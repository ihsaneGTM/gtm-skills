// THE CAPTIONS — the speaker's words, low in the frame, word by word (scrapbook language).
//
// v3 (2026-10-05, second review: « les polices, les couleurs, ça ne va pas », « pas dynamique »):
// Archivo ExtraBold (book.mjs FACES.caption) at 0.06 of the frame width, white, held off the
// picture by a soft dark shadow and a hairline of dark round the letters; the word BEING SAID in
// the accent colour (project.json `accent`), the ones already said in white; each word RISES in
// as it is said (0.86 → 1 and up 0.15 of its size, a hair past, in 0.1 s). Centred, its middle at
// 0.765 of the height. Kept from v2 (measured on the reference): lower case and no punctuation,
// proper nouns keep their capital; a chunk of AT MOST THREE WORDS, cut at the end of a phrase,
// replaced by the next one, never scrolled; nothing pre-shown.
//
// They step aside, never twice on the frame: while a section header or a phrase label says the
// same words (a beat with `mutesCaptions`), the captions are off.
import { createCanvas, setFont, clamp01, lerp, easeOutBack, easeOutCubic, PJ, ACCENT, measureText, drawText, FRAME } from "./book.mjs";

const SENT_END = /[.!?…:]["')\]]*$/;
const PHRASE_END = /[,;—–]["')\]]*$/;

// the text of a word as the captions write it
export function captionText(raw, { sentenceStart, keep, lower = true }) {
  let w = String(raw).trim().replace(/^[^\p{L}\p{N}$€£#@'’]+|[^\p{L}\p{N}%'’+]+$/gu, "");
  if (!w) return "";
  if (keep.has(w.toLowerCase())) return keep.get(w.toLowerCase());
  if (!lower) return w;
  const isAcronym = /^[A-Z0-9]{2,}s?$/.test(w);              // CTA, AI, CTAs, 11
  const inner = /[a-z][A-Z]/.test(w);                         // ElevenLabs, iPhone
  if (w === "I" || /^I['’]/.test(w) || isAcronym || inner) return w;
  // a capital in the middle of a sentence is a name; at its start it is only grammar
  if (/^\p{Lu}/u.test(w) && !sentenceStart) return w;
  return w.toLowerCase();
}

// words: [{ w, s, e }] on the OUTPUT timeline. Returns the chunks [{ s, e, words:[{text,s,e}] }].
export function chunk(words, { maxWords = 3, maxGap = 0.45, keep = new Map(), lower = true, measure = null, maxW = Infinity } = {}) {
  const out = [];
  let cur = null, sentenceStart = true, prev = null;
  // a name of several words (« Station F », « Meta Ads Library ») is one block: never split
  // across two chunks, and written as given
  const multi = [...keep.values()].filter(k => /\s/.test(k)).map(k => k.split(/\s+/));
  const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const glued = new Map();     // word index → [keep words, position in it]
  for (let i = 0; i < words.length; i++) for (const parts of multi) {
    if (parts.every((p, k) => words[i + k] && norm(words[i + k].w) === norm(p))) parts.forEach((p, k) => glued.set(i + k, [parts, k]));
  }
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    const g = glued.get(wi);
    const text = g ? g[0][g[1]] : captionText(w.w, { sentenceStart, keep, lower });
    const endsSentence = SENT_END.test(w.w), endsPhrase = PHRASE_END.test(w.w);
    if (text) {
      const gap = prev ? w.s - prev.e : 0;
      const tooWide = cur && measure && measure([...cur.words.map(x => x.text), text].join(" ")) > maxW;
      const inside = g && g[1] > 0;          // the second word of a name stays with the first
      const room = g && g[1] === 0 ? g[0].length : 1;
      if (!inside && (!cur || cur.words.length + room > Math.max(maxWords, room) || cur.closed || gap > maxGap || tooWide)) {
        cur = { words: [], closed: false };
        out.push(cur);
      }
      cur.words.push({ text, s: w.s, e: w.e });
      if (endsSentence || endsPhrase) cur.closed = true;
    }
    sentenceStart = endsSentence;
    prev = w;
  }
  for (let i = 0; i < out.length; i++) {
    const c = out[i], next = out[i + 1];
    c.s = c.words[0].s;
    const last = c.words[c.words.length - 1].e;
    // up until the next chunk starts, or a breath after its last word when nothing follows soon
    c.e = next ? Math.min(next.words[0].s, last + 0.9) : last + 0.6;
  }
  return out;
}

// y and the chunk width inside the feed's safe area (short-editor/scripts/safezones.mjs, 2026-10-05:
// it was y 0.765 and 0.84 of the width, under the feed's caption and its buttons)
export function captions({ id = "captions", words, frame = FRAME, from = 0, until, y = 0.725, size = 0.06,
  maxWords = 3, mutes = () => [], keep = PJ.captionKeep ?? [], lower = true, layer = "over", active = ACCENT }) {
  const W = frame.w, H = frame.h, px = size * W;
  const keepMap = new Map(keep.map(k => [String(k).toLowerCase(), String(k)]));
  const mctx = createCanvas(8, 8).getContext("2d");
  const measure = s => measureText(mctx, s, "caption", px);
  const space = px * 0.28;
  const CH = chunk(words, { maxWords, keep: keepMap, lower, measure, maxW: W * 0.66 })
    .filter(c => c.e > from && c.s < until);
  let muteWins = null;
  const muted = t => {
    if (!muteWins) muteWins = mutes().map(b => [b.from, b.to]);
    return muteWins.some(([a, b]) => t >= a && t < b);
  };
  return {
    id, from, to: until, layer, chunks: CH,
    draw(ctx, t) {
      if (t < from || t >= until || muted(t)) return;
      const c = CH.find(x => t >= x.s - 0.02 && t < x.e);
      if (!c) return;
      const shown = c.words.filter(w => t >= w.s - 0.02);
      if (!shown.length) return;
      // the chunk is laid out with ALL its words, so a word appearing never moves the others
      const widths = c.words.map(w => measure(w.text));
      const total = widths.reduce((a, b) => a + b, 0) + space * (c.words.length - 1);
      let x = W / 2 - total / 2;
      const by = y * H + px * 0.36;
      // the word being said: the last one whose onset has passed, until the next one starts
      const cur = shown[shown.length - 1];
      ctx.save();
      ctx.textBaseline = "alphabetic";
      c.words.forEach((w, i) => {
        if (t >= w.s - 0.02) {
          const u = t - (w.s - 0.02), k = clamp01(u / 0.10);
          const s = lerp(0.86, 1, easeOutBack(k, 2.0)), dy = (1 - easeOutCubic(k)) * px * 0.15;
          const cx = x + widths[i] / 2;
          ctx.save();
          ctx.globalAlpha = clamp01(u / 0.05 + 0.35);
          ctx.translate(cx, by + dy); ctx.scale(s, s); ctx.translate(-cx, -by);
          const fill = w === cur && t < w.e + 0.12 ? active : "#FFFFFF";
          // held off the picture: a soft shadow under, a hairline of dark round the letters
          ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = px * 0.22; ctx.shadowOffsetY = px * 0.06;
          drawText(ctx, w.text, x, by, "caption", px, { fill, stroke: px * 0.07, strokeColor: "rgba(15,12,10,.55)" });
          ctx.shadowColor = "rgba(0,0,0,0)";
          drawText(ctx, w.text, x, by, "caption", px, { fill });
          ctx.restore();
        }
        x += widths[i] + space;
      });
      ctx.restore();
    },
  };
}
