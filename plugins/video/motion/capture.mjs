#!/usr/bin/env node
// A PUBLIC web page as a sharp picture, to show the real thing in a video (an official page, a pricing
// page, a product's own screen): no browser bar, the text sharp once zoomed.
//
//   node capture.mjs <url> <out.png> [--width 1280] [--height 900] [--scale 2] [--full] [--wait 2] [--mobile]
//                    [--selector "<css>"] [--pad 16] [--max-height <px>] [--timeout 90]
//     --full        the whole height of the page (else the window only), up to --max-height
//     --mobile      a phone's width (390 px) and a phone's page
//     --selector    one section of the page only: the first element that matches (".faq", "#bounce-rate",
//                   "main table"), scrolled to, with --pad pixels around it
//     --max-height  the tallest picture taken, in the page's pixels (default 16,000 px of picture: 8,000 at --scale 2);
//                   a taller page is cut there, and said
//     --timeout     seconds before the capture gives up (default 90): a very long page never hangs it
// Never a page behind a login, never a form filled in. A cookie banner: crop the picture afterwards, or
// capture further down. Always crop on the useful part and hide personal data before a video shows it.
import fs from "node:fs";
import { launchChrome, sleep } from "./cdp.mjs";

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const [url, out] = a;
if (!url || !out) { console.log('usage: node capture.mjs <url> <out.png> [--width 1280] [--height 900] [--scale 2] [--full] [--wait 2] [--mobile] [--selector "<css>"] [--pad 16] [--max-height px] [--timeout 90]'); process.exit(2); }
const mobile = a.includes("--mobile");
const w = +opt("width", mobile ? 390 : 1280), h = +opt("height", mobile ? 844 : 900), sc = +opt("scale", mobile ? 3 : 2);
const sel = opt("selector", null), pad = +opt("pad", 16);
const maxH = Math.max(h, +opt("max-height", Math.floor(16000 / sc)));
const timeout = +opt("timeout", 90);
const chrome = await launchChrome();
const { cdp, close } = chrome;
// the whole capture runs against a clock: past it, Chrome is stopped and the capture says why
const timer = setTimeout(() => {
  console.error(`✗ the capture took more than ${timeout} s (a very long page?): capture one section with --selector "<css>", or a shorter --max-height`);
  try { chrome.proc.kill("SIGKILL"); } catch {}
  process.exit(1);
}, timeout * 1000);
try {
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: sc, mobile });
  if (mobile) await cdp.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  await cdp.send("Page.navigate", { url });
  await sleep(1000 * +opt("wait", 2) + 1500);
  let clip = { x: 0, y: 0, width: w, height: h, scale: 1 }, cut = null;
  if (sel) {
    // one section: scrolled into view (what it loads lazily shows), then measured in the page's coordinates
    const find = `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'start' }); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height, W: document.documentElement.scrollWidth }; })()`;
    if (!(await cdp.eval(find))) throw new Error(`nothing on that page matches ${sel}`);
    await sleep(900);
    const r = await cdp.eval(find);
    const x = Math.max(0, Math.floor(r.x - pad)), y = Math.max(0, Math.floor(r.y - pad));
    const cw = Math.ceil(Math.min(r.w + 2 * pad, Math.max(w, r.W) - x)), ch = Math.ceil(r.h + 2 * pad);
    if (ch > maxH) cut = ch;
    clip = { x, y, width: cw, height: Math.min(ch, maxH), scale: 1 };
  } else if (a.includes("--full")) {
    const m = await cdp.send("Page.getLayoutMetrics");
    const full = Math.ceil(m.cssContentSize.height);
    if (full > maxH) cut = full;
    clip = { x: 0, y: 0, width: w, height: Math.min(full, maxH), scale: 1 };
  }
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  if (cut) console.log(`⚠ ${sel ? `the section ${sel}` : "the page"} is ${cut.toLocaleString("en-US")} px high: only its top ${clip.height.toLocaleString("en-US")} px were taken (--selector "<css>" for one section, --max-height to change it)`);
  console.log(`→ ${out} (${Math.round(clip.width * sc)} × ${Math.round(clip.height * sc)}): look at it, crop it on the useful part, hide personal data`);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
} finally { clearTimeout(timer); await close(); }
