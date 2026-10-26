#!/usr/bin/env node
// Makes the Mac ready for the motion skills, so nobody has to: idempotent, quiet once done.
//
//   node bootstrap.mjs            the fonts, the Mac's own tools (built from their Swift source), a Chrome
//                                 to draw the films, the music and paper sounds of the shelf
//   node bootstrap.mjs --python   also the Python of the vertical styles (~/.venv/gtm-motion: numpy, OpenCV,
//                                 Pillow, SciPy, yt-dlp for the YouTube shots)
//   node bootstrap.mjs --check    says what is there and what is missing, installs nothing (exit 1 if missing)
//
// It never installs what needs a password. ffmpeg and Node 22 are Prepare your Mac's (the app's /setup).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fetchFonts, missing as missingFonts } from "./fonts.mjs";
import { findChrome } from "./cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, "..", "assets");
const HOME = os.homedir();
export const VENV = process.env.GTM_MOTION_VENV || path.join(HOME, ".venv", "gtm-motion");
export const PY = path.join(VENV, "bin", "python");
const CHECK = process.argv.includes("--check"), PYTHON = process.argv.includes("--python") || process.argv.includes("--all");
const run = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: "utf8", stdio: CHECK ? "pipe" : ["ignore", "inherit", "inherit"], ...o });
const has = bin => spawnSync("/bin/sh", ["-c", `command -v ${bin}`], { encoding: "utf8" }).status === 0;
const report = [], problems = [];
const ok = (what, detail = "") => report.push(`✓ ${what}${detail ? ` (${detail})` : ""}`);
const bad = (what, fix) => { problems.push(what); report.push(`✗ ${what}${fix ? `: ${fix}` : ""}`); };

// ── what Prepare your Mac installs ──────────────────────────────────────────────────────────────
if (!has("ffmpeg") || !has("ffprobe")) bad("ffmpeg", "brew install ffmpeg (or Prepare your Mac in the app)");
else ok("ffmpeg");
const nodeMajor = +process.versions.node.split(".")[0];
if (nodeMajor < 22) bad(`Node.js ${process.versions.node}`, "Node 22 or later: brew upgrade node");
else ok(`Node.js ${process.versions.node}`);

// ── the fonts (Google Fonts, OFL) ───────────────────────────────────────────────────────────────
if (missingFonts().length && !CHECK) { const e = await fetchFonts({ quiet: true }); e.forEach(x => report.push(`⚠ ${x}`)); }
if (missingFonts().length) bad(`fonts: ${missingFonts().join(", ")}`, "node plugins/video/motion/fonts.mjs"); else ok("fonts");

// ── the Mac's own tools, built once from their Swift source (Vision, PDFKit, Core Image) ───────
const NATIVE = path.join(HERE, "native");
for (const t of ["ocr", "pdf2png", "cutout"]) {
  const src = path.join(NATIVE, `${t}.swift`), bin = path.join(NATIVE, t);
  const fresh = fs.existsSync(bin) && fs.statSync(bin).mtimeMs >= fs.statSync(src).mtimeMs;
  if (!fresh && !CHECK) {
    if (!has("swiftc")) { bad(`${t} (Swift)`, "xcode-select --install"); continue; }
    const r = spawnSync("swiftc", ["-O", src, "-o", bin], { encoding: "utf8" });
    if (r.status !== 0) { bad(`${t} (Swift)`, r.stderr.split("\n")[0]); continue; }
  }
  if (fs.existsSync(bin)) ok(t); else bad(t, "node plugins/video/motion/bootstrap.mjs");
}

// ── a Chrome to draw the films: yours, or a headless one in ~/.cache/gtm-chrome ────────────────
let chrome = findChrome();
if (!chrome && !CHECK) {
  process.stderr.write("→ installing a headless Chrome to draw the videos (once per Mac, about 100 MB)…\n");
  run("npx", ["--yes", "@puppeteer/browsers@2", "install", "chrome-headless-shell@stable", "--path", path.join(HOME, ".cache", "gtm-chrome")]);
  chrome = findChrome();
}
if (chrome) ok("Chrome", chrome.includes("headless-shell") ? "headless" : path.basename(chrome)); else bad("Chrome", "node plugins/video/motion/bootstrap.mjs, or install Google Chrome");

// ── the shelf: the music and the paper sounds the motion styles use (Mixkit, downloaded once) ──
const SHELF = [
  ["music/mixkit-complicated-281.mp3", "https://assets.mixkit.co/music/281/281.mp3"],
  ["music/mixkit-gimme-that-groove-872.mp3", "https://assets.mixkit.co/music/872/872.mp3"],
  ["music/mixkit-hip-hop-02-738.mp3", "https://assets.mixkit.co/music/738/738.mp3"],
  ["music/mixkit-deep-urban-623.mp3", "https://assets.mixkit.co/music/623/623.mp3"],
  ["sfx/paper/mixkit-page-turn-single-1104.wav", "https://assets.mixkit.co/active_storage/sfx/1104/1104.wav"],
  ["sfx/paper/mixkit-paper-quick-movement-2380.wav", "https://assets.mixkit.co/active_storage/sfx/2380/2380.wav"],
  ["sfx/paper/mixkit-paper-slide-1530.wav", "https://assets.mixkit.co/active_storage/sfx/1530/1530.wav"],
];
for (const [rel, url] of SHELF) {
  const f = path.join(ASSETS, rel);
  if (fs.existsSync(f)) continue;
  if (CHECK) { report.push(`· ${rel} not downloaded yet (fetched on first run)`); continue; }
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(`${f}.part`, Buffer.from(await r.arrayBuffer()));
    fs.renameSync(`${f}.part`, f);
  } catch (e) { report.push(`⚠ ${rel}: ${e.message} (${url})`); }
}
ok("music and sound shelf");

// ── the Python of the vertical styles ───────────────────────────────────────────────────────────
// A Python of 3.10 or later (yt-dlp needs it): Homebrew's, else installed with Homebrew (no password);
// macOS's own 3.9 only as a last resort. Packages in a venv of their own, never system-wide.
const verOf = p => { const r = spawnSync(p, ["-c", "import sys; print('%d.%d' % sys.version_info[:2])"], { encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : null; };
const atLeast = (v, m) => { const [a, b] = v.split(".").map(Number); return a > 3 || (a === 3 && b >= m); };
function basePython() {
  const c = ["/opt/homebrew/bin/python3.13", "/opt/homebrew/bin/python3.12", "/opt/homebrew/bin/python3.14", "/opt/homebrew/bin/python3.11", "/opt/homebrew/bin/python3", "/usr/local/bin/python3", "python3"];
  for (const p of c) { const v = (p.includes("/") ? fs.existsSync(p) : has(p)) && verOf(p); if (v && atLeast(v, 10)) return p; }
  return null;
}
const PKGS = ["numpy", "opencv-python-headless", "pillow", "scipy", "yt-dlp[default]"];
const IMPORTS = "import numpy, cv2, PIL, scipy, yt_dlp";
const STAMP = path.join(VENV, ".gtm-checked");
const pyOk = () => fs.existsSync(PY) && (fs.existsSync(STAMP) || spawnSync(PY, ["-c", IMPORTS], { encoding: "utf8" }).status === 0);
if (PYTHON) {
  if (!pyOk() && !CHECK) {
    let base = basePython();
    if (!base && has("brew")) { process.stderr.write("→ installing Python 3.13 with Homebrew (once per Mac)…\n"); run("brew", ["install", "python@3.13"]); base = basePython(); }
    if (!base && fs.existsSync("/usr/bin/python3") && verOf("/usr/bin/python3")) { base = "/usr/bin/python3"; report.push("⚠ only macOS's Python 3.9: the YouTube shots may not download (yt-dlp needs 3.10)"); }
    if (!base) bad("Python 3.10+", "brew install python@3.13");
    else {
      process.stderr.write(`→ setting up the vertical styles' Python in ${VENV} (once per Mac, about a minute)…\n`);
      if (!fs.existsSync(PY)) run(base, ["-m", "venv", VENV]);
      run(PY, ["-m", "pip", "install", "-q", "--upgrade", "pip"]);
      run(PY, ["-m", "pip", "install", "-q", ...PKGS]);
      if (spawnSync(PY, ["-c", IMPORTS], { encoding: "utf8" }).status === 0) fs.writeFileSync(STAMP, new Date().toISOString() + "\n");
    }
  }
  if (pyOk()) ok("Python of the vertical styles", verOf(PY)); else bad("Python of the vertical styles", "node plugins/video/motion/bootstrap.mjs --python");
} else if (CHECK) report.push(pyOk() ? `✓ Python of the vertical styles (${verOf(PY)})` : "· Python of the vertical styles: set up on the first vertical video");

console.log(report.join("\n"));
process.exit(problems.length ? 1 : 0);
