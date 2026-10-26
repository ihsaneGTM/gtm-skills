// THE MUSIC BED (v3.1, 2026-10-05: « ça mériterait de mettre une musique de fond, là il n'y a zéro
// musique »). A track from the shelf (plugins/video/assets/music/, its README: their licences),
// under the whole short, at the HOUSE LEVEL: 15 LU under the voice as heard (style 01's, validated
// in review: « even the louder version was not enough »; the explainer sits at 16), its momentary
// median against the voice's. On a change of scene (the teaser of a next episode) it can DROP:
// gone in 0.12 s on the cut, the new scene in its own sound.
//
//   node music.mjs plugins/video/assets/music/mixkit-hip-hop-02-738.mp3 [--start 0] [--under 15] [--drop 43.3]
//
// Hip Hop 02 (Mixkit, Lily J) is the style's bed: the validated cut plays it from 0 s (the user's pick
// on the music board, then the style's default, 2026-10-05); Convergence from 16.6 s is the house
// track of the other styles.
//
// --start: where in the track the short begins (pick it on the track's loudness: its swell on the
// hook's promise); --under: LU under the voice; --drop: the output second the bed stops; --gain
// forces the cue gain (dB) instead of measuring it. Writes assets/music.wav (48 kHz 16-bit stereo,
// as long as the short + 1 s, a 0.25 s fade in, a 1.2 s fade out) and project.json bed / bedDb /
// bedTrack / bedStart / bedUnder / bedDrop. measure.mjs reads the bed back as heard (role "bed").
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const track = argv[0];
if (!track || !fs.existsSync(track)) { console.error("usage: node music.mjs <track.mp3> [--start s] [--under 15] [--drop s] [--gain dB]"); process.exit(2); }
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const len = (P.duration ?? 60) + 1, start = parseFloat(arg("--start", "0")), under = parseFloat(arg("--under", "15"));
const drop = arg("--drop") != null ? parseFloat(arg("--drop")) : null;
const out = path.resolve("assets", "music.wav");
const af = ["afade=t=in:st=0:d=0.25"];
if (drop != null) af.push(`afade=t=out:st=${Math.max(0, drop - 0.12).toFixed(3)}:d=0.12`);
else af.push(`afade=t=out:st=${(len - 1.2).toFixed(2)}:d=1.2`);
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(start), "-stream_loop", "-1", "-i", track, "-t", String(len),
  "-af", af.join(","), "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", out], { stdio: "inherit" });
if (r.status !== 0) process.exit(1);
// the bed's momentary median (EBU R128, 400 ms), over the part that plays
function momentaryMedian(file, until) {
  const m = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-t", String(until), "-af", "ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const v = [...((m.stdout || "") + (m.stderr || "")).matchAll(/lavfi\.r128\.M=(-?[\d.]+)/g)].map(x => +x[1]).filter(x => x > -60).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}
let gain = arg("--gain") != null ? parseFloat(arg("--gain")) : null;
const med = momentaryMedian(out, drop ?? len - 1.2);
if (gain == null) {
  if (P.voiceM == null || med == null) { console.error("the voice is not calibrated (sounds.mjs --calibrate) or the bed is silent: pass --gain"); process.exit(1); }
  gain = +(P.voiceM - under - med - (P.sfxMasterDb ?? 0)).toFixed(1);
}
Object.assign(P, { bed: "music.wav", bedDb: gain, bedTrack: path.basename(track), bedStart: start, bedUnder: under, bedDrop: drop });
fs.writeFileSync("project.json", JSON.stringify(P, null, 2));
console.log(`assets/music.wav — ${len.toFixed(1)} s of ${path.basename(track)} from ${start} s${drop != null ? `, dropping at ${drop} s` : ""}`
  + ` · its momentary median ${med?.toFixed(1)} LUFS · bed gain ${gain} dB (${under} LU under the voice: check it with measure.mjs)`);
