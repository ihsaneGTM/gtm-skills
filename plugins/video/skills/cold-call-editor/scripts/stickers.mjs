// THE TWO ENDS OF THE CALL, as die-cut stickers — the caller's yellow microphone and the
// other side's handset (the green handset of the phone chip), the white border and the
// one soft shadow of the icons that come out from behind the person. They live on the
// ringing sheet (ringscene.mjs).
const ENGINE = new URL("../../short-editor/scripts/", import.meta.url).href;
const { C, roundRect, Path2D } = await import(ENGINE + "scene.mjs");

// Feather icons (MIT): the handset (the same path as the phone chip), a microphone
const P_PHONE = "M21.6 16.9v2.7a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.6 17.6 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3.6 5.4 1.8 1.8 0 0 1 5.4 3.4h2.7a1.8 1.8 0 0 1 1.8 1.6 11.6 11.6 0 0 0 .6 2.5 1.8 1.8 0 0 1-.4 1.9L9 10.5a15.9 15.9 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4 11.6 11.6 0 0 0 2.5.6 1.8 1.8 0 0 1 1.6 1.9z";
export const GREEN = "#16A34A";

export function glyph(ctx, kind, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s / 24, s / 24); ctx.translate(-12, -12);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (kind === "phone") {
    ctx.lineWidth = 2.2; ctx.stroke(new Path2D(P_PHONE));
  } else {
    roundRect(ctx, 8.6, 1.6, 6.8, 12.8, 3.4); ctx.fill();
    ctx.lineWidth = 2.3;
    ctx.beginPath(); ctx.moveTo(5, 10.6); ctx.arc(12, 10.6, 7, Math.PI, 0, true); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 17.8); ctx.lineTo(12, 21.6); ctx.moveTo(8.4, 21.8); ctx.lineTo(15.6, 21.8); ctx.stroke();
  }
  ctx.restore();
}

// a die-cut sticker: the white border, one soft shadow, the face, the glyph
export function sticker(ctx, kind, cx, cy, s, { rot = 0, alpha = 1, K = 1, lift = 1 } = {}) {
  const b = s * 0.085, h = s / 2, r = s * 0.2237;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.shadowColor = `rgba(0,0,0,${(0.42 * lift).toFixed(3)})`; ctx.shadowBlur = 30 * K * lift; ctx.shadowOffsetY = 11 * K * lift;
  roundRect(ctx, -h - b, -h - b, s + 2 * b, s + 2 * b, r + b); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  ctx.shadowColor = "transparent";
  roundRect(ctx, -h, -h, s, s, r); ctx.fillStyle = kind === "mic" ? C.yellow : "#FFFFFF"; ctx.fill();
  if (kind !== "mic") { roundRect(ctx, -h, -h, s, s, r); ctx.strokeStyle = "rgba(0,0,0,.07)"; ctx.lineWidth = 1.2 * K; ctx.stroke(); }
  glyph(ctx, kind, 0, 0, s * 0.60, kind === "mic" ? "#0B0B0C" : GREEN);
  ctx.restore();
}
