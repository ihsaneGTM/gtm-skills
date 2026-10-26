// THE GTM OS map, exactly as the video should show it: the Pipecorn hub in the
// middle, the real acquisition bricks around it, branches unfurling clockwise,
// a camera that pushes into a brick when the speaker names it.
//
// Node identity (labels, icons, live statuses) is NOT written here. It comes
// from the project's gtmos-nodes.json, written from the user's real map
// (example/gtmos-nodes.json shows the shape). Hardcoding it ships a video that
// contradicts the dashboard it is selling.
//
// The layout is the one deliberate departure from a dashboard: the video wants
// an ellipse. Angles are arc-length uniform, because equal angles bunch the
// bricks at the extremes.
import fs from "node:fs";
import path from "node:path";
import {
  CARD, C, STATUS, F, MONO, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint,
  easeOutExpo, easeOutBack, spring, lerp, seg, roundRect, withAlpha, drawIcon,
  drawPipecornP, drawCardShell,
} from "./scene.mjs";

// --- geometry ----------------------------------------------------------------
// A project with no GTM OS map beat (a talking-head intro) has no nodes file:
// fall back to an empty map rather than crashing the whole render at import —
// render.mjs imports this unconditionally, and with `eof_action=pass` on the
// overlay a crashed compositor still lets ffmpeg encode a video with NO
// graphics at all, which the build then refuses only at the very end.
const NODES_FILE = path.resolve(process.cwd(), "gtmos-nodes.json");
const DOC = fs.existsSync(NODES_FILE)
  ? JSON.parse(fs.readFileSync(NODES_FILE, "utf8"))
  : { nodes: [], rx: 0, ry: 0, buildOrder: [] };
export const NODES = DOC.nodes;
export const RX = DOC.rx, RY = DOC.ry;
export const BUILD_ORDER = DOC.buildOrder;
export const CX = CARD.w / 2, CY = CARD.h / 2 + 6;
export const nodePos = n => {
  const r = (n.a * Math.PI) / 180;
  return { x: CX + RX * Math.cos(r), y: CY + RY * Math.sin(r) };
};
const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
const ORDER_IDX = Object.fromEntries(BUILD_ORDER.map((id, i) => [id, i]));

// --- the skills panel + the Claude Code terminal -----------------------------
// Used when the speaker says "there is a skill in each channel": the panel
// slides in beside the map (the map shifts left and pulls back to make room),
// one skill is picked, and it expands into a terminal that runs it.
// Skill names must be REAL names from this repo. Inventing one is a lie the
// viewer can check.
const PANEL = { x: CARD.x + 664, y: CARD.y + 66, w: 310, h: 372, r: 20 };
const TERM  = { x: 84, y: 96, w: 912, h: 448, r: 22 };
const rowY = (P, i) => P.y + 130 + i * 54;

export function drawSkillsPanel(ctx, t, S) {
  if (!S) return;
  const inK = spring(clamp01((t - S.in) / 0.6));
  const outK = 1 - easeInOutCubic(clamp01((t - S.select - 0.22) / 0.34));
  const a = Math.min(inK, outK);
  if (a <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = clamp01(a);
  ctx.translate((1 - easeOutQuint(clamp01((t - S.in) / 0.55))) * 90, 0);

  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r);
  ctx.fillStyle = "rgba(24,26,31,.97)"; ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.13)"; ctx.lineWidth = 1.4; ctx.stroke();

  ctx.font = F(800, 17); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,217,13,.9)";
  ctx.fillText("SKILLS", PANEL.x + 24, PANEL.y + 40);
  ctx.font = F(600, 15);
  ctx.fillStyle = "rgba(244,245,247,.45)";
  ctx.fillText(S.group || "", PANEL.x + 96, PANEL.y + 40);
  ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PANEL.x + 20, PANEL.y + 66); ctx.lineTo(PANEL.x + PANEL.w - 20, PANEL.y + 66); ctx.stroke();

  S.skills.forEach((s, i) => {
    const k = spring(clamp01((t - (S.row0 + i * S.rowGap)) / 0.5));
    if (k <= 0.01) return;
    const picked = i === (S.pick || 0) && t >= S.select;
    const dim = t >= S.select && !picked ? 1 - easeInOutCubic(clamp01((t - S.select) / 0.3)) * 0.72 : 1;
    const y = rowY(PANEL, i);
    ctx.save();
    ctx.globalAlpha = clamp01(k) * dim;
    ctx.translate((1 - easeOutQuint(clamp01((t - (S.row0 + i * S.rowGap)) / 0.45))) * 44, 0);
    if (picked) {
      const pk = easeOutBack(clamp01((t - S.select) / 0.28));
      roundRect(ctx, PANEL.x + 14, y - 20, PANEL.w - 28, 40, 12);
      ctx.fillStyle = `rgba(255,217,13,${(0.90 * pk).toFixed(3)})`; ctx.fill();
    }
    ctx.font = MONO(500, 18); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = picked ? "#141517" : "rgba(244,245,247,.90)";
    ctx.fillText(s, PANEL.x + 26, y);
    ctx.restore();
  });
  ctx.restore();
}

export function drawTerminal(ctx, t, S) {
  if (!S) return;
  const inK = spring(clamp01((t - S.termIn) / 0.5), 2.9, 5.6);
  const outK = 1 - easeInOutCubic(clamp01((t - S.termOut) / (S.termEnd - S.termOut)));
  const a = Math.min(clamp01(inK * 1.5), outK);
  if (a <= 0.01) return;

  const PICK = S.pick || 0;
  const from = { x: PANEL.x + 14, y: rowY(PANEL, PICK) - 20, w: PANEL.w - 28, h: 40 };
  const k = clamp01(inK);
  const r = {
    x: lerp(from.x, TERM.x, k), y: lerp(from.y, TERM.y, k),
    w: lerp(from.w, TERM.w, k), h: lerp(from.h, TERM.h, k),
  };

  // scrim: without it the map's bottom labels poke out under the window and
  // read as a rendering glitch rather than as an app behind a modal
  ctx.save();
  ctx.globalAlpha = clamp01(a) * 0.72 * clamp01(k * 1.4);
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 34);
  ctx.fillStyle = "#0B0C0E"; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = clamp01(a);
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  roundRect(ctx, r.x, r.y, r.w, r.h, TERM.r);
  ctx.fillStyle = "#0B0C0E"; ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 1.5; ctx.stroke();
  if (k < 0.45) { ctx.restore(); return; }

  roundRect(ctx, r.x, r.y, r.w, r.h, TERM.r);
  ctx.save(); ctx.clip();
  ctx.globalAlpha = clamp01(a) * clamp01((k - 0.45) / 0.3);

  ctx.fillStyle = "rgba(255,255,255,.045)"; ctx.fillRect(r.x, r.y, r.w, 38);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.beginPath(); ctx.arc(r.x + 24 + i * 19, r.y + 19, 6, 0, 7); ctx.fillStyle = c; ctx.fill();
  });
  ctx.font = F(700, 16); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(244,245,247,.66)";
  ctx.fillText("Claude Code", r.x + r.w / 2, r.y + 20);

  const LX = r.x + 34;
  let y = r.y + 78;

  const cmd = `> ${S.skills[PICK]}`;
  const tk = clamp01((t - S.prompt) / (S.promptEnd - S.prompt));
  ctx.font = MONO(500, 21); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFD90D";
  const typed = cmd.slice(0, Math.max(1, Math.floor(tk * cmd.length)));
  ctx.fillText(typed, LX, y);
  if (tk < 1 && Math.floor(t * 6) % 2) {
    ctx.fillRect(LX + ctx.measureText(typed).width + 3, y - 11, 10, 22);
  }
  y += 44;

  (S.lines || []).forEach((ln, i) => {
    const lk = easeOutCubic(clamp01((t - (S.line0 + i * S.lineGap)) / 0.18));
    if (lk <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp01(a) * lk;
    ctx.font = MONO(500, 21);
    if (ln.ok) {
      // drawn, not typeset: Geist Mono has no check glyph and renders a box
      ctx.save();
      ctx.strokeStyle = "#7DE2B8"; ctx.lineWidth = 2.6;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(LX + 3, y + 1); ctx.lineTo(LX + 8, y + 6); ctx.lineTo(LX + 17, y - 6);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "rgba(244,245,247,.86)"; ctx.fillText(ln.text, LX + 34, y);
    } else {
      ctx.fillStyle = "rgba(244,245,247,.55)"; ctx.fillText("·", LX + 6, y);
      ctx.fillStyle = "rgba(244,245,247,.78)"; ctx.fillText(ln.text, LX + 34, y);
    }
    ctx.restore();
    y += 34;
  });

  if (S.summary != null) {
    const sk = easeOutBack(clamp01((t - S.summary) / 0.4));
    if (sk > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp01(a) * clamp01(sk);
      ctx.font = MONO(500, 22);
      const w = ctx.measureText(S.summaryText).width + 40;
      ctx.translate(LX, y + 14);
      ctx.scale(lerp(0.9, 1, clamp01(sk)), lerp(0.9, 1, clamp01(sk)));
      roundRect(ctx, 0, -19, w, 38, 19);
      ctx.fillStyle = "rgba(255,217,13,.94)"; ctx.fill();
      ctx.fillStyle = "#141517"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(S.summaryText, 20, 1);
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.restore();
}

export function sidebarShift(t, S) {
  if (!S) return 0;
  return clamp01(Math.min(easeInOutCubic(clamp01((t - S.in) / 0.6)),
                          1 - easeInOutCubic(clamp01((t - S.sidebarOut) / 0.5))));
}

// --- the map ------------------------------------------------------------------
function drawBadge(ctx, text, cx, cy, k) {
  ctx.save();
  ctx.globalAlpha = clamp01(k);
  ctx.font = F(600, 16);
  const w = ctx.measureText(text).width + 26, h = 30;
  ctx.translate(cx, cy);
  const s = lerp(0.86, 1, clamp01(k));
  ctx.scale(s, s);
  roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = "rgba(255,217,13,.94)"; ctx.fill();
  ctx.fillStyle = "#141517"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

// `E` is the project's GTM OS timing block (edl.mjs MAP), `SK` its skills block.
function camera(t, E, SK) {
  let zoom = 1, px = CX, py = CY, dim = 0, focusId = null;
  const push = (id, a, b, z) => {
    if (a == null || b == null) return;
    const k = Math.min(easeInOutCubic(seg(t, a, a + 0.75)), easeInOutCubic(1 - seg(t, b - 0.65, b)));
    if (k <= 0.001) return;
    const p0 = id === "root" ? { x: CX, y: CY } : nodePos(byId[id]);
    const p = { x: lerp(CX, p0.x, 0.54), y: lerp(CY, p0.y, 0.54) };
    zoom = lerp(zoom, z, k); px = lerp(px, p.x, k); py = lerp(py, p.y, k);
    dim = Math.max(dim, k); focusId = k > 0.4 ? id : focusId;
  };
  for (const f of E.focus || []) push(f.node, f.in, f.out, f.zoom || 1.34);
  {
    // the skills panel opens beside the map, so the map slides left and pulls
    // back. 0.71 / +222 were measured against the CONTENT extent (labels
    // included, 82..918 px), not node-to-node — that is what leaves the
    // left-most brick a real margin instead of pinning it to the edge.
    const k = sidebarShift(t, SK);
    if (k > 0.001) { zoom = lerp(zoom, 0.71, k); px = lerp(px, CX + 222, k); }
  }
  if (E.boom != null && t >= E.boom && t < E.boom + 0.9)
    zoom *= lerp(0.90, 1.0, easeOutExpo(seg(t, E.boom, E.boom + 0.9)));
  return { zoom, px, py, dim, focusId };
}

// rect = where the card lands. The app window on the desktop is exactly this
// card at a uniform scale, which is what makes the push into full frame a pure
// rectangle interpolation instead of a rebuild.
export function drawMap(ctx, t, E, SK, rect = CARD, forceVis = null, chromeFade = 0) {
  let vis = 0, cardScale = 1;
  for (const A of E.acts) {
    const dur = A.build ? 0.62 : 0.44;
    const outK = 1 - easeInOutCubic(seg(t, A.out, A.outEnd));
    const v = Math.min(easeOutQuint(seg(t, A.in, A.in + dur)), outK);
    if (v > vis) {
      vis = v;
      cardScale = lerp(A.build ? 0.955 : 0.975, 1, easeOutQuint(seg(t, A.in, A.in + dur + 0.08))) * lerp(1, 0.972, 1 - outK);
    }
  }
  if (forceVis !== null) { vis = forceVis; cardScale = 1; }
  if (vis <= 0.002) return;

  const nodeAppear = id => spring(clamp01((t - (E.branch0 + ORDER_IDX[id] * E.branchGap)) / 0.85));
  const branchDraw = id => easeOutCubic(clamp01((t - (E.branch0 + ORDER_IDX[id] * E.branchGap - 0.16)) / 0.42));
  const BADGES = E.badges || [];

  const SC = rect.w / CARD.w;
  ctx.save();
  ctx.translate(rect.x - CARD.x * SC, rect.y - CARD.y * SC);
  ctx.scale(SC, SC);

  const boomFlash = E.boom != null && t >= E.boom && t < E.boom + 0.55
    ? Math.pow(1 - clamp01((t - E.boom) / 0.55), 1.6) : 0;
  const ccx = CARD.x + CARD.w / 2;
  drawCardShell(ctx, vis, cardScale, CARD);

  const cam = camera(t, E, SK);
  ctx.save();
  ctx.translate(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.px, -cam.py);
  const idleY = Math.sin(t * 0.9) * 2.2;

  for (const n of NODES) {
    const k = branchDraw(n.id);
    if (k <= 0) continue;
    const p = nodePos(n);
    const dimK = cam.focusId && cam.focusId !== n.id ? lerp(1, 0.20, cam.dim) : 1;
    ctx.save();
    ctx.globalAlpha = 0.9 * dimK;
    ctx.strokeStyle = withAlpha("#8B93A5", 0.32);
    ctx.lineWidth = 1.7 / Math.max(1, cam.zoom * 0.72); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(CX, CY);
    ctx.lineTo(lerp(CX, p.x, k), lerp(CY, p.y, k) + idleY * 0.5); ctx.stroke();
    ctx.restore();
  }

  // data flowing back to the hub — used under "it tells me where the signups
  // come from", never as constant decoration
  if (E.pulseFrom != null && t > E.pulseFrom - 0.2 && t < E.pulseTo + 1.6) {
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i], p = nodePos(n);
      const phase = (t - E.pulseFrom - i * 0.29) / 2.4;
      if (phase < 0) continue;
      const u = phase % 1;
      const fade = clamp01((E.pulseTo + 1.4 - t) / 1.2) * clamp01((t - E.pulseFrom) / 0.5);
      const dimK = cam.focusId && cam.focusId !== n.id ? lerp(1, 0.2, cam.dim) : 1;
      ctx.save();
      ctx.globalAlpha = fade * dimK * (1 - Math.pow(Math.abs(u * 2 - 1), 2)) * 0.95;
      ctx.fillStyle = "#7DE2B8"; ctx.shadowColor = "#0EA968"; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(lerp(p.x, CX, easeInOutCubic(u)), lerp(p.y, CY, easeInOutCubic(u)), 3.4, 0, 7);
      ctx.fill(); ctx.restore();
    }
  }

  for (const n of NODES) {
    const a = nodeAppear(n.id);
    if (a <= 0.001) continue;
    const p = nodePos(n);
    const focused = cam.focusId === n.id;
    const dimK = cam.focusId && !focused ? lerp(1, 0.22, cam.dim) : 1;
    const R = 36, col = STATUS[n.status] || C.grey;
    ctx.save();
    ctx.translate(p.x, p.y + idleY * 0.5);
    ctx.scale(a, a);
    ctx.globalAlpha = Math.min(1, a) * dimK;
    if (focused) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.16 * pulse;
      ctx.strokeStyle = "#FFD90D"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, R + 11 + pulse * 4, 0, 7); ctx.stroke();
      ctx.restore();
    }
    const bi = ORDER_IDX[n.id];
    const bf = E.boom != null && t >= E.boom + bi * 0.055 ? 1 - clamp01((t - (E.boom + bi * 0.055)) / 0.5) : 0;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7);
    ctx.fillStyle = "rgba(255,255,255,.045)"; ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.62 + 0.3 * bf);
    ctx.lineWidth = 2 + 1.6 * bf;
    if (bf > 0) { ctx.shadowColor = col; ctx.shadowBlur = 22 * bf; }
    ctx.stroke(); ctx.shadowBlur = 0;
    drawIcon(ctx, n.icon, 0, -1, 33);
    ctx.beginPath(); ctx.arc(R * 0.70, -R * 0.70, 4.6, 0, 7);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = "rgba(17,18,20,.9)"; ctx.lineWidth = 2; ctx.stroke();
    const bg2 = BADGES.find(b => b.node === n.id && t >= b.from - 0.3 && t <= b.to + 0.25);
    if (bg2) {
      const bk = Math.min(easeOutBack(clamp01((t - bg2.from) / 0.42)), 1 - easeInOutCubic(seg(t, bg2.to, bg2.to + 0.25)));
      if (bk > 0.01) drawBadge(ctx, bg2.text, 0, R + 46, bk);
    }
    ctx.globalAlpha = Math.min(1, a) * dimK * clamp01((a - 0.35) / 0.5);
    ctx.font = F(600, 20); ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = focused ? "#FFFFFF" : "rgba(244,245,247,.88)";
    ctx.fillText(n.label, 0, R + 11);
    ctx.restore();
  }

  // the hub
  {
    const a = spring(clamp01((t - E.centerPop) / 0.9));
    if (a > 0.001) {
      const R = 46;
      const hubFocus = (BADGES.some(b => b.node === "root" && t >= b.from - 0.3 && t <= b.to + 0.25));
      ctx.save();
      ctx.translate(CX, CY + idleY * 0.35);
      ctx.scale(a, a);
      const br = 0.5 + 0.5 * Math.sin(t * 1.7);
      ctx.save();
      ctx.globalAlpha = (0.085 + 0.055 * br) * (hubFocus ? 1.8 : 1) + boomFlash * 0.55;
      ctx.fillStyle = "#FFD90D"; ctx.shadowColor = "#FFD90D"; ctx.shadowBlur = 26;
      ctx.beginPath(); ctx.arc(0, 0, R + 12 + br * 5, 0, 7); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7);
      ctx.fillStyle = "#FFD90D"; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.stroke();
      drawPipecornP(ctx, 0, 0, R * 1.30, "#0B0B0B");
      const bg3 = BADGES.find(b => b.node === "root" && t >= b.from - 0.3 && t <= b.to + 0.25);
      if (bg3) {
        const bk = Math.min(easeOutBack(clamp01((t - bg3.from) / 0.42)), 1 - easeInOutCubic(seg(t, bg3.to, bg3.to + 0.25)));
        if (bk > 0.01) drawBadge(ctx, bg3.text, 0, R + 34, bk);
      }
      // The shockwave belongs to the boom ALONE. Deriving it from max(centrePop,
      // boom) silently kills it the moment centrePop moves earlier: its term
      // saturates at 1 and the `< 1` test never fires again.
      if (E.boom != null) {
        const ringT = seg(t, E.boom, E.boom + 0.75);
        if (ringT > 0 && ringT < 1) {
          ctx.save();
          ctx.globalAlpha = (1 - ringT) * 0.6;
          ctx.strokeStyle = "#FFD90D"; ctx.lineWidth = 3 * (1 - ringT) + 1;
          ctx.beginPath(); ctx.arc(0, 0, R + easeOutCubic(ringT) * 120, 0, 7); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }
  ctx.restore();

  // the app's own header chip, so the card reads as a running product
  if (E.chrome !== false) {
    const a = easeOutCubic(seg(t, E.chromeFrom, E.chromeFrom + 0.6)) * (1 - chromeFade);
    ctx.save();
    ctx.globalAlpha = a * 0.96;
    const px = CARD.x + 26, py = CARD.y + 22;
    roundRect(ctx, px, py, 196, 44, 22);
    ctx.fillStyle = "rgba(255,255,255,.055)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(px + 25, py + 22, 12, 0, 7);
    ctx.fillStyle = "#FFD90D"; ctx.fill();
    drawPipecornP(ctx, px + 25, py + 22, 15, "#0B0B0B");
    ctx.font = F(700, 17); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#F4F5F7"; ctx.fillText("GTM OS", px + 46, py + 22);
    const blink = 0.55 + 0.45 * Math.sin(t * 2.6);
    ctx.beginPath(); ctx.arc(px + 128, py + 22, 4.2, 0, 7);
    ctx.fillStyle = C.green; ctx.globalAlpha = a * (0.5 + 0.5 * blink); ctx.fill();
    ctx.globalAlpha = a * 0.72;
    ctx.font = F(600, 14); ctx.fillStyle = "rgba(244,245,247,.72)";
    ctx.fillText("LIVE", px + 140, py + 23);
    ctx.restore();
  }

  drawSkillsPanel(ctx, t, SK);
  drawTerminal(ctx, t, SK);

  if (boomFlash > 0) {
    ctx.save();
    const gb = ctx.createRadialGradient(ccx, CARD.y + CARD.h / 2, 0, ccx, CARD.y + CARD.h / 2, CARD.w * 0.55);
    gb.addColorStop(0, `rgba(255,231,120,${0.30 * boomFlash})`);
    gb.addColorStop(0.55, `rgba(255,217,13,${0.10 * boomFlash})`);
    gb.addColorStop(1, "rgba(255,217,13,0)");
    ctx.fillStyle = gb; ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
    ctx.restore();
  }
  ctx.restore();                                  // clip from drawCardShell
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.strokeStyle = boomFlash > 0 ? `rgba(255,217,13,${0.10 + 0.5 * boomFlash})` : "rgba(255,255,255,.10)";
  ctx.lineWidth = 1.5 + 1.6 * boomFlash; ctx.stroke();
  ctx.restore();                                  // card transform
  ctx.restore();                                  // rect transform
}
