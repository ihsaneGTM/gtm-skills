#!/usr/bin/env node
// A MOTION SCENE in a part of the long video (references/motion-scenes.md; Ihsane, 2026-10-15: the shorts' motion pages
// tree-a/b/c « hyper bien fait », wanted in the long video too). One idea of a part told as an After Effects-like scene:
// written with gsap on the part's words (motion-kit/kit.js), rendered with alpha, laid in the part by F.motionPage
// (film/motionpage.js) over the screen's paper.
//
//   node motionscene.mjs <run> <scene> --part <n> --from <s> --to <s>     set the scene up (film seconds of the part: from
//                                                                         0.1–0.4 s before the screen's transition, to its end)
//   node motionscene.mjs <run> <scene> --variant <v> --sheet [--at t,…]   look: stills/motion/mp-<scene>-<v>.png (+ each still)
//   node motionscene.mjs <run> <scene> --variant <v>                      render: film/media/mp-<scene>/f0001.png… + meta.json
// The scene's folder: <run>/motion/<scene>/ (kit, gsap, faces, the run's people and logos, words.js, paper.png); write
// <v>.html there (references/scenes/*.html are the references).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, "../motion-kit"), FONTS = path.resolve(HERE, "../../../motion/fonts");
const a = process.argv.slice(2);
const RUN = path.resolve(a.shift() || ".");
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const has = k => a.includes("--" + k);
const NAME = a[0];
if (!fs.existsSync(path.join(RUN, "run.json"))) { console.error("✗ <run>: the video's folder (workspace/projects/<slug>)"); process.exit(2); }
if (!NAME || !/^[a-z0-9-]+$/.test(NAME)) { console.error("✗ <scene> (lower case, digits, dashes)"); process.exit(2); }
const DIR = path.join(RUN, "motion", NAME);
const r3 = x => Math.round(x * 1000) / 1000;
const W = 1920, H = 1080, FPS = 30;
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;

if (opt("from")) {
  const N = +opt("part"), FROM = +opt("from"), TO = +opt("to");
  if (!N || !(TO > FROM)) { console.error("✗ --part <n> --from <s> --to <s>"); process.exit(2); }
  fs.mkdirSync(path.join(DIR, "fonts"), { recursive: true });
  fs.cpSync(path.join(KIT, "vendor"), path.join(DIR, "vendor"), { recursive: true });
  fs.copyFileSync(path.join(KIT, "kit.js"), path.join(DIR, "kit.js"));
  for (const f of ["BricolageGrotesque.ttf", "Onest.ttf", "InstrumentSerif-Italic.ttf", "GeistMono.ttf"]) fs.copyFileSync(path.join(FONTS, f), path.join(DIR, "fonts", f));
  for (const k of ["people", "logos", "mascot"]) if (fs.existsSync(path.join(RUN, "film/img", k))) fs.cpSync(path.join(RUN, "film/img", k), path.join(DIR, "img", k), { recursive: true });
  if (fs.existsSync(path.join(RUN, "film/img/logo.png"))) fs.copyFileSync(path.join(RUN, "film/img/logo.png"), path.join(DIR, "img/brand-mark.png"));
  // the part's words on the scene's clock (film time = the voice's time + the segment's start)
  const ctx = {}; new Function("window", fs.readFileSync(path.join(RUN, "film", `words-${N}.js`), "utf8"))(ctx);
  const at = ctx.SEGS[0].at;
  const words = ctx.WORDS.map(w => ({ w: w.w, s: r3(w.s + at - FROM), e: r3(w.e + at - FROM) })).filter(w => w.s >= -0.01 && w.s < TO - FROM + 1);
  const info = { name: NAME, part: N, from: r3(FROM), to: r3(TO), dur: r3(TO - FROM) };
  fs.writeFileSync(path.join(DIR, "words.js"), `window.WORDS=${JSON.stringify(words)};\nwindow.PAGE_INFO=${JSON.stringify(info)};\n`);
  // the screen's paper (fx.js › F.paperBg + brand.css), for the sheets
  const probe = path.join(RUN, "film", "_paper-probe.html");
  fs.writeFileSync(probe, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="theme.css"><style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden}.scr,.scr-bg,.scr *{position:absolute}</style></head><body><div class="scr"><div class="scr-bg paperbg" style="--gx1:30%;--gy1:30%;--gx2:70%;--gy2:65%"></div></div></body></html>`);
  const srv = await serveDir(path.join(RUN, "film")); const { cdp, close } = await launchChrome();
  await cdp.send("Page.enable"); await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: `${srv.url}/_paper-probe.html` }); await sleep(1500);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(DIR, "paper.png"), Buffer.from(data, "base64"));
  await close(); await srv.close(); fs.rmSync(probe);
  console.log(`motion/${NAME}/ set up: part ${N}, ${words.length} words, ${info.dur} s. Write <variant>.html there`);
  process.exit(0);
}

const V = opt("variant");
if (!V || !fs.existsSync(path.join(DIR, `${V}.html`))) { console.error(`✗ --variant <v>: motion/${NAME}/<v>.html`); process.exit(2); }
const INFO = JSON.parse(fs.readFileSync(path.join(DIR, "words.js"), "utf8").match(/PAGE_INFO=(.*);/)[1]);
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
  for (let i = 0; i < 600 && !ready; i++) { await sleep(100); if (broken) break; try { ready = await cdp.eval("window.__ready === true"); } catch {} }
  if (!ready) { await close(); throw new Error(`the scene did not get ready${broken ? `: ${broken.split("\n")[0]}` : ""}`); }
  const shot = async (t) => { await cdp.eval(`(async () => { __page.seek(${t.toFixed(5)}); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); return 1; })()`); const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }); return Buffer.from(data, "base64"); };
  return { close, shot, info: () => cdp.eval("({ dur: __page.dur, cues: __page.cues })") };
};
try {
  if (has("sheet")) {
    // a contact sheet on the paper: 12 instants (or --at), 4 by 3, each 480×270
    const pg = await open(true, `still=1&guides=1`);
    const { dur } = await pg.info();
    const ts = opt("at") ? opt("at").split(",").map(Number) : Array.from({ length: 12 }, (_, i) => r3(0.3 + (dur - 0.4) * i / 11));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mp16-"));
    for (const [i, t] of ts.entries()) fs.writeFileSync(path.join(tmp, `s${String(i).padStart(2, "0")}.png`), await pg.shot(t));
    await pg.close();
    const SD = path.join(RUN, "stills", "motion"); fs.mkdirSync(SD, { recursive: true });
    const out = path.join(SD, `mp-${NAME}-${V}.png`), cols = Math.min(4, ts.length), rows = Math.ceil(ts.length / cols);
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", path.join(tmp, "s%02d.png"), "-vf", `scale=480:270,tile=${cols}x${rows}:padding=6:color=gray`, "-frames:v", "1", out], { encoding: "utf8" });
    if (r.status) throw new Error(r.stderr);
    for (const [i, t] of ts.entries()) fs.renameSync(path.join(tmp, `s${String(i).padStart(2, "0")}.png`), path.join(SD, `mp-${NAME}-${V}-${t}.png`));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`stills/motion/mp-${NAME}-${V}.png: ${ts.length} instants (${ts.join(", ")} s) · full size: stills/motion/mp-${NAME}-${V}-<t>.png`);
  } else {
    const OUT = path.join(RUN, "film", "media", `mp-${NAME}`);
    fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
    const first = await open(true);
    const info = await first.info(), N = Math.round(info.dur * FPS);
    const K = Math.max(1, Math.min(+opt("pieces", 3), Math.floor(N / 60)));
    const pages = [first, ...(await Promise.all(Array.from({ length: K - 1 }, () => open(false))))];
    const t0 = Date.now();
    await Promise.all(pages.map(async (pg, j) => {
      for (let i = Math.round(N * j / K); i < Math.round(N * (j + 1) / K); i++) fs.writeFileSync(path.join(OUT, `f${String(i + 1).padStart(4, "0")}.png`), await pg.shot(i / FPS));
    }));
    await Promise.all(pages.map(p => p.close()));
    fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ kind: "motion", fps: FPS, n: N, alpha: true, source: `motion/${NAME}/${V}.html`, part: INFO.part, from: INFO.from, cues: info.cues }, null, 1));
    console.log(`film/media/mp-${NAME}/ — ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s · ${info.cues.length} sounds`);
  }
} catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1; }
finally { await server.close(); }
