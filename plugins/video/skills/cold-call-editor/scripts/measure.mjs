// Every sound AS HEARD, by subtraction (the engine's audio-spec.md, method 3): the mix is
// rendered with and without the sound (NO_CUES=<regex> in edl.mjs), and the difference is
// the sound exactly as the master carries it. Run from the project folder:
//
//   node measure.mjs [bed|hookbed|ring|whoosh|flash|riser|glitch|click|swoosh]
//
// What was settled on the reference call (re-measure on every cut, a quiet take moves it):
// the bed ~17 LU under the voice during the call (the user found 15 a little loud), the
// muffled intro ~18 LU under the hook's voice, the ringback ~7 LU under the programme.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const E = fileURLToPath(new URL("../../short-editor/scripts/", import.meta.url));
const { timeline } = await import(new URL("./call.mjs", import.meta.url).href);
const TL = timeline();
const run = (args, env = {}) => {
  const r = spawnSync("node", args, { env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
  return r.stdout;
};
const ff = a => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...a], { encoding: "utf8", maxBuffer: 256 << 20 }); return (r.stdout || "") + (r.stderr || ""); };
const VARIANTS = [
  ["bed", "sample:music\\.wav"], ["hookbed", "music-hook"], ["ring", "ringback"], ["whoosh", "whoosh\\.wav"],
  ["flash", "camera-flash"], ["riser", "riser"], ["glitch", "glitch"], ["click", "click"], ["swoosh", "swoosh_in|whoosh_out"],
];
const only = process.argv[2] ? VARIANTS.filter(v => v[0] === process.argv[2]) : VARIANTS;
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
const EDL = await import(new URL(`file://${process.cwd()}/edl.mjs`).href);
const cues = EDL.sfxCues();
const diff = "[1:a]volume=-1[n];[0:a][n]amix=inputs=2:normalize=0,";
for (const [name, rx] of only) {
  const f = `tmp/m_no${name}.wav`;
  if (name === "bed" || name === "hookbed") {
    const win = name === "bed" ? `atrim=start=${TL.C0.toFixed(2)},` : `atrim=end=${TL.HOOK_END.toFixed(2)},`;
    const bedI = integrated(diff + win + "ebur128[o]", ["-i", "mix.wav", "-i", f]);
    const voiceI = integrated(`[0:a]${win}ebur128[o]`, ["-i", f]);
    console.log(`${name.padEnd(8)} as heard ${bedI.toFixed(1)} LUFS · the voice without it ${voiceI.toFixed(1)} LUFS → ${(voiceI - bedI).toFixed(1)} LU under the voice`);
    continue;
  }
  const tr = momentary(diff + "ebur128[o]", ["-i", "mix.wav", "-i", f]);
  const re = new RegExp(rx);
  for (const t of cues.filter(c => re.test(c.kind)).map(c => c.t)) {
    const w = tr.filter(([x]) => x >= t - 0.3 && x <= t + 1.2).map(([, m]) => m);
    console.log(`${name.padEnd(8)} at ${t.toFixed(2)} s  top ${Math.max(...w).toFixed(1)} LUFS (momentary) → ${(median - Math.max(...w)).toFixed(1)} LU under the programme median`);
  }
}
