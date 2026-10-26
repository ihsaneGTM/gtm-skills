#!/usr/bin/env node
// The render of a motion part: Chrome draws each frame of film/part-<n>.html, ffmpeg encodes them as they come (no frame
// on disk), then its sound: the clone's voice at its natural level (from 0.25 s, its pauses placed by prep.mjs) and the
// shelf's sounds the film asks for. NO music here and NO master: the assembly lays ONE music bed under the whole video
// (it starts in the dressed intro and goes on) and masters the whole.
//
//   node render.mjs <run-dir> --part <n>                      → build/part-<n>.mp4 (+ build/part-<n>.json)
//   node render.mjs <run-dir> --part <n> --stills 3,12.5,40   → stills/part-<n>-<t>.jpg (LOOK at each one)
//   node render.mjs <run-dir> --part <n> --audio-only         the sound again, on the last render's picture
//   node render.mjs <run-dir> --part <n> --4k                 → build/4k/part-<n>.mp4: drawn natively at 3840×2160
//                                                (deviceScaleFactor 2, the stock shots' 4K frames, the junction frames
//                                                of the 4K clips), only once the user asked for the 4K
//   node render.mjs <run-dir> --part <n> --slice 20:30         → build/part-<n>-slice.mp4: the picture of that span only
//   options: --fx-offset <dB> (on every sound; default: matched to the voice, -10 for a voice at -28.4 LUFS, like intro.mjs)   --crf <n> (default 18; 4K 15)
//            --pieces <n> (Chromes drawing at once; default min(cores − 2, RAM / 1.5 GB, 4), 4K 1; 1 = one pass)
//            --preset <x264 preset> (default medium at 1080p, slow at 4K)
// Google Chrome draws when it is installed (the same look at 1080p and 4K; required at 4K: the headless shell stalls at
// ×2); the junction frames of the right size (build/junctions/1080|4k/) are put in film/img/ first.
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";
import { step, render as beat } from "../../../motion/progress.mjs";
import { sfxPath, alignOf, loudness } from "./sound.mjs";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const N = +opt("part", 1), K4 = a.includes("--4k");
const fps = 30, W = 1920, H = 1080, DSF = K4 ? 2 : 1, stills = opt("stills"), audioOnly = a.includes("--audio-only");
const FXO0 = opt("fx-offset"), CRF = opt("crf", K4 ? "15" : "18");
const PAGE = path.join(RUN, "film", `part-${N}.html`);
if (!fs.existsSync(PAGE)) { console.error(`✗ film/part-${N}.html is missing: scripts/prep.mjs ${path.relative(process.cwd(), RUN)} (after the voice's take)`); process.exit(2); }
const BUILD = path.join(RUN, "build"), OUTDIR = K4 ? path.join(BUILD, "4k") : BUILD;
fs.mkdirSync(OUTDIR, { recursive: true });
const OUT = path.join(OUTDIR, `part-${N}.mp4`), video = path.join(OUTDIR, `part-${N}-video.mp4`), VO = path.join(RUN, "vo", `part-${N}`, "voix", "prise.wav");
// the junction frames of this size into film/img/ (the film shows them as the real frames of the clips around it)
const J = path.join(BUILD, "junctions", K4 ? "4k" : "1080");
if (fs.existsSync(J)) {
  for (const f of fs.readdirSync(J)) if (f.endsWith(".png")) { const d = path.join(RUN, "film", "img", f); fs.rmSync(d, { force: true }); fs.copyFileSync(path.join(J, f), d); }
} else if (K4 && !stills) { console.error("✗ no 4K junction frames (build/junctions/4k): intro.mjs --4k for the intro and each cutback first"); process.exit(2); }
// at 4K the stock shots are read from film/media4k/ (framed.js, ?hd=1): every shot needs its 3200×1800 frames
if (K4) {
  const M = path.join(RUN, "film", "media");
  const shots = fs.existsSync(M) ? fs.readdirSync(M).filter(d => { try { return JSON.parse(fs.readFileSync(path.join(M, d, "media.json"), "utf8")).kind === "shot"; } catch { return false; } }) : [];
  const miss = shots.filter(d => !fs.existsSync(path.join(RUN, "film", "media4k", d, "f0001.jpg")));
  if (miss.length) { console.error(`✗ no 4K frames for ${miss.join(", ")}: node plugins/video/skills/voiceover-video/scripts/media.mjs ${path.relative(process.cwd(), RUN)} frames --all --4k`); process.exit(2); }
}
// Google Chrome when it is there (the headless shell stalls on the 4K frames and draws no WebGL)
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;
if (K4 && !/Google Chrome$/.test(process.env.CHROME || "")) { console.error("✗ the 4K needs Google Chrome (/Applications/Google Chrome.app)"); process.exit(2); }

// how many Chromes draw at once: each draws a run of consecutive frames into its own file, the files joined without
// re-encoding (concat -c copy, each piece's exact duration). The film is a pure function of t: a piece starting at
// frame k draws the same frames as one pass (checked frame for frame, OPTIMISATION-SKILLS.md § 10). --pieces 1 = one pass.
const PIECES = (() => {
  const v = opt("pieces", process.env.GTM_PIECES || null);
  if (v) return Math.max(1, +v | 0);
  // 4: the sweet spot measured on an M2 Pro (§ 10). At 4K one pass: x264 slow already takes every core (2 pieces: 35 → 41 s)
  if (K4) return 1;
  return Math.max(1, Math.min(os.availableParallelism() - 2, Math.floor(os.totalmem() / 1.5e9), 4));
})();
const PRESET = opt("preset", K4 ? "slow" : "medium");           // 1080p drafts at medium (§ 10: same picture), 4K slow
const SLICE = opt("slice");
const PREROLL = +opt("preroll", 0);                              // frames drawn before a piece, not kept (a test: § 10)                                      // --slice a:b (seconds): the picture of that span only
const MD5 = process.env.GTM_FRAME_MD5 || null;                   // a check: the md5 of every captured frame, to a file

const server = await serveDir(RUN);
// one Chrome on the film, ready; returns { cdp, close, shot }
const openFilm = async (log) => {
  const { cdp, close } = await launchChrome();
  let broken = null;
  try {
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
    if (log) cdp.on("Runtime.consoleAPICalled", p => console.log(p.type === "warning" ? "[film] ⚠" : "[film]", p.args.map(x => x.value ?? x.description).join(" ").replace(/^⚠ /, "")));
    cdp.on("Runtime.exceptionThrown", p => { broken = p.exceptionDetails.exception?.description || p.exceptionDetails.text; console.log("[film error]", broken); });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
    for (let k = 0; ; k++) {
      await cdp.send("Page.navigate", { url: `${server.url}/film/part-${N}.html?render=1&tr=P3${K4 ? "&hd=1" : ""}` });
      let ready = false;
      for (let i = 0; i < 400 && !ready; i++) {
        await sleep(100);
        if (broken) throw new Error(`the film stops on an error: ${broken.split("\n")[0]}`);
        try { ready = await cdp.eval("window.__filmReady === true"); } catch {}
      }
      if (!ready) { if (k >= 2) throw new Error(`the film did not get ready: open film/part-${N}.html in a browser to see its error`); continue; }
      const h = await cdp.eval("window.__filmHealth");
      if (!h || (!h.badImages.length && !h.badFonts.length)) break;
      console.log("missing pictures or faces, loading again:", JSON.stringify(h));
      if (k >= 3) throw new Error("missing: " + JSON.stringify(h));
    }
    // every face the page declares loaded before the first frame: a fresh Chrome (a piece starting mid-film) would
    // otherwise draw a word in the fallback face until its face arrives (seen on the intro's « totally normal. »)
    const unloaded = await cdp.eval(`(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; return [...document.fonts].filter(f => f.status !== "loaded").map(f => f.family); })()`);
    if (unloaded.length) console.log(`⚠ faces that did not load: ${unloaded.join(", ")}`);
  } catch (e) { await close(); throw e; }
  // a 4K frame at quality 100 can pass 4 MB, and one CDP message that big hangs: quality 95 at 4K, lowered for the rare
  // frame still too big
  const shot = async (t, q0 = K4 ? 95 : 100) => {
    if (broken) throw new Error(`the film stops on an error: ${broken.split("\n")[0]}`);
    await cdp.eval(`__film.seek(${t.toFixed(5)})`);
    let q = q0, data;
    for (;;) { data = (await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: q, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } })).data; if (!K4 || data.length < 3.6e6 || q <= 80) break; q -= 5; }
    return Buffer.from(data, "base64");
  };
  return { cdp, close, shot };
};
const encoder = (file) => {
  const enc = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-vf", "scale=in_range=pc:out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p",
    "-c:v", "libx264", "-preset", PRESET, "-profile:v", "high", "-crf", CRF, "-color_range", "tv", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-r", String(fps), file], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => enc.on("close", c => (c ? rej(new Error("encode")) : res())));
  return { write: async (b) => { if (!enc.stdin.write(b)) await new Promise(r => enc.stdin.once("drain", r)); }, end: async () => { enc.stdin.end(); await done; } };
};

let meta, cues, segs, part;
const films = [];
try {
  films.push(await openFilm(true));
  const { cdp } = films[0];
  meta = await cdp.eval("__film.meta");
  cues = await cdp.eval("__film.cues");
  segs = await cdp.eval("window.SEGS");
  part = await cdp.eval("window.PART || null");
  if (stills) {
    const dir = path.join(RUN, "stills"); fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.split(",").map(Number)) fs.writeFileSync(path.join(dir, `part-${N}-${s}.jpg`), await films[0].shot(s, 88));
    console.log(`stills → ${path.relative(process.cwd(), dir)}/part-${N}-*.jpg (part ${N} lasts ${meta.duration.toFixed(2)} s): look at each one`);
  } else if (!audioOnly) {
    const total = Math.round(meta.duration * fps);
    let f0 = 0, f1 = total;
    if (SLICE) { const [x, y] = SLICE.split(":").map(Number); f0 = Math.max(0, Math.round(x * fps)); f1 = Math.min(total, Math.round(y * fps)); }
    const n = f1 - f0;
    // pieces of 2 s at least
    const k = Math.max(1, Math.min(PIECES, Math.floor(n / (2 * fps))));
    step(RUN, "render", "running", `Drawing part ${N}${K4 ? " in 4K" : ""}`);
    const t0 = Date.now();
    // the other Chromes start while nothing waits on them
    const more = Array.from({ length: k - 1 }, () => openFilm(false));
    for (const m of await Promise.all(more)) films.push(m);
    console.log(`${n} frames, ${k} piece(s) at once, x264 ${PRESET} crf ${CRF} (Chromes ready in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    const bounds = Array.from({ length: k + 1 }, (_, i) => f0 + Math.round((n * i) / k));
    const files = bounds.slice(0, -1).map((_, i) => k === 1 && !SLICE ? video : path.join(OUTDIR, `part-${N}-piece-${i}.mp4`));
    const sums = MD5 ? new Array(n) : null;
    let done = 0;
    await Promise.all(files.map(async (file, i) => {
      const e = encoder(file);
      // --preroll n draws n frames before the piece, not kept. Not needed: Chrome keeps a moving text's raster scale from
      // the frames before, so a piece's text edges differ from one pass by a hair (47-52 dB, invisible at ×5) with or
      // without a preroll; two plain passes already differ by 85-99 dB on some frames (§ 10)
      for (let f = Math.max(0, bounds[i] - PREROLL); f < bounds[i]; f++) await films[i].shot(f / fps);
      for (let f = bounds[i]; f < bounds[i + 1]; f++) {
        const jpg = await films[i].shot(f / fps);
        if (sums) sums[f - f0] = crypto.createHash("md5").update(jpg).digest("hex");
        if (process.env.GTM_FRAME_DIR) fs.writeFileSync(path.join(process.env.GTM_FRAME_DIR, `f${String(f).padStart(5, "0")}.jpg`), jpg);
        await e.write(jpg);
        done++;
        beat(RUN, done, n, K4 ? "4K" : "16x9");
        if (i === 0 && (f - bounds[0]) % 300 === 0) console.log(`${done}/${n} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
      await e.end();
    }));
    if (sums) fs.writeFileSync(MD5, sums.map((h, i) => `${f0 + i} ${h}`).join("\n") + "\n");
    const out = SLICE ? path.join(OUTDIR, `part-${N}-slice.mp4`) : video;
    if (k > 1 || SLICE) {
      // joined as they are; each piece's exact duration, or a frame is lost at each join
      const list = path.join(OUTDIR, `part-${N}-pieces.txt`);
      fs.writeFileSync(list, "ffconcat version 1.0\n" + files.map((f, i) => `file '${path.basename(f)}'\nduration ${((bounds[i + 1] - bounds[i]) / fps).toFixed(6)}\n`).join(""));
      const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-r", String(fps), out], { stdio: "inherit" });
      if (r.status) throw new Error("the pieces could not be joined");
      for (const f of files) fs.rmSync(f, { force: true });
      fs.rmSync(list, { force: true });
    }
    const got = +spawnSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "default=nw=1:nk=1", out]).stdout.toString().trim();
    if (got !== n) throw new Error(`${got} frames in the picture, ${n} drawn: a join lost frames`);
    console.log(`${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s (${k} piece(s))`);
    if (SLICE) console.log("→", path.relative(process.cwd(), out));
  }
} catch (e) {
  if (!stills) step(RUN, "render", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally { await Promise.all(films.map(f => f.close())); await server.close(); }
if (process.exitCode || stills || SLICE) process.exit(process.exitCode || 0);

// ── the sound: the clone's voice and the shelf's sounds, no music (the assembly lays the one bed) ────────────────
try {
  step(RUN, "render", "running", `Mixing part ${N}'s sound`);
  const dur = meta.duration;
  // the sounds' level follows the voice: -10 dB for a voice at -28.4 LUFS (the clone), lower for a quieter one (a real
  // voice cleaned by the isolator sits near -36: its sounds 8 dB lower, or they cover it; leads-qualifies, 2026-10-15)
  const LV = loudness(VO), FXO = FXO0 != null ? +FXO0 : +(-10 + Math.min(0, LV.I + 28.4)).toFixed(1);
  const args = ["-y", "-loglevel", "error"], filt = [];
  segs.forEach((g, i) => {
    args.push("-i", VO);
    filt.push(`[${i}:a]atrim=${g.s0.toFixed(3)}:${g.s1.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(g.at * 1000)}:all=1[v${i}]`);
  });
  filt.push(segs.length > 1 ? `${segs.map((_, i) => `[v${i}]`).join("")}amix=inputs=${segs.length}:normalize=0,apad=whole_dur=${dur}[vo]` : `[v0]apad=whole_dur=${dur}[vo]`);
  let idx = segs.length;
  const labels = ["[vo]"];
  cues.forEach((c, i) => {
    const p = sfxPath(c.name), mode = c.align || ("end" in c ? "end" : "attack"), t = "end" in c ? c.end : c.t;
    const st = Math.max(0, t - alignOf(p, mode));
    if (st >= dur - 0.05) return;
    args.push("-i", p);
    filt.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(st * 1000)}:all=1,volume=${(c.gain ?? 0) + FXO}dB[s${i}]`);
    labels.push(`[s${i}]`); idx++;
  });
  filt.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad=whole_dur=${dur},atrim=0:${dur},aresample=48000[out]`);
  const wav = path.join(OUTDIR, `part-${N}-audio.wav`);
  let r = spawnSync("ffmpeg", [...args, "-filter_complex", filt.join(";"), "-map", "[out]", "-ac", "2", "-c:a", "pcm_s16le", wav], { stdio: "inherit" });
  if (r.status) throw new Error("the mix failed (ffmpeg)");
  const L = loudness(wav);
  console.log(`voice alone ${LV.I.toFixed(1)} LUFS · part ${N} ${L.I.toFixed(1)} LUFS, TP ${L.TP.toFixed(1)} dBTP · ${cues.length} sounds at ${FXO} dB · no music (the assembly lays it)`);
  const src = audioOnly ? OUT : video, tmp = OUT + ".tmp.mp4";
  if (!fs.existsSync(src)) throw new Error("no picture to put the sound on: render the part first");
  r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", K4 ? "320k" : "256k", "-ar", "48000", "-ac", "2", "-t", dur.toFixed(3), "-movflags", "+faststart", tmp], { stdio: "inherit" });
  if (r.status) throw new Error("the sound could not be put on the picture");
  fs.renameSync(tmp, OUT);
  fs.rmSync(video, { force: true }); fs.rmSync(wav, { force: true });
  fs.writeFileSync(path.join(OUTDIR, `part-${N}.json`), JSON.stringify({ part: N, duration: dur, frames: Math.round(dur * fps), size: K4 ? "4k" : "1080", in: part?.in, out: part?.out, voice: LV.I, mix: L.I, sounds: cues.length, fx: FXO, at: Date.now() }, null, 1) + "\n");
  step(RUN, "render", "done", `Part ${N}${K4 ? " in 4K" : ""}: ${dur.toFixed(1)} s`);
  console.log("→", path.relative(process.cwd(), OUT));
} catch (e) {
  step(RUN, "render", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
