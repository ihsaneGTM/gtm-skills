#!/usr/bin/env node
// EVERY WORD ON SCREEN IS A WORD THE SPEAKER SAYS.
//
//   node verbatim.mjs [--allow "1,00M|GTM"]
//
// It covers the title blocks AND the words drawn on the full-frame plates
// (`text:` — label(), funnel()'s inputs), which are on screen exactly as much.
//
// The on-screen text is in the language the speaker SPEAKS and is taken word
// for word from the transcript, never translated. That is a rule a doc can
// state and a run can quietly break, so it is a check.
//
// It reads every `sans(...)` / `serif(...)` string in plan.mjs and asks whether
// each word exists in the transcript. The reference is the CORRECTED stream —
// subs.json when it is there, because whisper splits apostrophes into two tokens
// (`d` + `'acquisition`) and `subs.config.json` is where that is repaired —
// falling back to words.json plus the same corrections applied here.
//
// `--allow` is for the things that are NOT words: a counter's rendered value
// ("1,00M" for a spoken "1 million"), a figure, a unit. Keep the list short; a
// long one means the plan drifted back into writing rather than quoting.
// It is separated by `|`, NOT by a comma — a comma is a decimal point in many locales
// and `--allow "1,00M"` split into "1" and "00M", which allowed neither.
import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const has = f => fs.existsSync(path.resolve(CWD, f));
const read = f => fs.readFileSync(path.resolve(CWD, f), "utf8");

if (!has("plan.mjs")) { console.error("plan.mjs not found"); process.exit(1); }
if (!has("words.json")) { console.error("words.json not found; transcribe first"); process.exit(1); }

const said = new Set();
for (const w of JSON.parse(read("words.json"))) { const n = norm(w.w); if (n) said.add(n); }
// the corrected stream: merged apostrophes and repaired names live here
if (has("subs.json"))
  for (const c of JSON.parse(read("subs.json"))) for (const w of c.words) { const n = norm(w.w); if (n) said.add(n); }
if (has("subs.config.json"))
  for (const c of (JSON.parse(read("subs.config.json")).corrections || []))
    for (const w of c.replace) { const n = norm(w); if (n) said.add(n); }

const ALLOW = new Set((arg("--allow", "") || "").split("|").map(norm).filter(Boolean));
// Three ways a word reaches the screen, and the gate has to see all three:
//   sans("…") / serif("…")   a title block's runs
//   label({ … text: "…" })   a word written on a plate (illustrate.mjs)
//   { text: "…" }            an input's word inside funnel()'s `inputs`
// Checking only the first once let a plate print a word the speaker never said
// with the gate green — which is the whole failure this file exists to make
// impossible.
const PLAN = read("plan.mjs");
const rows = [
  ...[...PLAN.matchAll(/(?:sans|serif)\(\s*"([^"]*)"/g)].map(m => m[1]),
  ...[...PLAN.matchAll(/\btext:\s*"([^"]*)"/g)].map(m => m[1]),
];
if (!rows.length) { console.error("no text line found in plan.mjs"); process.exit(1); }

const bad = [];
for (const r of rows) for (const w of r.split(/\s+/)) {
  const n = norm(w);
  if (n && !said.has(n) && !ALLOW.has(n)) bad.push([w, r]);
}

console.log(`${rows.length} line(s) on screen, ${said.size} distinct words in the transcript`);
if (!bad.length) {
  console.log("\n✓ every word on screen is a word the speaker says");
  process.exit(0);
}
console.log("\n✗ words on screen that are NOT in the transcript:");
for (const [w, r] of bad) console.log(`   "${w}"   in the line "${r}"`);
console.log("\nA block is the speaker's OWN sentence minus what does not carry it — never a");
console.log("translation, a synonym, or a linking word added to make the line fit. If the line");
console.log("you want is not in words.json, the answer is a shorter line.");
console.log('A rendered figure (the counter) is declared with --allow "1,00M" (separator |).');
process.exit(1);
