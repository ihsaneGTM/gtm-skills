// THE REACTION GIFS, from GIPHY (its API is made for this: apps that put GIFs in what people post).
//
//   node gif.mjs sheet "pepe silvia" "conspiracy board" [--n 6] [--rating pg]   # → tmp/gif-<words>.jpg
//   node gif.mjs search "empty wallet" [--n 8] [--sticker] [--rating pg-13]
//   node gif.mjs get <id> --name wallet [--width 0.80] [--sticker]   (0.80: the polaroid's width)
//
// sheet is how the validated cut's four GIFs were picked (Pepe Silvia, Key & Peele sweating, Buddy
// the Elf on the phone, « Let's get ready to rumble »): two to four searches by the meme's own name,
// the candidates on ONE contact sheet (the middle frame of each, its number, size, frames, title),
// rated pg; read the sheet, then get the one that says the sentence: a clean picture (no watermark,
// no burned-in line that contradicts the speaker), 480 px wide or more (a 280 px GIF is blown up 2×
// on the polaroid), the reaction in its first second (a card shows 1.5-2.6 s of it).
// search prints the candidates (id, title, size, its page) as text.
// get downloads the MP4 rendition (a sticker: its transparent WebP) and hands it to media.mjs.
// Needs GIPHY_API_KEY (free at developers.giphy.com) in .env.local; without it, say so and use
// a generated reaction picture (picture.mjs) or a GIF the user drops in the project instead.
// Credit: a short with GIPHY content says "GIFs via GIPHY" in its description; a meme belongs
// to whoever made it, so a paid ad never ships one (SKILL.md § Non-negotiables).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { key } from "./keys.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const cmd = argv[0];
const KEY = key("GIPHY_API_KEY");
if (!KEY) { console.error("GIPHY_API_KEY is not set (.env.local at the root of GTM by Pipecorn): no GIF search. Use picture.mjs for a reaction picture, or a GIF the user supplies (media.mjs)."); process.exit(3); }
const kind = argv.includes("--sticker") ? "stickers" : "gifs";

async function api(p, q) {
  const u = new URL(`https://api.giphy.com/v1/${kind}/${p}`);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  u.searchParams.set("api_key", KEY);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`GIPHY answered HTTP ${r.status}`);
  return r.json();
}

// the words of a command, its flags and their values left out
const words = () => argv.slice(1).filter((a, i, all) => !a.startsWith("--") && !["--n", "--rating", "--name", "--width", "--fps"].includes(all[i]) && !["--n", "--rating", "--name", "--width", "--fps"].includes(all[i - 1]));

if (cmd === "sheet") {
  const qs = words();
  if (!qs.length) { console.error('usage: node gif.mjs sheet "<words>" ["<other words>" …] [--n 6] [--rating pg]'); process.exit(2); }
  const { createCanvas, loadImage } = await import(new URL("../../short-editor/scripts/scene.mjs", import.meta.url).href);
  const items = [], seen = new Set();
  for (const q of qs) {
    const j = await api("search", { q, limit: arg("--n", "6"), rating: arg("--rating", "pg"), lang: "en" });
    for (const d of j.data || []) if (!seen.has(d.id)) { seen.add(d.id); items.push({ q, id: d.id, title: d.title, user: d.username || null, o: d.images?.original || {} }); }
  }
  if (!items.length) { console.log("nothing found; try the meme's own name ('confused travolta', 'skeleton waiting')"); process.exit(0); }
  fs.mkdirSync("tmp", { recursive: true });
  const tag = qs[0].replace(/[^a-z0-9]+/gi, "-").slice(0, 40), cw = 300, ch = 230, cols = 6, rows = Math.ceil(items.length / cols);
  const c = createCanvas(cols * cw, rows * ch), x = c.getContext("2d");
  x.fillStyle = "#222"; x.fillRect(0, 0, c.width, c.height);
  for (const [i, it] of items.entries()) {
    const f = path.resolve("tmp", `gif-${tag}-${i}.jpg`), dur = (+it.o.frames || 10) / 15;
    spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(dur * 0.5), "-i", it.o.mp4 || it.o.url, "-frames:v", "1", "-vf", "scale=290:-2", f]);
    const X = (i % cols) * cw, Y = Math.floor(i / cols) * ch;
    if (fs.existsSync(f)) { const im = await loadImage(f), k = Math.min(290 / im.width, 180 / im.height); x.drawImage(im, X + 5 + (290 - im.width * k) / 2, Y + 5, im.width * k, im.height * k); fs.rmSync(f); }
    x.fillStyle = "#fff"; x.font = "bold 15px sans-serif"; x.fillText(`${i}. ${it.o.width}x${it.o.height} ${it.o.frames ?? "?"}f`, X + 6, Y + 202);
    x.fillStyle = "#bbb"; x.font = "13px sans-serif"; x.fillText((it.title || "(no title)").slice(0, 38), X + 6, Y + 222);
  }
  const out = path.resolve("tmp", `gif-${tag}.jpg`);
  fs.writeFileSync(out, c.toBuffer("image/jpeg"));
  fs.writeFileSync(path.resolve("tmp", `gif-${tag}.json`), JSON.stringify(items.map(({ o, ...it }) => ({ ...it, width: o.width, height: o.height, frames: o.frames })), null, 1));
  console.log(items.map((it, i) => `${String(i).padStart(2)}. ${it.id.padEnd(20)} ${String(it.o.width).padStart(4)}x${String(it.o.height).padEnd(4)} ${(it.o.frames ? `${it.o.frames}f` : "").padEnd(5)} [${it.q}] ${it.title || "(no title)"}`).join("\n"));
  console.log(`${path.relative(process.cwd(), out)} — look at it, then: node gif.mjs get <id> --name <name>`);
} else if (cmd === "search") {
  const q = argv[1];
  if (!q) { console.error('usage: node gif.mjs search "<words>" [--n 8] [--sticker]'); process.exit(2); }
  const j = await api("search", { q, limit: arg("--n", "8"), rating: arg("--rating", "pg-13"), lang: "en" });
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync(path.join("tmp", `giphy-${q.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.json`), JSON.stringify(j.data.map(d => ({ id: d.id, title: d.title, url: d.url, images: d.images?.original })), null, 1));
  if (!j.data?.length) console.log("nothing found; try other words (the meme's own name works best: 'confused travolta', 'skeleton waiting')");
  for (const d of j.data || []) {
    const o = d.images?.original || {};
    console.log(`${d.id.padEnd(20)} ${String(o.width).padStart(4)}x${String(o.height).padEnd(4)} ${(o.frames ? `${o.frames}f` : "").padEnd(5)} ${d.title || "(no title)"}  ${d.url}`);
  }
} else if (cmd === "get") {
  const id = argv[1], name = arg("--name");
  if (!id || !name) { console.error("usage: node gif.mjs get <id> --name <name> [--width 0.56] [--sticker]"); process.exit(2); }
  const j = await api(id, {});
  const o = j.data?.images?.original;
  const url = kind === "stickers" ? (o?.webp || o?.url) : (o?.mp4 || o?.url);
  if (!url) { console.error("no downloadable rendition for this id"); process.exit(1); }
  const r = await fetch(url);
  if (!r.ok) { console.error(`download failed: HTTP ${r.status}`); process.exit(1); }
  fs.mkdirSync("tmp", { recursive: true });
  const ext = kind === "stickers" ? (url.includes(".webp") ? ".webp" : ".gif") : (url.includes(".mp4") ? ".mp4" : ".gif");
  const file = path.resolve("tmp", `${name}${ext}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  const credits = path.resolve("assets", "media", "credits.json");
  fs.mkdirSync(path.dirname(credits), { recursive: true });
  const c = fs.existsSync(credits) ? JSON.parse(fs.readFileSync(credits, "utf8")) : {};
  c[name] = { source: "GIPHY", id, title: j.data.title, page: j.data.url, user: j.data.username || null };
  fs.writeFileSync(credits, JSON.stringify(c, null, 1));
  const m = spawnSync("node", [path.join(HERE, "media.mjs"), file, "--name", name, "--width", arg("--width", "0.80"), "--fps", arg("--fps", "15"), ...(kind === "stickers" ? ["--alpha"] : [])], { stdio: "inherit" });
  process.exit(m.status ?? 1);
} else {
  console.error('usage: node gif.mjs sheet "<words>" … | search "<words>" | get <id> --name <name>');
  process.exit(2);
}
