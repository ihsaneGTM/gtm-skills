#!/usr/bin/env node
// The YouTube chapters of the final cut, their times read from the assembly (run.json › assembly) and the words, never
// guessed: for the description (publication.md, SKILL.md § 12).
//
//   node chapters.mjs <run-dir> "intro=Why you only find 40–60% of your contacts" "1@So=What's in this video" \
//        "1@So#2=Single provider vs waterfall" "cutback-1=Which one to choose: the test" "2@And#4=Reason 1: the providers" …
//
// A chapter starts at: `intro` (0:00, the first chapter always), `cutback-<n>` (the clip's first frame), or `<part>@<word>`
// (that word of the part's take, its anchor as voice.mjs anchors lists it: @word, @word#n). YouTube needs the first at
// 0:00, at least 3 chapters, each 10 s or more: a shorter one is said, to merge with its neighbour.
// Prints the lines to paste (m:ss Title), and writes nothing.
import fs from "node:fs";
import path from "node:path";
import { anchors } from "../../../motion/align.mjs";

const a = process.argv.slice(2);
const RUN = path.resolve(a[0] || ".");
const run = JSON.parse(fs.readFileSync(path.join(RUN, "run.json"), "utf8"));
const asm = run.assembly;
if (!asm?.parts) { console.error("✗ no assembly in run.json: assemble.mjs first (the chapters are read on the final cut)"); process.exit(2); }
// where each piece starts in the final cut
let at = 0;
const start = {};
for (const p of asm.parts) { start[p.kind === "part" ? `part-${p.n}` : p.kind === "cutback" ? `cutback-${p.n}` : "intro"] = at; at += p.d; }
const total = at;
const segsOf = n => { const w = fs.readFileSync(path.join(RUN, "film", `words-${n}.js`), "utf8"); return JSON.parse((/window\.SEGS=(\[.*?\]);/.exec(w) || [])[1] || "[]"); };
const timeOf = spec => {
  if (spec === "intro" || spec === "0") return 0;
  if (/^cutback-\d+$/.test(spec)) { if (start[spec] == null) throw new Error(`no ${spec} in the assembly`); return start[spec]; }
  const m = /^(\d+)(@.+)$/.exec(spec);
  if (!m) throw new Error(`unreadable: ${spec} (intro, cutback-<n> or <part>@<word>)`);
  const n = +m[1];
  if (start[`part-${n}`] == null) throw new Error(`no part ${n} in the assembly`);
  const words = JSON.parse(fs.readFileSync(path.join(RUN, "vo", `part-${n}`, "words.json"), "utf8"));
  const s = anchors(words)(m[2]);
  // the take's time in the film (prep.mjs's segments: the voice from 0.25 s, its pauses)
  let g = segsOf(n)[0];
  for (const x of segsOf(n)) if (s >= x.s0 - 1e-6) g = x;
  return start[`part-${n}`] + (s - g.s0 + g.at);
};
const fmt = t => { const s = Math.floor(t + 1e-6); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
try {
  const ch = a.slice(1).map(x => { const i = x.indexOf("="); if (i < 0) throw new Error(`no title: ${x} (spec=Title)`); return { t: timeOf(x.slice(0, i)), title: x.slice(i + 1).trim() }; }).sort((p, q) => p.t - q.t);
  if (!ch.length || ch[0].t > 0.5) throw new Error("the first chapter must be intro (0:00)");
  ch[0].t = 0;
  if (ch.length < 3) console.log("⚠ YouTube shows chapters only from 3 of them");
  ch.forEach((c, i) => { const len = (ch[i + 1]?.t ?? total) - c.t; if (len < 10) console.log(`⚠ « ${c.title} » lasts ${len.toFixed(1)} s: YouTube needs 10 s or more (merge it with its neighbour)`); });
  console.log(ch.map(c => `${fmt(c.t)} ${c.title}`).join("\n"));
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
