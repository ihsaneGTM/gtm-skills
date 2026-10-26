#!/usr/bin/env node
// The filmed clips, dressed: the intro (step 4 of the skill) and each cutback, the same way. The real footage NEVER
// goes through Chrome: Chrome draws only the layer behind the user (film/<clip>.html + <clip>-story.js, on a transparent
// page), ffmpeg lays it on the footage, applies the camera's punches to the footage and to the user's mask, and puts the
// user, cut out, on top.
//
//   node intro.mjs <run-dir> [--cutback <n>]      the material of the intro (or of cutback n): the picture graded (a
//                                                 cutback takes the intro's LUT), played at the intro's speed, its frames
//                                                 (film/media/<clip>/f0001.jpg…), the user's mask on each
//                                                 (film/media/<clip>-mask/m00001.png…, Apple Vision, closed and feathered),
//                                                 its words (film/<clip>-words.js), its page (film/<clip>.html) and, when
//                                                 missing, its scenario skeleton (film/<clip>-story.js)
//   node intro.mjs <run-dir> [--cutback <n>] --words        the words only (after cut.mjs moved the clip)
//   node intro.mjs <run-dir> --speed 1.1                    the intro (and every cutback) played faster, picture and voice
//                                                 together, the voice's pitch kept: run.json › cut.intro.speed (default:
//                                                 workspace/motion/profile.json › voiceover.introSpeed); --speed 1 undoes it
//   node intro.mjs <run-dir> [--cutback <n>] --frames       the frames again (after the graded picture changed)
//   node intro.mjs <run-dir> [--cutback <n>] --stills 1.6,9 stills/<clip>-still-<t>.jpg, composed exactly as the render
//   node intro.mjs <run-dir> [--cutback <n>] --render       build/<clip>.mp4 (1080p): the picture at 30 fps, the user's voice
//                                                 untouched; the intro carries the music from its first frame (about 12 LU
//                                                 under the voice, ducked; build/intro.json › music.next tells the assembly
//                                                 where the track goes on); a cutback has none (the bed of the assembly runs
//                                                 under it); the sounds. Its junction frames → build/junctions/1080/ and
//                                                 film/img/ (intro-last.png; cutback-<n>-first.png, cutback-<n>-last.png),
//                                                 stripped of their colour chunks
//   node intro.mjs <run-dir> [--cutback <n>] --4k           the same clip composed again at 4K from the 4K take (graded with
//                                                 the same LUT, the masks upscaled, the layer drawn at ×2 by Google Chrome),
//                                                 its sound the 1080p build's → build/4k/<clip>.mov, build/junctions/4k/.
//                                                 Only when the user asks for the 4K (after the 1080p draft is validated).
//   node intro.mjs <run-dir> [--cutback <n>] --4k --trial 10   a short trial of the 4K composition (10 frames, its first
//                                                 and last frames looked at): build/4k/<clip>-trial.mov, nothing else written
//   options: --pieces <n> (pieces composed at once; default 2, 4K 1; 1 = one pass)
//            --preset <x264 preset> (default medium at 1080p, slow at 4K)
//            --lut <file.cube> (a cutback's grade; default real/intro-graded.mp4.cube, the intro's LUT, from scripts/grade.mjs)
//            --music gimme|…|<file> --music-start 1.95 --music-under 12   --fx-offset <dB> (default: matched to the voice)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { segment } from "../../short-editor/scripts/matte.mjs";
import { step } from "../../../motion/progress.mjs";
import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";
import { profile } from "../../../motion/brand.mjs";
import { sfxPath, musicPath, alignOf, loudness } from "./sound.mjs";
import { framePng } from "./png.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const has = k => a.includes("--" + k);
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const runF = path.join(RUN, "run.json"), run = JSON.parse(fs.readFileSync(runF, "utf8"));
const N_CB = opt("cutback") != null ? +opt("cutback") : null;
const CLIP = N_CB ? `cutback-${N_CB}` : "intro";
const cut = N_CB ? run.cut?.cutbacks?.[N_CB - 1] : run.cut?.intro;
if (!cut) { console.error(`✗ no ${N_CB ? `cutback ${N_CB}` : "intro"} in run.json › cut: scripts/cut.mjs first`); process.exit(2); }
const R = path.join(RUN, "real"), FILM = path.join(RUN, "film"), BUILD = path.join(RUN, "build");
const RAW = path.join(R, `${CLIP}.mp4`);
if (!fs.existsSync(RAW)) { console.error(`✗ real/${CLIP}.mp4 is missing: scripts/cut.mjs first`); process.exit(2); }
const pad = (n, k) => String(n).padStart(k, "0");
const r3 = x => Math.round(x * 1000) / 1000;
const FPS = 30, W = 1920, H = 1080;
// the grade: the intro by scripts/grade.mjs, the colour grade's engine (real/intro-graded.mp4 and its LUT, real/intro-graded.mp4.cube); a cutback
// takes the SAME LUT (one look for every filmed part), applied here with the grade's own chain
const LUT = opt("lut") ? path.resolve(opt("lut")) : path.join(R, "intro-graded.mp4.cube");
const GRADE = lut => `scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=gbrp16le,lut3d=file='${lut.replace(/'/g, "'\\''")}':interp=tetrahedral,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`;
const GRADED = path.join(R, `${CLIP}-graded.mp4`);
const newer = (f, ...src) => fs.existsSync(f) && src.every(s => !fs.existsSync(s) || fs.statSync(f).mtimeMs >= fs.statSync(s).mtimeMs);
if (N_CB && !newer(GRADED, RAW, LUT)) {
  if (fs.existsSync(LUT)) {
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", RAW, "-map", "0:v:0", "-map", "0:a:0?", "-vf", GRADE(LUT), "-c:v", "libx264", "-crf", "17", "-preset", "medium",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-c:a", "copy", "-movflags", "+faststart", GRADED], { stdio: "inherit" });
    if (r.status) { console.error("✗ the cutback could not be graded with the intro's LUT"); process.exit(1); }
    console.log(`cutback ${N_CB} graded with the intro's LUT (${path.relative(RUN, LUT)}) → real/${CLIP}-graded.mp4`);
  } else console.log(`⚠ no LUT (${path.relative(RUN, LUT)}): grade the intro with scripts/grade.mjs first, or pass --lut; cutback ${N_CB} stays as filmed`);
}
// a graded intro older than the cut is another cut's: left aside (grade the new cut again)
const gradedOK = fs.existsSync(GRADED) && (N_CB || newer(GRADED, RAW));
if (!N_CB && fs.existsSync(GRADED) && !gradedOK) console.log("⚠ real/intro-graded.mp4 is older than real/intro.mp4 (a new cut): grade the intro again with scripts/grade.mjs; the cut is used as filmed meanwhile");
if (!N_CB && !fs.existsSync(GRADED)) console.log("⚠ no real/intro-graded.mp4: grade the intro with scripts/grade.mjs first (SKILL.md § 3); the cut is used as filmed meanwhile");
const RAWPIC = gradedOK ? GRADED : RAW;
// the speed (Ihsane, 2026-10-12: « je parle trop lentement… », ×1.1; ×1.2 was too fast): picture and voice together, once,
// into real/<clip>-speed.mp4, then both the picture and the sound of the clip. A cutback plays at the intro's speed.
if (opt("speed") != null) { run.cut.intro.speed = +opt("speed"); fs.writeFileSync(runF, JSON.stringify(run, null, 2) + "\n"); }
const SPEED = +(cut.speed ?? run.cut.intro.speed ?? profile().voiceover?.introSpeed ?? 1);
const FAST = path.join(R, `${CLIP}-speed.mp4`), FASTTMP = path.join(R, `${CLIP}-speed.tmp.mov`);
if (SPEED !== 1) {
  const stale = !newer(FAST, RAWPIC, RAW) || (() => { try { return JSON.parse(fs.readFileSync(FAST + ".json", "utf8")).speed !== SPEED; } catch { return true; } })();
  if (stale) {
    let r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", RAWPIC, "-i", RAW, "-filter_complex", `[0:v]setpts=PTS/${SPEED},fps=30[v];[1:a]atempo=${SPEED}[a]`,
      "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", FASTTMP], { stdio: "inherit" });
    if (!r.status) r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", FASTTMP, "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", FAST], { stdio: "inherit" });
    fs.rmSync(FASTTMP, { force: true });
    if (r.status) { console.error(`✗ ${CLIP} could not be sped up`); process.exit(1); }
    fs.writeFileSync(FAST + ".json", JSON.stringify({ speed: SPEED, picture: path.basename(RAWPIC) }) + "\n");
    console.log(`${CLIP} at ×${SPEED} → real/${CLIP}-speed.mp4 (the frames and the masks are made again by intro.mjs <run>${N_CB ? ` --cutback ${N_CB}` : ""})`);
  }
}
const SRC = SPEED !== 1 ? FAST : RAW, PIC = SPEED !== 1 ? FAST : RAWPIC;
const FR = path.join(FILM, "media", CLIP), MK = path.join(FILM, "media", `${CLIP}-mask`);
const probe = spawnSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "json", SRC], { encoding: "utf8" });
const N = +JSON.parse(probe.stdout).streams[0].nb_read_packets, DUR = N / FPS;
const PAGE = path.join(FILM, `${CLIP}.html`), STORY = path.join(FILM, `${CLIP}-story.js`), WORDS = path.join(FILM, `${CLIP}-words.js`);

// ── the material ───────────────────────────────────────────────────────────────────────────────────
if (!has("stills") && !has("render") && !has("4k")) {
  // the clip's words, from the take's (its own times, at its speed): the scenario is timed on them
  const all = JSON.parse(fs.readFileSync(path.join(RUN, "take", "words.json"), "utf8"));
  const words = all.filter(w => w.s >= cut.from - 0.01 && w.s < cut.to).map(w => ({ w: w.w, s: r3((w.s - cut.from) / SPEED), e: r3((Math.min(w.e, cut.to) - cut.from) / SPEED) }));
  fs.writeFileSync(WORDS, `window.WORDS=${JSON.stringify(words)};\nwindow.SEGS=[{"s0":0,"s1":${r3(DUR + 1)},"at":0}];\nwindow.GEN={"t0":0,"t1":0};\nwindow.CUTS=[];\nwindow.INTRO={"n":${N},"dur":${r3(DUR)},"clip":${JSON.stringify(CLIP)}};\n`);
  const tpl = path.join(HERE, "..", "template", run.style || "document", "film");
  fs.writeFileSync(PAGE, fs.readFileSync(path.join(tpl, "clip.html"), "utf8").replaceAll("__CLIP__", CLIP));
  if (!fs.existsSync(STORY)) {
    fs.writeFileSync(STORY, fs.readFileSync(path.join(tpl, "intro-story.js"), "utf8").replaceAll("__SLUG__", `${run.slug}-${CLIP}`).replaceAll("__TITLE__", `${run.subject || run.slug} · ${CLIP}`));
    console.log(`film/${CLIP}-story.js: the skeleton, to write (references/example-${N_CB ? "cutback" : "intro"}-story.js)`);
  }
  console.log(`${CLIP}-words.js (×${SPEED}): ${words.length} words, « ${words.slice(0, 6).map(w => w.w).join(" ")}${words.length > 6 ? ` … ${words.slice(-4).map(w => w.w).join(" ")}` : ""} », ${DUR.toFixed(3)} s (${N} frames)`);
  if (has("words")) process.exit(0);
  const frames = () => {
    fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
    return spawnSync("ffmpeg", ["-v", "error", "-y", "-i", PIC, "-vf", `scale=${W}:${H}:flags=lanczos`, "-q:v", "2", "-start_number", "1", path.join(FR, "f%04d.jpg")], { stdio: "inherit" });
  };
  if (has("frames")) {
    const r = frames();
    console.log(r.status ? "✗ the frames could not be extracted" : `${fs.readdirSync(FR).length} frames from ${path.basename(PIC)}`);
    process.exit(r.status ? 1 : 0);
  }
  step(RUN, "intro", "running", `Cutting you out of ${N_CB ? `cutback ${N_CB}` : "the intro"}`);
  if (frames().status) { console.error("✗ the frames could not be extracted"); process.exit(1); }
  const t0 = Date.now();
  const n = await segment({ source: SRC, width: W, height: H, fps: FPS, speed: 1, editEnd: DUR }, MK, path.join(BUILD, `matte-${CLIP}`));
  fs.rmSync(path.join(BUILD, `matte-${CLIP}`), { recursive: true, force: true });
  console.log(`${fs.readdirSync(FR).filter(f => f.endsWith(".jpg")).length} frames, ${n} masks in ${((Date.now() - t0) / 1000).toFixed(0)} s → film/media/${CLIP}, ${CLIP}-mask`);
  step(RUN, "intro", "done", `You, cut out on ${n} frames of ${N_CB ? `cutback ${N_CB}` : "the intro"}`);
  process.exit(0);
}

// ── the layer behind the user, from Chrome, on a transparent page ──────────────────────────────────
for (const f of [PAGE, WORDS, STORY]) if (!fs.existsSync(f)) { console.error(`✗ film/${path.basename(f)} is missing (intro.mjs <run>${N_CB ? ` --cutback ${N_CB}` : ""} first)`); process.exit(2); }
const K4 = has("4k");
// Google Chrome when it is installed (the same drawing at 1080p and at 4K; the headless shell stalls at ×2)
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;
if (K4 && !/Google Chrome$/.test(process.env.CHROME || "")) { console.error("✗ the 4K needs Google Chrome (/Applications/Google Chrome.app): the headless shell stalls at ×2"); process.exit(2); }
const OW = K4 ? 3840 : W, OH = K4 ? 2160 : H;
const TRIAL = K4 && opt("trial") ? Math.max(1, Math.min(+opt("trial"), N)) : null, NN = TRIAL || N;
const server = await serveDir(RUN);
// one Chrome on the clip's page (transparent), ready; layer(t) = its PNG at t
const openPage = async (log) => {
  const { cdp, close } = await launchChrome();
  let broken = null;
  try {
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
    if (log) cdp.on("Runtime.consoleAPICalled", p => console.log(p.type === "warning" ? `[${CLIP}] ⚠` : `[${CLIP}]`, p.args.map(x => x.value ?? x.description).join(" ").replace(/^⚠ /, "")));
    cdp.on("Runtime.exceptionThrown", p => { broken = p.exceptionDetails.exception?.description || p.exceptionDetails.text; console.log(`[${CLIP} error]`, broken); });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: K4 ? 2 : 1, mobile: false });
    await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    await cdp.send("Page.navigate", { url: `${server.url}/film/${CLIP}.html?render=1` });
    let ready = false;
    for (let i = 0; i < 400 && !ready; i++) {
      await sleep(100);
      if (broken) throw new Error(`${CLIP} stops on an error: ${broken.split("\n")[0]}`);
      try { ready = await cdp.eval("window.__filmReady === true"); } catch {}
    }
    if (!ready) throw new Error(`${CLIP} did not get ready: open film/${CLIP}.html in a browser to see its error`);
    const h = await cdp.eval("window.__filmHealth");
    if (h && (h.badImages.length || h.badFonts.length)) throw new Error("missing: " + JSON.stringify(h));
    // every face the page declares loaded before the first frame: a fresh Chrome (a piece starting mid-film) would
    // otherwise draw a word in the fallback face until its face arrives (seen on the intro's « totally normal. »)
    const unloaded = await cdp.eval(`(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; return [...document.fonts].filter(f => f.status !== "loaded").map(f => f.family); })()`);
    if (unloaded.length) console.log(`⚠ faces that did not load: ${unloaded.join(", ")}`);
  } catch (e) { await close(); throw e; }
  const layer = async (t) => {
    if (broken) throw new Error(`${CLIP} stops on an error: ${broken.split("\n")[0]}`);
    await cdp.eval(`__film.seek(${t.toFixed(5)})`);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    return Buffer.from(data, "base64");
  };
  return { cdp, close, layer };
};
// the clip drawn in PIECES at once: each piece a Chrome drawing its run of frames piped into its own composition, the
// pieces joined without re-encoding (OPTIMISATION-SKILLS.md § 10); 1 = one pass
const PIECES = (() => {
  const v = opt("pieces", process.env.GTM_PIECES || null);
  if (v) return Math.max(1, +v | 0);
  // 2: the composition (ffmpeg's camera and overlays) is what costs here, not Chrome; 2 is as fast as 4 (§ 10)
  if (K4) return 1;                                              // 4K: x264 slow takes every core already
  return Math.max(1, Math.min(os.availableParallelism() - 2, Math.floor(os.totalmem() / 1.5e9), 2));
})();
const PRESET = opt("preset", K4 ? "slow" : "medium");           // 1080p at medium (§ 10: the same picture), 4K slow
const pages = [];
const film = {};
try {
  pages.push(await openPage(true));
  const { cdp, layer } = pages[0];
  film.cam = await cdp.eval("window.INTRO_CAM || { anchor: [0.5, 0.3], punches: [] }");
  film.cues = await cdp.eval("__film.cues");

  // the camera: 1 + each punch (in fast, released linearly); the same curve in JS (stills) and in ffmpeg (render).
  // `perspective` crops at the sub-pixel, frame by frame (cubic): zoompan rounds its window to whole pixels, and a slow
  // release then trembles (round 2 of 2026-10-12: « les zooms sont très mal gérés »)
  const [AX, AY] = film.cam.anchor;
  const zoomAt = t => 1 + film.cam.punches.reduce((s, [p, z, din, rel]) => s + (z - 1) * (t < p ? 0 : t < p + din ? (t - p) / din : Math.max(0, 1 - (t - p - din) / rel)), 0);
  // off: the first frame of a piece (its frames counted from 0 by the filter: `in` + off is the clip's frame)
  const zExprAt = (off = 0) => { const T = off ? `((in+${off})/${FPS})` : `(in/${FPS})`; return film.cam.punches.length ? "(1" + film.cam.punches.map(([p, z, din, rel]) =>
    `+${(z - 1).toFixed(4)}*if(lt(${T},${p.toFixed(3)}),0,if(lt(${T},${(p + din).toFixed(3)}),(${T}-${p.toFixed(3)})/${din.toFixed(3)},max(0,1-(${T}-${(p + din).toFixed(3)})/${rel.toFixed(3)})))`).join("") + ")" : "1"; };
  const cam = (z) => {
    const x0 = `${AX}*W*(1-1/${z})`, y0 = `${AY}*H*(1-1/${z})`, x1 = `(${x0}+W/${z})`, y1 = `(${y0}+H/${z})`;
    return `perspective=x0='${x0}':y0='${y0}':x1='${x1}':y1='${y0}':x2='${x0}':y2='${y1}':x3='${x1}':y3='${y1}':interpolation=cubic:sense=source:eval=frame`;
  };
  // [0] the picture, [1] the masks, [2] the layer; `pre`: what the picture needs first (the 4K take: graded, timed)
  const graph = (z, pre = "", mpre = "") => [
    `[0:v]${pre}split=2[f1][f2]`,
    `[f1]${cam(z)}[bg]`,
    `[f2]${cam(z)},format=rgba[fz]`,
    `[1:v]${mpre}format=gray,${cam(z)},format=gray[mz]`,
    `[fz][mz]alphamerge[me]`,
    `[2:v]format=rgba[ov]`,
    `[bg][ov]overlay=0:0:format=auto[u]`,
    `[u][me]overlay=0:0:format=auto,format=yuv420p[v]`,
  ].join(";");

  if (has("stills")) {
    const dir = path.join(RUN, "stills"); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(BUILD, { recursive: true });
    for (const t of opt("stills").split(",").map(Number)) {
      const i = Math.min(N - 1, Math.floor(t * FPS + 1e-6)), png = path.join(BUILD, `${CLIP}-layer.png`);
      fs.writeFileSync(png, await layer(t));
      const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(FR, `f${pad(i + 1, 4)}.jpg`), "-i", path.join(MK, `m${pad(i + 1, 5)}.png`), "-i", png,
        "-filter_complex", graph(zoomAt(t).toFixed(4)), "-map", "[v]", "-frames:v", "1", "-q:v", "3", path.join(dir, `${CLIP}-still-${t}.jpg`)], { stdio: "inherit" });
      if (r.status) throw new Error("a still could not be composed");
      fs.rmSync(png, { force: true });
    }
    console.log(`stills → ${path.relative(process.cwd(), dir)}/${CLIP}-still-*.jpg (${film.cam.punches.length} punch(es)): look at each one`);
  } else {
    if (!TRIAL) step(RUN, "intro", "running", `Drawing ${N_CB ? `cutback ${N_CB}` : "your intro"}${K4 ? " in 4K" : ""}`);
    const OUTDIR = K4 ? path.join(BUILD, "4k") : BUILD; fs.mkdirSync(OUTDIR, { recursive: true });
    film.video = path.join(OUTDIR, TRIAL ? `${CLIP}-trial.mov` : `${CLIP}-video.mp4`);
    let input, pre = "", mpre = "";
    if (K4) {
      // the 4K take from the clip's start, graded with the same LUT (an HLG take tone-mapped first), timed as the 1080p
      const src = path.resolve(run.video);
      const trc = String(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_transfer", "-of", "default=nw=1:nk=1", src], { encoding: "utf8" }).stdout).trim();
      let hlg = "";
      if (/arib-std-b67/.test(trc)) {
        const hl = path.join(BUILD, "hlg2709.cube");
        if (!fs.existsSync(hl)) spawnSync(process.execPath, [path.join(HERE, "hdr-lut.mjs"), "--out", hl], { stdio: "ignore" });
        hlg = `format=rgb48le,lut3d=file='${hl}':interp=tetrahedral,format=yuv420p,`;
      }
      input = ["-ss", String(cut.from), "-i", src];
      pre = `fps=${FPS},scale=${OW}:${OH}:flags=lanczos,${hlg}${fs.existsSync(LUT) ? GRADE(LUT) + "," : ""}setpts=PTS/${SPEED},fps=${FPS},trim=end_frame=${N},setpts=PTS-STARTPTS,format=yuv444p,`;
      mpre = `scale=${OW}:${OH}:flags=bicubic,`;
    } else input = ["-i", PIC];
    const t0 = Date.now();
    // k pieces at once: each a Chrome drawing its run of frames, piped into its own composition (the same graph, its
    // frames picked by trim, the masks and the camera's clock offset), then joined without re-encoding
    const k = Math.max(1, Math.min(PIECES, Math.floor(NN / (2 * FPS))));
    for (const p of await Promise.all(Array.from({ length: k - 1 }, () => openPage(false)))) pages.push(p);
    const bounds = Array.from({ length: k + 1 }, (_, i) => Math.round((NN * i) / k));
    const vEnc = process.env.GTM_LOSSLESS ? ["-c:v", "libx264", "-qp", "0", "-preset", "ultrafast"] : ["-c:v", "libx264", "-preset", PRESET, "-crf", K4 ? "13" : "16", ...(K4 ? ["-profile:v", "high"] : [])];
    const files = bounds.slice(0, -1).map((_, j) => k === 1 ? film.video : film.video.replace(/(\.\w+)$/, `-piece-${j}$1`));
    let done = 0;
    await Promise.all(files.map(async (file, j) => {
      const a0 = bounds[j], a1 = bounds[j + 1], pick = k === 1 ? "" : `trim=start_frame=${a0}:end_frame=${a1},setpts=PTS-STARTPTS,`;
      const enc = spawn("ffmpeg", ["-y", "-loglevel", "error", ...input, "-framerate", String(FPS), "-start_number", String(a0 + 1), "-i", path.join(MK, "m%05d.png"),
        "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
        "-filter_complex", graph(zExprAt(a0), pre + pick, mpre), "-map", "[v]", "-frames:v", String(a1 - a0), ...vEnc,
        "-color_range", "tv", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
      const closed = new Promise((res, rej) => enc.on("close", c => (c ? rej(new Error("the composite failed (ffmpeg)")) : res())));
      enc.stdin.on("error", () => {});
      for (let i = a0; i < a1; i++) {
        const png = await pages[j].layer(i / FPS);
        if (process.env.GTM_FRAME_DIR) fs.writeFileSync(path.join(process.env.GTM_FRAME_DIR, `l${pad(i + 1, 5)}.png`), png);
        if (!enc.stdin.write(png)) await new Promise(r => enc.stdin.once("drain", r));
        if (++done % 150 === 0) console.log(`${done}/${NN} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
      enc.stdin.end(); await closed;
    }));
    if (k > 1) {
      const list = film.video + ".txt";
      fs.writeFileSync(list, "ffconcat version 1.0\n" + files.map((f, j) => `file '${path.basename(f)}'\nduration ${((bounds[j + 1] - bounds[j]) / FPS).toFixed(6)}\n`).join(""));
      const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-r", String(FPS), film.video], { stdio: "inherit" });
      if (r.status) throw new Error("the pieces could not be joined");
      for (const f of [...files, list]) fs.rmSync(f, { force: true });
    }
    const got = +spawnSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "default=nw=1:nk=1", film.video]).stdout.toString().trim();
    if (got !== NN) throw new Error(`${got} frames composed, ${NN} drawn: a join lost frames`);
    console.log(`${NN} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s (${k} piece(s), x264 ${PRESET})`);
  }
} catch (e) {
  step(RUN, "intro", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally { await Promise.all(pages.map(p => p.close())); await server.close(); }
if (process.exitCode || has("stills")) process.exit(process.exitCode || 0);

// the junction frames of a dressed clip, written as their own files (never through a hard link), colour chunks stripped
// (a cICP chunk made Chrome draw the frame about 4 % darker: the junction jumped, round 10)
const junctions = (video, size) => {
  const J = path.join(BUILD, "junctions", size); fs.mkdirSync(J, { recursive: true });
  const names = N_CB ? [[`cutback-${N_CB}-first.png`, false], [`cutback-${N_CB}-last.png`, true]] : [["intro-last.png", true]];
  for (const [name, last] of names) {
    framePng(video, path.join(J, name), { last });
    if (size === "1080") { const f = path.join(FILM, "img", name); fs.rmSync(f, { force: true }); fs.copyFileSync(path.join(J, name), f); }
  }
  return names.map(x => x[0]);
};

// ── 4K: the 1080p build's sound on the 4K picture ──────────────────────────────────────────────────
if (TRIAL) {
  const v = film.video, f0 = path.join(BUILD, "4k", `${CLIP}-trial-first.png`), f1 = path.join(BUILD, "4k", `${CLIP}-trial-last.png`);
  framePng(v, f0); framePng(v, f1, { last: true });
  console.log(`trial: ${NN} frames at 3840×2160 → ${path.relative(process.cwd(), v)}; look at ${path.relative(process.cwd(), f0)} and ${path.basename(f1)}, then delete them`);
  process.exit(0);
}
if (K4) {
  try {
    const OUT = path.join(BUILD, "4k", `${CLIP}.mov`), snd = path.join(BUILD, `${CLIP}.mp4`);
    if (!fs.existsSync(snd)) throw new Error(`build/${CLIP}.mp4 is missing: the 1080p render first (its sound is the 4K's)`);
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", film.video, "-i", snd, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "pcm_s16le", "-t", DUR.toFixed(3), OUT], { stdio: "inherit" });
    if (r.status) throw new Error("the sound could not be put on the 4K picture");
    fs.rmSync(film.video, { force: true });
    const js = junctions(OUT, "4k");
    console.log(`→ build/4k/${CLIP}.mov (3840×2160) · its junction frames → build/junctions/4k/ (${js.join(", ")})`);
    step(RUN, "intro", "done", `${N_CB ? `Cutback ${N_CB}` : "Your intro"} in 4K`);
  } catch (e) { step(RUN, "intro", "failed", String(e.message).slice(0, 160)); console.error(`✗ ${e.message}`); process.exitCode = 1; }
  process.exit(process.exitCode || 0);
}

// ── the sound: the user's voice untouched, the music from the first frame (the intro only), the sounds ─────────────
try {
  const OUT = path.join(BUILD, `${CLIP}.mp4`), wav = path.join(BUILD, `${CLIP}-audio.wav`), mOnly = path.join(BUILD, `${CLIP}-music.wav`);
  const LV = loudness(SRC);
  // the sounds against the user's real voice as the motion part's against the clone (-28.4 LUFS, sounds at -10 dB)
  const FXO = opt("fx-offset") != null ? +opt("fx-offset") : +(-10 + (LV.I + 28.4)).toFixed(1);
  const voice = `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${DUR},atrim=0:${DUR},asplit=2[vo][sc]`;
  let music = null;
  const args = ["-y", "-loglevel", "error", "-i", SRC], filt = [voice], labels = ["[vo]"];
  let idx = 1;
  if (!N_CB) {
    // the music starts with the hook (a 0.25 s fade in) and runs to the cut: the assembly goes on from there
    // the track: run.json › music, else the user's (profile.json › voiceover.music), else « Gimme That Groove! » from 1.95 s
    const PM = run.music || profile().voiceover?.music || {};
    const MUSIC = opt("music", PM.name || "gimme"), MSTART = +opt("music-start", PM.start ?? (MUSIC === "gimme" ? 1.95 : 0));
    const UNDER = +opt("music-under", 12);
    const mus = g => `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${DUR},afade=t=in:d=0.25,volume=${g}dB[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=2.5:attack=30:release=450:makeup=1[duck]`;
    let r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", SRC, "-ss", String(MSTART), "-i", musicPath(MUSIC), "-filter_complex", `${voice};${mus(0)};[vo]anullsink`, "-map", "[duck]", "-t", String(DUR), mOnly]);
    if (r.status) throw new Error("the music alone could not be mixed");
    const MG = +((LV.I - UNDER) - loudness(mOnly).I).toFixed(1);
    args.push("-ss", String(MSTART), "-i", musicPath(MUSIC)); filt.push(mus(MG)); labels.push("[duck]"); idx = 2;
    music = { name: MUSIC, start: MSTART, gain: MG, lufs: +(loudness(mOnly).I + MG).toFixed(1), next: r3(MSTART + DUR) };
  } else filt[0] = filt[0].replace(",asplit=2[vo][sc]", "[vo]");
  film.cues.forEach((c, i) => {
    const p = sfxPath(c.name), mode = c.align || ("end" in c ? "end" : "attack"), t = "end" in c ? c.end : c.t;
    const st = Math.max(0, t - alignOf(p, mode));
    if (st >= DUR - 0.05) return;
    args.push("-i", p);
    filt.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(st * 1000)}:all=1,volume=${(c.gain ?? 0) + FXO}dB[s${i}]`);
    labels.push(`[s${i}]`); idx++;
  });
  filt.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad=whole_dur=${DUR},atrim=0:${DUR}[out]`);
  let r = spawnSync("ffmpeg", [...args, "-filter_complex", filt.join(";"), "-map", "[out]", "-ac", "2", "-c:a", "pcm_s16le", wav], { stdio: "inherit" });
  if (r.status) throw new Error("the mix failed (ffmpeg)");
  const L = loudness(wav);
  r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", film.video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", "-t", DUR.toFixed(3), "-movflags", "+faststart", OUT], { stdio: "inherit" });
  if (r.status) throw new Error("the sound could not be put on the picture");
  for (const f of [film.video, wav, mOnly]) fs.rmSync(f, { force: true });
  const js = junctions(OUT, "1080");
  if (!N_CB) { const f = path.join(R, "intro-last.png"); fs.rmSync(f, { force: true }); fs.copyFileSync(path.join(BUILD, "junctions", "1080", "intro-last.png"), f); }
  fs.writeFileSync(path.join(BUILD, `${CLIP}.json`), JSON.stringify({ clip: CLIP, duration: r3(DUR), frames: N, speed: SPEED, voice: LV.I, mix: L.I, music, sounds: film.cues.length, fx: FXO, punches: film.cam.punches, at: Date.now() }, null, 1) + "\n");
  console.log(`voice ${LV.I.toFixed(1)} LUFS · mix ${L.I.toFixed(1)} LUFS, TP ${L.TP.toFixed(1)} dBTP${music ? ` · music ${music.name} from ${music.start} s at ${music.gain} dB (${(LV.I - music.lufs).toFixed(1)} LU under the voice), goes on at ${music.next} s` : " · no music (the assembly's bed runs under it)"} · ${film.cues.length} sounds at ${FXO} dB`);
  console.log(`→ ${path.relative(process.cwd(), OUT)} · junction frames → film/img/ (${js.join(", ")}): render the motion part${N_CB ? "s around it" : " after it"}`);
  step(RUN, "intro", "done", `${N_CB ? `Cutback ${N_CB}` : "Your intro"}, dressed: ${DUR.toFixed(1)} s`);
} catch (e) {
  step(RUN, "intro", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
