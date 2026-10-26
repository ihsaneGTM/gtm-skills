// THE HOOK'S GLITCH, on the lettering — the footage glitches in the assembly itself
// (assemble.py: channels split, bands torn sideways, blocks copied out of place, frames
// dropped); this does the same to what is DRAWN, so the record breaks up with the picture
// instead of sitting clean on top of it.
//
// On every frame of a burst (assets/hookfx.json, output seconds) the drawn beats of the
// hook are rendered off-screen, then laid back over the frame as a red and a cyan ghost
// pulled apart, plus a few bands of the lettering torn sideways and thin bright lines
// across the frame. About one frame in four of a burst stays clean, so it flickers.
// Seeded per frame: the same render twice gives the same glitch.
const ENGINE = new URL("../../short-editor/scripts/", import.meta.url).href;
const { createCanvas } = await import(ENGINE + "scene.mjs");
const { rng } = await import(ENGINE + "hand.mjs");

export function glitchText({ id = "hook-glitch", frame = { w: 1080, h: 1920 }, bursts = [], sources = [], seed = 1337, fps = 60, bands = [0.40, 0.86] }) {
  const W = frame.w, H = frame.h, K = W / 1080;
  let off = null, red = null, cyan = null;
  const tint = (dst, src, color) => {
    const c = dst.getContext("2d");
    c.save(); c.clearRect(0, 0, W, H); c.globalCompositeOperation = "source-over"; c.drawImage(src, 0, 0);
    c.globalCompositeOperation = "source-in"; c.fillStyle = color; c.fillRect(0, 0, W, H); c.restore();
  };
  const from = bursts.length ? Math.min(...bursts.map(b => b[0])) : 0, to = bursts.length ? Math.max(...bursts.map(b => b[1])) : 0;
  return {
    id, from, to, layer: "over", mutesCaptions: false, cues: () => [],
    draw(ctx, t) {
      const b = bursts.find(([a, z]) => t >= a && t < z);
      if (!b) return;
      const f = Math.round(t * fps), R = rng(seed + f * 7919);
      if (R() < 0.24) return;                                  // a clean frame: it flickers
      const u = (t - b[0]) / Math.max(1e-3, b[1] - b[0]);
      const amp = (b[2] ?? 1) * (0.55 + R() * 0.45) * (1 - 0.35 * u);
      if (!off) { off = createCanvas(W, H); red = createCanvas(W, H); cyan = createCanvas(W, H); }
      const o = off.getContext("2d");
      o.clearRect(0, 0, W, H);
      for (const s of sources) if (t >= s.from && t <= s.to) s.draw(o, t, { ghost: true });
      tint(red, off, "rgb(255,36,72)"); tint(cyan, off, "rgb(0,229,255)");
      const dx = (10 + R() * 26) * K * amp;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.drawImage(red, dx, (R() - 0.5) * 8 * K);
      ctx.drawImage(cyan, -dx, (R() - 0.5) * 8 * K);
      // bands of the lettering torn sideways
      ctx.globalAlpha = 1;
      const n = 2 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const y = (bands[0] + R() * (bands[1] - bands[0])) * H, h = (14 + R() * 80) * K, sh = (R() - 0.5) * 2 * 120 * K * amp;
        ctx.drawImage(off, 0, y, W, h, sh, y, W, h);
      }
      // thin bright lines across the frame
      const m = Math.floor(R() * 3.2);
      for (let i = 0; i < m; i++) {
        ctx.globalAlpha = 0.30 + R() * 0.45;
        ctx.fillStyle = R() < 0.5 ? "#FFFFFF" : "rgb(0,229,255)";
        ctx.fillRect(0, R() * H, W, (1 + R() * 3) * K);
      }
      ctx.restore();
    },
  };
}
