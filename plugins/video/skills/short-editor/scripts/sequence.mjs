#!/usr/bin/env node
// EVERY WORD THE SPEAKER SAYS IS ON SCREEN, once, in order, at its time — the vertical language's
// headlines (top titles and the plate's subtitles) against words.json. From the project folder:
//
//   node sequence.mjs
//
// The runs of every headline, sorted by their time, are aligned with the transcript: a word said
// and not shown, a word shown and not said there, and a word shown more than 0.25 s from its onset
// are listed (onsets: words-fixed.json's when words.mjs has run). Written by Claude during an edit (2026-10-02) and run by hand since; here so nobody
// writes it again. (Landscape title blocks: verbatim.mjs.)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const P = JSON.parse(fs.readFileSync("project.json", "utf8")), SP = P.speed ?? 1;
const PLAN = await import(pathToFileURL(path.resolve("plan.mjs")).href);
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9']/g, "").replace(/'/g, "");
// the onsets measured on the voice when words.mjs has run (words-fixed.json), the transcript's otherwise
const FIXED = fs.existsSync("words-fixed.json") ? JSON.parse(fs.readFileSync("words-fixed.json", "utf8")).words : null;
const said = JSON.parse(fs.readFileSync("words.json", "utf8")).map((w, i) => ({ n: norm(w.w), w: w.w, s: FIXED?.[i]?.a ?? w.s })).filter(w => w.n);
const shown = [];
// the headlines the plan made, those a plate holds inside it included (headline.mjs MADE)
// (beside this file, by URL: a folder with a space, "Application Support", stays a folder)
const { MADE } = await import(new URL("./headline.mjs", import.meta.url).href);
const heads = MADE.length ? MADE : (PLAN.BEATS ?? []).filter(b => b.kind === "headline" && b.spec);
for (const b of heads)
  for (const l of b.spec.lines) for (const r of l.runs)
    for (const piece of String(r.text).split(/\s+/)) if (norm(piece)) shown.push({ n: norm(piece), w: piece, t: (r.t ?? l.t) * SP, id: b.id });
if (!shown.length) { console.log("no headline in plan.mjs"); process.exit(0); }
shown.sort((a, b) => a.t - b.t);
let i = 0, j = 0, bad = 0, late = 0;
while (i < said.length || j < shown.length) {
  const a = said[i], b = shown[j];
  if (a && b && a.n === b.n) {
    const d = b.t - a.s;
    if (Math.abs(d) > 0.25) { late++; console.log(`  ~ ${a.w.padEnd(16)} said ${a.s.toFixed(2)} · on screen ${b.t.toFixed(2)} (${d >= 0 ? "+" : ""}${d.toFixed(2)} s, source time)  [${b.id}]`); }
    i++; j++; continue;
  }
  // a little look-ahead tells a missing word from an added one
  const k = shown.slice(j, j + 4).findIndex(x => a && x.n === a.n);
  const m = said.slice(i, i + 4).findIndex(x => b && x.n === b.n);
  if (a && (k < 0 || (m >= 0 && m <= k))) { console.log(`  ✗ said, not on screen: "${a.w}" (${a.s.toFixed(2)} s)`); i++; bad++; }
  else { console.log(`  ✗ on screen, not said there: "${b.w}" (${b.t.toFixed(2)} s) [${b.id}]`); j++; bad++; }
}
console.log(bad ? `✗ ${bad} mismatch(es) between the ${said.length} words said and the ${shown.length} on screen${late ? `; ${late} more than 0.25 s off` : ""}`
  : `✓ the same ${said.length} words, in the same order${late ? `; ⚠ ${late} more than 0.25 s from their onset` : ""}`);
process.exit(bad ? 1 : 0);
