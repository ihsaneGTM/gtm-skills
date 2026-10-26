// THE PIPECORN GENERIC — the picture and its sounds (generic.mjs puts it at the end of a short).
// Validated by Ihsane on 2026-10-05 (an edit of style 1, after three refused versions):
//   · Pipecorn FIRST, so the viewer knows the video is over: the sparkle flies in over the last
//     frames of the video, bursts into Pipecorn yellow, and the real wordmark is revealed
//   · then ONE SLOT on the same screen: the wordmark is REPLACED by a value's words, which are
//     replaced by the next value's words, and so on, then Pipecorn again ("Pipecorn qui s'affiche,
//     ça remplace Pipecorn par Phone coverage, Phone coverage par Connect rate… et après ça
//     redevient Pipecorn"). What is in the slot rolls up out of a window letter by letter while the
//     next rolls up into it from under: never two things in the same place
//   · the WORDS BEFORE THE NUMBER ("quand on affiche 93 %, on ne sait pas que c'est du phone
//     coverage"): the number follows in a black pill under the window, which stays from the first
//     value to the last (its number rolls the same way, its width follows)
//   · the explainer's (style 4) light and motion on the yellow: brown shadows in two layers, motion
//     blur like a shutter, springs and expo curves; Outfit, pipecorn.com's face
//   · NO MUSIC under it ("on enlève la musique, on met juste des beaux effets sonores"): the Motionix
//     pack on every move
// Values are data: { label, n?, glyph } (values.json); a value without a number has no pill content
// of its own: its words carry it.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const { createCanvas, Path2D, GlobalFonts } = await import(new URL("../scene.mjs", import.meta.url).href);
const { loadImage } = await import("@napi-rs/canvas");
import { clamp01, seg, lerp, EASE, rgba, roundRect, silhouette, paintSprite, rrShape,
  popLight, textShadows, motionBlur, mx } from "../pro.mjs";

const BRAND = new URL("../../../../assets/brand/pipecorn/", import.meta.url);
const FACE = {};
for (const w of [700, 800, 900]) {
  const p = fileURLToPath(new URL(`fonts/Outfit-${w}.woff2`, BRAND));
  FACE[w] = fs.existsSync(p) && GlobalFonts.registerFromPath(p, `PcOutfit${w}`) ? `PcOutfit${w}` : "Helvetica Neue";
}
const font = (w, s) => `${Math.round(s)}px ${FACE[w]}`;
const Y = "#FFD90D", INK = "#0D0D0D", BROWN = "96,66,0";
export const loadWordmark = () => loadImage(fileURLToPath(new URL("wordmark-black.png", BRAND)));

const GLYPH = {
  phone: c => { c.moveTo(19, 15.8); c.lineTo(19, 18.4); c.bezierCurveTo(19, 19.4, 18, 20.1, 17, 20); c.bezierCurveTo(9.6, 19.3, 4.7, 14.4, 4, 7); c.bezierCurveTo(3.9, 6, 4.6, 5, 5.6, 5); c.lineTo(8.2, 5); c.lineTo(9.6, 8.6); c.lineTo(8, 10.2); c.bezierCurveTo(9, 12.4, 11.6, 15, 13.8, 16); c.lineTo(15.4, 14.4); c.closePath(); },
  users: c => { c.arc(9, 8.5, 3.2, 0, 7); c.moveTo(3.5, 19.5); c.arc(9, 19.5, 5.5, Math.PI, 0); c.moveTo(17.8, 8.6); c.arc(16, 8.6, 1.8, 0, 7); c.moveTo(16.5, 13.5); c.quadraticCurveTo(20.5, 14, 20.5, 19); },
  chart: c => { c.moveTo(4, 20); c.lineTo(20, 20); c.moveTo(7, 17); c.lineTo(7, 12); c.moveTo(12, 17); c.lineTo(12, 7); c.moveTo(17, 17); c.lineTo(17, 10); },
  globe: c => { c.arc(12, 12, 8, 0, 7); c.moveTo(4, 12); c.lineTo(20, 12); c.moveTo(12, 4); c.bezierCurveTo(7.5, 8, 7.5, 16, 12, 20); c.moveTo(12, 4); c.bezierCurveTo(16.5, 8, 16.5, 16, 12, 20); },
  bolt: c => { c.moveTo(13, 3); c.lineTo(5, 13.5); c.lineTo(11.5, 13.5); c.lineTo(10.5, 21); c.lineTo(19, 10.5); c.lineTo(12.5, 10.5); c.closePath(); },
};
function glyph(ctx, kind, size, color = INK, width = 2.3) {
  const f = GLYPH[kind] || GLYPH.chart;
  ctx.save(); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
  ctx.beginPath(); f(ctx); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  ctx.restore();
}
const STAR = new Path2D("M413 0C224.502 197.185 222.514 206.953 343.359 341.701C207.96 221.441 198.144 223.42 0 411C188.498 213.816 190.486 204.053 69.6413 69.304C205.046 189.564 214.856 187.585 413 0Z");
const star = (ctx, size, color) => { ctx.save(); ctx.scale(size / 413, size / 411); ctx.translate(-206.5, -205.5); ctx.fillStyle = color; ctx.fill(STAR); ctx.restore(); };
const starShape = (x, w) => { x.save(); x.scale(w / 413, w / 411); x.translate(-206.5, -205.5); x.fill(STAR); x.restore(); };
function dither(c, W, H, amp) {
  const id = c.getImageData(0, 0, W, H), d = id.data; let s = 777;
  for (let i = 0; i < d.length; i += 4) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const n = ((s >>> 16) / 65536 - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(id, 0, 0);
}
// a shadow in two layers on the yellow (brown, the light above)
function shadeY(ctx, K, key, w, h, shape, k = 1) {
  for (const [b, oy, a] of [[8, 7, 0.42], [46, 28, 0.36]]) paintSprite(ctx, silhouette(key, w, h, b * K, `rgb(${BROWN})`, shape), a * k, 0, oy * K);
}

// the timeline, from J (the burst into yellow): what generic.mjs needs to place it
export const FLY = 0.40;                                   // the sparkle's flight, over the video's last frames
export const SW = 1.3, HOLD_LOGO = 1.15, TAIL = 1.1;      // a value's time, the logo's first hold, its last
export const lengthAfterJ = n => HOLD_LOGO + SW * n + TAIL;

// sting({ w, h, fps, values, wordmark, prelude }) → { J: 0-based, draw(ctx, t), cues(), end }
// t is the generic's own time: the burst into yellow is at J = FLY (the sparkle flies from 0);
// prelude(ctx, t) draws the video's last frames under it until the yellow has covered them.
export function sting({ w: W, h: H, fps = 30, values, wordmark, prelude = null }) {
  const K = W / 1080, n = values.length, J = FLY;
  // the yellow ground, once
  const YG = createCanvas(W, H), yg = YG.getContext("2d");
  yg.fillStyle = Y; yg.fillRect(0, 0, W, H);
  { const g = yg.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.7);
    g.addColorStop(0, "rgba(255,244,160,0.40)"); g.addColorStop(0.6, "rgba(255,228,80,0.08)"); g.addColorStop(1, "rgba(255,217,13,0)");
    yg.fillStyle = g; yg.fillRect(0, 0, W, H);
    const v = yg.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.9);
    v.addColorStop(0, "rgba(140,96,0,0)"); v.addColorStop(1, "rgba(140,96,0,0.20)");
    yg.fillStyle = v; yg.fillRect(0, 0, W, H); dither(yg, W, H, 2.5); }
  const SP = Math.round(20 * K), tile = createCanvas(SP, SP), tx = tile.getContext("2d");
  tx.fillStyle = "rgba(90,60,0,0.10)"; tx.beginPath(); tx.arc(SP / 2, SP / 2, 1.5 * K, 0, 7); tx.fill();
  const ground = ctx => { ctx.drawImage(YG, 0, 0); ctx.save(); ctx.fillStyle = ctx.createPattern(tile, "repeat"); ctx.fillRect(0, 0, W, H); ctx.restore(); };

  // ── the wordmark: a canvas with its brown shadows, wiped in from the left ──
  const WW = 720 * K, WH = WW * wordmark.height / wordmark.width, wmPad = 60 * K;
  const WMS = createCanvas(Math.ceil(WW + 2 * wmPad), Math.ceil(WH + 2 * wmPad)), WMC = createCanvas(WMS.width, WMS.height);
  { const x = WMS.getContext("2d");
    for (const [bl, oy, a] of [[5, 4, 0.42], [26, 18, 0.32]]) {
      const s = createCanvas(WMS.width, WMS.height), sx = s.getContext("2d");
      sx.filter = `blur(${(bl * K).toFixed(1)}px)`; sx.drawImage(wordmark, wmPad, wmPad + oy * K, WW, WH);
      sx.filter = "none"; sx.globalCompositeOperation = "source-in"; sx.fillStyle = `rgb(${BROWN})`; sx.fillRect(0, 0, WMS.width, WMS.height);
      x.globalAlpha = a; x.drawImage(s, 0, 0);
    } }
  function drawWordmark(ctx, cx, cy, s, k, e, sh = null) {
    const o = WMC.getContext("2d");
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.filter = "none"; o.clearRect(0, 0, WMC.width, WMC.height);
    o.drawImage(WMS, 0, 0); o.drawImage(wordmark, wmPad, wmPad, WW, WH);
    if (k < 1) {
      o.globalCompositeOperation = "destination-in";
      const edge = lerp(-0.1, 1.1, k) * WMC.width, g = o.createLinearGradient(edge - 90 * K, 0, edge, 0);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = g; o.fillRect(0, 0, WMC.width, WMC.height);
    }
    if (sh != null && sh > 0 && sh < 1) {
      o.globalCompositeOperation = "source-atop";
      const x = lerp(-0.2, 1.2, EASE.inOutCubic(sh)) * WMC.width, g = o.createLinearGradient(x - 110 * K, 0, x + 110 * K, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
      o.fillStyle = g; o.fillRect(0, 0, WMC.width, WMC.height);
    }
    ctx.save(); ctx.translate(cx, cy + (1 - e) * 28 * K); ctx.scale(s, s);
    const bl = (1 - e) * 9 * K; if (bl > 0.3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
    ctx.drawImage(WMC, -WMC.width / 2, -WMC.height / 2);
    ctx.restore();
  }

  // ── THE OPENING: the sparkle flies in over the video, bursts, the yellow floods out of it ──
  // the slot sits high enough that its words end above y 0.425, where the feed's buttons start on
  // the right (safezones.mjs, 2026-10-05): the words may then take the safe area's whole width
  const LOGO_Y = 0.385 * H;
  const RMAX = Math.hypot(W / 2, Math.max(LOGO_Y, H - LOGO_Y)) + 60 * K;
  const floodK = t => EASE.inOutCubic(seg(t, J - 0.02, 0.36));
  const W0 = J + 0.16;                                    // the wordmark's reveal
  function sparkleFly(ctx, t) {
    const u = seg(t, J - FLY, FLY); if (u <= 0) return;
    const zu = seg(t, J, 0.3); if (zu >= 1) return;
    const e = EASE.inOutCubic(u), x = lerp(W * 1.15, W / 2, e), y = lerp(-H * 0.06, LOGO_Y, e);
    const s = lerp(120, 300, e) * K * (1 + 5 * EASE.inExpo(zu)), a = 1 - clamp01((zu - 0.4) / 0.6);
    ctx.save(); ctx.globalAlpha *= a;
    if (u < 1) {
      const pu = EASE.inOutCubic(Math.max(0, u - 0.25)), px = lerp(W * 1.15, W / 2, pu), py = lerp(-H * 0.06, LOGO_Y, pu);
      const g = ctx.createLinearGradient(px, py, x, y); g.addColorStop(0, rgba(Y, 0)); g.addColorStop(1, rgba(Y, 0.9));
      ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 16 * K; ctx.lineCap = "round"; ctx.shadowColor = rgba(Y, 1); ctx.shadowBlur = 24 * K;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
    }
    ctx.translate(x, y); ctx.rotate(-2.4 * (1 - e) + 0.6 * EASE.inExpo(zu));
    paintSprite(ctx, silhouette("stgl", 300 * K, 300 * K, 30 * K, "rgba(255,217,13,1)", starShape), 0.8, 0, 0);
    star(ctx, s, floodK(t) > 0.05 ? "#FFFFFF" : Y);
    ctx.restore();
  }
  function opening(ctx, t) {
    const fk = floodK(t);
    if (fk > 0 && fk < 1) {
      ctx.save(); ctx.beginPath(); ctx.arc(W / 2, LOGO_Y, Math.max(1, RMAX * fk), 0, 7); ctx.clip(); ground(ctx); ctx.restore();
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 6 * K; ctx.shadowColor = "rgba(255,255,255,0.8)"; ctx.shadowBlur = 24 * K;
      ctx.beginPath(); ctx.arc(W / 2, LOGO_Y, RMAX * fk, 0, 7); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.translate(W / 2, LOGO_Y); popLight(ctx, K, t, J, 600 * K, { a: 0.6, dur: 0.45 }); ctx.restore();
    sparkleFly(ctx, t);
  }
  // the small black sparkle that twinkles in the wordmark's corner
  function twinkle(ctx, t, t0, cx, cy) {
    const tu = seg(t, t0, 0.45); if (tu <= 0) return;
    const tz = Math.max(0, EASE.spring(tu));
    ctx.save(); ctx.translate(cx + WW / 2 + 4 * K, cy - WH * 0.66); ctx.rotate((1 - EASE.outExpo(tu)) * 1.6 + (t - t0) * 0.6);
    star(ctx, 64 * K * tz, INK); ctx.restore();
  }

  // ── THE SLOT ──
  const FIRST = J + HOLD_LOGO;
  const SWAP = i => FIRST + SW * i;                       // value i rolls in (i = n: the logo again)
  const BACK = SWAP(n), END = +(BACK + TAIL).toFixed(3);
  const ROLL = 0.44, STG = 0.018;                          // a letter's roll, the delay letter to letter
  const D = 300 * K;                                       // one line: the roll's travel
  const TOP = LOGO_Y - 165 * K, BOT = LOGO_Y + 125 * K;  // the window
  const PY = LOGO_Y + 215 * K, PH = 150 * K;              // the pill, under it
  const NUM_AT = 0.52;                                     // the number follows its words
  const LS = -1 * K;
  const fitSize = text => { let s = 176 * K; for (;;) { yg.font = font(900, s); yg.letterSpacing = `${LS}px`; const w = yg.measureText(text).width; yg.letterSpacing = "0px"; if (w <= 860 * K || s < 56 * K) return s; s -= 4 * K; } };
  const LAY = values.map(v => {
    const size = fitSize(v.label), f = font(900, size); yg.font = f; yg.letterSpacing = "0px";
    const chars = [...v.label], ws = chars.map(ch => yg.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + LS * (chars.length - 1);
    let x = W / 2 - total / 2; const out = [];
    chars.forEach((ch, j) => { out.push([ch, x + ws[j] / 2]); x += ws[j] + LS; });
    return { f, size, chars: out, base: LOGO_Y + size * 0.36 };
  });
  const roll = (t, tin, tout, j) => {
    const iu = tin == null ? 1 : seg(t, tin + j * STG, ROLL);
    const ou = tout == null ? 0 : seg(t, tout + j * STG, ROLL);
    if (iu <= 0 || ou >= 1) return null;
    const ie = EASE.inOutQuint(iu), oe = EASE.inOutQuint(ou);
    return { dy: (1 - ie) * D - oe * D, sp: (iu < 1 ? Math.sin(Math.PI * iu) : 0) + Math.sin(Math.PI * ou) };
  };
  // it fades as it nears the window's edge (no letter cut by a hard line)
  const fadeAt = dy => 1 - Math.pow(clamp01(Math.abs(dy) / (D * 0.62)), 1.6);
  const clipWin = ctx => { ctx.beginPath(); ctx.rect(0, TOP, W, BOT - TOP); ctx.clip(); };
  function label(ctx, t, i) {
    const L = LAY[i], tin = SWAP(i), tout = SWAP(i + 1);
    if (t < tin || t > tout + ROLL + STG * L.chars.length) return;
    ctx.save(); clipWin(ctx); ctx.font = L.f; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    L.chars.forEach(([ch, x], j) => {
      if (ch === " ") return;
      const r = roll(t, tin, tout, j); if (!r) return;
      ctx.save(); ctx.translate(x, L.base + r.dy); ctx.globalAlpha *= fadeAt(r.dy);
      const st = 1 + 0.16 * r.sp; ctx.scale(1 / Math.sqrt(st), st);        // stretched along its move
      textShadows(ctx, ch, L.f, 0, 0, K, { contact: [5, 5, 0.30], soft: [24, 18, 0.26], color: `rgb(${BROWN})` });
      ctx.fillStyle = INK; ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }
  // the pill: in with the first value, out as the logo comes back; its width follows its content
  const NF = font(900, 104 * K), WF = font(800, 64 * K), GS = 96 * K, GAPN = 30 * K, PADX = 34 * K;
  const textOf = v => (v.n ? { s: String(v.n), f: NF, dy: 37 * K } : { s: String(v.word || ""), f: WF, dy: 23 * K });
  const numW = v => { const x = textOf(v); if (!x.s) return 0; yg.font = x.f; return yg.measureText(x.s).width; };
  const pillW = v => numW(v) + GS + (numW(v) ? GAPN : 0) + 2 * PADX;
  function pill(ctx, t) {
    const pin = seg(t, SWAP(0) + NUM_AT, 0.42), pout = seg(t, BACK + 0.04, 0.26);
    if (pin <= 0 || pout >= 1) return;
    let cur = 0; for (let i = 1; i < n; i++) if (t >= SWAP(i) + NUM_AT - 0.12) cur = i;
    const ru = cur > 0 ? seg(t, SWAP(cur) + NUM_AT - 0.12, 0.36) : 1, re = EASE.inOutQuint(ru);
    const w = cur > 0 ? lerp(pillW(values[cur - 1]), pillW(values[cur]), re) : pillW(values[0]);
    const s = Math.max(0, EASE.spring(pin)) * (1 - EASE.inCubic(pout)), x0 = W / 2 - w / 2, y0 = PY - PH / 2;
    if (s <= 0.01) return;
    ctx.save(); ctx.translate(W / 2, PY); ctx.scale(s, s); ctx.translate(-W / 2, -PY);
    ctx.save(); ctx.translate(W / 2, PY); shadeY(ctx, K, `pill-${Math.round(w / 4)}`, w, PH, rrShape(PH / 2)); ctx.restore();
    roundRect(ctx, x0, y0, w, PH, PH / 2); ctx.fillStyle = INK; ctx.fill();
    ctx.save(); roundRect(ctx, x0, y0, w, PH, PH / 2); ctx.clip();
    const g = ctx.createLinearGradient(0, y0, 0, PY); g.addColorStop(0, "rgba(255,255,255,0.13)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, PH / 2);
    const content = (v, dy) => {
      const x = textOf(v), nw = numW(v), cw = GS + (nw ? GAPN : 0) + nw, cx = W / 2 - cw / 2;
      ctx.save(); ctx.translate(0, dy);
      ctx.save(); ctx.translate(cx + GS / 2, PY); roundRect(ctx, -GS / 2, -GS / 2, GS, GS, GS / 2); ctx.fillStyle = Y; ctx.fill();
      glyph(ctx, v.glyph, GS * 0.56, INK, 2.4); ctx.restore();
      if (x.s) { ctx.font = x.f; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.shadowColor = rgba(Y, 0.5); ctx.shadowBlur = 18 * K;
        ctx.fillStyle = Y; ctx.fillText(x.s, cx + GS + GAPN, PY + x.dy); }
      ctx.restore();
    };
    if (cur > 0 && ru < 1) { content(values[cur - 1], -re * PH); content(values[cur], (1 - re) * PH); }
    else content(values[cur], 0);
    ctx.restore();
    ctx.restore();
  }
  function logo(ctx, t) {
    if (t < W0) return;
    if (t < BACK) {
      const ru = seg(t, W0, 0.42), e = EASE.outExpo(ru), k = EASE.inOutCubic(ru);
      const ou = n ? EASE.inOutQuint(seg(t, SWAP(0), ROLL + 0.08)) : 0; if (ou >= 1) return;
      ctx.save(); if (ou > 0) clipWin(ctx);
      ctx.globalAlpha *= fadeAt(ou * D); drawWordmark(ctx, W / 2, LOGO_Y - ou * D, 1, k, e);
      ctx.restore();
      if (ou <= 0) twinkle(ctx, t, W0 + 0.45, W / 2, LOGO_Y);
      return;
    }
    // back: it rolls up into the window as the last value rolls out, a sheen, its sparkle again
    const bu = n ? seg(t, BACK, ROLL + 0.08) : 1, be = EASE.inOutQuint(bu);
    ctx.save(); if (bu < 1) clipWin(ctx);
    ctx.globalAlpha *= fadeAt((1 - be) * D); drawWordmark(ctx, W / 2, LOGO_Y + (1 - be) * D, 1, 1, 1, seg(t, BACK + 0.6, 0.6));
    ctx.restore();
    if (n) { twinkle(ctx, t, BACK + 0.5, W / 2, LOGO_Y);
      ctx.save(); ctx.translate(W / 2, LOGO_Y); popLight(ctx, K, t, BACK + 0.42, 520 * K, { a: 0.45, dur: 0.45 }); ctx.restore(); }
    else twinkle(ctx, t, W0 + 0.45, W / 2, LOGO_Y);
  }
  const FAST = [[J - FLY, J + 0.36], ...Array.from({ length: n + 1 }, (_, i) => [SWAP(i), SWAP(i) + ROLL + 0.25]),
    ...values.map((_, i) => [SWAP(i) + NUM_AT - 0.12, SWAP(i) + NUM_AT + 0.3])];
  function paint(ctx, t) {
    if (floodK(t) < 1 && prelude) prelude(ctx, t);
    if (floodK(t) >= 1) ground(ctx);
    opening(ctx, t);
    logo(ctx, t);
    for (let i = 0; i < n; i++) label(ctx, t, i);
    pill(ctx, t);
  }
  return {
    J, END,
    draw(ctx, t) {
      if (FAST.some(([a, b]) => t >= a && t <= b)) motionBlur(ctx, t, fps, 10, paint, null, { key: "sting" });
      else paint(ctx, t);
    },
    // the sounds: [{ t, kind: "sample:<dir>/<file>[:start:len]", gain, align }], t in the generic's time
    cues() {
      const c = [
        { t: J - 0.05, kind: "sample:top5/whoosh.wav", gain: -9.5, align: 0.94 },   // the burst
        mx("popPremium", J + 0.01), mx("swishBig", J + 0.12), mx("thump", W0 + 0.02),
      ];
      for (let i = 0; i <= n && n; i++) {
        const T = SWAP(i);
        c.push(mx("swish", T + 0.08));                                               // the roll
        if (i < n) c.push(mx(i === 0 ? "popPremium" : "stretch", T + NUM_AT + 0.02)); // the pill pops, then rolls
        if (i < n) c.push(mx("tick", T + ROLL - 0.02));                              // the words settle
      }
      if (n) { c.push(mx("thump", BACK + 0.42)); c.push(mx("popSmall", BACK + 0.52)); }
      else c.push(mx("popSmall", W0 + 0.45));
      // the Motionix kinds are "sample:sfx-motionix/<file>": their folder is assets/sfx/motionix
      return c.map(({ role, keep, ...q }) => ({ ...q, kind: q.kind.replace("sample:sfx-motionix/", "sample:motionix/") }));
    },
  };
}
