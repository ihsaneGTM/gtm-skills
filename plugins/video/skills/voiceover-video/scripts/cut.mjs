#!/usr/bin/env node
// The filmed parts, cut from the take: the intro (from the start to the end of the hook) and the cutbacks (a short
// real line at a change of part), each in 1920×1080, 30 fps, SDR (an HDR take is tone-mapped), AAC 48 kHz stereo,
// with the frames the film joins on.
//
//   node cut.mjs <run-dir> --intro <#sentence | #first-#last | from-to | seconds> [--cutback <#sentence | #first-#last | from-to>]…
//
// A sentence is its number in take/sentences.json (take.mjs lists them). The rule of the cuts (settled 2026-10-12/13):
//   the intro ends right after the hook's last word: min(the next word's start - 0.05 s, the word's end + 0.3 s);
//   a cutback starts 0.08 s before the user speaks and ends 0.13 s after its last word, before any new mouth movement
//   (never into the next sentence: at most the next word's start - 0.05 s). Round 10 (Ihsane): « it ends right after his
//   last word, not on the start of the next sentence ».
// Seconds given by hand are taken as they are (rounded to the frame).
// Writes real/intro.mp4, real/intro-last.png; real/cutback-<n>.mp4, real/cutback-<n>-first.png, -last.png; the same
// pictures in film/img/ (the film starts on intro-last.png and ends a cutback on cutback-<n>-first.png); run.json › cut.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { step } from "../../../motion/progress.mjs";
import { ROOT } from "../../../motion/brand.mjs";
import { framePng } from "./png.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const all = k => a.flatMap((x, i) => (x === "--" + k && a[i + 1] != null ? [a[i + 1]] : []));
const runF = path.join(RUN, "run.json"), run = JSON.parse(fs.readFileSync(runF, "utf8"));
const src = path.resolve(ROOT, run.video || "");
if (!fs.existsSync(src)) { console.error(`✗ the filmed take is not found: ${run.video}`); process.exit(2); }
const sentences = (() => { try { return JSON.parse(fs.readFileSync(path.join(RUN, "take", "sentences.json"), "utf8")); } catch { return null; } })();
const FPS = 30, frame = t => Math.round(t * FPS) / FPS, floorF = t => Math.floor(t * FPS + 1e-6) / FPS;
const sent = k => { const x = sentences?.[+k]; if (!x) throw new Error(`no sentence #${k} in take/sentences.json (take.mjs first)`); return x; };
const end = x => (x.next != null ? Math.min(x.next - 0.05, x.e + 0.3) : x.e + 0.3);

const introArg = all("intro")[0];
if (!introArg) { console.error("✗ --intro <#sentence | seconds>: where the hook ends"); process.exit(2); }
// the intro: from the start to a sentence (#n), or a span of the take (#first-#last, or from-to in seconds) when the
// video does not start at the take's start (the facecam mode cuts its face shots this way too)
const intro = (() => {
  let m;
  if ((m = /^#(\d+)-#?(\d+)$/.exec(introArg))) { const x = sent(m[1]), y = sent(m[2]); return { from: frame(Math.max(0, x.s - 0.08)), to: floorF(end(y)), text: sentences.filter(z => z.i >= x.i && z.i <= y.i).map(z => z.text).join(" ") }; }
  if ((m = /^([\d.]+)-([\d.]+)$/.exec(introArg))) return { from: frame(+m[1]), to: floorF(+m[2]) };
  if (/^#/.test(introArg)) { const x = sent(introArg.slice(1)); return { from: 0, to: floorF(end(x)), text: sentences.filter(y => y.i <= x.i).map(y => y.text).join(" ") }; }
  return { from: 0, to: floorF(+introArg) };
})();
const cutbacks = all("cutback").map(c => {
  let m;
  if ((m = /^#(\d+)(?:-#?(\d+))?$/.exec(c))) {
    const x = sent(m[1]), y = sent(m[2] ?? m[1]);
    return { from: frame(Math.max(0, x.s - 0.08)), to: frame(y.next != null ? Math.min(y.next - 0.05, y.e + 0.13) : y.e + 0.13), text: sentences.filter(z => z.i >= x.i && z.i <= y.i).map(z => z.text).join(" ") };
  }
  if ((m = /^([\d.]+)-([\d.]+)$/.exec(c))) return { from: frame(+m[1]), to: frame(+m[2]) };
  throw new Error(`--cutback ${c}: #sentence, #first-#last or from-to (seconds)`);
});

const trc = String(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_transfer", "-of", "default=nw=1:nk=1", src], { encoding: "utf8" }).stdout).trim();
let tone = "";
if (/arib-std-b67/.test(trc)) {
  // HLG → SDR BT.709 through a LUT (Homebrew's ffmpeg has no zscale): hdr-lut.mjs, copied from the short editor
  const lut = path.join(RUN, "build", "hlg2709.cube");
  fs.mkdirSync(path.dirname(lut), { recursive: true });
  if (!fs.existsSync(lut)) spawnSync(process.execPath, [path.join(HERE, "hdr-lut.mjs"), "--out", lut], { stdio: "ignore" });
  tone = `format=rgb48le,lut3d=file=${lut}:interp=tetrahedral,`;
} else if (/smpte2084/.test(trc)) console.log("⚠ a PQ (HDR10) take: cut as it is, its colours may look flat; export it in SDR or HLG and cut again");

const cutOne = (from, to, out) => {
  const n = Math.round((to - from) * FPS);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", from.toFixed(3), "-i", src, "-frames:v", String(n), "-t", (n / FPS).toFixed(3),
    "-vf", `${tone}scale=1920:1080:flags=lanczos,fps=${FPS},format=yuv420p`, "-c:v", "libx264", "-crf", "18", "-preset", "medium",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", out], { encoding: "utf8" });
  if (r.status) throw new Error(`the cut failed: ${String(r.stderr).slice(-300)}`);
};
// the frames the film joins on (until the clip is dressed: intro.mjs --render writes the dressed clip's), stripped of their
// colour chunks (png.mjs: a cICP chunk made Chrome draw them darker)
const still = (mp4, png, last) => {
  framePng(mp4, png, { last });
  const J = path.join(RUN, "build", "junctions", "1080"); fs.mkdirSync(J, { recursive: true });
  for (const d of [J, path.join(RUN, "film", "img")]) { const f = path.join(d, path.basename(png)); fs.rmSync(f, { force: true }); fs.copyFileSync(png, f); }
};
const dur = f => +String(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).stdout).trim();

try {
  step(RUN, "intro", "running", "Cutting your intro");
  const R = path.join(RUN, "real");
  fs.mkdirSync(R, { recursive: true }); fs.mkdirSync(path.join(RUN, "film", "img"), { recursive: true });
  for (const f of fs.readdirSync(R)) if (/^cutback-\d+/.test(f)) fs.rmSync(path.join(R, f));
  cutOne(intro.from, intro.to, path.join(R, "intro.mp4"));
  still(path.join(R, "intro.mp4"), path.join(R, "intro-last.png"), true);
  console.log(`intro: ${intro.from.toFixed(3)} → ${intro.to.toFixed(3)} s (${dur(path.join(R, "intro.mp4")).toFixed(3)} s)${intro.text ? `\n  « …${intro.text.split(/\s+/).slice(-14).join(" ")} »` : ""}`);
  cutbacks.forEach((c, i) => {
    const n = i + 1, f = path.join(R, `cutback-${n}.mp4`);
    cutOne(c.from, c.to, f);
    still(f, path.join(R, `cutback-${n}-first.png`), false);
    still(f, path.join(R, `cutback-${n}-last.png`), true);
    console.log(`cutback ${n}: ${c.from.toFixed(3)} → ${c.to.toFixed(3)} s (${dur(f).toFixed(3)} s)${c.text ? `  « ${c.text} »` : ""}`);
  });
  // the intro's speed (intro.mjs --speed) is kept through a new cut
  if (run.cut?.intro?.speed) intro.speed = run.cut.intro.speed;
  run.cut = { intro, cutbacks: cutbacks.map((c, i) => ({ ...c, clip: `real/cutback-${i + 1}.mp4` })), tone: tone ? "HLG → SDR (LUT)" : null };
  fs.writeFileSync(runF, JSON.stringify(run, null, 2) + "\n");
  step(RUN, "intro", "done", `Intro ${intro.to.toFixed(1)} s${cutbacks.length ? `, ${cutbacks.length} cutback${cutbacks.length > 1 ? "s" : ""}` : ""}`);
  console.log("→ look at real/intro-last.png and each cutback's first frame: the film joins on them");
} catch (e) {
  step(RUN, "intro", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
