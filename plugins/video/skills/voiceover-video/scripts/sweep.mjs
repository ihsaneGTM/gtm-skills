#!/usr/bin/env node
// The face ↔ screen junction (run.json › junction « sweep »; Ihsane, 2026-10-14, for a facecam video that cuts often): film/sweep.html drawn on a transparent page, frame by frame, into
// build/sweep/<name>.mov (ProRes 4444 with alpha, 21 frames, covered on frame 10). One file per variant (seed, direction).
//   node scripts/sweep.mjs <run-dir> [--seeds 3,7,11,19] [--dirs up,down] [--still 10]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0]);
const page = path.join(RUN, "film", "sweep.html");
if (!fs.existsSync(page)) fs.copyFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "template", "document", "film", "sweep.html"), page);
const seeds = opt("seeds", "3,7,11,19").split(",").map(Number), dirs = opt("dirs", "up").split(",");
const OUT = path.join(RUN, "build", "sweep"); fs.mkdirSync(OUT, { recursive: true });
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;
const server = await serveDir(RUN);
const { cdp, close } = await launchChrome();
try {
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const seed of seeds) for (const dir of dirs) {
    const name = `sweep-${seed}-${dir}`, F = path.join(OUT, name);
    fs.rmSync(F, { recursive: true, force: true }); fs.mkdirSync(F, { recursive: true });
    await cdp.send("Page.navigate", { url: `${server.url}/film/sweep.html?seed=${seed}&dir=${dir}` });
    for (let i = 0; i < 100; i++) { await sleep(60); try { if (await cdp.eval("window.__ready === true")) break; } catch {} }
    const { N } = await cdp.eval("window.SWEEP");
    for (let f = 0; f < N; f++) {
      await cdp.eval(`draw(${f})`);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
      fs.writeFileSync(path.join(F, `s${String(f).padStart(3, "0")}.png`), Buffer.from(data, "base64"));
    }
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-framerate", "30", "-i", path.join(F, "s%03d.png"), "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", path.join(OUT, `${name}.mov`)], { stdio: "inherit" });
    if (r.status) throw new Error("encode " + name);
    console.log(`→ build/sweep/${name}.mov (${N} frames)`);
  }
} finally { await close(); await server.close(); }
