#!/usr/bin/env node
// WHAT A PLAN BUILDS WITH, read off the engine's own sources: every module, every figure with its
// options and their defaults, and the comment written above it. Every edit read the sources to learn
// a signature (hand.mjs three times, 60k to 130k tokens before the first plan): this prints only it.
//
//   node api.mjs                   the modules, one line each
//   node api.mjs hand              hand.mjs: each export, its signature, its comment
//   node api.mjs hand stickers     only those exports
//   node api.mjs --find tape       the exports whose name or comment mention it, in every module
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(["api", "build", "bootstrap", "render", "fingerprint", "prep", "take", "check", "verify", "matte", "matte-holes", "cuts", "zexpr", "gate",
  "mix", "sfx", "audition", "preview", "occlusion", "onset", "sequence", "verbatim", "fit", "silhouette", "room", "words", "bed", "measure", "generic", "rough-cut",
  "hdr-lut", "safezones", "build_subs", "transcribe", "fonts", "jingle", "music", "house"]);
const modules = fs.readdirSync(HERE).filter(f => f.endsWith(".mjs") && !SKIP.has(f.replace(/\.mjs$/, ""))).sort();
const head = src => {                                    // the module's first comment line
  const l = src.split("\n").find(x => /^\/\/\s*\S/.test(x) && !/^\/\/\s*=+$/.test(x)) || "";
  return l.replace(/^\/\/\s*/, "").slice(0, 110);
};
function exportsOf(src) {
  const lines = src.split("\n"), out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export\s+(?:async\s+)?function\s+(\w+)\s*\(/) || lines[i].match(/^export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    const c = !m && lines[i].match(/^export\s+const\s+(\w+)\s*=/);
    if (!m && !c) continue;
    // the comment block right above (a blank line or code ends it); when there is none, the nearest
    // block above that names it (a figure's doc is often above the helpers it exports with it)
    const block = end => { const d = []; for (let j = end; j >= 0 && /^\s*\/\//.test(lines[j]); j--) d.unshift(lines[j].replace(/^\s*\/\/\s?/, "")); return d; };
    let doc = block(i - 1);
    if (!doc.length) {
      const name = (m || c)[1].toLowerCase(), found = [];
      for (let j = i - 1; j >= Math.max(0, i - 60) && found.length < 2; j--) {
        if (!/^\s*\/\//.test(lines[j]) || /^\s*\/\//.test(lines[j + 1] ?? "")) continue;
        const d = block(j); if (d.join(" ").toLowerCase().includes(name)) found.unshift(d);
        j -= d.length - 1;
      }
      doc = found.flat();
    }
    if (c) { out.push({ name: c[1], sig: "(a value)", doc }); continue; }
    // the parameters: from the "(" to its matching ")", over as many lines as it takes
    let text = lines.slice(i, i + 40).map(l => l.replace(/(^|\s)\/\/\s?(.*)$/, " /* $2 */")).join("\n"), start = text.indexOf("(", text.indexOf(m[1])), depth = 0, end = start;
    for (let k = start; k < text.length; k++) { const ch = text[k]; if ("([{".includes(ch)) depth++; else if (")]}".includes(ch)) { depth--; if (depth === 0) { end = k; break; } } }
    out.push({ name: m[1], sig: text.slice(start, end + 1).replace(/\s+/g, " "), doc });
  }
  return out;
}
const argv = process.argv.slice(2);
if (!argv.length) {
  for (const f of modules) console.log(`${f.replace(/\.mjs$/, "").padEnd(12)} ${head(fs.readFileSync(path.join(HERE, f), "utf8"))}`);
  console.log("\nnode api.mjs <module> [export …]: its figures, their options and defaults · --find <word>: across them all");
  process.exit(0);
}
if (argv[0] === "--find") {
  const re = new RegExp(argv[1] ?? ".", "i");
  for (const f of modules) for (const e of exportsOf(fs.readFileSync(path.join(HERE, f), "utf8")))
    if (re.test(e.name) || re.test(e.doc.join(" "))) console.log(`${f.replace(/\.mjs$/, "")}.${e.name}${e.sig === "(a value)" ? "" : e.sig.length > 140 ? e.sig.slice(0, 140) + "…)" : e.sig}${e.doc[0] ? `\n    ${e.doc[0]}` : ""}`);
  process.exit(0);
}
const file = path.join(HERE, argv[0].replace(/\.mjs$/, "") + ".mjs");
if (!fs.existsSync(file)) { console.error(`no module ${argv[0]} (node api.mjs lists them)`); process.exit(1); }
const only = argv.slice(1), src = fs.readFileSync(file, "utf8");
console.log(`${path.basename(file)} — ${head(src)}\n`);
for (const e of exportsOf(src)) {
  if (only.length && !only.includes(e.name)) continue;
  console.log(`${e.name}${e.sig}`);
  for (const d of e.doc) console.log(`  // ${d}`);
  console.log("");
}
