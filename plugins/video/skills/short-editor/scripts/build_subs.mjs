// words.json -> subs.json: caption chunks with per-word timings.
//
//   node build_subs.mjs [--max 4] [--gap 0.55] [--no-from-plan]
//
// A PHRASE IS CARRIED BY ONE CHANNEL, NEVER TWO. By default (as soon as
// plan.mjs exists) this script reads it and SILENCES the caption wherever a
// title block quotes the phrase: either the caption at the bottom, or the text
// to the right or left, but NOT BOTH.
//
// Corrections are PATTERNS, never indices. An index-based fix list silently
// rots the moment the transcript shifts by one word: `[25, ["GTM"]]` once
// landed on "a" and shipped the caption "GTM marketer". Patterns are matched
// longest-first and anything that fails to match is reported, not swallowed.
//
// Edit CORRECTIONS and HOT below for the project — product names the ASR will
// always mangle, and the words worth turning yellow.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const MAX = parseInt(arg("--max", "5"), 10);          // words per caption chunk
const GAP = parseFloat(arg("--gap", "0.55"));         // a pause this long breaks the chunk
const UNTIL = parseFloat(arg("--until", "Infinity")); // caption nothing from here on (a long video's untouched tail)
// Stretches to caption, in OUTPUT seconds: "0-17.7,26.3-47". A long video is not
// necessarily one continuous shot of the speaker — it may alternate with a
// screen layout, and a white line across that composition fights it. Without
// this the only choice was "caption everything up to editEnd".
const WINDOWS = (arg("--windows", "") || "").split(",").filter(Boolean)
  .map(w => w.split("-").map(Number));

const CWD = process.cwd();
const CFG = fs.existsSync(path.resolve(CWD, "subs.config.json"))
  ? JSON.parse(fs.readFileSync(path.resolve(CWD, "subs.config.json"), "utf8"))
  : { corrections: [], hot: [] };

// words.json is the ORIGINAL timeline; render.mjs draws at OUTPUT time and
// nothing between the two divides. So the division happens HERE, once — and
// `--until` / `--windows` are then output seconds, the same unit as `editEnd`,
// which is what SKILL.md tells you to pass. Before this they were compared
// against source times and a 1.15x project cut its captions 13 % too late.
const SPEED = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8")).speed ?? 1; }
  catch { return 1; }
})();
const at = t => +(t / SPEED).toFixed(3);
const inWindow = t => !WINDOWS.length || WINDOWS.some(([a, b]) => t >= a && t <= b);
const ALL = JSON.parse(fs.readFileSync(path.resolve(CWD, "words.json"), "utf8"));

// --- --from-plan: a phrase belongs to ONE channel only ---------------------------
//
// Without it, the caption showed "B2B to generate tons of leads" at 4.20 s and
// the block rewrote "TONS OF LEADS" at 4.62 s: the same four words, twice, two
// tenths of a second apart.
//
// The `captionAlpha` fade (render.mjs) was not enough: it switches the line off
// when the block ARRIVES, not when the phrase STARTS — and a caption chunk
// starts earlier. So everything a block quotes is removed from the word stream
// here: from the attack of its FIRST quoted word until it leaves the screen.
//
// The quoted words are found in the transcript by their LETTERS, not by their
// tokenisation: whisper splits an elided word ("d'un" → "d" + "'un"), so the
// stream is walked until it covers the line's letters.
const letters = s2 => s2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
async function planBlackouts() {
  const url = pathToFileURL(path.resolve(CWD, "plan.mjs")).href;
  const PLAN = await import(url);
  const out2 = [];
  for (const b of (PLAN.BEATS || [])) {
    if (!b.mutesCaptions || !b.spec || !b.spec.lines) continue;
    let first = Infinity;
    for (const l of b.spec.lines) {
      const want = letters(l.runs.map(r => r.text).join(""));
      if (!want) continue;
      const t0 = l.t * SPEED;                                  // back to source time
      let best = 0;
      for (let i = 1; i < ALL.length; i++) if (Math.abs(ALL[i].s - t0) < Math.abs(ALL[best].s - t0)) best = i;
      // step back a word or two if the line starts earlier than the attack found
      for (let back = 0; back <= 2; back++) {
        const i0 = Math.max(0, best - back);
        let acc = "";
        for (let j = i0; j < ALL.length && acc.length < want.length + 4; j++) {
          acc += letters(ALL[j].w);
          if (acc.startsWith(want) || want.startsWith(acc) && acc.length === want.length) { first = Math.min(first, ALL[i0].s); back = 9; break; }
        }
      }
      if (first === Infinity) first = Math.min(first, ALL[best].s);
    }
    if (first !== Infinity) out2.push([first - 0.03, b.to * SPEED + 0.02]);
  }
  return out2;
}
// ON BY DEFAULT, not behind an option. As a flag it is exactly the kind of guard
// that gets forgotten, and forgetting it writes the phrase twice on screen.
// `--no-from-plan` exists for when the plan is not written yet (captions built
// before the blocks) — it is loud on purpose.
const FROM_PLAN = !argv.includes("--no-from-plan") && fs.existsSync(path.resolve(CWD, "plan.mjs"));
if (argv.includes("--no-from-plan")) console.log("⚠ --no-from-plan: title blocks do NOT reserve their phrase, the caption may write it again");
const BLACKOUT = FROM_PLAN ? await planBlackouts() : [];
if (FROM_PLAN) {
  console.log(`--from-plan: ${BLACKOUT.length} block(s) own their phrase, the caption stays silent there`);
  for (const [a, b] of BLACKOUT) console.log(`   ${a.toFixed(2)} → ${b.toFixed(2)} s`);
}
const muted = t => BLACKOUT.some(([a, b]) => t >= a && t <= b);
const words = ALL.filter(w => at(w.s) < UNTIL && inWindow(at(w.s)) && !muted(w.s));

// --- corrections --------------------------------------------------------------
// Each entry: { find: "raw words as transcribed", replace: ["Fixed", "Words"] }
// Longest first, so a 3-word pattern wins over a 1-word one inside it.
const corr = [...(CFG.corrections || [])].sort((a, b) => b.find.split(/\s+/).length - a.find.split(/\s+/).length);
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
let out = words.map(w => ({ ...w }));
const unused = [];
for (const c of corr) {
  const pat = c.find.split(/\s+/).map(norm);
  let hits = 0;
  for (let i = 0; i + pat.length <= out.length; i++) {
    if (pat.every((p, k) => norm(out[i + k].w) === p)) {
      const s = out[i].s, e = out[i + pat.length - 1].e;
      const rep = c.replace.map((w, k, arr) => ({
        w, s: s + (e - s) * (k / arr.length), e: s + (e - s) * ((k + 1) / arr.length),
      }));
      out.splice(i, pat.length, ...rep);
      i += rep.length - 1; hits++;
    }
  }
  if (!hits) unused.push(c.find);
}

// --- hot words ------------------------------------------------------------------
const hot = new Set((CFG.hot || []).map(norm));
out = out.map(w => ({ ...w, hot: hot.has(norm(w.w)) || undefined }));

// --- chunking ---------------------------------------------------------------------
const chunks = [];
let cur = [];
const flush = () => {
  if (!cur.length) return;
  chunks.push({
    s: at(cur[0].s),
    // hold the caption until the next one starts, so nothing flickers off
    e: at(cur[cur.length - 1].e),
    words: cur.map(w => ({ w: w.w, s: at(w.s), e: at(w.e), ...(w.hot ? { hot: true } : {}) })),
  });
  cur = [];
};
for (let i = 0; i < out.length; i++) {
  const w = out[i];
  if (cur.length && (w.s - cur[cur.length - 1].e > GAP || cur.length >= MAX)) flush();
  cur.push(w);
  // Break on the speaker's own punctuation, not only at the word cap. A fixed
  // 4-word slice cuts "in / less than a year" — the words are right and the line
  // still reads like a machine. A comma is where the speaker breathed.
  if (/[.!?]$/.test(w.w) || (/[,;:]$/.test(w.w) && cur.length >= 2)) flush();
}
flush();

// An orphan is a one- or two-word chunk left by a sentence end: "an." on its own
// line for a third of a second reads as a glitch. Fold it back into the chunk
// before it when that one has room.
for (let i = chunks.length - 1; i > 0; i--) {
  const c = chunks[i], p = chunks[i - 1];
  if (c.words.length <= 2 && p.words.length + c.words.length <= MAX + 2
      && c.s - p.e < GAP) {
    p.words.push(...c.words); p.e = c.e; chunks.splice(i, 1);
  }
}
// extend each chunk to the next one's start (minus a hair) so captions never blink
for (let i = 0; i < chunks.length - 1; i++) {
  chunks[i].e = Math.min(chunks[i + 1].s - 0.02, chunks[i].e + 0.45);
}
// …but NEVER into a range a title block owns, nor past a window. Filtering the
// words is not enough: this extension is what pushed a chunk's end out by
// 0.45 s and put a line back under a block.
const LIMITS = [...BLACKOUT.map(([a]) => at(a)), ...WINDOWS.map(([, b]) => b)].sort((a, b) => a - b);
for (const c of chunks) {
  const stop = LIMITS.find(x => x > c.s);
  if (stop != null && c.e > stop) c.e = Math.max(c.s + 0.25, +(stop - 0.03).toFixed(3));
}

fs.writeFileSync(path.resolve(CWD, "subs.json"), JSON.stringify(chunks, null, 0));
console.log(`subs.json — ${chunks.length} chunks, ${out.length} words, ${[...hot].length} accent words`
  + (SPEED !== 1 ? ` · OUTPUT times (source ÷ ${SPEED})` : ""));
if (WINDOWS.length) console.log(`  windows: ${WINDOWS.map(([a, b]) => `${a}-${b}`).join(", ")} s`);
if (unused.length) {
  console.error(`  ⚠ ${unused.length} correction(s) with no match, to review:`);
  for (const u of unused) console.error(`      "${u}"`);
}
