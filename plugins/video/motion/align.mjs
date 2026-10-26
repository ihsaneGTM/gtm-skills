// Words and time, shared by the three motion skills: what a word is on screen, how the written text
// is set on the times a speech-to-text heard, and the anchors (@word#n±s) every edit is written with.
//
// The timing comes from what was HEARD (ElevenLabs Scribe, read back on the take), never from the
// alignment the synthesis returns: that one is 50 to 250 ms off, which shows on one-word captions.
// The words on screen are the text's own (spelling, "MX-5", "7 500"), set on the heard times.

// a word as it is compared: lower case, no accents, letters and digits only ("Bon_Coin" → "boncoin")
export const norm = w => String(w).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// the words as they show: no play tags ([excited]), a lone punctuation mark ("?", ":") glued to the word
// before it, "_" a no-break space ("7_500" shows as "7 500", in one caption)
export function writtenWords(text) {
  const out = [];
  for (const w of String(text).replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean)) {
    if (!norm(w) && out.length) out[out.length - 1] += " " + w;
    else if (norm(w)) out.push(w.replace(/_/g, " "));
  }
  return out;
}

// what the voice is given: the text with its pronunciations (`say`, longest first, so "1.6 TDI" is
// replaced before "1.6") and "_" said as a space
export function spoken(text, say = {}) {
  let s = String(text);
  for (const k of Object.keys(say || {}).sort((a, b) => b.length - a.length)) s = s.split(k).join(say[k]);
  return s.replace(/_/g, " ");
}

// ── sequence matching, as Python's difflib.SequenceMatcher(autojunk=False) does it ─────────────
// the longest matching block, then the same on each side of it; opcodes in order
function longest(a, b, a0, a1, b0, b1) {
  let best = [a0, b0, 0], j2 = new Map();
  for (let i = a0; i < a1; i++) {
    const next = new Map();
    for (let j = b0; j < b1; j++) {
      if (a[i] !== b[j]) continue;
      const k = (j2.get(j - 1) || 0) + 1;
      next.set(j, k);
      if (k > best[2]) best = [i - k + 1, j - k + 1, k];
    }
    j2 = next;
  }
  return best;
}
export function matchingBlocks(a, b) {
  const out = [], queue = [[0, a.length, 0, b.length]];
  while (queue.length) {
    const [a0, a1, b0, b1] = queue.pop();
    const [i, j, k] = longest(a, b, a0, a1, b0, b1);
    if (!k) continue;
    out.push([i, j, k]);
    if (a0 < i && b0 < j) queue.push([a0, i, b0, j]);
    if (i + k < a1 && j + k < b1) queue.push([i + k, a1, j + k, b1]);
  }
  out.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  // adjacent blocks merged, then the sentinel
  const merged = [];
  for (const m of out) {
    const l = merged[merged.length - 1];
    if (l && l[0] + l[2] === m[0] && l[1] + l[2] === m[1]) l[2] += m[2]; else merged.push([...m]);
  }
  merged.push([a.length, b.length, 0]);
  return merged;
}
export function opcodes(a, b) {
  let i = 0, j = 0;
  const ops = [];
  for (const [ai, bj, k] of matchingBlocks(a, b)) {
    const tag = i < ai && j < bj ? "replace" : i < ai ? "delete" : j < bj ? "insert" : null;
    if (tag) ops.push([tag, i, ai, j, bj]);
    if (k) ops.push(["equal", ai, ai + k, bj, bj + k]);
    i = ai + k; j = bj + k;
  }
  return ops;
}
export function ratio(a, b) {
  const m = matchingBlocks(a, b).reduce((n, x) => n + x[2], 0);
  return a.length + b.length ? (2 * m) / (a.length + b.length) : 1;
}

const r3 = x => Math.round(x * 1000) / 1000;
// the written words set on Scribe's heard words: a word matched takes its heard time; a passage said
// another way ("208" / "deux cent huit") shares the heard time evenly and is marked approx; a gap is
// spread between its neighbours
export function retime(text, scribe) {
  const heard = (scribe.words || []).filter(w => w.type === "word");
  const hn = heard.map(w => norm(w.text));
  const ww = writtenWords(text).filter(w => norm(w));
  const wn = ww.map(norm);
  const out = new Array(ww.length).fill(null);
  for (const [op, a0, a1, b0, b1] of opcodes(wn, hn)) {
    if (op === "equal") for (let k = 0; k < a1 - a0; k++) { const h = heard[b0 + k]; out[a0 + k] = { w: ww[a0 + k], s: h.start, e: h.end }; }
    else if (op === "replace" && b1 > b0) {
      const s = heard[b0].start, e = heard[b1 - 1].end, n = a1 - a0;
      for (let k = 0; k < n; k++) out[a0 + k] = { w: ww[a0 + k], s: r3(s + (e - s) * k / n), e: r3(s + (e - s) * (k + 1) / n), approx: true };
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (out[i]) continue;
    let prev = null, next = null;
    for (let j = i - 1; j >= 0; j--) if (out[j]) { prev = out[j]; break; }
    for (let j = i + 1; j < out.length; j++) if (out[j]) { next = out[j]; break; }
    const s = prev ? prev.e : next ? next.s - 0.2 : 0;
    const e = next ? next.s : s + 0.25;
    out[i] = { w: ww[i], s: r3(s), e: r3(Math.max(e, s + 0.08)), approx: true };
  }
  return out;
}

// ── anchors ───────────────────────────────────────────────────────────────────────────────────
// "@word", "@word#n" (the n-th time it is said), "@word+0.2" / "@word-0.15" (seconds after/before its
// start); compared as norm() does, so "t'es" matches "tes" and "Bon_Coin" matches "boncoin".
// "@MX-5": the dash and the digit belong to the word when no word "MX" exists.
export function anchors(words) {
  return v => {
    if (typeof v === "number") return v;
    const m = /^@(.+?)(?:#(\d+))?([+-]\d+(?:\.\d+)?)?$/.exec(String(v).trim());
    if (!m) throw new Error(`unreadable anchor: ${v}`);
    let key = norm(m[1]), nth = +(m[2] || 1), off = +(m[3] || 0);
    let hits = words.filter(w => norm(w.w) === key);
    if (!hits.length && m[3]) {
      const alt = words.filter(w => norm(w.w) === norm(m[1] + m[3]));
      if (alt.length) { hits = alt; off = 0; }
    }
    if (hits.length < nth) throw new Error(`anchor not in the voice: ${v}`);
    return r3(hits[nth - 1].s + off);
  };
}
// every word with its time and its exact anchor (@word#n), for writing an edit
// ("@MX-5#1": a word ending in -digits always carries its number, or "-5" would read as an offset)
export function anchorList(words) {
  const seen = new Map();
  return words.map(w => {
    const k = norm(w.w), n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    const base = w.w.replace(/[\s ]+/g, "").replace(/^[«"“(]+/, "").replace(/[.,;:!?…»"”)]+$/, "");
    const anchor = `@${base}${n > 1 || /-\d+(\.\d+)?$/.test(base) ? `#${n}` : ""}`;
    return { t: w.s, e: w.e, word: w.w, anchor, approx: !!w.approx };
  });
}
