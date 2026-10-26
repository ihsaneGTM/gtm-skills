// THE VOICE, AS ONE LINE — a single thin line of wave above the call record, driven by
// the MEASURED level of the voice talking (assets/call.json): the caller's colour while
// they talk, the other voice's while it does (review, 2026-10-03).
//
// What it replaced, in order: a black "Dynamic Island" capsule with an avatar per side
// (refused: the black bubble); two die-cut stickers with the names and bars between them
// (refused: "too AI"). Tested beside this line and not picked: nothing at all, a rule
// under the speaker's name that lives with the voice, a blinking REC light.
//
//   wave({ frame, data: loadLevels(), from, to, hide: [PLATE_AT, C0], colors })

export function wave({
  id = "wave", frame = { w: 1080, h: 1920 }, data, from = 0, to, hide = null,
  colors = { A: "#FFD90D", B: "rgba(255,255,255,.9)" },
  // (x1 before the feed's buttons, safezones.mjs; it was 0.07–0.93)
  y = 0.585, x0 = 0.10, x1 = 0.84, amp = 34, memory = 1.1, n = 180,
}) {
  return {
    id, from, to, layer: "over", mutesCaptions: false, cues: () => [],
    draw(ctx, t) {
      if (t < from || t > to) return;
      if (hide && t >= hide[0] && t < hide[1]) return;        // under the ringing sheet
      const W = frame.w, H = frame.h, K = W / 1080, Y = y * H, X0 = x0 * W, X1 = x1 * W;
      const a = data.A(t), b = data.B(t);
      ctx.save(); ctx.lineWidth = 3 * K; ctx.lineJoin = "round";
      ctx.strokeStyle = a >= b ? colors.A : colors.B;
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 8 * K;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        // the line runs back in time from right to left: the voice of the last `memory` s
        const u = i / n, tt = t - (1 - u) * memory, v = Math.max(data.A(tt), data.B(tt));
        const env = Math.sin(Math.PI * u);
        const yy = Y + Math.sin(u * 60 + t * 18) * Math.sin(u * 23 - t * 7) * v * amp * K * env;
        i ? ctx.lineTo(X0 + (X1 - X0) * u, yy) : ctx.moveTo(X0, yy);
      }
      ctx.stroke(); ctx.restore();
    },
  };
}
