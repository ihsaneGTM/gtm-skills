#!/usr/bin/env node
// The video's real stock shots and GIFs (references/media.md): a professional editor diversifies (Ihsane, 2026-10-13:
// « ça fait trop IA sinon »). Free commercial licences only for the shots; GIFs for organic use, credited.
//
//   node media.mjs <run> stock search "<words>" ["<more words>"…] [--n 12]
//        Mixkit's search (no key; each candidate's licence read: a Restricted one is marked and never fetched), and Pexels
//        when PEXELS_API_KEY is set (its site blocks scripts: without a key, find Pexels pages with a web search and give
//        their link to `get`) → assets/stock/search-<words>.json and sheet-<words>.jpg (numbered): LOOK at it
//   node media.mjs <run> stock get <a Pexels video page | a Mixkit video page | a file> --name <name> --from 1 --to 4.2
//        [--author "<name and profile link>"]
//        only those seconds are fetched (a 1 s handle on each side is wise), 1920×1080 at 30 fps, H.264 crf 23, no sound →
//        assets/clips/<name>.mp4 + .source.json (page, author, licence, seconds), then its frames. A Mixkit page under its
//        Restricted licence (720p, personal use) is refused; a Pexels page is fetched through its own free-download link.
//   node media.mjs <run> gif search "<words>" ["<more>"…] [--n 8]      GIPHY (GIPHY_API_KEY) → assets/gifs/sheet-<words>.jpg
//   node media.mjs <run> gif get <id | giphy page | link | file> --name <name> [--from s] [--to s]
//        [--crop W:H:X:Y] [--blur X:Y:W:H] [--caption "…"]
//        → assets/gifs/<name>.mp4 + .source.json (a TV channel's mark cropped off, or blurred: --blur is placed in the
//        picture once cropped), then its frames
//   node media.mjs <run> frames <name> [--4k]       the film's pictures again: film/media/<name>/f0001.jpg… (a shot 1600×900,
//        a GIF 1080 high at 15 fps); --4k: a shot's 3200×1800 frames in film/media4k/<name>/ (the 4K render reads them)
//   node media.mjs <run> frames --all [--4k]
//   node media.mjs <run> sheet                        every clip and GIF, one labelled frame each → assets/media-sheet.jpg
//   node media.mjs <run> credits                      the README's « Media » section, from the .source.json files
// Keys (never printed): PEXELS_API_KEY (optional), GIPHY_API_KEY (optional), from the environment or .env.local.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "../../../motion/brand.mjs";
import { launchChrome, sleep } from "../../../motion/cdp.mjs";
import { step } from "../../../motion/progress.mjs";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i >= 0 && i + 1 < a.length ? a[i + 1] : d; };
const FLAGS = ["--n", "--name", "--from", "--to", "--author", "--crop", "--blur", "--caption"];
const words = [];
for (let i = 3; i < a.length; i++) { if (a[i].startsWith("--")) { if (FLAGS.includes(a[i])) i++; continue; } words.push(a[i]); }
const RUN = path.resolve(a[0] || ".");
const [kind, verb] = [a[1], a[2]];
if (!fs.existsSync(path.join(RUN, "film"))) { console.error(`✗ no film in ${RUN} (scripts/new.mjs first)`); process.exit(2); }
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const CLIPS = path.join(RUN, "assets", "clips"), GIFS = path.join(RUN, "assets", "gifs"), STOCK = path.join(RUN, "assets", "stock");
const tag = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "media";
const ff = (args, what) => { const r = spawnSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 }); if (r.status) throw new Error(`${what}: ${String(r.stderr).trim().slice(-300)}`); };
const dur = f => +String(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).stdout).trim();
function key(name) {
  if (process.env[name]?.trim()) return process.env[name].trim();
  try { const m = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*['"]?([^'"\\s]+)`, "m")); if (m && !/^(your[_-]|xxx|changeme|<)/i.test(m[1])) return m[1]; } catch {}
  return null;
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// a sheet of numbered pictures (remote or data: URLs), drawn by Chrome
async function sheet(cells, out) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}body{background:#1d1d22;width:1700px;padding:20px;font:15px/1.3 -apple-system,Helvetica,sans-serif;color:#eee}main{display:grid;grid-template-columns:repeat(4,400px);gap:20px}figure{background:#2a2a31;border-radius:8px;overflow:hidden}img{display:block;width:400px;height:225px;object-fit:cover;background:#000}figcaption{padding:8px 10px;min-height:58px}b{display:inline-block;min-width:26px;padding:2px 6px;margin-right:6px;border-radius:5px;background:#FFD90D;color:#111}.no{color:#ff8b8b;font-weight:700}</style></head><body><main>${cells.map((c, i) => `<figure><img src="${esc(c.img)}"><figcaption><b>${i + 1}</b>${c.html}</figcaption></figure>`).join("")}</main></body></html>`;
  const { cdp, close } = await launchChrome();
  try {
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1700, height: 900, deviceScaleFactor: 1, mobile: false });
    const { frameTree } = await cdp.send("Page.getFrameTree");
    await cdp.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
    for (let i = 0; i < 60; i++) { await sleep(250); if (await cdp.eval("[...document.images].every(i => i.complete)")) break; }
    const h = await cdp.eval("document.body.scrollHeight");
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 86, clip: { x: 0, y: 0, width: 1700, height: Math.ceil(h), scale: 1 }, captureBeyondViewport: true });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data, "base64"));
  } finally { await close(); }
}

// ── the film's pictures of a clip or a GIF ──────────────────────────────────────────────────────────────
function frames(name, k4 = false) {
  const clip = path.join(CLIPS, `${name}.mp4`), gif = path.join(GIFS, `${name}.mp4`);
  const isGif = !fs.existsSync(clip) && fs.existsSync(gif);
  const src = isGif ? gif : clip;
  if (!fs.existsSync(src)) throw new Error(`no assets/clips/${name}.mp4 nor assets/gifs/${name}.mp4`);
  if (isGif && k4) { console.log(`${name}: a GIF keeps its 1080 frames at 4K (a print, not full screen)`); return null; }
  const dest = path.join(RUN, "film", k4 ? "media4k" : "media", name);
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true });
  // a shot: 1600×900 (the frame on the paper), lanczos, q 4; at 4K 3200×1800, q 3; a GIF: 15 fps, 1080 high, q 3
  const vf = isGif ? "fps=15,scale=-2:1080" : k4 ? "scale=3200:1800:flags=lanczos" : "scale=1600:900:flags=lanczos";
  ff(["-i", src, "-vf", vf, "-q:v", isGif || k4 ? "3" : "4", path.join(dest, "f%04d.jpg")], `the frames of ${name}`);
  const n = fs.readdirSync(dest).filter(f => f.endsWith(".jpg")).length, fps = isGif ? 15 : 30;
  if (!k4) fs.writeFileSync(path.join(dest, "media.json"), JSON.stringify({ kind: isGif ? "gif" : "shot", file: path.relative(RUN, src), n, fps, at: new Date().toISOString() }, null, 1) + "\n");
  console.log(`${name}: ${n} pictures at ${fps} fps (${(n / fps).toFixed(2)} s) → film/${k4 ? "media4k" : "media"}/${name}`);
  if (!k4) console.log(isGif ? `  gif(s, '${name}', ${n}, t0, t1, { cap: '…' })    (pinned print on the right; organic use only)` : `  shot('${name}', ${n}, t0, t1, <the second of the clip it starts at>)`);
  return n;
}

try {
  // ═════ stock shots ═════
  if (kind === "stock" && verb === "search") {
    if (!words.length) throw new Error('what to look for: node media.mjs <run> stock search "call center" ["phone answer"]');
    const items = [];
    for (const q of words) {
      // Mixkit: its search page lists each clip with its licence (JSON-LD copyrightNotice)
      const r = await fetch(`https://mixkit.co/free-stock-video/${tag(q)}/`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        const h = await r.text();
        const lic = {};
        // the page's JSON-LD gives the licence of its first clips; the others are checked by `get` on their own page
        const objs = [...h.matchAll(/"@type":"VideoObject","@id":"(https:\/\/mixkit\.co\/free-stock-video\/[^"#]+)#video"/g)];
        objs.forEach((m, k) => { const seg = h.slice(m.index, objs[k + 1]?.index ?? m.index + 4000), c = /"copyrightNotice":"([^"]*)"/.exec(seg); if (c) lic[m[1]] = { licence: c[1] }; });
        for (const m of h.matchAll(/data-item-grid--video-player-item-id-value="(\d+)"[\s\S]*?<img src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?href="(\/free-stock-video\/[^"]+)"/g)) {
          const page = `https://mixkit.co${m[4]}`, L = lic[page] || {};
          items.push({ q, source: "Mixkit", id: m[1], page, title: m[3], thumb: m[2], licence: L.licence || "to check (get does)", status: /Restricted/i.test(L.licence || "") ? "RESTRICTED" : L.licence ? "free" : "to check" });
        }
      } else console.log(`Mixkit: HTTP ${r.status} for « ${q} »`);
      // Pexels: its API with a key (the site itself blocks scripts)
      const pk = key("PEXELS_API_KEY");
      if (pk) {
        const p = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=${opt("n", "12")}&orientation=landscape`, { headers: { Authorization: pk }, signal: AbortSignal.timeout(30000) });
        if (p.ok) for (const v of (await p.json()).videos || []) items.push({ q, source: "Pexels", id: String(v.id), page: v.url, title: v.url.split("/").filter(Boolean).pop().replace(/-\d+$/, "").replace(/-/g, " "), thumb: v.image, duration: v.duration, author: `${v.user?.name} (${v.user?.url})`, licence: "Pexels License", status: "free" });
        else console.log(`Pexels: HTTP ${p.status}${p.status === 401 ? " (the key is refused)" : ""}`);
      }
    }
    if (!items.length) { console.log("nothing found: other words (what the picture SHOWS: « woman answering phone », « server room »)"); process.exit(0); }
    const out = path.join(STOCK, `sheet-${tag(words[0])}.jpg`);
    fs.mkdirSync(STOCK, { recursive: true });
    fs.writeFileSync(path.join(STOCK, `search-${tag(words[0])}.json`), JSON.stringify(items, null, 1) + "\n");
    await sheet(items.map(it => ({ img: it.thumb, html: `${esc(it.source)} ${esc(it.id)}${it.duration ? ` · ${it.duration} s` : ""} ${it.status === "RESTRICTED" ? "<span class=no>RESTRICTED</span>" : esc(it.status)}<br>${esc(it.title.slice(0, 70))}` })), out);
    items.forEach((it, i) => console.log(`${String(i + 1).padStart(2)}. ${it.status.padEnd(10)} ${it.source.padEnd(6)} ${it.page}  ${it.title}`));
    if (!key("PEXELS_API_KEY")) console.log("(Pexels without a key: search the web for « site:pexels.com/video <words> » and give the page to `stock get`)");
    console.log(`→ ${path.relative(ROOT, out)}: LOOK at it, then: node plugins/video/skills/voiceover-video/scripts/media.mjs ${path.relative(ROOT, RUN)} stock get <page> --name <name> --from <s> --to <s>`);
  } else if (kind === "stock" && verb === "get") {
    const what = words[0], name = opt("name"), from = +opt("from", 0), to = opt("to") != null ? +opt("to") : null;
    if (!what || !/^[a-z0-9-]+$/.test(name || "")) throw new Error("usage: media.mjs <run> stock get <page | file> --name <name> --from <s> --to <s>");
    let url = null, src = { page: what, author: opt("author"), licence: null };
    if (fs.existsSync(what)) { url = path.resolve(what); src = { page: null, file: what, author: opt("author") || "the user", licence: "the user's own" }; }
    else if (/pexels\.com\/video\//.test(what) || /^pexels:\d+$/.test(what)) {
      // Pexels: its own free-download link redirects to the file (the page itself is behind a bot check: never forced)
      const id = (/(\d+)\/?$/.exec(what.replace(/[?#].*$/, "")) || /pexels:(\d+)/.exec(what) || [])[1];
      if (!id) throw new Error(`no video id in ${what}`);
      const r = await fetch(`https://www.pexels.com/download/video/${id}/`, { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(30000) });
      url = r.headers.get("location");
      if (!url) throw new Error(`Pexels gave no file for ${id} (HTTP ${r.status})`);
      src = { page: /^https?:/.test(what) ? what : `https://www.pexels.com/video/${id}/`, author: opt("author") || "(Pexels: add --author)", licence: "Pexels License (free for commercial use, no attribution required; https://www.pexels.com/license/)" };
    } else if (/mixkit\.co\/free-stock-video\//.test(what)) {
      // Mixkit: only its Free licence (many clips are « Restricted »: 720p, personal use only: refused)
      const r = await fetch(what, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`Mixkit: HTTP ${r.status}`);
      const h = await r.text();
      // the page names its licence in its JSON-LD (license: …#videoFree) and on its button (data-license="videoFree");
      // the button's words are split over lines, so the plain words alone are not enough (2026-10-15)
      const free = /#videoFree"|data-license="videoFree"|copyrightNotice":"Free/.test(h);
      if (/data-license="videoRestricted"|#videoRestricted"|Restricted License/i.test(h) || !free) throw new Error("this Mixkit clip is not under the Mixkit Stock Video Free License (Restricted: personal use only): pick another");
      const id = (/-(\d+)\/?$/.exec(what.replace(/[?#].*$/, "")) || [])[1];
      for (const res of ["1080", "720"]) { const u = `https://assets.mixkit.co/videos/${id}/${id}-${res}.mp4`; const hd = await fetch(u, { method: "HEAD", headers: { "User-Agent": UA } }); if (hd.ok) { url = u; break; } }
      if (!url) throw new Error(`Mixkit gave no file for ${id}`);
      src = { page: what, author: opt("author") || "Mixkit", licence: "Mixkit Stock Video Free License (free for commercial use, no attribution required; https://mixkit.co/license/)" };
    } else throw new Error(`a Pexels or Mixkit video page, or a file: ${what} (other sites: check their licence by hand first)`);
    fs.mkdirSync(CLIPS, { recursive: true });
    const out = path.join(CLIPS, `${name}.mp4`);
    // only the seconds needed, cropped to 16:9 (cover), 30 fps, no sound
    ff([...(from ? ["-ss", String(from)] : []), ...(to != null ? ["-to", String(to)] : []), "-i", url, "-an", "-vf", "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,fps=30,format=yuv420p",
      "-c:v", "libx264", "-crf", "23", "-preset", "medium", "-movflags", "+faststart", out], "the clip");
    fs.writeFileSync(`${out.replace(/\.mp4$/, "")}.source.json`, JSON.stringify({ kind: "shot", name, ...src, seconds: [from, to ?? +(from + dur(out)).toFixed(2)], at: new Date().toISOString() }, null, 1) + "\n");
    console.log(`assets/clips/${name}.mp4: ${dur(out).toFixed(2)} s · ${src.licence} · ${src.author}`);
    frames(name);
  }
  // ═════ GIFs ═════
  else if (kind === "gif" && verb === "search") {
    const gk = key("GIPHY_API_KEY");
    if (!gk) throw new Error("No GIPHY key (GIPHY_API_KEY in .env.local; free at developers.giphy.com, or in the app: Settings › Connectors › Add key). A link works without one: media.mjs <run> gif get <giphy page> --name <name>");
    const items = [], seen = new Set();
    for (const q of words) {
      const u = new URL("https://api.giphy.com/v1/gifs/search");
      for (const [k2, v] of Object.entries({ q, limit: opt("n", "8"), rating: "pg", lang: "en", api_key: gk })) u.searchParams.set(k2, v);
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`GIPHY answered HTTP ${r.status}`);
      for (const d of (await r.json()).data || []) {
        if (seen.has(d.id)) continue; seen.add(d.id);
        const o = d.images?.original || {};
        items.push({ q, id: d.id, title: d.title || "", page: d.url, user: d.username || null, width: +o.width || null, height: +o.height || null, frames: +o.frames || null, thumb: d.images?.fixed_width_still?.url || d.images?.downsized_still?.url });
      }
    }
    if (!items.length) { console.log("nothing found: the meme's own name works best (« this is fine », « math lady »)"); process.exit(0); }
    const out = path.join(GIFS, `sheet-${tag(words[0])}.jpg`);
    fs.mkdirSync(GIFS, { recursive: true });
    fs.writeFileSync(path.join(GIFS, `search-${tag(words[0])}.json`), JSON.stringify(items, null, 1) + "\n");
    await sheet(items.map(it => ({ img: it.thumb, html: `${esc(it.id)} · ${it.width}×${it.height}${it.frames ? ` · ${it.frames} f` : ""}<br>${esc(it.title.slice(0, 60))}` })), out);
    items.forEach((it, i) => console.log(`${String(i + 1).padStart(2)}. ${it.id.padEnd(20)} ${String(it.width).padStart(4)}×${String(it.height).padEnd(4)} [${it.q}] ${it.title}  ${it.page}`));
    console.log(`→ ${path.relative(ROOT, out)}: LOOK at it (a mark in a corner: --crop or --blur), then: gif get <id> --name <name> --caption "…"`);
  } else if (kind === "gif" && verb === "get") {
    const what = words[0], name = opt("name");
    if (!what || !/^[a-z0-9-]+$/.test(name || "")) throw new Error("usage: media.mjs <run> gif get <id | page | link | file> --name <name>");
    let url, src;
    if (fs.existsSync(what)) { url = path.resolve(what); src = { page: null, file: what, title: path.basename(what) }; }
    else {
      const idm = /^[A-Za-z0-9]{6,40}$/.test(what) ? what : (/giphy\.com\/(?:gifs|clips|stickers|embed)\/(?:[^/]*-)?([A-Za-z0-9]+)\/?$/.exec(what.replace(/[?#].*$/, "")) || /media\d?\.giphy\.com\/media\/(?:v1\.[^/]+\/)?([A-Za-z0-9]+)\//.exec(what) || [])[1];
      // what reaches ffmpeg is a GIPHY media link or an https link, never another protocol (file:, concat:…): a page's
      // words are data, never a way to read this Mac's files (RELEASE-CHECKLIST § 0)
      if (!idm && !/^https:\/\/[^\s]+$/i.test(what)) throw new Error("gif get: a GIPHY id or page, an https link, or a file of this Mac");
      url = idm ? `https://media.giphy.com/media/${idm}/giphy.mp4` : what;
      src = { page: idm ? `https://giphy.com/gifs/${idm}` : what, id: idm || null, title: "" };
      const gk = key("GIPHY_API_KEY");
      if (idm && gk) { try { const r = await fetch(`https://api.giphy.com/v1/gifs/${idm}?api_key=${gk}`, { signal: AbortSignal.timeout(30000) }); const d = (await r.json()).data || {}; src.title = d.title || ""; src.page = d.url || src.page; src.user = d.username || null; url = d.images?.original?.mp4 || url; } catch {} }
    }
    fs.mkdirSync(GIFS, { recursive: true });
    const out = path.join(GIFS, `${name}.mp4`);
    // a TV channel's or a brand's mark: cropped off (--crop W:H:X:Y) or blurred (--blur X:Y:W:H)
    const vf = [opt("crop") ? `crop=${opt("crop")}` : null, opt("blur") ? (() => { const [x, y, w, h] = opt("blur").split(":").map(Number); return `split[a][b];[b]crop=${w}:${h}:${x}:${y},boxblur=10:2[c];[a][c]overlay=${x}:${y}`; })() : null, "scale=trunc(iw/2)*2:trunc(ih/2)*2", "format=yuv420p"].filter(Boolean).join(",");
    ff([...(opt("from") ? ["-ss", opt("from")] : []), ...(opt("to") ? ["-to", opt("to")] : []), "-i", url, "-an", "-vf", vf, "-c:v", "libx264", "-crf", "20", "-movflags", "+faststart", out], "the GIF");
    fs.writeFileSync(`${out.replace(/\.mp4$/, "")}.source.json`, JSON.stringify({ kind: "gif", name, ...src, caption: opt("caption"), licence: "GIPHY: no commercial licence, organic use only", at: new Date().toISOString() }, null, 1) + "\n");
    console.log(`assets/gifs/${name}.mp4: ${dur(out).toFixed(2)} s · ${src.title || src.page || src.file} · organic use only`);
    frames(name);
  }
  // ═════ frames, sheet, credits ═════
  else if (kind === "frames") {
    const all = a.includes("--all"), k4 = a.includes("--4k");
    const names = all ? [...new Set([...(fs.existsSync(CLIPS) ? fs.readdirSync(CLIPS) : []), ...(fs.existsSync(GIFS) ? fs.readdirSync(GIFS) : [])].filter(f => /^[a-z0-9-]+\.mp4$/.test(f)).map(f => f.replace(/\.mp4$/, "")))] : [verb];
    if (!names[0]) throw new Error("usage: media.mjs <run> frames <name> [--4k] | frames --all [--4k]");
    for (const n of names) frames(n, k4);
  } else if (kind === "sheet") {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gtm-media-"));
    try {
      const cells = [];
      for (const [dir, k2] of [[CLIPS, "shot"], [GIFS, "gif"]]) for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith(".mp4")).sort() : []) {
        const jpg = path.join(tmp, `${k2}-${f}.jpg`);
        ff(["-ss", String(Math.min(1.2, dur(path.join(dir, f)) / 2)), "-i", path.join(dir, f), "-frames:v", "1", "-vf", "scale=400:-2", jpg], "a sheet frame");
        const s = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, f.replace(/\.mp4$/, ".source.json")), "utf8")); } catch { return {}; } })();
        cells.push({ img: `data:image/jpeg;base64,${fs.readFileSync(jpg).toString("base64")}`, html: `${k2} · ${esc(f.replace(/\.mp4$/, ""))} · ${dur(path.join(dir, f)).toFixed(1)} s<br>${esc((s.licence || "").split("(")[0])}` });
      }
      if (!cells.length) throw new Error("no clip nor GIF yet");
      await sheet(cells, path.join(RUN, "assets", "media-sheet.jpg"));
      console.log(`→ assets/media-sheet.jpg (${cells.length}): look at it whole, as one series`);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  } else if (kind === "credits") {
    const rows = [];
    for (const dir of [CLIPS, GIFS]) for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith(".source.json")).sort() : []) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      rows.push(`| ${s.kind} | \`${path.relative(RUN, path.join(dir, f.replace(/\.source\.json$/, ".mp4")))}\` | ${s.page || s.file || ""} | ${s.author || s.user || s.title || ""} | ${s.seconds ? `${s.seconds[0]}–${s.seconds[1]} s` : ""} | ${s.licence || ""} |`);
    }
    const block = `<!-- media -->\n## Media: stock shots and GIFs\n\n| Kind | File | Source | Author | Seconds taken | Licence |\n| --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\nGIFs: GIPHY grants no commercial licence: organic use only (replace them before any paid ad; drop one if a Content ID claim comes up).\n<!-- /media -->`;
    const readme = path.join(RUN, "README.md"), r = fs.existsSync(readme) ? fs.readFileSync(readme, "utf8") : "";
    fs.writeFileSync(readme, /<!-- media -->[\s\S]*<!-- \/media -->/.test(r) ? r.replace(/<!-- media -->[\s\S]*<!-- \/media -->/, block) : `${r.trimEnd()}\n\n${block}\n`);
    console.log(`README.md › Media: ${rows.length} row(s)`);
  } else {
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 29).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(2);
  }
  const shots = fs.existsSync(CLIPS) ? fs.readdirSync(CLIPS).filter(f => f.endsWith(".mp4")).length : 0, gifs = fs.existsSync(GIFS) ? fs.readdirSync(GIFS).filter(f => f.endsWith(".mp4")).length : 0;
  if (["stock", "gif"].includes(kind) && verb === "get") step(RUN, "media", "running", `${shots} stock shot${shots === 1 ? "" : "s"}, ${gifs} GIF${gifs === 1 ? "" : "s"}`);
} catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1; }
