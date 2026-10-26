// The QC pass. Run it before showing a reviewer anything.
//
//   node verify.mjs
//
// The tool cannot watch the video or listen to it. Every claim made about a cut
// has to come from a measurement, and this is where they come from. Exit code is
// non-zero if a hard check fails, so build scripts can gate on it.
//
// Zero dependencies on purpose: ffmpeg already carries every measurement this
// needs (ebur128, astats, silencedetect, alphaextract), so the skill does not
// make anyone install numpy to find out whether a render is straight.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const CWD = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const OUT = P.out;
const fail = [], warn = [];
const has = f => fs.existsSync(path.resolve(CWD, f));

if (!fs.existsSync(OUT)) { console.error(`${OUT} does not exist; run build.sh first`); process.exit(1); }

// ffmpeg reports to stderr; both streams have to come back
const ff = a => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...a], { encoding: "utf8", maxBuffer: 64 << 20 }); return (r.stdout || "") + (r.stderr || ""); };
const probe = a => spawnSync("ffprobe", ["-v", "error", ...a], { encoding: "utf8", maxBuffer: 16 << 20 }).stdout;
const num = (s, re) => { const m = s.match(re); return m ? parseFloat(m[1]) : NaN; };

// --- container ----------------------------------------------------------------
const info = JSON.parse(probe(["-select_streams", "v:0", "-show_entries",
  "stream=width,height,r_frame_rate,nb_frames", "-show_entries", "format=duration", "-of", "json", OUT]));
const st = info.streams[0], w = st.width, h = st.height;
const [fn, fd] = st.r_frame_rate.split("/").map(Number);
const fps = fn / (fd || 1), frames = +st.nb_frames || 0, dur = +info.format.duration;
console.log(`container   ${w}x${h} · ${fps} fps · ${frames} frames · ${dur.toFixed(3)} s`);
if (w !== (P.width ?? 1080) || h !== (P.height ?? 1920)) fail.push(`format ${w}x${h} instead of ${P.width ?? 1080}x${P.height ?? 1920}`);
if (Math.abs(dur - P.duration) > 1.0) fail.push(`duration ${dur.toFixed(3)} s instead of ${P.duration} s`);

// --- the encoded audio is the mix we produced ---------------------------------
// Subtract the two and look at what is left. Calibrated on a real render:
// aligned leaves the residual 15.5 dB BELOW the signal; a 5 ms drift puts it
// 3.6 dB ABOVE. There is no ambiguous middle, so a 10 dB margin is safe.
if (has("mix.wav")) {
  const sig = num(ff(["-i", "mix.wav", "-af", "aformat=channel_layouts=mono,astats", "-f", "null", "-"]), /RMS level dB:\s*(-?[\d.]+)/);
  const res = num(ff(["-i", OUT, "-i", "mix.wav", "-filter_complex",
    "[0:a]aresample=48000,aformat=channel_layouts=mono[a];[1:a]aresample=48000,aformat=channel_layouts=mono[b];" +
    "[a][b]amerge=inputs=2,pan=mono|c0=c0-c1,astats", "-f", "null", "-"]), /RMS level dB:\s*(-?[\d.]+)/);
  const margin = sig - res;
  console.log(`encoding    residual ${margin.toFixed(1)} dB below the mix`);
  if (!(margin > 10)) fail.push(`the file does not match mix.wav (margin ${margin.toFixed(1)} dB, expected > 10): drift or wrong track`);
} else warn.push("mix.wav missing; cannot check the encode is faithful");

// --- every sound cue produced audible energy ----------------------------------
let cues = null;
try {
  const r = spawnSync("node", ["-e",
    "import('node:path').then(async ({default:p})=>{const {pathToFileURL}=await import('node:url');" +
    "const E=await import(pathToFileURL(p.resolve('edl.mjs')).href);console.log(JSON.stringify(E.sfxCues()))})"],
    { encoding: "utf8", cwd: CWD });
  cues = JSON.parse(r.stdout.trim().split("\n").pop());
} catch { warn.push("could not read sfxCues() from edl.mjs"); }

if (cues && has("sfx.json")) {
  // sfx.mjs records the peak it actually rendered for each cue — exact, and it
  // does not mistake a slow attack for a missing sound.
  const man = JSON.parse(fs.readFileSync(path.resolve(CWD, "sfx.json"), "utf8"));
  const silent = man.filter(c => !(c.peak > 0));
  const missing = cues.filter(c => !man.some(m => Math.abs(m.t - c.t) < 1e-6 && m.kind === c.kind));
  console.log(`effects     ${cues.length} cues · ${man.length - silent.length} audible in the bed`);
  if (silent.length) fail.push(`${silent.length} cue(s) with no audio: ${silent.slice(0, 6).map(c => `${c.t}s ${c.kind}`).join(", ")}`);
  if (missing.length) fail.push(`${missing.length} EDL cue(s) missing from the bed; re-run sfx.mjs`);
  const late = cues.filter(c => c.t > P.duration);
  if (late.length) warn.push(`${late.length} cue(s) after the end of the video`);
} else if (cues && cues.length) {
  warn.push("sfx.json missing; re-run sfx.mjs so the effect bed can be checked");
}

// --- loudness + clipping --------------------------------------------------------
const sum = (ff(["-i", OUT, "-af", "ebur128=peak=true", "-f", "null", "-"]).split("Summary:").pop()) || "";
const g = k => num(sum, new RegExp(`^\\s*${k}:\\s*(-?[\\d.]+)`, "m"));
const [I, LRA, TP] = [g("I"), g("LRA"), g("Peak")];
const stats = ff(["-i", OUT, "-af", "astats=metadata=1", "-f", "null", "-"]);
const flat = num(stats, /Flat factor:\s*([\d.]+)/);
console.log(`loudness    ${I.toFixed(1)} LUFS · LRA ${LRA.toFixed(1)} LU · true peak ${TP.toFixed(1)} dBTP`);
const tgt = P.lufs ?? -14, ceil = P.ceilingDbtp ?? -1.0;
if (Math.abs(I - tgt) > 1.0) warn.push(`${I.toFixed(1)} LUFS, target ${tgt}`);
if (TP > ceil + 0.3) fail.push(`true peak ${TP.toFixed(1)} dBTP above the ceiling ${ceil}`);
if (Number.isFinite(flat) && flat > 1) warn.push(`flat factor ${flat.toFixed(1)}: a sign of clipping`);

// --- blur windows and the overlay ----------------------------------------------
let D = null;
try {
  const r = spawnSync("node", ["-e", `
import('node:path').then(async ({default: p}) => {
  const {pathToFileURL} = await import('node:url');
  const E = await import(pathToFileURL(p.resolve('edl.mjs')).href);
  const PL = await import(pathToFileURL(p.resolve('plan.mjs')).href);
  console.log(JSON.stringify({
    blur: E.BLUR_WINDOWS || [],
    floating: (PL.BEATS || []).map(b => [b.id, b.from, b.to]),
    opaque: [
      ...(E.MAC ? [['macos', E.MAC.wake, E.MAC.pushTo]] : []),
      ...((E.MAP && E.MAP.acts) || []).map((a, i) => ['map' + i, a.in, a.outEnd]),
    ],
  }));
});`], { encoding: "utf8", cwd: CWD });
  D = JSON.parse(r.stdout.trim().split("\n").pop());
} catch { warn.push("could not read edl.mjs / plan.mjs to check the blur"); }

if (D) {
  const drawn = [...D.floating, ...D.opaque];
  // blurBand 0 = a project with no progressive-blur band at all (a landscape
  // talking head draws its own soft dim behind each block) — nothing to check
  const NO_BLUR_BAND = (P.blurBand ?? 700) === 0;
  if (!NO_BLUR_BAND) for (const [id, bf, bt] of D.floating)
    if (!D.blur.some(([a, b]) => a <= bf + 0.3 && b >= bt - 0.3))
      warn.push(`floating beat ${id} (${bf}-${bt}s) has no blur behind it`);
  for (const [a, b] of D.blur)
    // the house rule: no blur over a stretch with nothing on it
    if (!drawn.some(([, bf, bt]) => bf < b && bt > a))
      fail.push(`blur window ${a}-${b}s with no graphic at all: blur over nothing`);
  console.log(`blur        ${D.blur.length} window(s) · ${D.floating.length} floating beat(s), ${D.opaque.length} opaque`);

  const covered = t => drawn.some(([, bf, bt]) => bf - 0.2 <= t && t <= bt + 0.2);
  const holes = [];
  for (let t = 0.5; t < P.duration; t += 2) if (!covered(t)) holes.push(+t.toFixed(1));
  const probes = holes.filter((_, i) => i % Math.max(1, Math.floor(holes.length / 5)) === 0).slice(0, 5);
  const bad = [];
  for (const x of probes) {
    spawnSync("node", [path.join(HERE, "render.mjs"), "--png", String(x)], { cwd: CWD });
    const f = path.resolve(CWD, `frame_${x}.png`);
    if (!fs.existsSync(f)) continue;
    // subtitles are legitimately drawn low in frame — only the graphics band counts
    // (the blur band on a short; the top 82 % of the frame on a landscape project)
    const band = (P.blurBand ?? 700) > 0 ? (P.blurBand ?? 700) : Math.round((P.height ?? 1920) * 0.82);
    const y = probe(["-f", "lavfi", "-i",
      `movie=${path.basename(f)},crop=${P.width ?? 1080}:${band}:0:0,alphaextract,signalstats`,
      "-show_entries", "frame_tags=lavfi.signalstats.YMAX", "-of", "csv=p=0", "-read_intervals", "%+#1"]);
    if (parseFloat(y) > 2) bad.push(x);
    fs.unlinkSync(f);
  }
  console.log(`overlay     empty on ${probes.length - bad.length}/${probes.length} probes outside beats${bad.length ? `  ⚠ ${bad}` : ""}`);
  if (bad.length) warn.push(`graphics linger outside beats at ${bad}`);
}

// --- the PICTURE is on the timeline, not only the sound ------------------------
// The audio check above cannot see a picture that drifted: the voice is mix.wav,
// laid in by timestamp. On the GTM OS short (2026-09-29) the camera came out ten
// frames AHEAD of the layers from 3.92 s on — the speaker's lips 167 ms before the voice —
// and every check here passed. The source's own hard cuts are the anchor: each one
// has an exact output frame (through `cuts` and `speed`), and the render must cut
// THERE. A cut that a full-frame plate hides is not found, which is a warning; a cut
// found at the wrong frame is a failure.
{
  const { srcToOut, outToSrc } = await import(pathToFileURL(path.join(HERE, "cuts.mjs")).href);
  const end = P.editEnd ?? P.duration;
  const sceneAt = (file, from, len, thr, pre = "") => {
    const out = ff(["-ss", String(Math.max(0, from)), "-t", String(len), "-i", file, "-an", "-vf",
      `scale=160:-2,${pre}select='gt(scene,${thr})',showinfo`, "-f", "null", "-"]);
    return [...out.matchAll(/pts_time:([\d.]+)/g)].map(m => Math.max(0, from) + parseFloat(m[1]));
  };
  const nearest = (found, t) => found.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
  const srcCuts = sceneAt(P.source, 0, outToSrc(end, P), 0.30);
  const expected = srcCuts.map(s => ({ s, t: srcToOut(s, P) })).filter(c => c.t > 0.1 && c.t < end - 0.1);
  const off = [], hidden = [];
  let flashed = 0;
  for (const c of expected) {
    let found = sceneAt(OUT, c.t - 0.30, 0.60, 0.15);
    let near = found.length ? nearest(found, c.t) : null;
    let d = near == null ? null : Math.round((near - c.t) * fps);
    // A FLASH on the cut (titles.mjs flash, v5 of the GTM OS short) blows the frames
    // around it out to white, and the plain detector finds the flash's own ramp — two
    // frames early — instead of the cut hidden under it. A flash is a blend toward
    // white, which a per-frame black/white-point normalisation undoes: the cut is looked
    // for again on those frames, and only counts if it lands within a frame.
    if (d == null || Math.abs(d) > 1) {
      const f2 = sceneAt(OUT, c.t - 0.30, 0.60, 0.15, "normalize=smoothing=0,");
      const n2 = f2.length ? nearest(f2, c.t) : null;
      if (n2 != null && Math.abs(Math.round((n2 - c.t) * fps)) <= 1) { near = n2; d = Math.round((n2 - c.t) * fps); flashed++; }
    }
    if (near == null) { hidden.push(c.t.toFixed(2)); continue; }
    if (Math.abs(d) > 1) off.push(`${c.t.toFixed(3)} s → found at ${near.toFixed(3)} s (${d > 0 ? "+" : ""}${d} frames)`);
  }
  console.log(`picture     ${expected.length} source cut(s) · ${expected.length - off.length - hidden.length} on the right frame` +
    (hidden.length ? ` · ${hidden.length} under a full-frame plate` : "") + (flashed ? ` · ${flashed} found under a flash` : ""));
  if (off.length) fail.push(`the picture drifted from the soundtrack: ${off.join("; ")}`);
  if (hidden.length) warn.push(`source cut(s) not found at ${hidden.join(", ")} s; hidden by a full-frame plate? check by eye`);
}

console.log();
for (const x of warn) console.log(`  ⚠ ${x}`);
for (const x of fail) console.log(`  ✗ ${x}`);
if (!fail.length && !warn.length) console.log("  ✓ everything conforms");
process.exit(fail.length ? 1 : 0);
