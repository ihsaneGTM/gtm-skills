// A minimal Chrome DevTools client for the motion skills (Node ≥ 22: global WebSocket and fetch; no
// dependency). The films are HTML pages drawn as a pure function of time: Chrome renders them frame by
// frame, captures public pages, and draws documents.
//
// Which Chrome: $CHROME; else a headless shell (the one bootstrap.mjs installs in ~/.cache/gtm-chrome,
// or Puppeteer's); else Google Chrome or Chromium in /Applications. A headless shell is preferred: it
// starts faster and draws the same on every Mac.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOME = os.homedir();
const verNum = s => (String(s).match(/\d+/g) || []).map(Number);
const newer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
function shells() {
  const out = [];
  const roots = [path.join(HOME, ".cache", "gtm-chrome", "chrome-headless-shell"), path.join(HOME, ".cache", "chrome-headless", "chrome-headless-shell"), path.join(HOME, ".cache", "puppeteer", "chrome-headless-shell")];
  for (const r of roots) {
    let vs = [];
    try { vs = fs.readdirSync(r); } catch { continue; }
    for (const v of vs.sort(newer).reverse()) {
      for (const sub of ["chrome-headless-shell-mac-arm64", "chrome-headless-shell-mac-x64"]) {
        const p = path.join(r, v, sub, "chrome-headless-shell");
        if (fs.existsSync(p)) out.push(p);
      }
    }
  }
  return out;
}
export function findChrome() {
  if (process.env.CHROME && fs.existsSync(process.env.CHROME)) return process.env.CHROME;
  const apps = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", path.join(HOME, "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"), "/Applications/Chromium.app/Contents/MacOS/Chromium"];
  return [...shells(), ...apps].find(p => fs.existsSync(p)) || null;
}

// The debugging port is Chrome's own pick (--remote-debugging-port=0, read back from DevToolsActivePort in its profile):
// a port chosen at random here could be another Chrome's (two renders at once), and the render would then drive
// someone else's page. `port` is kept for a caller that needs a fixed one.
export async function launchChrome({ port = 0, headless = true } = {}) {
  const chrome = findChrome();
  if (!chrome) throw new Error("No Chrome on this Mac: run node plugins/video/motion/bootstrap.mjs (it installs a headless Chrome), or install Google Chrome.");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gtm-chrome-"));
  const args = [
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars", "--mute-audio", "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required",
    "--disable-extensions", "--disable-component-update",
    // every frame waits for all its tiles, with a tile budget big enough for 4K: no stale bands at the seams
    ...(process.env.NO_TILE_FIX ? [] : ["--run-all-compositor-stages-before-draw", "--disable-checker-imaging", "--force-gpu-mem-available-mb=8192", "--force-gpu-mem-discardable-limit-mb=4096"]),
    ...(process.env.CHROME_EXTRA ? process.env.CHROME_EXTRA.split(" ") : []),
  ];
  if (headless && !/chrome-headless-shell$/.test(chrome)) args.unshift("--headless=new");
  args.push("about:blank");
  const proc = spawn(chrome, args, { stdio: "ignore" });
  let ok = false;
  for (let i = 0; i < 200; i++) {
    if (!port) { try { port = +fs.readFileSync(path.join(dir, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); continue; } }
    try { await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); ok = true; break; } catch { await sleep(100); }
  }
  if (!ok) { proc.kill("SIGKILL"); throw new Error(`Chrome did not start (${chrome})`); }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(t => t.type === "page");
  const cdp = await connect(page.webSocketDebuggerUrl);
  return {
    proc, cdp, chrome,
    async close() {
      try { cdp.close(); } catch {}
      proc.kill("SIGTERM");
      await sleep(200);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    },
  };
}

export async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map(), listeners = new Map();
  ws.onmessage = ev => {
    const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) (listeners.get(msg.method) || []).forEach(f => f(msg.params));
  };
  const api = {
    send(method, params = {}) { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { res, rej })); },
    on(m, f) { if (!listeners.has(m)) listeners.set(m, []); listeners.get(m).push(f); },
    async eval(expression) {
      const r = await api.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    // a large result (a WAV as base64) kept in the page and read back in slices: one big CDP message hangs
    async evalBig(expression, chunk = 900000) {
      const n = await api.eval(`(async () => { window.__big = await (${expression}); return window.__big ? window.__big.length : 0; })()`);
      const parts = [];
      for (let i = 0; i < n; i += chunk) parts.push(await api.eval(`window.__big.slice(${i}, ${i + chunk})`));
      await api.eval("window.__big = null; 0");
      return parts.join("");
    },
    close() { ws.close(); },
  };
  return api;
}

export const FORMATS = { "16x9": [1920, 1080], "9x16": [1080, 1920], "1x1": [1080, 1080], "4x5": [1080, 1350] };

// a static server on 127.0.0.1, for the length of one render or capture: no dev server to keep running
export async function serveDir(root) {
  const http = await import("node:http");
  const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "video/mp4" };
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const f = path.resolve(base, "." + u);
    if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) };
}
