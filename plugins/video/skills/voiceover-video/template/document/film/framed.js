/* Stock shots in the Fr1 frame (waterfall videos, round 9; the same frame as the dark 3D shots of waterfall-v1-3d `?v=D`).
   F.framed({ t0, t1, shots: [{ name, n, t0, t1, start, fps }], label }) puts a group of consecutive shots on V1's paper:
   the paper fades over the scene and the frame draws itself (guide lines out to the page's edges, a thin ink rectangle,
   crosshairs), the screen opens from its middle line, then each shot plays inside it, graded to sit on the paper
   (saturation −15 %, a little warm, blacks lifted), a slow push, the F1 screen-door grid laid over at true pixels; at
   the end the screen closes, the frame undraws, the scene comes back. The open animation is done BEFORE t0 (the screen is
   open on the word) and the close AFTER t1. Pictures: film/media/<name>/f0001.jpg… (1600×900, cut at `fps`). */
(() => {
  const W = 1920, H = 1080, FR = { x: 160, y: 64, w: 1600, h: 900 };
  // ?hd=1 (the 4K render, deviceScaleFactor 2): the shots' frames at 3200×1800 (media4k/), the grid then 8 device px
  const HD = /[?&]hd=1/.test(location.search);
  const css = document.createElement('style');
  css.textContent = `
    .frd{left:0;top:0;width:1920px;height:1080px;pointer-events:none}
    .frd-paper{left:0;top:0;width:1920px;height:1080px}
    .frd-scr{left:${FR.x}px;top:${FR.y}px;width:${FR.w}px;height:${FR.h}px;overflow:hidden;background:#1a1916;box-shadow:0 18px 60px -18px rgba(28,26,46,.38)}
    .frd-scr img{left:0;top:0;width:${FR.w}px;height:${FR.h}px;display:block;transform-origin:50% 50%;filter:saturate(.85) sepia(.07) contrast(.9) brightness(1.06)}
    .frd-grid{left:0;top:0;width:${FR.w}px;height:${FR.h}px;background-image:radial-gradient(ellipse 72% 70% at 50% 46%,transparent 58%,rgba(20,16,8,.22) 100%),repeating-linear-gradient(90deg,rgba(0,0,0,.13) 0 1px,transparent 1px 4px),repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 1px,transparent 1px 4px)}
    .frd-warm{left:0;top:0;width:${FR.w}px;height:${FR.h}px;background:rgba(255,236,200,.06);mix-blend-mode:soft-light}
    .frd canvas{left:0;top:0;width:1920px;height:1080px}
  `;
  document.head.appendChild(css);
  const { clamp } = F, io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), P = (T, a, d) => clamp((T - a) / d);
  const IN = 0.42, OUT = 0.36;   // the in-animation ends at t0, the out-animation starts at t1
  F.framed = (g) => {
    F.when(g.t0, 'framed t0'); F.when(g.t1, 'framed t1');
    const root = F.el('div', 'frd', F.mediaLayer);
    const paper = F.el('div', 'frd-paper paperbg', root);
    const scr = F.el('div', 'frd-scr', root);
    const ims = g.shots.map((s) => { const im = F.el('img', 'lazy', scr); im.style.display = 'none'; return im; });
    F.el('div', 'frd-warm', scr); F.el('div', 'frd-grid', scr);
    const cv = F.el('canvas', '', root); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const a0 = g.t0 - IN, a1 = g.t1 + OUT;
    const draw = (kF, kS) => {
      c.clearRect(0, 0, W, H); if (kF <= 0) return;
      const { x, y, w, h } = FR;
      c.strokeStyle = 'rgba(26,26,26,.12)'; c.lineWidth = 1.2;
      for (const yy of [y, y + h]) { c.beginPath(); c.moveTo(x - x * kF, yy); c.lineTo(x + w + (W - x - w) * kF, yy); c.stroke(); }
      for (const xx of [x, x + w]) { c.beginPath(); c.moveTo(xx, y - y * kF); c.lineTo(xx, y + h + (H - y - h) * kF); c.stroke(); }
      c.strokeStyle = '#1A1A1A'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y);
      let L = 2 * (w + h) * kF, cx = x, cy = y;
      for (const [dx, dy] of [[w, 0], [0, h], [-w, 0], [0, -h]]) { const len = Math.abs(dx + dy), t = Math.min(1, L / len); cx += dx * t; cy += dy * t; c.lineTo(cx, cy); L -= len; if (L <= 0) break; }
      c.stroke();
      const k = 18 * kF; c.lineWidth = 2;
      for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { c.beginPath(); c.moveTo(px - k, py); c.lineTo(px + k, py); c.moveTo(px, py - k); c.lineTo(px, py + k); c.stroke(); }
      if (kS > 0.002 && kS < 0.998) { const hh = h / 2 * kS; c.fillStyle = `rgba(255,236,150,${(0.9 * (1 - kS)).toFixed(2)})`; c.fillRect(x, y + h / 2 - hh - 1, w, 2); c.fillRect(x, y + h / 2 + hh - 1, w, 2); }
    };
    const cur = g.shots.map(() => -1);
    F.LAZY.push((T, pend) => {
      const on = T >= a0 && T < a1;
      root.style.display = on ? 'block' : 'none';
      if (!on) return;
      const kP = Math.min(io(P(T, a0, 0.2)), 1 - io(P(T, a1 - 0.18, 0.18)));
      const kF = Math.min(io(P(T, a0 + 0.04, 0.26)), 1 - io(P(T, g.t1 + 0.12, 0.2)));
      const kS = Math.min(io(P(T, g.t0 - 0.2, 0.2)), 1 - io(P(T, g.t1, 0.16)));
      paper.style.opacity = kP.toFixed(3);
      const cl = `inset(${((1 - kS) * 50).toFixed(3)}% 0 ${((1 - kS) * 50).toFixed(3)}% 0)`;
      scr.style.clipPath = cl; scr.style.visibility = kS > 0.001 ? '' : 'hidden';
      draw(kF, kS);
      // which shot: each from its t0 (the first one also during the opening, the last one also during the closing)
      let si = 0; g.shots.forEach((s, i) => { if (T >= s.t0) si = i; });
      g.shots.forEach((s, i) => {
        const im = ims[i]; im.style.display = i === si ? 'block' : 'none';
        if (i !== si) return;
        const fps = s.fps || 30, tt = Math.max(T, i === 0 ? a0 : s.t0);
        const fi = Math.max(0, Math.min(s.n - 1, Math.floor((tt - s.t0 + (s.start || 0)) * fps + 1e-6)));
        if (fi !== cur[i]) { cur[i] = fi; im.src = `${HD ? 'media4k' : 'media'}/${s.name}/f${String(fi + 1).padStart(4, '0')}.jpg`; pend.push(im.decode().catch(() => {})); }
        const pr = clamp((T - s.t0 + 0.4) / (s.t1 - s.t0 + 0.8));
        im.style.transform = `scale(${(1.0 + 0.035 * pr).toFixed(4)})`;
      });
    });
    F.sfx(g.t0 - 0.3, 'm:fast-whoosh-2', -22, { align: 'peak' });
    g.shots.slice(1).forEach((s) => F.sfx(s.t0 - 0.05, 'k:click', -26));
    F.sfx(g.t1 + 0.05, 'm:smooth-fast-whoosh', -27, { align: 'peak' });
    return root;
  };
})();
