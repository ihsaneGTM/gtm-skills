#!/usr/bin/env node
// Each motion part's timing and page: its take (vo/part-<n>/words.json) placed in its film → film/words-<n>.js, and its
// page film/part-<n>.html (+ the story's skeleton film/story-<n>.js when there is none yet).
//
//   node prep.mjs <run-dir> [--part <n>]       (after node plugins/video/motion/voice.mjs take <run>/vo/part-<n>/vo.json)
//
// The parts: vo/part-1/, vo/part-2/… (one take each, ElevenLabs, the user's clone). The video is
//   intro (filmed, dressed) → part 1 → cutback 1 (filmed, dressed) → part 2 → … → the last part (its end card),
// so part n starts on the previous filmed clip's last frame (img/intro-last.png, or img/cutback-<n-1>-last.png) and ends
// on the next one's first frame (img/cutback-<n>-first.png), the last part on its own end card.
// The voice starts at 0.25 s (the junction out of the filmed clip is 0.42 s: the voice comes in while the frame snaps).
// vo.json › pauses: [["a word", 0.8], …] in the order of the text: that many seconds of silence after the word (a breath
// for a scene that needs time); the voice itself is never stretched.
// Writes window.WORDS, SEGS ([{ s0, s1, at }]: a part of the take and where it starts in the film), GEN (no titles in
// this format), CUTS ([]) and PART ({ n, total, in, out }).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const run = (() => { try { return JSON.parse(fs.readFileSync(path.join(RUN, "run.json"), "utf8")); } catch { return {}; } })();
const VO = path.join(RUN, "vo");
const parts = fs.existsSync(VO) ? fs.readdirSync(VO).map(d => (/^part-(\d+)$/.exec(d) || [])[1]).filter(Boolean).map(Number).sort((x, y) => x - y) : [];
if (!parts.length) { console.error("✗ no vo/part-<n>/ in this run: write vo/part-1/vo.json (SKILL.md § 6), take the voice, then prep.mjs"); process.exit(2); }
const total = parts.at(-1), ncb = run.cut?.cutbacks?.length || 0;
const AI = run.mode === "ai";   // the AI voice mode: no filmed clip, the parts follow each other
if (!AI && total !== ncb + 1 && total !== ncb) console.log(`⚠ ${total} part(s) for ${ncb} cutback(s): the video alternates part 1 → cutback 1 → part 2…; cut.mjs and vo/part-<n>/ must agree`);
const LEAD = 0.25;
const r3 = x => Math.round(x * 1000) / 1000;
const clean = x => String(x).replace(/[  ]/g, " ").replace(/[ ?.!,;:]+$/, "").trim().toLowerCase();
const tpl = path.join(HERE, "..", "template", run.style || "document", "film");

for (const n of opt("part") ? [+opt("part")] : parts) {
  const D = path.join(VO, `part-${n}`);
  const spec = JSON.parse(fs.readFileSync(path.join(D, "vo.json"), "utf8"));
  if (!fs.existsSync(path.join(D, "words.json"))) { console.error(`✗ part ${n}: vo/part-${n}/words.json is missing (voice.mjs take vo/part-${n}/vo.json)`); process.exitCode = 1; continue; }
  const words = JSON.parse(fs.readFileSync(path.join(D, "words.json"), "utf8"));
  // pauses (numbers only; a part's end is its take's end)
  const pauses = (spec.pauses || (spec.parts || []).filter(p => typeof p[1] === "number")).filter(p => +p[1] > 0);
  const segs = [];
  let at = LEAD, s0 = 0, i0 = 0;
  for (const [tok, pause] of [...pauses, [null, 0]]) {
    if (tok === null) { segs.push({ s0, s1: r3(words.at(-1).e + 1), at: r3(at) }); break; }
    const i = words.findIndex((w, k) => k >= i0 && clean(w.w).endsWith(clean(tok)));
    if (i < 0 || i === words.length - 1) { console.error(`✗ part ${n}: vo.json › pauses: « ${tok} » not found after word n° ${i0}, or it is the last word`); process.exit(1); }
    const c = r3((words[i].e + words[i + 1].s) / 2);
    segs.push({ s0, s1: c, at: r3(at) });
    at += (c - s0) + +pause;
    s0 = c; i0 = i + 1;
  }
  const PART = AI ? { n, total, in: null, out: null, next: n < total }
    : { n, total, in: n === 1 ? "img/intro-last.png" : `img/cutback-${n - 1}-last.png`, out: n <= ncb ? `img/cutback-${n}-first.png` : null };
  fs.writeFileSync(path.join(RUN, "film", `words-${n}.js`), `window.WORDS=${JSON.stringify(words)};\nwindow.SEGS=${JSON.stringify(segs)};\nwindow.GEN={"t0":0,"t1":0};\nwindow.CUTS=[];\nwindow.PART=${JSON.stringify(PART)};\n`);
  fs.writeFileSync(path.join(RUN, "film", `part-${n}.html`), fs.readFileSync(path.join(tpl, "part.html"), "utf8").replaceAll("__N__", String(n)));
  const story = path.join(RUN, "film", `story-${n}.js`);
  if (!fs.existsSync(story)) fs.writeFileSync(story, fs.readFileSync(path.join(tpl, "story.js"), "utf8").replaceAll("__SLUG__", `${run.slug || path.basename(RUN)}-part-${n}`).replaceAll("__TITLE__", run.subject || run.slug || "").replaceAll("__N__", String(n)));
  const last = segs.at(-1), voEnd = last.at + (words.at(-1).e - last.s0);
  const pre = (spec.prefix || "").trim();
  console.log(`part ${n}/${total}: ${segs.length > 1 ? `${segs.length} segments, ` : ""}the voice from ${LEAD} s to ${voEnd.toFixed(2)} s · ${words.length} words, ${(words.length / (words.at(-1).e - words[0].s)).toFixed(2)} words/s · in ${PART.in || "its first idea"} · out ${PART.out || (PART.next ? `part ${n + 1}` : "the end card (held 2.5 s)")} → film/part-${n}.html`);
  pauses.forEach(([tok, p], k) => console.log(`  ${p} s of air after « ${tok} » (segment ${k + 2} at ${segs[k + 1].at.toFixed(2)} s)`));
  if (pre && !spec.real && !String(spec.text || "").trim().startsWith(pre)) console.log(`⚠ part ${n}: vo.json › text does not start with the clone's prefix ${JSON.stringify(spec.prefix)}: take the voice again with it`);
}
