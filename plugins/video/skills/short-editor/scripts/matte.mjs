// The person matte for the edited stretch, ready for build.sh to composite.
//
//   node matte.mjs              # from the working directory
//   node matte.mjs --force      # redo it even if matte/ is already populated
//
// Three steps, and the order is the whole trick:
//   1. extract the frames of [0, editEnd] with the SPEED applied but NOT the
//      camera, so the masks land 1:1 on the output frames and build.sh can put
//      them through the same zoompan as the picture;
//   2. Apple Vision person segmentation (native/matte, Neural Engine), several
//      processes at once: about a minute for a minute of video at 30 fps on an
//      M2 Pro (it was five, one process and the refinement in ffmpeg);
//   3. a morphological CLOSING, then a small dilation and a feather, on the GPU
//      in the same processes (native/matte --refine).
//
// Step 3 is not cosmetic. The raw mask cuts into the shadow between a sleeve
// and a forearm — visible to a reviewer in one pass — and that gap is a
// concavity, not an outer edge, so dilation alone cannot fill it. dilation x8 → erosion x8 bridges it without
// growing the silhouette, then dilation x3 + a 1.8 px blur put the boundary a
// hair OUTSIDE the person, which is the right error: two pixels of wall behind
// the speaker is invisible, two pixels of the speaker missing is a hole.
//
// Every matte/ carries what it was made for (matte/.stamp.json: the source, the size, the
// fps, the speed, the cuts): a matte made for another speed or other cuts is made again,
// never reused (its masks would land on the wrong frames). And when GTM by Pipecorn already
// made it, from the start of the edit while Claude reads and writes (prep.mjs, in .prep/matte),
// it is taken from there in a second, or waited for if it is still being made.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { cutsOf, videoGraph } from "./cuts.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(HERE, "native", "matte");
const SWIFT = path.join(HERE, "native", "matte.swift");
const count = d => { try { return fs.readdirSync(d).filter(f => /^m\d{5}\.png$/.test(f)).length; } catch { return 0; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

// what a matte is made for: the same stamp, the same masks
export function stampOf(P) {
  const src = fs.realpathSync(P.source), st = fs.statSync(src);
  const FPS = P.fps ?? 30, END = P.editEnd ?? P.duration;
  return { source: src, size: st.size, mtimeMs: Math.round(st.mtimeMs), width: P.width ?? 1080, height: P.height ?? 1920,
    fps: FPS, speed: P.speed ?? 1, cuts: JSON.stringify(cutsOf(P)), frames: Math.round(END * FPS) };
}
// a matte made for `have` serves `want` when everything matches and it has enough frames
export const serves = (have, want) => !!have && ["source", "size", "mtimeMs", "width", "height", "fps", "speed", "cuts"]
  .every(k => have[k] === want[k]) && have.frames >= want.frames;
const readStamp = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, ".stamp.json"), "utf8")); } catch { return null; } };

// The masks of P's edited stretch into `out` (m00001.png…), through `raw` (scratch, removed after).
export async function segment(P, out, raw, log = console.log) {
  const W = P.width ?? 1080, H = P.height ?? 1920, FPS = P.fps ?? 30, SPEED = P.speed ?? 1;
  const N = Math.round((P.editEnd ?? P.duration) * FPS);
  const run = (cmd, args, label) => {
    const r = spawnSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`${label} failed (code ${r.status})`);
  };
  // --- 0. the Vision tool, built on demand -------------------------------------
  // native/matte.swift is committed, the BINARY is not: it is a Mach-O for one
  // architecture and regenerable in two seconds. Built here so a fresh clone works
  // without anyone being told to run an install — the same rule as bootstrap.mjs.
  if (!fs.existsSync(BIN) || fs.statSync(BIN).mtimeMs < fs.statSync(SWIFT).mtimeMs) {
    log("0/3 compiling the Vision tool (once per machine)…");
    const tmp = `${BIN}.${process.pid}`;   // two edits compiling at once never run a half-written binary
    const r = spawnSync("swiftc", ["-O", "-o", tmp, SWIFT], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error("compilation failed; the Xcode command line tools are required (xcode-select --install)");
    fs.renameSync(tmp, BIN);
  }

  // --- 1. the frames, retimed, at the output size, WITHOUT the camera ----------
  fs.rmSync(raw, { recursive: true, force: true });
  fs.mkdirSync(raw, { recursive: true });
  const pre = SPEED !== 1 ? `setpts=PTS/${SPEED},fps=${FPS},` : "";
  log(`1/3 extracting ${N} frames (${W}x${H}, speed ${SPEED}x)…`);
  // the project's `cuts` (source stretches removed, see cuts.mjs) apply here too, so
  // mask N is the mask of the frame build.sh will show as output frame N
  const vcut = cutsOf(P).length ? videoGraph(P, "0:v", "vsrc") : "";
  run("ffmpeg", ["-v", "error", "-y", "-i", P.source,
    "-filter_complex", `${vcut}${vcut ? "[vsrc]" : "[0:v]"}${pre}scale=${W}:${H}:flags=lanczos[out]`, "-map", "[out]",
    "-frames:v", String(N), "-q:v", "3", path.join(raw, "f%05d.jpg")], "extraction");

  // --- 2. Vision, then the closing + feather, on the GPU, several at once ---------
  // One process leaves the Neural Engine idle while it decodes a frame and encodes a mask, so
  // several run side by side on interleaved frames: measured on an M2 Pro (2026-10-08), 300
  // frames in 33.8 s with one, 11.8 s with three, 8.9 s with six. Each holds ~620 MB, so as
  // many as the memory allows (a third of it), from 2 to 6. The closing and the feather run in
  // the same process on the GPU (`--refine`): the 19 ffmpeg passes they replace took 91 s for
  // 50 s of video, and the masks they write are the same (matte.swift says how close).
  const files = fs.readdirSync(raw).filter(f => f.endsWith(".jpg")).sort();
  const masks = path.join(raw, "m");
  fs.mkdirSync(masks, { recursive: true });
  const workers = Math.max(2, Math.min(6, Math.floor(os.totalmem() / 3e9), os.availableParallelism() - 2));
  log(`2/3 segmenting ${files.length} frames (${workers} at a time)…`);
  const t2 = Date.now();
  const lists = Array.from({ length: workers }, (_, k) => {
    const l = path.join(raw, `list${k}.txt`);
    fs.writeFileSync(l, files.filter((_, i) => i % workers === k).map(f => path.join(raw, f)).join("\n"));
    return l;
  });
  const tick = setInterval(() => {
    const n = fs.readdirSync(masks).length, s = (Date.now() - t2) / 1000;
    log(`  ${n}/${files.length} — ${s.toFixed(0)}s, ${(n / s).toFixed(1)} img/s`);
  }, 15000);
  const codes = await Promise.all(lists.map(l => new Promise(ok => {
    const c = spawn(BIN, ["--quality", "accurate", "--refine", "--out", masks, "--list", l], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    c.stderr.on("data", d => { err += d; });
    c.on("close", code => {
      const real = err.split("\n").filter(x => x.trim() && !/^\s+\d+\/\d+ — /.test(x)).join("\n");
      if (real) console.error(real);
      ok(code);
    });
  })));
  clearInterval(tick);
  if (codes.some(c => c !== 0)) throw new Error(`Vision failed (codes ${codes.join(", ")})`);
  log(`3/3 ${fs.readdirSync(masks).length} masks, closed and feathered, in ${((Date.now() - t2) / 1000).toFixed(1)}s`);
  fs.rmSync(out, { recursive: true, force: true });
  fs.renameSync(masks, out);
  fs.writeFileSync(path.join(out, ".stamp.json"), JSON.stringify(stampOf(P)));
  fs.rmSync(raw, { recursive: true, force: true });
  return count(out);
}

// --- the command: the project's matte/, then what the speaker holds and the stencil ------------
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const CWD = process.cwd();
  const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
  const FORCE = process.argv.includes("--force");
  const W = P.width ?? 1080, H = P.height ?? 1920, FPS = P.fps ?? 30;
  const N = Math.round((P.editEnd ?? P.duration) * FPS);
  const OUT = path.resolve(CWD, "matte"), PREP = path.resolve(CWD, ".prep");
  const want = stampOf(P), mine = readStamp(OUT);
  const done = count(OUT);
  // a stamped matte is trusted by its stamp (a retimed take has fewer masks than its duration
  // in frames); one without a stamp, from before them, by its count, as it always was
  if (!FORCE && (mine ? serves(mine, want) : done >= N)) {
    console.log(`matte/ already populated (${done} masks for ${N} frames); --force to redo it`);
    process.exit(0);
  }
  if (mine && !serves(mine, want)) console.log("matte/ was made for another speed, size or cut of the video: made again");
  try {
    // the matte GTM by Pipecorn started with the edit: waited for while it is being made, when it
    // is the one this project needs
    const lock = path.join(PREP, "matte.lock");
    let job = null; try { job = JSON.parse(fs.readFileSync(lock, "utf8")); } catch {}
    // one made for another version of the video (rushed, cut, retimed since) will never serve: stopped,
    // the Neural Engine is this one's
    const prepping = job?.pid > 1 && alive(job.pid) && /prep\.mjs/.test(spawnSync("ps", ["-o", "command=", "-p", String(job.pid)], { encoding: "utf8" }).stdout || "");
    if (prepping && (FORCE || !serves(job.stamp, want))) {
      try { process.kill(-job.pid, "SIGTERM"); } catch { try { process.kill(job.pid, "SIGTERM"); } catch {} }
      console.log("the matte made ahead was for another version of the video: stopped");
    }
    if (prepping && !FORCE && serves(job.stamp, want)) {
      console.log("the matte is being made since the edit started: waiting for it…");
      const t0 = Date.now();
      let last = 0;
      while (fs.existsSync(lock) && alive(job.pid)) {
        await sleep(1000);
        if (Date.now() - last > 15000) { last = Date.now(); console.log(`  ${count(path.join(PREP, ".matte-frames", "m"))} masks so far — ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
      }
    }
    const pre = path.join(PREP, "matte");
    if (!FORCE && serves(readStamp(pre), want)) {
      fs.rmSync(OUT, { recursive: true, force: true });
      fs.renameSync(pre, OUT);
      fs.writeFileSync(path.join(OUT, ".stamp.json"), JSON.stringify(want));
      console.log(`matte/ — ${count(OUT)} masks, made ahead by GTM by Pipecorn`);
    } else {
      fs.rmSync(pre, { recursive: true, force: true });   // made for something else: only disk space now
      await segment(P, OUT, path.resolve(CWD, ".matte-frames"));
    }
  } catch (e) { console.error(String(e.message || e)); process.exit(1); }

  const made = count(OUT);
  console.log(`matte/ — ${made} masks for ${N} edit frames`);
  if (made < N) { console.error(`⚠ ${N - made} mask(s) missing; build.sh will hold the last one`); }
  // what the speaker HOLDS is not them: project.json `matteHoles` (matte-holes.mjs)
  { const { applyHoles } = await import("./matte-holes.mjs"); applyHoles(CWD); }

  // --- 4. assets/mask-small: the STENCIL, and it must carry an alpha channel -----
  //
  // The drawing modules expect assets/mask-small (RGBA, alpha = the matte), and
  // nothing used to produce it: each project made it by hand. Made as OPAQUE
  // greyscale it does not break, it LIES — `rim()` and `sketch()` composite with
  // `source-in` over the union of the stencil frames: without alpha that union is
  // the whole frame, and the white rim fills the ENTIRE screen except the speaker.
  // So matte.mjs writes it, once, correctly.
  const SMALL = path.resolve(CWD, "assets", "mask-small");
  const SW = 640, SH = Math.round(SW * H / W / 2) * 2;
  fs.rmSync(SMALL, { recursive: true, force: true });
  fs.mkdirSync(SMALL, { recursive: true });
  console.log(`4/4 stencil assets/mask-small (${SW}x${SH}, RGBA)…`);
  // white everywhere, alpha = the mask: `alphamerge` takes the mask's luma as alpha
  const r = spawnSync("ffmpeg", ["-v", "error", "-y",
    "-f", "lavfi", "-i", `color=c=white:s=${SW}x${SH}`,
    "-framerate", String(FPS), "-i", path.join(OUT, "m%05d.png"),
    "-filter_complex", `[1:v]scale=${SW}:${SH}:flags=lanczos,format=gray[a];[0:v]format=rgba,fps=${FPS}[c];[c][a]alphamerge[out]`,
    "-map", "[out]", "-frames:v", String(made), path.join(SMALL, "f%04d.png")], { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) { console.error(`stencil failed (code ${r.status})`); process.exit(1); }
  const small = fs.readdirSync(SMALL).filter(f => f.endsWith(".png")).length;
  console.log(`assets/mask-small — ${small} stencils`);
}
