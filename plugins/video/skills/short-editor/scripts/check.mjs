#!/usr/bin/env node
// THE CHECKS BEFORE A RENDER, in one command and one short answer. From the project folder:
//
//   node check.mjs                 a vertical short: occlusion (+ the feed's safe zones), onset, sequence
//                                  a landscape one: fit, verbatim, onset
//   node check.mjs occlusion onset some of them
//
// They run at once; each says one line (✓ or ✗ and its verdict) and only its problems (✗ and ⚠,
// 12 lines at most each): the passing lines a full run prints are what every edit filtered out by
// hand with grep and tail. A check that has nothing to look at in this edit (no title block for
// fit, no quoted text for verbatim) says so in its line. Exit 1 when one fails.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const ALL = ["occlusion", "onset", "sequence", "verbatim", "fit"];
const DEFAULT = (P.width ?? 1080) > (P.height ?? 1920) ? ["fit", "verbatim", "onset"] : ["occlusion", "onset", "sequence"];
const want = process.argv.slice(2).filter(a => ALL.includes(a));
const run = name => new Promise(ok => {
  const c = spawn(process.execPath, [path.join(HERE, `${name}.mjs`)], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  c.stdout.on("data", d => out += d); c.stderr.on("data", d => out += d);
  c.on("close", code => ok({ name, code, out }));
});
const results = await Promise.all((want.length ? want : DEFAULT).map(run));
let failed = 0;
// what the plan says as it loads is said by every check: once, here
const seen = results.map(r => new Set(r.out.split("\n").map(l => l.trim()).filter(Boolean)));
const plan = [...seen[0]].filter(l => results.length > 1 && seen.every(s => s.has(l)) && /^⚠/.test(l));
for (const l of plan) console.log(`plan       ${l}`);
for (const { name, code, out } of results) {
  const lines = out.split("\n").map(l => l.replace(/\s+$/, "")).filter(l => l && !plan.includes(l.trim()));
  const nothing = lines.find(l => /^no (text line|headline)/.test(l));
  const verdict = [...lines].reverse().find(l => /^\s*[✓✗⚠]/.test(l) && !/^\s{2}/.test(l)) ?? lines.at(-1) ?? "(no output)";
  const issues = lines.filter(l => /^\s+[✗⚠~?]/.test(l) || (code !== 0 && /^\s{2,}\S/.test(l) && !/^\s+✓/.test(l)));
  if (code !== 0 && !nothing) failed++;
  console.log(`${name.padEnd(10)} ${nothing && !issues.length ? `— ${nothing}` : verdict.trim()}`);
  for (const l of issues.slice(0, 12)) console.log(`  ${l.trim()}`);
  if (issues.length > 12) console.log(`  … ${issues.length - 12} more: node ${path.join(HERE, `${name}.mjs`)}`);
}
process.exit(failed ? 1 : 0);
