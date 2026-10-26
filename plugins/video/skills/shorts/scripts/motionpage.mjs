#!/usr/bin/env node
// A MOTION PAGE: the content of one white page as an After Effects-like scene over the WHOLE vertical frame (Ihsane,
// 2026-10-14: « quand tu zoomes, il y a des éléments qui se cropent en haut et en bas… très osées, très dans la brand,
// très style After Effects »). The long video's engine drew in a 16:9 stage cropped to a column, so a zoom cut its content
// on a line in the middle of the frame; here the page IS the frame (1080×1920, transparent), written with gsap on the
// short's words (motion-kit/kit.js says how). whitePage() lays it on its sheet like any child: docLayer({ src, y: 0 }).
//
//   node motionpage.mjs <short> --page <name> --from <s> --to <s> [--seed 5] [--handoff] [--channel "<name>" --channel-logo <file>]   set the page up (once)
//   node motionpage.mjs <short> --page <name> --variant <v> --sheet [--at t,…] [--bg face.png] look: stills/mp-<page>-<v>.png
//   node motionpage.mjs <short> --page <name> --variant <v>                                     render its frames
//
// Set up: <short>/motion/<page>/ gets the kit, gsap, the faces, the pictures (people, logos, face), words.js (the page's
// words on its clock: 0 = the sheet starts rising) and paper.png (the sheet's own paper, for the stills and for a page
// that takes the paper over: PAGE({ handoff: t }), whitePage({ handoff }) then stops drawing it). Each variant: <v>.html there.
// Frames: assets/media/mp-<page>-<v>/f0001.png… (alpha) + meta.json (from, cues, camera).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, "../motion-kit");
const FONTS = path.resolve(HERE, "../../../motion/fonts");
const ROOT = path.resolve(HERE, "../../../../..");
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const has = k => a.includes("--" + k);
const D = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const NAME = opt("page");
if (!NAME || !/^[a-z0-9-]+$/.test(NAME)) { console.error("✗ --page <name> (lower case, digits, dashes)"); process.exit(2); }
const DIR = path.join(D, "motion", NAME);
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const r3 = x => Math.round(x * 1000) / 1000;
const W = 1080, H = 1920, FPS = 30;

// ── set up ────────────────────────────────────────────────────────────────────────────────────────────────────────
if (opt("from")) {
  const FROM = +opt("from"), TO = +opt("to"), SEED = +opt("seed", 5);
  if (!(TO > FROM)) { console.error("✗ --from <s> --to <s>: the page's span, seconds of the short"); process.exit(2); }
  fs.mkdirSync(path.join(DIR, "fonts"), { recursive: true });
  fs.cpSync(path.join(KIT, "vendor"), path.join(DIR, "vendor"), { recursive: true });
  fs.copyFileSync(path.join(KIT, "kit.js"), path.join(DIR, "kit.js"));
  for (const f of ["BricolageGrotesque.ttf", "Onest.ttf", "InstrumentSerif-Italic.ttf", "GeistMono.ttf"]) fs.copyFileSync(path.join(FONTS, f), path.join(DIR, "fonts", f));
  const img = path.join(DIR, "img");
  const people = path.join(ROOT, "workspace", "projects", "waterfall-v1-part2", "film", "img", "people");
  if (fs.existsSync(people)) fs.cpSync(people, path.join(img, "people"), { recursive: true });
  for (const [k, src] of [["logos", path.join(ROOT, "workspace", "brand", "logos")], ["face", path.join(ROOT, "workspace", "brand", "face")], ["tools", path.join(HERE, "../../../assets/logos")]])
    if (fs.existsSync(src)) fs.cpSync(src, path.join(img, k), { recursive: true });
  // the channel (the end card's row under the player): Your brand's name and logo (the run's brand/theme.json, written by
  // new.mjs from workspace/brand/), or the ones given for this run (--channel "<name>" --channel-logo <file>, kept in
  // run.json › channel); no name: the card has no channel row. Never a name the user did not give.
  {
    const RUN = fs.existsSync(path.join(D, "run.json")) ? D : path.resolve(D, "..", ".."), runF = path.join(RUN, "run.json"), run = readJSON(runF, null);
    const theme = readJSON(path.join(RUN, "brand", "theme.json"), {}) || {};
    if (run && (opt("channel") || opt("channel-logo"))) {
      run.channel = { ...(run.channel || {}), ...(opt("channel") ? { name: opt("channel") } : {}), ...(opt("channel-logo") ? { logo: path.resolve(opt("channel-logo")) } : {}) };
      fs.writeFileSync(runF, JSON.stringify(run, null, 2) + "\n");
    }
    const name = String(run?.channel?.name || theme.name || "").trim().slice(0, 60) || null;
    const logoSrc = [run?.channel?.logo, theme.logo && path.join(RUN, theme.logo)].find(f => f && fs.existsSync(f)) || null;
    let logo = null;
    if (name && logoSrc) { logo = `img/channel${path.extname(logoSrc).toLowerCase() || ".png"}`; fs.mkdirSync(path.join(DIR, "img"), { recursive: true }); fs.copyFileSync(logoSrc, path.join(DIR, logo)); }
    fs.writeFileSync(path.join(DIR, "channel.js"), `window.CHANNEL=${JSON.stringify(name ? { name, logo } : null)};\n`);
    console.log(name ? `the channel: « ${name} »${logo ? ", its logo" : ", no logo (its first letter)"}` : "the channel: none (Your brand has no name; --channel \"<name>\" --channel-logo <file> to give one)");
  }
  const words = readJSON(path.join(D, "words.json"), []).filter(w => w.s >= FROM - 0.01 && w.s < TO + 2).map(w => ({ w: w.w, s: r3(w.s - FROM), e: r3(w.e - FROM) }));
  const page = { name: NAME, from: r3(FROM), to: r3(TO), dur: r3(TO - FROM), seed: SEED, handoff: has("handoff") };
  fs.writeFileSync(path.join(DIR, "words.js"), `window.WORDS=${JSON.stringify(words)};\nwindow.PAGE_INFO=${JSON.stringify(page)};\n`);
  // the sheet's paper, as whitePage() draws it (at its drift at the handoff, when there is one)
  const { paperCanvas } = await import("./doc.mjs");
  const pz = 1;   // a sheet with a handoff does not drift (whitePage)
  const { createCanvas } = await import("../../short-editor/scripts/scene.mjs");
  const c = createCanvas(W, H), x = c.getContext("2d");
  x.translate(W / 2, H / 2); x.scale(pz, pz); x.translate(-W / 2, -H / 2); x.drawImage(paperCanvas(W, H, SEED), 0, 0);
  fs.writeFileSync(path.join(DIR, "paper.png"), await c.toBuffer("image/png"));
  console.log(`motion/${NAME}/ set up: ${words.length} words, ${page.dur} s${page.handoff ? ", its paper can be taken over (PAGE({ handoff }))" : ""}. Write motion/${NAME}/<variant>.html (motion-kit/kit.js)`);
  process.exit(0);
}

const V = opt("variant");
if (!V || !fs.existsSync(path.join(DIR, `${V}.html`))) { console.error(`✗ --variant <v>: motion/${NAME}/<v>.html`); process.exit(2); }
const INFO = (() => { const s = fs.readFileSync(path.join(DIR, "words.js"), "utf8"); return JSON.parse(s.match(/PAGE_INFO=(.*);/)[1]); })();
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;
const server = await serveDir(DIR);
const open = async (log, query = "") => {
  const { cdp, close } = await launchChrome();
  let broken = null;
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  if (log) cdp.on("Runtime.consoleAPICalled", p => console.log(`[${NAME}/${V}]`, p.args.map(x => x.value ?? x.description).join(" ")));
  cdp.on("Runtime.exceptionThrown", p => { broken = p.exceptionDetails.exception?.description || p.exceptionDetails.text; console.log(`[${NAME}/${V} error]`, broken); });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await cdp.send("Page.navigate", { url: `${server.url}/${V}.html?${query}` });
  let ready = false;
  for (let i = 0; i < 300 && !ready; i++) { await sleep(100); if (broken) break; try { ready = await cdp.eval("window.__ready === true"); } catch {} }
  if (!ready) { await close(); throw new Error(`the page did not get ready${broken ? `: ${broken.split("\n")[0]}` : ""}`); }
  const shot = async (t) => { await cdp.eval(`(async () => { __page.seek(${t.toFixed(5)}); await new Promise(r => requestAnimationFrame(() => r())); return 1; })()`); const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }); return Buffer.from(data, "base64"); };
  return { close, shot, info: () => cdp.eval("({ dur: __page.dur, cues: __page.cues, camera: __page.camera, handoff: __page.handoff })") };
};
try {
  if (has("sheet")) {
    // a contact sheet on the paper, the subtitles' band marked: 10 instants (or --at), 5 by 2, each 324×576
    const pg = await open(true, `still=1&guides=1${opt("bg") ? `&bg=${encodeURIComponent(opt("bg"))}` : ""}`);
    const { dur } = await pg.info();
    const ts = opt("at") ? opt("at").split(",").map(Number) : Array.from({ length: 10 }, (_, i) => r3(0.5 + (dur - 0.6) * i / 9));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mp-"));
    for (const [i, t] of ts.entries()) fs.writeFileSync(path.join(tmp, `s${String(i).padStart(2, "0")}.png`), await pg.shot(t));
    await pg.close();
    const SD = path.join(D, "stills"); fs.mkdirSync(SD, { recursive: true });
    const out = path.join(SD, `mp-${NAME}-${V}.png`), cols = Math.min(5, ts.length), rows = Math.ceil(ts.length / cols);
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", path.join(tmp, "s%02d.png"), "-vf", `scale=324:576,tile=${cols}x${rows}:padding=6:color=gray`, "-frames:v", "1", out], { encoding: "utf8" });
    if (r.status) throw new Error(r.stderr);
    // full-size stills too, to look closely
    for (const [i, t] of ts.entries()) fs.renameSync(path.join(tmp, `s${String(i).padStart(2, "0")}.png`), path.join(SD, `mp-${NAME}-${V}-${t}.png`));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`stills/mp-${NAME}-${V}.png: ${ts.length} instants (${ts.join(", ")} s; the n-th tile is the n-th, from 0) · full size: stills/mp-${NAME}-${V}-<t>.png`);
  } else {
    const OUT = path.join(D, "assets", "media", `mp-${NAME}-${V}`);
    fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
    const first = await open(true);
    const info = await first.info(), N = Math.round(info.dur * FPS);
    const K = Math.max(1, Math.min(4, os.availableParallelism() - 2, Math.floor(N / 60)));
    const pages = [first, ...(await Promise.all(Array.from({ length: K - 1 }, () => open(false))))];
    const t0 = Date.now();
    await Promise.all(pages.map(async (pg, j) => {
      for (let i = Math.round(N * j / K); i < Math.round(N * (j + 1) / K); i++) fs.writeFileSync(path.join(OUT, `f${String(i + 1).padStart(4, "0")}.png`), await pg.shot(i / FPS));
    }));
    await Promise.all(pages.map(p => p.close()));
    fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ fps: FPS, width: W, height: H, frames: N, loop: false, alpha: true, source: `motion/${NAME}/${V}.html`, from: INFO.from, cues: info.cues, camera: info.camera, handoff: info.handoff }, null, 1));
    console.log(`assets/media/mp-${NAME}-${V}/ — ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s · ${info.cues.length} sounds`);
  }
} catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1; }
finally { await server.close(); }
