#!/usr/bin/env node
// HOW LOUD EACH SOUND IS AS HEARD, against the voice: what every edit measured by hand
// (audio-spec.md, "by subtraction"), one command. From the project, after build.sh:
//
//   node measure.mjs              every family of sound in the edit
//   node measure.mjs bed click    some of them
//
// By subtraction on the EFFECTS BUS, before the loudness pass (the scrapbook's method): the bus
// rendered without one family (sfx.mjs with NO_CUES) is taken from the full bus, which leaves that
// family exactly (the bus is a plain sum); its momentary loudness (EBU R128, 400 ms) is read
// against the voice's momentary median, on the same scale. Both then take the same programme gain,
// so "LU under the voice" is what the master plays. (Two finished mixes are not subtracted: the
// dynamic loudnorm does not give them the same gain curve, and what is left of the voice, 21-24 LU
// under the programme, would hide a click.)
//
// A cue's figure is its loudest 400 ms around it; the bed's, its median where it sounds. The aims
// are the vertical short's, measured this way on its validated cut (pipecorn-sales-calls,
// 2026-10-05): ✓ within 2 LU of the aim, ⚠ further. sfx.wav and sfx.json are put back after.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAMILIES = [
  ["bed", "sample:music\\.wav"],
  ["flash", "camera-flash"], ["whoosh", "sfx-top5/whoosh\\.wav"], ["click", "sfx-top5/click"],
  ["glitch", "sfx-top5/glitch"], ["riser", "sfx-top5/riser"],
  ["swoosh", "^(swoosh_in|whoosh_out|swoosh_out)$"],
  ["paper", "^(sheet_in|ptick|felt|tear|mallet|sheet_out)"],
  ["light", "motionix/"],
];
// LU under the voice, measured this way on the validated cut of style 01
const AIM = { click: 25.3, whoosh: 18.6, glitch: 21.9, flash: 18.5, riser: 19.9 };

const ff = args => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
function momentary(file) {
  const r = ff(["-i", file, "-af", "ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M", "-f", "null", "-"]);
  const out = [], txt = (r.stdout || "") + (r.stderr || "");
  let t = null;
  for (const line of txt.split("\n")) {
    const mt = line.match(/pts_time:([\d.]+)/); if (mt) t = +mt[1];
    const mv = line.match(/lavfi\.r128\.M=(-?[\d.]+|-inf)/); if (mv && t != null) out.push([t, mv[1].includes("inf") ? -120 : +mv[1]]);
  }
  return out;
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

for (const f of ["voice.wav", "sfx.wav", "sfx.json", "edl.mjs", "project.json"]) if (!fs.existsSync(f)) { console.error(`${f} missing: run build.sh first`); process.exit(1); }
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const cues = JSON.parse(fs.readFileSync("sfx.json", "utf8"));
const want = process.argv.slice(2);
const fams = FAMILIES.filter(([name, rx]) => (!want.length || want.includes(name)) && cues.some(c => new RegExp(rx).test(c.kind)));
const known = FAMILIES.map(([, rx]) => new RegExp(rx));
const other = [...new Set(cues.map(c => c.kind).filter(k => !known.some(r => r.test(k))))];
const vmed = median(momentary("voice.wav").filter(([, x]) => x > -50).map(([, x]) => x));
console.log(`voice: momentary median ${vmed.toFixed(1)} LUFS (before the loudness pass)\n`);
console.log("family     cues   LU under the voice (median · min-max)   aim");
fs.copyFileSync("sfx.wav", ".measure.sfx.wav"); fs.copyFileSync("sfx.json", ".measure.sfx.json");
let off = 0;
try {
  for (const [name, rx] of fams) {
    const mine = cues.filter(c => new RegExp(rx).test(c.kind));
    const r = spawnSync("node", [path.join(HERE, "sfx.mjs")], { env: { ...process.env, NO_CUES: rx }, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`sfx.mjs failed: ${r.stderr}`);
    fs.renameSync("sfx.wav", ".measure.no.wav");
    fs.copyFileSync(".measure.sfx.wav", "sfx.wav");
    ff(["-y", "-i", ".measure.sfx.wav", "-i", ".measure.no.wav", "-filter_complex", "[1:a]volume=-1[n];[0:a][n]amix=inputs=2:normalize=0", "-c:a", "pcm_s16le", ".measure.diff.wav"]);
    const m = momentary(".measure.diff.wav");
    let u;
    if (name === "bed") u = [vmed - median(m.map(([, x]) => x).filter(x => x > -60))];
    else u = mine.map(c => vmed - Math.max(-120, ...m.filter(([t]) => t >= c.t - 0.05 && t <= c.t + 0.75).map(([, x]) => x))).sort((a, b) => a - b);
    const med = median(u), aim = name === "bed" ? (P.bedUnder ?? 15) : AIM[name];
    const mark = aim == null ? " " : Math.abs(med - aim) <= 2 ? "✓" : "⚠";
    if (mark === "⚠") off++;
    console.log(`${mark} ${name.padEnd(8)} ${String(mine.length).padStart(3)}    ${med.toFixed(1).padStart(5)} LU  (${u[0].toFixed(1)} … ${u.at(-1).toFixed(1)})`.padEnd(58) + (aim != null ? `${aim.toFixed(1)} LU${mark === "⚠" ? (med < aim ? "  (too loud)" : "  (too quiet)") : ""}` : ""));
  }
} finally {
  fs.renameSync(".measure.sfx.wav", "sfx.wav"); fs.renameSync(".measure.sfx.json", "sfx.json");
  for (const f of [".measure.no.wav", ".measure.diff.wav"]) fs.rmSync(f, { force: true });
}
if (other.length) console.log(`\nnot measured (no family): ${other.slice(0, 8).join(", ")}${other.length > 8 ? "…" : ""}`);
console.log(off ? `\n⚠ ${off} family(ies) more than 2 LU from the aim: their gain in edl.mjs (or bedDb), then build.sh --audio-only` : "\n✓ every family with an aim within 2 LU of it");
