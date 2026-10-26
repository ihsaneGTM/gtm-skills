#!/usr/bin/env node
// The progress marker of a long video (look.md § Long videos: chapters): film/tracker.html drawn on a transparent page,
// one overlay per chapter, laid by the assembly right AFTER the chapter's yellow page (it holds about 4.5 s, then leaves
// on mechanical sounds: assemble.mjs lays them). Validated by Ihsane on 2026-10-14 (the bar framed; WHITE chosen, yellow and dark
// kept as options).
//
//   node tracker.mjs <run-dir>                       → build/tracker/chapter-<i>.mov for every chapter of run.json › chapters
//                                                      (all the chapters on the bar up to 5, else 3 around the new one)
//   node tracker.mjs <run-dir> --only 3              → that chapter only
//   node tracker.mjs <run-dir> --theme dark          → overrides run.json › tracker.theme (white, the default | yellow | dark)
//   node tracker.mjs <run-dir> --demo '<o json>' --dur 22.7 --states-at 9.85 --out build/tracker-demo.mov
//                                                    → one overlay of a whole clip, the marker appearing at --states-at
// run.json › chapters: [{ title: "Level 2", part: 13, at: 31.2 }, …] (at: the instant in that piece where the marker
//   appears: the chapter page's end; a chapter may give `clip: "cutback-4"` instead of `part`)
// run.json › tracker: { theme: "dark", kicker: "FUNNEL" | null, mascot: "pipecorn-49.png" | false, hold: 4.5, labels:
//   [short label per chapter] } (labels default to the chapters' titles). The mascot is film/img/mascot/<file>: the
//   brand's own (Pipecorn: Frame 49 of Pipecorn/Assets), never another character.
// Each overlay is ProRes 4444 with alpha, hold + 0.8 s long, the marker in at 0 and out at `hold`.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { launchChrome, serveDir, sleep } from "../../../motion/cdp.mjs";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const run = (() => { try { return JSON.parse(fs.readFileSync(path.join(RUN, "run.json"), "utf8")); } catch { return {}; } })();
const TR = run.tracker || {};
const THEME = opt("theme", TR.theme || "white"), HOLD = +(TR.hold ?? 4.5);
const page = path.join(RUN, "film", "tracker.html");
if (!fs.existsSync(page)) fs.copyFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "template", "document", "film", "tracker.html"), page);
const GC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!process.env.CHROME && fs.existsSync(GC)) process.env.CHROME = GC;

// the jobs: { out, dur, at, o } (o without appear/hide: set from `at` and the hold)
const jobs = [];
if (opt("demo")) {
  const o = JSON.parse(opt("demo")), at = +opt("states-at", 0);
  jobs.push({ out: path.resolve(RUN, opt("out", "build/tracker-demo.mov")), dur: +opt("dur", HOLD + 0.8), o: { ...o, appear: at, hide: at + HOLD } });
} else {
  const CH = run.chapters || [];
  if (!CH.length) { console.error("✗ run.json › chapters is empty: write the chapters first (look.md § Long videos: chapters)"); process.exit(2); }
  const L = TR.labels || CH.map((c) => c.short || c.title);
  CH.forEach((c, i) => {
    if (opt("only") != null && +opt("only") !== i + 1) return;
    // the chapters shown: ALL of them up to 5 (Ihsane: « il faut toujours afficher les trois chapitres pour montrer qu'on
    // est bien en troisième »), else a window of 3 kept full at both ends; before the update the new one is still « next »
    const n = CH.length, lo = n <= 5 ? 0 : Math.max(0, Math.min(i - 1, n - 3)), hi = n <= 5 ? n - 1 : lo + 2;
    const items = [];
    for (let j = lo; j <= hi; j++) items.push({ t: L[j], b: j < i - 1 ? "done" : j === i - 1 ? "now" : "next", a: j < i ? "done" : j === i ? "now" : "next" });
    jobs.push({ out: path.join(RUN, "build", "tracker", `chapter-${i + 1}.mov`), dur: HOLD + 0.8,
      o: { appear: 0, hide: HOLD, kicker: c.kicker ?? TR.kicker ?? null, count: `CHAPTER ${i + 1} / ${CH.length}`, mascot: TR.mascot ?? "pipecorn-49.png", items } });
  });
}
const server = await serveDir(RUN);
const { cdp, close } = await launchChrome();
try {
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await cdp.send("Page.navigate", { url: `${server.url}/film/tracker.html?theme=${THEME}` });
  for (let i = 0; i < 100; i++) { await sleep(60); try { if (await cdp.eval("window.__ready === true")) break; } catch {} }
  for (const j of jobs) {
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    const TMP = j.out + ".frames"; fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
    // the first draw builds the bar and loads the mascot: wait for every picture before the first frame
    await cdp.eval(`draw(0, ${JSON.stringify(j.o)})`);
    await cdp.eval(`Promise.all([...document.images].map((i) => i.decode().catch(() => {})))`);
    await sleep(150);
    const N = Math.round(j.dur * 30), { appear: A0, hide: H0 } = j.o;
    let last = null;
    for (let f = 0; f < N; f++) {
      const t = f / 30;
      // a frame changes only around the appearance and the exit: the rest repeats the last one
      const busy = (t >= A0 - 0.05 && t <= A0 + 1.5) || (t >= H0 - 0.5 && t <= H0 + 0.6);
      const file = path.join(TMP, `t${String(f).padStart(5, "0")}.png`);
      if (busy || !last) {
        await cdp.eval(`draw(${t.toFixed(4)}, ${JSON.stringify(j.o)})`);
        const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
        fs.writeFileSync(file, Buffer.from(data, "base64")); last = file;
      } else fs.copyFileSync(last, file);
    }
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-framerate", "30", "-i", path.join(TMP, "t%05d.png"), "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", j.out], { stdio: "inherit" });
    fs.rmSync(TMP, { recursive: true, force: true });
    if (r.status) throw new Error("the encode of " + path.basename(j.out));
    console.log(`→ ${path.relative(process.cwd(), j.out)} (${N} frames, ${THEME})`);
  }
} finally { await close(); await server.close(); }
