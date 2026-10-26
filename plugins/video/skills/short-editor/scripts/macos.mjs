// The desktop demo: a Mac screen wakes with the user's real wallpaper, the app
// is already in the menu bar, its dock icon bounces, the window opens, the
// product builds INSIDE it, and on cue the window is pushed forward until it
// IS the full-frame card.
//
// This is the shot the reviewer asked to keep, so the constraints behind it are
// not decoration:
//   - No laptop shell. A drawn MacBook body reads as clip art; a bare screen
//     with a real wallpaper reads as a screen recording.
//   - APPWIN is the content card at a uniform scale. Because the two rects are
//     similar, the push is a rectangle interpolation — the product is never
//     re-laid-out mid-move, which is what would give the trick away.
//   - The desktop fades AND scales up during the push, so it reads as flying
//     into the screen rather than as a crossfade.
//   - The menu bar and dock are darkened, not lightened. A light scrim on a
//     bright wallpaper makes white glyphs unreadable; this was caught on the
//     third wallpaper the reviewer picked.
import { CARD, F, clamp01, easeInOutCubic, easeOutQuint, spring, lerp, roundRect, drawPipecornP, loadImage } from "./scene.mjs";

export const SCR = { x: 52, y: 50, w: 976, h: 534, r: 24 };
const BAR = 30;
// the app window is exactly the card at a uniform scale
export const APPWIN = { x: 150, y: SCR.y + BAR + 18, w: 780, h: 780 * CARD.h / CARD.w };
const DOCK_N = 6, DOCK_S = 46, DOCK_APP = 2;

let WALL = null;
export async function loadWallpaper(file = "assets/wallpaper.png") {
  try { WALL = await loadImage(file); } catch { WALL = null; console.error(`wallpaper missing: ${file}`); }
  return WALL;
}

function dockSlot(i) {
  const gap = 14, tot = DOCK_N * DOCK_S + (DOCK_N - 1) * gap;
  return { x: SCR.x + SCR.w / 2 - tot / 2 + i * (DOCK_S + gap) + DOCK_S / 2,
           y: SCR.y + SCR.h - 46 };
}

// M = the project's macOS timing block (edl.mjs MAC)
export function macFrame(t, M) {
  if (!M || t < M.wake - 0.1 || t > M.pushTo) return null;
  const u = easeInOutCubic(clamp01((t - M.pushFrom) / (M.pushTo - M.pushFrom)));
  return {
    T: M,
    rect: {
      x: lerp(APPWIN.x, CARD.x, u), y: lerp(APPWIN.y, CARD.y, u),
      w: lerp(APPWIN.w, CARD.w, u), h: lerp(APPWIN.h, CARD.h, u),
    },
    deskAlpha: spring(clamp01((t - M.wake) / 0.7)) * (1 - easeInOutCubic(clamp01((t - M.pushFrom) / 0.55))),
    deskScale: 1 + 0.20 * easeInOutCubic(clamp01((t - M.pushFrom) / 0.9)),
    chromeAlpha: clamp01((t - M.open - 0.2) / 0.3) * (1 - easeInOutCubic(clamp01((t - M.pushFrom) / 0.42))),
    rise: (1 - easeOutQuint(clamp01((t - M.wake) / 0.7))) * 70,
    opened: t >= M.open,
    openK: spring(clamp01((t - M.open) / 0.55), 2.9, 5.6),
  };
}

export function drawDesktop(ctx, t, D, { appName = "GTM OS" } = {}) {
  if (D.deskAlpha <= 0.004) return;
  const M = D.T;
  ctx.save();
  ctx.globalAlpha = clamp01(D.deskAlpha);
  const cx = SCR.x + SCR.w / 2, cy = SCR.y + SCR.h / 2;
  ctx.translate(cx, cy); ctx.scale(D.deskScale, D.deskScale); ctx.translate(-cx, -cy);
  ctx.translate(0, D.rise);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 42; ctx.shadowOffsetY = 16;
  roundRect(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r);
  ctx.fillStyle = "#0E131C"; ctx.fill();
  ctx.restore();

  roundRect(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r);
  ctx.save(); ctx.clip();
  if (WALL) {
    const sc = Math.max(SCR.w / WALL.width, SCR.h / WALL.height);
    const dw = WALL.width * sc, dh = WALL.height * sc;
    ctx.drawImage(WALL, SCR.x + (SCR.w - dw) / 2, SCR.y + (SCR.h - dh) / 2, dw, dh);
  } else {
    const wp = ctx.createLinearGradient(SCR.x, SCR.y, SCR.x + SCR.w * 0.7, SCR.y + SCR.h);
    wp.addColorStop(0, "#0E131C"); wp.addColorStop(0.55, "#18202C"); wp.addColorStop(1, "#111823");
    ctx.fillStyle = wp; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  }

  // --- menu bar: the app is already up there -------------------------------
  ctx.fillStyle = "rgba(10,12,16,.34)";
  ctx.fillRect(SCR.x, SCR.y, SCR.w, BAR);
  const by = SCR.y + BAR / 2;
  ctx.beginPath(); ctx.arc(SCR.x + 26, by, 10, 0, 7);
  ctx.fillStyle = "#FFD90D"; ctx.fill();
  drawPipecornP(ctx, SCR.x + 26, by, 12, "#0B0B0B");
  ctx.font = F(800, 15); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.fillText(appName, SCR.x + 44, by + 1);
  ctx.fillStyle = "rgba(255,255,255,.5)";
  for (let i = 0; i < 4; i++) { roundRect(ctx, SCR.x + 112 + i * 30, by - 2.5, 20, 5, 2.5); ctx.fill(); }
  for (let i = 0; i < 3; i++) { roundRect(ctx, SCR.x + SCR.w - 30 - i * 28, by - 2.5, 16, 5, 2.5); ctx.fill(); }

  // --- dock -----------------------------------------------------------------
  const dockA = clamp01((t - M.wake - 0.28) / 0.4);
  if (dockA > 0.01) {
    ctx.save();
    ctx.globalAlpha = dockA;
    const d0 = dockSlot(0), dN = dockSlot(DOCK_N - 1);
    roundRect(ctx, d0.x - DOCK_S / 2 - 12, d0.y - DOCK_S / 2 - 10,
              (dN.x - d0.x) + DOCK_S + 24, DOCK_S + 20, 17);
    ctx.fillStyle = "rgba(16,18,24,.34)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.24)"; ctx.lineWidth = 1.2; ctx.stroke();
    const tint = ["#5b8def", "#e0574d", "#4bb36b", "#FFD90D", "#c96cd1", "#e0a24d"];
    for (let i = 0; i < DOCK_N; i++) {
      const d = dockSlot(i);
      let bo = 0;
      if (i === DOCK_APP) {
        const u = clamp01((t - M.bounce) / 0.42);
        bo = u > 0 && u < 1 ? -Math.abs(Math.sin(u * Math.PI * 2)) * 22 * (1 - u) : 0;
      }
      roundRect(ctx, d.x - DOCK_S / 2, d.y - DOCK_S / 2 + bo, DOCK_S, DOCK_S, 12);
      ctx.fillStyle = i === DOCK_APP ? "#FFD90D" : tint[i];
      ctx.globalAlpha = dockA * (i === DOCK_APP ? 1 : 0.82);
      ctx.fill();
      if (i === DOCK_APP) drawPipecornP(ctx, d.x, d.y + bo, DOCK_S * 0.62, "#0B0B0B");
      if (i === DOCK_APP && t >= M.open + 0.2) {
        ctx.globalAlpha = dockA * clamp01((t - M.open - 0.2) / 0.25);
        ctx.beginPath(); ctx.arc(d.x, d.y + DOCK_S / 2 + 8, 2.8, 0, 7);
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.restore();                                  // screen clip

  roundRect(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r);
  ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

// The window's own chrome (traffic lights, title, left rail), drawn OVER the
// content and faded out during the push so the card is left bare in full frame.
export function drawAppChrome(ctx, D, { appName = "GTM OS" } = {}) {
  const a = D.chromeAlpha;
  if (a <= 0.004) return;
  const r = D.rect, S = r.w / CARD.w;
  ctx.save();
  ctx.globalAlpha = clamp01(a);
  roundRect(ctx, r.x, r.y, r.w, r.h, 34 * S);
  ctx.save(); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(r.x, r.y, r.w, 26 * S);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.beginPath(); ctx.arc(r.x + (18 + i * 17) * S, r.y + 13 * S, 5.2 * S, 0, 7);
    ctx.fillStyle = c; ctx.fill();
  });
  ctx.font = F(700, Math.max(1, 13 * S)); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(244,245,247,.72)"; ctx.fillText(appName, r.x + r.w / 2, r.y + 14 * S);
  ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(r.x, r.y + 26 * S, 42 * S, r.h - 26 * S);
  ctx.beginPath(); ctx.arc(r.x + 21 * S, r.y + 48 * S, 9.5 * S, 0, 7); ctx.fillStyle = "#FFD90D"; ctx.fill();
  drawPipecornP(ctx, r.x + 21 * S, r.y + 48 * S, 11.5 * S, "#0B0B0B");
  for (let i = 0; i < 5; i++) {
    roundRect(ctx, r.x + 10.5 * S, r.y + (72 + i * 19) * S, 21 * S, 7 * S, 3 * S);
    ctx.fillStyle = i === 0 ? "rgba(255,217,13,.55)" : "rgba(255,255,255,.14)"; ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// Where the window grows FROM when it opens: the dock icon.
export const dockOrigin = () => ({ x: APPWIN.x + APPWIN.w / 2 - 23, y: SCR.y + SCR.h - 46 - 23 });
