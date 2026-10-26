#!/usr/bin/env node
// A real tool's PUBLIC homepage as a sharp picture, for the voiceover video: the full viewport above the fold, as a
// visitor sees it (Ihsane, round 11: « show the whole viewport height », never a thin top band): 1440 × 900 at ×2
// (2880 × 1800, 16:10), shown in the film in a browser frame with the site's name (page1() of the story).
// The cookie and consent banners, chat bubbles, modal dialogs and open menus are hidden by a style sheet put in the page
// before the shot, and any fixed box whose text says « cookie » too (Pipecorn's probo banner): hidden, never accepted.
//
//   node capture.mjs <url> <out.png> [--width 1440] [--height 900] [--scale 2] [--full] [--wait 2] [--mobile]
//                    [--selector "<css>"] [--pad 16] [--max-height <px>] [--timeout 90]
//     --full        the whole height of the page (else the viewport only), up to --max-height
//     --mobile      a phone's width (390 px) and a phone's page
//     --selector    one section of the page only (the first element that matches), with --pad pixels around it
//     --logo "<css>"  the brand's own mark alone, cut out cleanly: that element (its SVG or image), its intro animations
//                   finished, every background made transparent, on a transparent page → a PNG with alpha (use --scale 6
//                   for a sharp mark; --color "#111" paints a one-colour mark drawn in currentColor, e.g. a white logo of a
//                   dark header). Then trim it: ffmpeg -i <out.png> -vf "scale=-2:64:flags=lanczos" film/img/logos/<key>.png
// Then: ffmpeg -i <out.png> -q:v 2 film/img/pages/<key>-vp.jpg (the film reads <key>-vp.jpg), and LOOK at it: a banner
// the style sheet missed, or the site's own tag over the hero, is hidden by an extra rule or cropped by hand.
// Never a page behind a login, never a form filled in, nothing clicked.
import fs from "node:fs";
import { launchChrome, sleep } from "../../../motion/cdp.mjs";

const HIDE = ["#onetrust-consent-sdk", "#onetrust-banner-sdk", "#CybotCookiebotDialog", "#usercentrics-root", "#didomi-host", "#axeptio_overlay",
  "#hs-eu-cookie-confirmation", ".cc-window", ".cky-consent-container", "#cookiescript_injected", ".osano-cm-window", "#truste-consent-track",
  "[id*=cookie i]", "[class*=cookie i]", "[id*=consent i]", "[class*=consent i]", "[aria-label*=cookie i]",
  "#intercom-container", ".intercom-lightweight-app", "#hubspot-messages-iframe-container", ".drift-frame-controller", "#crisp-chatbox",
  "[class*=dropdown i]", "[class*=mega i]", "[class*=submenu i]", "[role=dialog]", "[aria-modal=true]", "[class*=modal i]", "[class*=backdrop i]", "[id*=axeptio i]", "[class*=axeptio i]", "[id*=tarteaucitron i]", "[id*=probo i]", "[class*=probo i]"].join(",") + "{display:none!important} *{backdrop-filter:none!important} body *{filter:none!important}";
const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const [url, out] = a;
if (!url || !out) { console.log('usage: node capture.mjs <url> <out.png> [--width 1440] [--height 900] [--scale 2] [--full] [--wait 2] [--mobile] [--selector "<css>"] [--pad 16] [--max-height px] [--timeout 90]'); process.exit(2); }
const mobile = a.includes("--mobile");
const w = +opt("width", mobile ? 390 : 1440), h = +opt("height", mobile ? 844 : 900), sc = +opt("scale", mobile ? 3 : 2);
const sel = opt("selector", null), pad = +opt("pad", 16), logo = opt("logo", null), color = opt("color", null);
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
  // the banners hidden, never accepted: consent tools by their usual ids, anything named cookie/consent, chat bubbles,
  // menus left open; the page may scroll again
  await cdp.eval(`(()=>{document.querySelectorAll("probo-cookie-banner").forEach(e=>e.remove());const s=document.createElement("style");s.textContent=${JSON.stringify(HIDE)};document.head.appendChild(s);document.body.style.overflow="auto";document.documentElement.style.overflow="auto";document.dispatchEvent(new MouseEvent("mousemove",{clientX:5,clientY:900}));return 1})()`);
  await sleep(1200);
  await cdp.eval(`(()=>{let n=0;for(const e of document.querySelectorAll('body *')){const cs=getComputedStyle(e);if((cs.position==='fixed'||cs.position==='sticky')&&/cookie/i.test(e.textContent||'')&&e.textContent.length<800){e.style.setProperty('display','none','important');n++;}}return n})()`);
  await sleep(500);
  let clip = { x: 0, y: 0, width: w, height: h, scale: 1 }, cut = null;
  if (logo) {
    // the mark alone on a transparent page: its animations run to their end, every other thing hidden, no background
    await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const r = await cdp.eval(`(() => {
      const e = document.querySelector(${JSON.stringify(logo)}); if (!e) return null;
      for (const an of document.getAnimations()) { try { an.finish(); } catch {} }
      e.setAttribute('data-gtm-logo', '1');
      ${color ? `for (const x of [e, ...e.querySelectorAll('*')]) x.style.setProperty('color', ${JSON.stringify(color)}, 'important');` : ""}
      const s = document.createElement('style');
      s.textContent = 'html,body,body *{background:transparent!important;background-color:transparent!important;backdrop-filter:none!important;box-shadow:none!important;filter:none!important}body *{visibility:hidden!important}[data-gtm-logo],[data-gtm-logo] *{visibility:visible!important}';
      document.head.appendChild(s);
      e.scrollIntoView({ block: 'center' });
      const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height };
    })()`);
    if (!r || !r.w) throw new Error(`no mark on that page matches ${logo}`);
    await sleep(600);
    const p = 2;
    clip = { x: Math.max(0, r.x - p), y: Math.max(0, r.y - p), width: r.w + 2 * p, height: r.h + 2 * p, scale: 1 };
  } else if (sel) {
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
