#!/usr/bin/env node
// Every sound AS HEARD, by subtraction (the engine's audio-spec.md): the mix is rendered with
// and without the sound (NO_CUES=<regex> in edl.mjs), and the difference is the sound exactly
// as the master carries it. Run from the project folder, after build.sh:
//
//   node measure.mjs [bed|whoosh|swoosh|click|glitch|riser|flash|pop|swish|ui|shutter|data|typing|fine]
//
// What this style aims at (re-measure on every take, a quiet recording moves it): the bed
// about 16 LU under the voice (between the vertical short's 15 and the call's 17), the house
// pack's whooshes, flash, glitch and riser 9-11 LU under the programme, the light sounds of the
// Motionix pack well under them (15-20 LU: heard, never in the way).
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const E = fileURLToPath(new URL("../../short-editor/scripts/", import.meta.url));
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
fs.mkdirSync("tmp", { recursive: true });
const run = (args, env = {}) => {
  const r = spawnSync("node", args, { env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
  return r.stdout;
};
const ff = a => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...a], { encoding: "utf8", maxBuffer: 256 << 20 }); return (r.stdout || "") + (r.stderr || ""); };
const VARIANTS = [
  ["bed", "sample:music\\.wav"], ["whoosh", "sfx-top5/whoosh\\.wav"], ["swoosh", "swoosh_in|swoosh_out|whoosh_out"], ["click", "sfx-top5/click"],
  ["glitch", "sfx-top5/glitch"], ["riser", "sfx-top5/riser"], ["flash", "sfx-top5/camera-flash"],
  // the light ones (the Motionix pack), by family
  ["pop", "sfx-motionix/(normal-pop|premium-pop|slow-pop|media-pop|smooth-pop|sweet-ui-open)"],
  ["swish", "sfx-motionix/[a-z0-9-]*whoosh"],
  ["ui", "sfx-motionix/(ui-(?!typing)|high-click|thump-click|mouse-click)"],
  ["shutter", "sfx-motionix/[a-z-]*camera-shutter"],
  ["data", "sfx-motionix/(data-collect|cinematic-data|[a-z-]*gear|[a-z-]*money)"],
  ["typing", "sfx-motionix/ui-typing"],
];
// the ui family role by role (node measure.mjs fine, or one of them by name)
const FINE = [
  ["select", "sfx-motionix/(ui-select|ui-glitch-click)"], ["confirm", "sfx-motionix/ui-enter"], ["deny", "sfx-motionix/ui-backspace"],
  ["thump", "sfx-motionix/thump-click"], ["stretch", "sfx-motionix/(ui-stretch|ui-digital-click\\.wav)"], ["ping", "sfx-motionix/ui-digital-click-1"],
  ["flicker", "sfx-motionix/ui-glitch-flicker"], ["tick", "sfx-motionix/(ui-digital-click-4|ui-key|high-click)"], ["button", "sfx-motionix/ui-button"],
];
const arg = process.argv[2];
const only = arg === "fine" ? FINE : arg ? [...VARIANTS, ...FINE].filter(v => v[0] === arg) : VARIANTS;
for (const [name, rx] of only) {
  run([E + "sfx.mjs"], { NO_CUES: rx });
  run([E + "mix.mjs", "--out", `tmp/m_no${name}.wav`]);
}
run([E + "sfx.mjs"]);                                       // back to the full mix, what build.sh ships
console.log(run([E + "mix.mjs"]).trim());

const momentary = (graph, inputs) => {
  const out = ff(["-v", "verbose", ...inputs, "-filter_complex", graph, "-map", "[o]", "-f", "null", "-"]);
  return [...out.matchAll(/t:\s*([\d.]+)\s+TARGET:[^M]*M:\s*(-?[\d.]+)/g)].map(m => [parseFloat(m[1]), parseFloat(m[2])]);
};
const integrated = (graph, inputs) => {
  const out = ff([...inputs, "-filter_complex", graph, "-map", "[o]", "-f", "null", "-"]);
  const x = (out.split("Summary:").pop() || "").match(/^\s*I:\s*(-?[\d.]+)/m);
  return x ? parseFloat(x[1]) : NaN;
};
const prog = momentary("[0:a]ebur128=metadata=0[o]", ["-i", "mix.wav"]).map(([, m]) => m).filter(m => m > -70).sort((a, b) => a - b);
const median = prog[prog.length >> 1];
console.log(`\nprogramme  I ${integrated("[0:a]ebur128[o]", ["-i", "mix.wav"]).toFixed(1)} LUFS · momentary median ${median.toFixed(1)} LUFS`);
const EDL = await import(pathToFileURL(`${process.cwd()}/edl.mjs`).href);
const cues = EDL.sfxCues();
const diff = "[1:a]volume=-1[n];[0:a][n]amix=inputs=2:normalize=0,";
for (const [name, rx] of only) {
  const f = `tmp/m_no${name}.wav`;
  if (name === "bed") {
    // the bed against the voice, over the stretch before the first music drop (or all of it)
    const drop = (P.musicDrops ?? [])[0];
    const win = drop && drop[0] > 8 ? `atrim=end=${drop[0].toFixed(2)},` : "";
    const bedI = integrated(diff + win + "ebur128[o]", ["-i", "mix.wav", "-i", f]);
    const voiceI = integrated(`[0:a]${win}ebur128[o]`, ["-i", f]);
    console.log(`bed      as heard ${bedI.toFixed(1)} LUFS · the voice without it ${voiceI.toFixed(1)} LUFS → ${(voiceI - bedI).toFixed(1)} LU under the voice`);
    continue;
  }
  const tr = momentary(diff + "ebur128[o]", ["-i", "mix.wav", "-i", f]);
  const re = new RegExp(rx);
  const tops = [];
  for (const t of cues.filter(c => re.test(c.kind)).map(c => c.t)) {
    const w = tr.filter(([x]) => x >= t - 0.3 && x <= t + 0.9).map(([, m]) => m);
    if (w.length) tops.push(Math.max(...w));
  }
  if (!tops.length) { console.log(`${name.padEnd(8)} no cue`); continue; }
  const s = tops.sort((a, b) => a - b);
  console.log(`${name.padEnd(8)} ${s.length} cue(s) · top ${s.at(-1).toFixed(1)} LUFS momentary → ${(median - s.at(-1)).toFixed(1)} to ${(median - s[0]).toFixed(1)} LU under the programme median`);
}
