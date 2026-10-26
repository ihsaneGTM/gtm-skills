// Platform marks drawn as vectors so they stay crisp at any size.
// LinkedIn / YouTube paths come from the house icon set; Instagram and
// TikTok are built from primitives here.
import { roundRect, drawPipecornP } from "./scene.mjs";
import { Path2D } from "@napi-rs/canvas";

const P_LINKEDIN = "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z";

// TikTok's note, traced as a stroke path in a 0..24 box.
function tiktokNote(ctx, s, color) {
  ctx.save();
  ctx.scale(s / 24, s / 24);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  // stem + flag
  ctx.beginPath();
  ctx.moveTo(13.6, 4.2);
  ctx.lineTo(13.6, 15.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13.6, 4.2);
  ctx.bezierCurveTo(14.2, 7.2, 16.3, 8.8, 19.2, 8.9);
  ctx.stroke();
  // note head
  ctx.beginPath();
  ctx.arc(10.0, 15.4, 3.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawBrand(ctx, kind, cx, cy, s, opts = {}) {
  const half = s / 2, r = s * 0.245;
  ctx.save();
  ctx.translate(cx, cy);
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.shadow !== false) { ctx.shadowColor = "rgba(0,0,0,.42)"; ctx.shadowBlur = s * 0.30; ctx.shadowOffsetY = s * 0.09; }

  const chip = fill => { roundRect(ctx, -half, -half, s, s, r); ctx.fillStyle = fill; ctx.fill(); ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; };

  if (kind === "youtube") {
    chip("#FF0000");
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-s * 0.115, -s * 0.185); ctx.lineTo(s * 0.205, 0); ctx.lineTo(-s * 0.115, s * 0.185);
    ctx.closePath(); ctx.fill();
  } else if (kind === "linkedin") {
    chip("#FFFFFF");
    ctx.save(); ctx.scale(s / 24, s / 24); ctx.translate(-12, -12);
    ctx.fillStyle = "#0A66C2"; ctx.fill(new Path2D(P_LINKEDIN)); ctx.restore();
  } else if (kind === "tiktok") {
    chip("#000000");
    ctx.save(); ctx.translate(-s * 0.5, -s * 0.5);
    ctx.save(); ctx.translate(s * 0.5 - s * 0.035, s * 0.5 - s * 0.035);
    ctx.translate(-s * 0.5, -s * 0.5); tiktokNote(ctx, s, "#25F4EE"); ctx.restore();   // cyan ghost
    ctx.save(); ctx.translate(s * 0.5 + s * 0.035, s * 0.5 + s * 0.035);
    ctx.translate(-s * 0.5, -s * 0.5); tiktokNote(ctx, s, "#FE2C55"); ctx.restore();   // red ghost
    tiktokNote(ctx, s, "#FFFFFF");
    ctx.restore();
  } else if (kind === "instagram") {
    const g = ctx.createLinearGradient(-half, half, half, -half);
    g.addColorStop(0, "#FEDA75"); g.addColorStop(0.3, "#FA7E1E");
    g.addColorStop(0.6, "#D62976"); g.addColorStop(1, "#962FBF");
    chip(g);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = s * 0.075; ctx.lineJoin = "round";
    roundRect(ctx, -s * 0.27, -s * 0.27, s * 0.54, s * 0.54, s * 0.17); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.135, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.175, -s * 0.175, s * 0.037, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
  } else if (kind === "seo") {
    chip("#FFFFFF");
    ctx.strokeStyle = "#1A73E8"; ctx.lineWidth = s * 0.085; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-s * 0.055, -s * 0.055, s * 0.19, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.09, s * 0.09); ctx.lineTo(s * 0.235, s * 0.235); ctx.stroke();
  } else if (kind === "signups") {
    chip("#0EA968");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = s * 0.075; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(-s * 0.035, -s * 0.10, s * 0.135, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, s * 0.21); ctx.bezierCurveTo(-s * 0.24, s * 0.03, s * 0.17, s * 0.03, s * 0.17, s * 0.21);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.20, -s * 0.20); ctx.lineTo(s * 0.20, -s * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.11, -s * 0.11); ctx.lineTo(s * 0.29, -s * 0.11); ctx.stroke();
  } else if (kind === "pipecorn") {
    chip("#FFD90D");
    drawPipecornP(ctx, 0, 0, s * 0.70, "#0B0B0B");
  }
  ctx.restore();
}

export const BRAND_LABEL = {
  youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
  seo: "SEO", signups: "Signups", linkedin: "LinkedIn",
};
