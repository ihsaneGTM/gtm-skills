#!/usr/bin/env node
// The content of a white page, drawn by the YouTube video editor's own engine (Ihsane, 2026-10-14: « les visuels ne sont
// pas du tout au niveau de notre skill /video-youtube-editor… la to-do list… pas pareille à nos to-do lists… l'étape 2
// pixelisée »). The long video's blocks (B.method, the editorial lines with the yellow marker, the LinkedIn-like profile
// cards, the counters, the tiles, ink…) with every effect they carry, timed on the short's words, on a TRANSPARENT page:
// whitePage() lays the frames on its sheet, which carries the paper, the grain, the vignette and the light.
//
//   node docpage.mjs <short-dir> --name <page> --from <s> --to <s> [--crop 360,0,1200,1080] [--stills 1.2,3]
//
// Setup (once per short): <short-dir>/doc/ gets the engine of voiceover-video's template « Document » (engine.js, fx.js,
// blocs.js, framed.js, theme.css), the brand's faces and colours (brand.css, brand.js, fonts/).
// Per page: doc/<page>-words.js (the short's words from --from to --to, on the page's own clock), doc/<page>.html, and
// doc/<page>-story.js: THE file to write (a skeleton is put there the first time; the reference blocks:
// voiceover-video/references/example-story-part2.js, its helpers in voiceover-video/template/document/film/story.js).
// The engine's stage is 1920×1080: lay the page's content in the central column --crop (default x 360-1560), which is
// what lands on the vertical sheet (scaled to its width). Writes assets/media/doc-<page>/f0001.png… (alpha) + meta.json.
// --stills t,…: stills/doc-<page>-<t>.png only (on a white ground, to look at), no frames.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.resolve(HERE, "../../voiceover-video/template/document/film");
const FONTS = path.resolve(HERE, "../../../motion/fonts");
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const D = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const NAME = opt("name");
if (!NAME || !/^[a-z0-9-]+$/.test(NAME)) { console.error("✗ --name <page> (lower case, digits, dashes)"); process.exit(2); }
const FROM = +opt("from"), TO = +opt("to");
if (!(TO > FROM)) { console.error("✗ --from <s> --to <s>: the page's span, seconds of the short"); process.exit(2); }
const [CX, CY, CW, CH] = String(opt("crop", "360,0,1200,1080")).split(",").map(Number);
const DOC = path.join(D, "doc");
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const P = readJSON(path.join(D, "project.json"), {});

// ── the engine and the brand, once ────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(path.join(DOC, "fonts"), { recursive: true });
fs.mkdirSync(path.join(DOC, "img"), { recursive: true });
for (const f of ["engine.js", "fx.js", "blocs.js", "framed.js", "theme.css", "docs.js", "photos.js"]) fs.copyFileSync(path.join(TPL, f), path.join(DOC, f));
for (const f of ["BricolageGrotesque.ttf", "Onest.ttf", "InstrumentSerif-Italic.ttf"]) if (!fs.existsSync(path.join(DOC, "fonts", f))) fs.copyFileSync(path.join(FONTS, f), path.join(DOC, "fonts", f));
const accent = P.accent || "#FFD90D", ink = P.ink || "#1A1A1A";
fs.writeFileSync(path.join(DOC, "brand.css"), `@font-face{font-family:"GTM Title";src:url(fonts/BricolageGrotesque.ttf) format("truetype");font-weight:100 900}
@font-face{font-family:"GTM Text";src:url(fonts/Onest.ttf) format("truetype");font-weight:100 900}
@font-face{font-family:"GTM Serif";src:url(fonts/InstrumentSerif-Italic.ttf) format("truetype")}
:root{--v:${accent};--ink:${ink};--on-v:${ink};--v-on-white:${ink};--logo-on-v:none}
/* a white page of a short: the engine draws the content only, on a transparent page (whitePage() carries the paper) */
html,body,#stage{background:transparent!important}
.post,.scr-bg,.paperbg,.light,.vig,.grain,.dust{display:none!important}
`);
fs.writeFileSync(path.join(DOC, "brand.js"), `window.LANG = ${JSON.stringify(P.language || "en")};
window.BRAND = {"name":"","logo":"","site":"","phone":"","lightAccent":true};
window.FONTS = ['700 40px "GTM Title"', '600 40px "GTM Title"', '400 40px "GTM Text"', '700 40px "GTM Text"'];
`);

// ── the page: its words, its html, its story's skeleton ───────────────────────────────────────────────────────────
const W = readJSON(path.join(D, "words.json"), []);
const r3 = x => Math.round(x * 1000) / 1000;
const words = W.filter(w => w.s >= FROM - 0.01 && w.s < TO).map(w => ({ w: w.w, s: r3(w.s - FROM), e: r3(Math.min(w.e, TO) - FROM) }));
const DUR = r3(TO - FROM);
fs.writeFileSync(path.join(DOC, `${NAME}-words.js`), `window.WORDS=${JSON.stringify(words)};\nwindow.SEGS=[{"s0":0,"s1":${r3(DUR + 1)},"at":0}];\nwindow.GEN={"t0":0,"t1":0};\nwindow.CUTS=[];\nwindow.PAGE={"name":${JSON.stringify(NAME)},"dur":${DUR},"from":${r3(FROM)},"crop":[${CX},${CY},${CW},${CH}]};\n`);
fs.writeFileSync(path.join(DOC, `${NAME}.html`), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Short page · ${NAME}</title>
<link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="brand.css"></head>
<body><div id="stage"></div>
<script src="brand.js"></script><script src="${NAME}-words.js"></script><script src="docs.js"></script><script src="photos.js"></script>
<script src="engine.js"></script><script src="fx.js"></script><script src="blocs.js"></script><script src="framed.js"></script>
<script src="${NAME}-story.js"></script><script>F.boot();</script></body></html>
`);
const STORY = path.join(DOC, `${NAME}-story.js`);
if (!fs.existsSync(STORY)) {
  // the template's skeleton, with all its blocks (ed, callout, profileCard, sheet, tile, chart, lockCard, counters…) and
  // their look, up to its instants: the page's content is written after it
  const tpl = fs.readFileSync(path.join(TPL, "story.js"), "utf8");
  const head = tpl.slice(0, tpl.indexOf("  /* ---------- instants")).replace("__SLUG__", NAME).replace(/^\/\*[\s\S]*?\*\/\n/, "");
  fs.writeFileSync(STORY, `/* A white page of a short (/video-long-to-shorts), drawn by the long video's engine (« Document »): THE content to write at the
   end. Its words: « ${words.map(w => w.w).join(" ")} »
   Lay it in the central column x ${CX}-${CX + CW}, y ${CY}-${CY + CH} (what lands on the vertical sheet); the sheet and its
   paper are the short's. Blocks and their use: voiceover-video/references/example-story-part1.js and part2.js. */
${head}
  F.DUR = ${DUR};
  const t = {};
  F.T = t;
  const s = F.screen('page', 0, F.DUR + 1, { push: 0, dof: 0 });
  // TO WRITE: ed(s, 'Who is <u>in charge</u>', 960, 200, A('There'), { markAt: A('charge') });
  // B.method(s, A('these') - 0.1, [['Lives the problem', A('these'), Z('these')], …], { tOverview: … });
};
`);
  // the fictional people of the long video (Nano Banana 2 headshots), for the profile cards
  const people = path.join(path.resolve(HERE, "../../../../.."), "workspace", "projects", "waterfall-v1-part2", "film", "img", "people");
  if (fs.existsSync(people)) fs.cpSync(people, path.join(DOC, "img", "people"), { recursive: true });
  console.log(`doc/${NAME}-story.js: the skeleton, to write (${words.length} words, ${DUR} s)`);
  process.exit(0);
}

// ── the frames: Chrome draws the page, transparent, cropped to the column ───────────────────────────────────────
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;
const server = await serveDir(DOC);
const open = async (log) => {
  const { cdp, close } = await launchChrome();
  let broken = null;
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  if (log) cdp.on("Runtime.consoleAPICalled", p => console.log(`[${NAME}]`, p.args.map(x => x.value ?? x.description).join(" ")));
  cdp.on("Runtime.exceptionThrown", p => { broken = p.exceptionDetails.exception?.description || p.exceptionDetails.text; console.log(`[${NAME} error]`, broken); });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await cdp.send("Page.navigate", { url: `${server.url}/${NAME}.html?render=1` });
  let ready = false;
  for (let i = 0; i < 400 && !ready; i++) { await sleep(100); if (broken) break; try { ready = await cdp.eval("window.__filmReady === true"); } catch {} }
  if (!ready) { await close(); throw new Error(`the page did not get ready${broken ? `: ${broken.split("\n")[0]}` : ""} (open doc/${NAME}.html to see it)`); }
  await cdp.eval(`(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; return 1; })()`);
  const shot = async (t) => { await cdp.eval(`__film.seek(${t.toFixed(5)})`); const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: CX, y: CY, width: CW, height: CH, scale: 1 } }); return Buffer.from(data, "base64"); };
  return { close, shot, cues: () => cdp.eval("__film.cues") };
};
const FPS = 30, N = Math.round(DUR * FPS);
try {
  if (opt("stills")) {
    const pg = await open(true);
    const SD = path.join(D, "stills"); fs.mkdirSync(SD, { recursive: true });
    for (const t of opt("stills").split(",").map(Number)) {
      const f = path.join(SD, `doc-${NAME}-${t}.png`);
      fs.writeFileSync(f + ".tmp.png", await pg.shot(t));
      // on white, to look at
      const { spawnSync } = await import("node:child_process");
      spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=white:s=${CW}x${CH}`, "-i", f + ".tmp.png", "-filter_complex", "[0][1]overlay", "-frames:v", "1", f]);
      fs.rmSync(f + ".tmp.png", { force: true });
    }
    await pg.close();
    console.log(`stills → stills/doc-${NAME}-*.png: look at each one`);
  } else {
    const OUT = path.join(D, "assets", "media", `doc-${NAME}`);
    fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
    const K = Math.max(1, Math.min(4, os.availableParallelism() - 2, Math.floor(N / 60)));
    const pages = [await open(true), ...(await Promise.all(Array.from({ length: K - 1 }, () => open(false))))];
    const t0 = Date.now();
    await Promise.all(pages.map(async (pg, j) => {
      for (let i = Math.round(N * j / K); i < Math.round(N * (j + 1) / K); i++) fs.writeFileSync(path.join(OUT, `f${String(i + 1).padStart(4, "0")}.png`), await pg.shot(i / FPS));
    }));
    const cues = await pages[0].cues();
    await Promise.all(pages.map(p => p.close()));
    fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ fps: FPS, width: CW, height: CH, frames: N, loop: false, alpha: true, source: `doc/${NAME}`, from: r3(FROM), cues }, null, 1));
    console.log(`assets/media/doc-${NAME}/ — ${N} frames (${CW}×${CH}, alpha) in ${((Date.now() - t0) / 1000).toFixed(0)} s · ${cues.length} sounds of the engine (meta.json › cues, page clock)`);
  }
} catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1; }
finally { await server.close(); }
