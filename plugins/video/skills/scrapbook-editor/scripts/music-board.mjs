// THE MUSIC BOARD — the same excerpt of the finished short with each track asked for, every bed at
// the same level under the voice, one after the other, each named on screen: the user listens and
// picks (2026-10-05: « prépare l'extrait avec les autres morceaux pour comparer » → Hip Hop 02).
//
//   node music-board.mjs --to 12 mixkit-hip-hop-02-738.mp3@0 convergence.mp3@16.6 …   # from the project
//
// A track is a file of plugins/video/assets/music/ (or a path), `@start` where the short begins in
// it (put its swell on the hook's promise: look at its short-term loudness). Each bed goes 15 LU under
// the voice (--under), drops where the project's does; `build.sh --audio-only` remuxes the short,
// the excerpt [0, --to] is cut with its name written low. Writes workspace/videos/<out>-musique.mp4
// (variants/ keeps each one) and puts the project's own bed back (project.json bedTrack…) at the end.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, "../../short-editor/scripts");
const SHELF = path.resolve(HERE, "../../../assets/music");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const to = parseFloat(opt("--to", "12")), under = opt("--under", "15");
const tracks = argv.filter((a, i) => !a.startsWith("--") && !["--to", "--under"].includes(argv[i - 1]));
if (!tracks.length) { console.error("usage: node music-board.mjs [--to 12] <track>[@start] …"); process.exit(2); }
const P0 = JSON.parse(fs.readFileSync("project.json", "utf8"));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] }); if (r.status !== 0) throw new Error(`${path.basename(cmd)} failed`); };
const bed = (file, start) => run("node", [path.join(HERE, "music.mjs"), file, "--start", String(start), "--under", under, ...(P0.bedDrop != null ? ["--drop", String(P0.bedDrop)] : [])]);
const { createCanvas, setFont, roundRect } = await import(path.join(HERE, "book.mjs"));
fs.mkdirSync("variants", { recursive: true });
const parts = [];
tracks.forEach((t, i) => {
  const [name, start = "0"] = t.split("@");
  const file = fs.existsSync(name) ? name : path.join(SHELF, name);
  bed(file, start);
  run(path.join(ENGINE, "build.sh"), ["--audio-only"]);
  // its name, low, on a dark pill (this ffmpeg may have no drawtext)
  const c = createCanvas(P0.width, P0.height), x = c.getContext("2d"), px = Math.round(P0.width * 0.0375);
  const text = `Musique ${i + 1}/${tracks.length} · ${path.basename(file).replace(/\.\w+$/, "").replace(/^mixkit-|-\d+$/g, "")}`;
  setFont(x, "caption", px);
  const w = x.measureText(text).width, ph = px + 26, X = (P0.width - w - 40) / 2, Y = P0.height * 0.88;
  x.fillStyle = "rgba(0,0,0,.66)"; roundRect(x, X, Y, w + 40, ph, ph / 2); x.fill();
  x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(text, X + 20, Y + ph / 2 + 1);
  fs.writeFileSync(`variants/label-${i + 1}.png`, c.toBuffer("image/png"));
  run("ffmpeg", ["-v", "error", "-y", "-i", P0.out, "-i", `variants/label-${i + 1}.png`, "-t", String(to),
    "-filter_complex", "[0:v][1:v]overlay=0:0,format=yuv420p[v]", "-map", "[v]", "-map", "0:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", `variants/board-${i + 1}.mp4`]);
  parts.push(`file 'board-${i + 1}.mp4'`);
  console.log(`  ${i + 1}. ${path.basename(file)} from ${start} s`);
});
fs.writeFileSync("variants/board.txt", parts.join("\n") + "\n");
const out = path.join(path.dirname(P0.out), `${path.basename(P0.out, ".mp4")}-musique.mp4`);
run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "variants/board.txt", "-c", "copy", "-movflags", "+faststart", out]);
// the project's own bed back
if (P0.bedTrack) { bed(path.join(SHELF, P0.bedTrack), P0.bedStart ?? 0); run(path.join(ENGINE, "build.sh"), ["--audio-only"]); }
console.log(`${out} — ${tracks.length} tracks × ${to} s, each ${under} LU under the voice; the short has its own bed back (${P0.bedTrack ?? "none"})`);
