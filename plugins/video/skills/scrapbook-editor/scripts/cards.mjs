// THE CARDS — a picture put ON THE SPEAKER'S FACE while they say what it shows.
//
// v3 (2026-10-05, second review: « les GIFs sont placés de manière beaucoup trop aléatoire, ils
// n'ont pas une belle animation d'entrée »): a meme or a picture is a POLAROID —
//   · always the SAME place and size in a video: on the frame's centre line, a little under the
//     face's centre (face.mjs F.slot(): one height for the whole video, from the median face), 0.80
//     of the width (v3.4: « les gifs un peu trop petits… plus bas, pour qu'on les voie bien »; a tall
//     picture narrower, never taller than 0.30 of the height), so the eye learns where they land;
//     tilted ±3°, the other way each time;
//   · a print: a white border, flat (no shading across it: « j'aime pas le dégradé sur le papier »),
//     a deeper chin at the foot with a caption written on it in the marker hand, a hairline round the
//     picture, a strip of tape across the top, its soft shadow;
//   · DROPPED on: from above, 22 % big and 8° off, landing in 0.3 s (its shadow tightening), with a
//     camera shutter; FLICKED away to the side at the end, in a blur, with a light whoosh.
//   shot   a screenshot or a screen recording of the real thing: rounded corners, a soft shadow,
//          a thin light rim; red annotations; a cursor that moves
//   phone  a tall phone page, `scroll` moving a tall capture up in flicks
//   ghost  a recording laid over the speaker at 62 % so both read
// Media come from assets/ (media.mjs prepares GIFs, videos and stills into a folder of frames).
// Every card is drawn on the over layer; the captions stay on top of it.
import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage, roundRect, motion, placeSprite, clamp01, lerp, easeOutCubic, RED, WHITE, INK, cue, hash, rng, FRAME,
  measureText, drawText, grain, polyPath, handFat } from "./book.mjs";
import { label as paperLabel } from "./paper.mjs";
import { SAFE, FORBIDDEN } from "../../short-editor/scripts/safezones.mjs";


// ── media: a still, or a folder of frames written by media.mjs (meta.json: fps, frames) ──────
const MEDIA = new Map();        // path → { kind, img | frames[], fps, w, h, windows: [[a, b]] }
function want(src, at, until, start = 0) {
  const p = path.resolve(process.cwd(), src);
  if (!MEDIA.has(p)) MEDIA.set(p, { windows: [] });
  MEDIA.get(p).windows.push([at, until, start]);
  return p;
}
// called once from the plan's load(): only the frames a card will show are decoded
export async function loadCards() {
  for (const [p, m] of MEDIA) {
    if (!fs.existsSync(p)) { console.error(`  ⚠ card media missing: ${path.relative(process.cwd(), p)} (prepare it with media.mjs)`); m.missing = true; continue; }
    if (fs.statSync(p).isDirectory()) {
      const meta = JSON.parse(fs.readFileSync(path.join(p, "meta.json"), "utf8"));
      const files = fs.readdirSync(p).filter(f => /^f\d+\.(png|jpe?g)$/i.test(f)).sort();
      m.kind = "clip"; m.fps = meta.fps; m.w = meta.width; m.h = meta.height; m.loop = meta.loop ?? true;
      m.frames = new Array(files.length).fill(null);
      // the frames inside any window this clip is shown in (looped clips: all of them)
      const need = new Set();
      for (const [a, b, s] of m.windows) {
        const n = Math.ceil((b - a) * meta.fps) + 2;
        for (let i = 0; i < n; i++) need.add(m.loop ? (Math.floor(s * meta.fps) + i) % files.length : Math.min(files.length - 1, Math.floor(s * meta.fps) + i));
      }
      for (const i of need) m.frames[i] = await loadImage(path.join(p, files[i]));
      m.files = files;
    } else {
      m.kind = "still"; m.img = await loadImage(p); m.w = m.img.width; m.h = m.img.height;
    }
  }
}
function frameOf(m, t, at, start) {
  if (!m || m.missing) return null;
  if (m.kind === "still") return m.img;
  const n = m.frames.length;
  let i = Math.floor((t - at + start) * m.fps);
  i = m.loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
  return m.frames[i] ?? m.frames.find(Boolean) ?? null;
}
export function mediaSize(src) {
  const p = path.resolve(process.cwd(), src);
  try {
    if (fs.statSync(p).isDirectory()) { const meta = JSON.parse(fs.readFileSync(path.join(p, "meta.json"), "utf8")); return { w: meta.width, h: meta.height }; }
    // a still: a PNG has its size in the IHDR chunk, a JPEG in its SOF marker
    const b = Buffer.alloc(65536), fd = fs.openSync(p, "r"), got = fs.readSync(fd, b, 0, 65536, 0); fs.closeSync(fd);
    if (b.toString("ascii", 1, 4) === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b[0] === 0xFF && b[1] === 0xD8) {
      for (let i = 2; i + 9 < got;) {
        if (b[i] !== 0xFF) { i++; continue; }
        const mk = b[i + 1];
        if (mk >= 0xC0 && mk <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(mk)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        if (mk === 0xD8 || mk === 0x01 || (mk >= 0xD0 && mk <= 0xD7)) { i += 2; continue; }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch {}
  return null;
}

// ── the cursor: the system arrow, black with a white rim ──────────────────────────────────────
function arrowCursor(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s / 20, s / 20);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 16.5); ctx.lineTo(4.1, 12.6); ctx.lineTo(6.8, 18.6); ctx.lineTo(9.4, 17.4);
  ctx.lineTo(6.8, 11.6); ctx.lineTo(12.2, 11.6); ctx.closePath();
  ctx.lineJoin = "round"; ctx.lineWidth = 2.1; ctx.strokeStyle = WHITE; ctx.stroke();
  ctx.fillStyle = "#0B0B0B"; ctx.fill();
  ctx.restore();
}

// ── a red note on a screenshot: a box, an arrow pointing at it, a circle, a line ─────────────
function note(ctx, n, X, Y, CW, CH, t, W) {
  if (t < (n.at ?? -1e9) || t >= (n.until ?? 1e9)) return;
  const k = n.draw ? easeOutCubic(clamp01((t - n.at) / n.draw)) : 1;
  const lw = (n.width ?? 0.0055) * W;
  ctx.save();
  ctx.strokeStyle = n.color ?? RED; ctx.fillStyle = n.color ?? RED; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const px = u => X + u * CW, py = v => Y + v * CH;
  if (n.kind === "box") {
    const x0 = px(n.x), y0 = py(n.y), w = n.w * CW, h = n.h * CH;
    ctx.beginPath(); ctx.rect(x0, y0, w * (k < 1 ? k : 1), h); ctx.stroke();
  } else if (n.kind === "circle") {
    ctx.beginPath(); ctx.ellipse(px(n.x + n.w / 2), py(n.y + n.h / 2), n.w * CW / 2 * 1.08, n.h * CH / 2 * 1.15, -0.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  } else if (n.kind === "arrow") {
    const [ax, ay] = n.from, [bx, by] = n.to;
    const x0 = px(ax), y0 = py(ay), x1 = lerp(x0, px(bx), k), y1 = lerp(y0, py(by), k);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    if (k > 0.85) {
      const a = Math.atan2(y1 - y0, x1 - x0), hl = lw * 3.2;
      ctx.beginPath(); ctx.moveTo(x1 + Math.cos(a) * lw * 0.6, y1 + Math.sin(a) * lw * 0.6);
      ctx.lineTo(x1 - Math.cos(a - 0.55) * hl, y1 - Math.sin(a - 0.55) * hl);
      ctx.lineTo(x1 - Math.cos(a + 0.55) * hl, y1 - Math.sin(a + 0.55) * hl); ctx.closePath(); ctx.fill();
    }
  } else if (n.kind === "line") {
    const [ax, ay] = n.from, [bx, by] = n.to;
    ctx.beginPath(); ctx.moveTo(px(ax), py(ay)); ctx.lineTo(lerp(px(ax), px(bx), k), lerp(py(ay), py(by), k)); ctx.stroke();
  }
  ctx.restore();
}

const STYLE = {
  // v3.4 (« les gifs un peu trop petits »): 0.80 of the width (was 0.60), a tall one narrower so
  // its picture is never taller than 0.30 of the height (the chin stays clear of the captions)
  // 2026-10-05, the feed's safe zones (short-editor/scripts/safezones.mjs): a polaroid in the middle
  // of the screen runs below y 0.425, where the feed's buttons take the right edge from x 0.84, so
  // the print is fitted between x 0.095 and 0.84 (card() below) and stays clear of the captions
  meme:    { polaroid: true, w: 0.62, maxH: 0.26, enter: "drop", exit: "flick" },
  picture: { polaroid: true, w: 0.60, maxH: 0.26, enter: "drop", exit: "flick" },
  shot:    { radius: 0.012, shadow: 1, rim: 1, opacity: 1, exit: "cut", w: 0.76 },
  phone:   { radius: 0.03, shadow: 1, rim: 0, opacity: 1, exit: "cut", w: 0.58 },
  ghost:   { radius: 0.012, shadow: 0, rim: 0, opacity: 0.62, exit: "cut", w: 0.62 },
};

// ── the polaroid ─────────────────────────────────────────────────────────────────────────────
// Its print, composed once (a still) or once per frame of a clip (a few kept): the border (flat,
// barely any grain), the picture in its window, the caption on the chin, the tape on top.
function polaroidGeometry(cw, ch, caption) {
  const side = cw * 0.055, top = cw * 0.055, chin = cw * (caption ? 0.20 : 0.15);
  const tapeH = cw * 0.085, mt = tapeH * 0.7;            // the tape stands over the top edge
  return { side, top, chin, PW: cw + 2 * side, PH: ch + top + chin, mt, tapeH };
}
function composePolaroid(img, cw, ch, { caption = null, seed = 1, fit = "cover", W = FRAME.w } = {}) {
  const g = polaroidGeometry(cw, ch, caption), R = rng(seed);
  const c = createCanvas(Math.ceil(g.PW), Math.ceil(g.PH + g.mt)), x = c.getContext("2d");
  x.translate(0, g.mt);
  // the border: a white card, flat, barely any grain
  x.fillStyle = "#FBFAF7"; x.fillRect(0, 0, g.PW, g.PH);
  x.save(); x.beginPath(); x.rect(0, 0, g.PW, g.PH); x.clip();
  x.globalCompositeOperation = "multiply"; x.globalAlpha = 0.035; x.fillStyle = x.createPattern(grain(), "repeat"); x.fillRect(0, 0, g.PW, g.PH);
  x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
  x.restore();
  // the picture in its window
  x.save(); x.beginPath(); x.rect(g.side, g.top, cw, ch); x.clip();
  if (img) {
    const s = fit === "contain" ? Math.min(cw / img.width, ch / img.height) : Math.max(cw / img.width, ch / img.height);
    const iw = img.width * s, ih = img.height * s;
    if (fit === "contain") { x.fillStyle = "#111"; x.fillRect(g.side, g.top, cw, ch); }
    x.drawImage(img, g.side + (cw - iw) / 2, g.top + (ch - ih) / 2, iw, ih);
  } else { x.fillStyle = "#222"; x.fillRect(g.side, g.top, cw, ch); }
  x.restore();
  x.strokeStyle = "rgba(0,0,0,.16)"; x.lineWidth = Math.max(1, W * 0.0012); x.strokeRect(g.side, g.top, cw, ch);
  // the caption, printed on the chin in condensed capitals
  if (caption) {
    const m = createCanvas(8, 8).getContext("2d");
    // written on the chin in the marker hand, as one writes on a polaroid
    let px = Math.min(cw * 0.1, g.chin * 0.55);          // in proportion to the card (0.06 W on v3's 0.60)
    const tw = () => measureText(m, caption, "hand", px);
    while (tw() > cw * 0.92 && px > 6) px *= 0.94;
    x.save();
    x.translate(g.PW / 2, g.top + ch + g.chin * 0.55); x.rotate((R() - 0.5) * 0.04);
    drawText(x, caption, -tw() / 2, px * 0.32, "hand", px, { fill: INK, stroke: handFat() * px, strokeColor: INK });
    x.restore();
  }
  // the tape across the top, a hair crooked
  x.save();
  x.translate(g.PW / 2 + (R() - 0.5) * g.PW * 0.06, 0); x.rotate((R() - 0.5) * 0.12);
  const len = g.PW * 0.34, wid = g.tapeH, pts = [];
  const zig = (xa, ya, xb, yb) => { for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([lerp(xa, xb, u) + (i % 2 ? 1 : -1) * wid * 0.08 * (0.5 + R()), lerp(ya, yb, u)]); } };
  pts.push([-len / 2, -wid / 2], [len / 2, -wid / 2]); zig(len / 2, -wid / 2, len / 2, wid / 2);
  pts.push([len / 2, wid / 2], [-len / 2, wid / 2]); zig(-len / 2, wid / 2, -len / 2, -wid / 2);
  x.shadowColor = "rgba(0,0,0,.18)"; x.shadowBlur = wid * 0.15; x.shadowOffsetY = wid * 0.05;
  polyPath(x, pts); x.fillStyle = "rgba(240,232,210,.80)"; x.fill();
  x.shadowColor = "rgba(0,0,0,0)";
  x.restore();
  c.geo = g;
  return c;
}

// the polaroids of a video take turns: tilted one way, then the other; dropped from the left,
// then from the right
let TURN = 0;

// a card. x, y: its CENTRE (fractions of the frame); w: the picture's width (fraction of the frame
// width); the height follows the media's aspect unless h is given (then the media covers the card).
export function card({ id, src, at, until, x = 0.5, y = 0.45, w = null, h = null, style = "meme", frame = FRAME,
  start = 0, enter = null, exit = null, opacity = null, notes = [], cursor = null, caption = null, sound = undefined,
  rot = null, dir = null, mutesCaptions = false, layer = "over", fit = "cover", scroll = null }) {
  const S = STYLE[style] ?? STYLE.meme, W = frame.w, H = frame.h, fps = frame.fps ?? 30;
  const p = want(src, at, until, start);
  const size = mediaSize(src);
  const knownAspect = size ? size.h / size.w : null;
  let cw = (w ?? S.w) * W;
  if (!h && !w && S.maxH && knownAspect && cw * knownAspect > S.maxH * H) cw = S.maxH * H / knownAspect;
  const beats = [];
  if (S.polaroid) {
    const turn = TURN++, side = turn % 2 ? 1 : -1;
    const r = (rot ?? 3.2 * side) * Math.PI / 180, d = dir ?? side;
    let ch = h ? h * H : cw * (knownAspect ?? 0.62);
    const capText = caption && (caption.on ?? "chin") === "chin" ? (caption.text ?? caption) : null;
    const seed = hash(id ?? src);
    const cache = new Map();
    const printAt = t => {
      const M = MEDIA.get(p), img = frameOf(M, t, at, start);
      const k = M?.kind === "clip" ? Math.floor((t - at + start) * (M.fps ?? 30)) % Math.max(1, M.frames?.length ?? 1) : 0;
      if (!cache.has(k)) {
        if (cache.size > 6) cache.delete(cache.keys().next().value);
        cache.set(k, composePolaroid(img, cw, ch, { caption: capText, seed, fit, W }));
      }
      return cache.get(k);
    };
    let geo = polaroidGeometry(cw, ch, capText);
    // inside the feed's safe area: the print (turned) narrowed to the room it has at its height,
    // then moved in, never under the feed's interface
    {
      const span = g => ({ hw: (g.PW * Math.cos(r) + (g.PH + g.mt) * Math.abs(Math.sin(r))) / 2 / W, hh: (g.PH + g.mt) / 2 / H });
      let s0 = span(geo);
      const R = y + s0.hh > FORBIDDEN[1].y0 ? FORBIDDEN[1].x0 : SAFE.x1, room = R - SAFE.x0;
      if (2 * s0.hw > room) { const k = room / (2 * s0.hw); cw *= k; ch *= k; geo = polaroidGeometry(cw, ch, capText); s0 = span(geo); }
      x = Math.min(R - s0.hw, Math.max(SAFE.x0 + s0.hw, x));
      y = Math.min(SAFE.y1 - s0.hh, Math.max(SAFE.y0 + s0.hh, y));
    }
    const PW = geo.PW, PHt = geo.PH + geo.mt;
    const cyOff = -geo.mt / 2 + (geo.chin - geo.top) / 2;   // the picture's centre on (x, y)
    const ent = enter ?? S.enter, ex = exit ?? S.exit;
    const mAt = t => motion(t, { at, until, enter: ent, exit: ex, W, dir: d });
    beats.push({ id: id ?? `card-${path.basename(src)}-${at}`, from: at, to: until, layer, mutesCaptions,
      draw(ctx, t) { placeSprite(ctx, t, { img: printAt(t), w: PW, h: PHt, cx: x * W, cy: y * H + cyOff, rot: r, mAt, W, H, fps, shadow: 1.1 }); },
      // a photo laid down: a shutter as it lands; a light whoosh as it is flicked away
      cues: () => (sound === null ? [] : [cue(sound ?? "shutter", at + 0.10), ...(ex === "flick" ? [cue("swish", until - 0.13)] : [])]) });
    if (caption && caption.on === "paper") {
      const m = createCanvas(8, 8).getContext("2d");
      const fitS = (0.92 * cw) / Math.max(1, measureText(m, caption.text, "display", W) + W * 0.6);
      const sz = caption.size ?? Math.min(0.085, Math.max(0.055, fitS));
      beats.push(...paperLabel({ id: `${id ?? src}-cap`, text: caption.text, at: caption.at ?? at + 0.2, until, x, y: (y * H + ch / 2 + geo.chin * 0.6) / H,
        size: sz, rot: caption.rot ?? -1.5, frame, sound: caption.sound === undefined ? "paper" : caption.sound, layer }));
    }
    return beats;
  }
  const draw = (ctx, t) => {
    const M = MEDIA.get(p);
    const m = motion(t, { at, until, enter: enter ?? "cut", exit: exit ?? S.exit, W });
    if (!m.on || m.a <= 0.003) return;
    const img = frameOf(M, t, at, start);
    const aspect = h ? (h * H) / cw : (knownAspect ?? (img ? img.height / img.width : 0.6));
    const ch = h ? h * H : cw * aspect;
    const X = x * W - cw / 2, Y = y * H - ch / 2, r = S.radius * W;
    ctx.save();
    ctx.globalAlpha *= m.a * (opacity ?? S.opacity);
    ctx.translate(x * W + m.dx, y * H + m.dy); if (rot) ctx.rotate(rot * Math.PI / 180); ctx.scale(m.sx, m.sy); ctx.translate(-x * W, -y * H);
    if (m.blur > 0.4) ctx.filter = `blur(${m.blur.toFixed(1)}px)`;
    if (S.shadow) {
      // two shadows, as everything else: a soft wide one, a tight one
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.34)"; ctx.shadowBlur = W * 0.035; ctx.shadowOffsetY = W * 0.014;
      roundRect(ctx, X, Y, cw, ch, r); ctx.fillStyle = "#101010"; ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.30)"; ctx.shadowBlur = W * 0.004; ctx.shadowOffsetY = W * 0.0015;
      roundRect(ctx, X, Y, cw, ch, r); ctx.fillStyle = "#101010"; ctx.fill(); ctx.restore();
    }
    ctx.save();
    if (r > 0) { roundRect(ctx, X, Y, cw, ch, r); ctx.clip(); }
    if (img && scroll) {
      // a TALL capture read by scrolling: the page fits the card's width and moves up in eased
      // flicks, from `from` to `to` (fractions of what is below the fold), `steps` flicks
      const s = cw / img.width, ih = img.height * s, room = Math.max(0, ih - ch);
      const steps = scroll.steps ?? 3, u = clamp01((t - at) / Math.max(0.1, until - at));
      const k = Math.min(steps, u * steps), whole = Math.floor(k), part = k - whole;
      const pos = (whole + easeOutCubic(clamp01(part / 0.45))) / steps;
      const off = room * lerp(scroll.from ?? 0, scroll.to ?? 0.85, Math.min(1, pos));
      ctx.drawImage(img, X, Y - off, cw, ih);
    } else if (img) {
      const s = fit === "contain" ? Math.min(cw / img.width, ch / img.height) : Math.max(cw / img.width, ch / img.height);
      const iw = img.width * s, ih = img.height * s;
      if (fit === "contain") { ctx.fillStyle = "#000"; ctx.fillRect(X, Y, cw, ch); }
      ctx.drawImage(img, X + (cw - iw) / 2, Y + (ch - ih) / 2, iw, ih);
    } else { ctx.fillStyle = "#222"; ctx.fillRect(X, Y, cw, ch); }
    ctx.restore();
    if (S.rim) { roundRect(ctx, X, Y, cw, ch, r); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(1.5, W * 0.0022); ctx.stroke(); }
    for (const n of notes) note(ctx, n, X, Y, cw, ch, t, W);
    if (cursor) {
      const ks = cursor.path ?? cursor;
      let cx = ks[0][1], cy = ks[0][2];
      for (let i = 1; i < ks.length; i++) {
        const [t0, x0, y0] = ks[i - 1], [t1, x1, y1] = ks[i];
        if (t >= t1) { cx = x1; cy = y1; continue; }
        if (t > t0) { const k = easeOutCubic((t - t0) / (t1 - t0)); cx = lerp(x0, x1, k); cy = lerp(y0, y1, k); }
        break;
      }
      arrowCursor(ctx, X + cx * cw, Y + cy * ch, (cursor.size ?? 0.032) * W);
    }
    ctx.restore();
  };
  // what appears makes a sound (a screen: the pack's click); a ghost over the speaker is silent
  const snd = sound === undefined ? (style === "ghost" ? null : "click") : sound;
  beats.push({ id: id ?? `card-${path.basename(src)}-${at}`, from: at, to: until, layer, mutesCaptions, draw, cues: () => (snd ? [cue(snd, at)] : []) });
  if (caption) {
    const ch = h ? h * H : cw * (knownAspect ?? 0.62);
    const m = createCanvas(8, 8).getContext("2d");
    const fitS = (0.92 * cw) / Math.max(1, measureText(m, caption.text, "display", W) + W * 0.6);
    const sz = caption.size ?? Math.min(0.085, Math.max(0.055, fitS));
    beats.push(...paperLabel({ id: `${id ?? src}-cap`, text: caption.text, at: caption.at ?? at, until, x, y: (y * H + ch / 2 + sz * W * 0.18) / H,
      size: sz, rot: caption.rot ?? -1.5, frame, sound: caption.sound === undefined ? "paper" : caption.sound, layer }));
  }
  return beats;
}
