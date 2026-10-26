/* recap-lib.js — the shared canvas engine of the recap page's variants (recap-a/b/c.html).
   One canvas over the whole frame; everything drawn from a state object S that a paused gsap timeline fills, so a frame
   is a pure function of t. Motion blur like After Effects: each frame is the average of N sub-frames over a 180° shutter
   (the timeline is re-seeked for each), accumulated in premultiplied space ("lighter" at 1/N). */
(() => {
  const W = 1080, H = 1920;
  const L = window.L = { W, H };
  L.img = src => K.el("img", { src, style: { display: "none" } });
  L.off = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  L.reset = c => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; c.filter = "none"; c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.letterSpacing = "0px"; };
  L.font = (c, w, px, fam = "Title", ls = 0) => { c.font = `${w} ${px.toFixed(2)}px ${fam}`; c.letterSpacing = `${ls.toFixed(2)}px`; };
  L.preload = () => Promise.all(["800 100px Title", "700 100px Title", "600 100px Title", "400 100px Title", "500 30px Text", "600 30px Text", "400 30px Mono", "500 30px Mono"].map(f => document.fonts.load(f)));
  L.c01 = x => Math.min(1, Math.max(0, x));
  L.lerp = (a, b, x) => a + (b - a) * x;
  L.seg = (t, a, b) => L.c01((t - a) / (b - a));
  L.E = n => gsap.parseEase(n);
  L.shadow = (c, a = 0.22, blur = 40, oy = 18) => { c.shadowColor = `rgba(26,26,26,${a})`; c.shadowBlur = blur; c.shadowOffsetY = oy; c.shadowOffsetX = 0; };
  L.noShadow = c => { c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetY = 0; c.shadowOffsetX = 0; };
  L.rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); };

  // a word laid out glyph by glyph: [{ ch, x, w }] (x from the left of the word, letter spacing included)
  L.layout = (text, weight, px, ls, fam = "Title") => {
    const c = L.off(8, 8).getContext("2d"); L.font(c, weight, px, fam, ls);
    const out = []; let prev = 0;
    for (let i = 0; i < text.length; i++) {
      const x1 = c.measureText(text.slice(0, i + 1)).width;
      out.push({ ch: text[i], x: prev, w: x1 - prev - (i < text.length - 1 ? 0 : 0) });
      prev = x1;
    }
    const m = c.measureText(text);
    return { glyphs: out, width: prev - ls, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight };
  };
  // the size that makes `text` span `width` px (ink extent)
  L.fit = (text, weight, width, lsEm = -0.05, fam = "Title") => {
    const c = L.off(8, 8).getContext("2d"); L.font(c, weight, 200, fam, lsEm * 200);
    const m = c.measureText(text); const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    return 200 * width / ink;
  };
  // the enclosed counters of a text (the holes inside 9, %…): [{ cx, cy, r (inscribed), area }] in frame px
  L.counters = (text, weight, px, ls, x0, base) => {
    const S = 0.25, w = Math.ceil(W * S), h = Math.ceil(H * S);
    const cv = L.off(w, h), c = cv.getContext("2d");
    c.scale(S, S); L.font(c, weight, px, "Title", ls); c.fillStyle = "#000"; c.fillText(text, x0, base);
    const d = c.getImageData(0, 0, w, h).data, ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ink[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    const lab = new Int32Array(w * h).fill(-1), comps = [];
    for (let s = 0; s < w * h; s++) {
      if (ink[s] || lab[s] >= 0) continue;
      const id = comps.length, st = [s]; lab[s] = id; let n = 0, sx = 0, sy = 0, edge = false, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; const px_ = [];
      while (st.length) {
        const p = st.pop(), x = p % w, y = (p / w) | 0; n++; sx += x; sy += y; px_.push(p); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
        for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < w * h && !ink[q] && lab[q] < 0 && Math.abs((q % w) - x) <= 1) { lab[q] = id; st.push(q); }
      }
      comps.push({ id, n, cx: sx / n, cy: sy / n, edge, px: px_, bx: (x0 + x1 + 1) / 2 / S, by: (y0 + y1 + 1) / 2 / S, bw: (x1 - x0 + 1) / S, bh: (y1 - y0 + 1) / S });
    }
    const holes = comps.filter(k => !k.edge && k.n > 20);
    for (const k of holes) {  // inscribed radius: the largest distance from a hole pixel to ink, at the best centre
      let best = 0, bx = k.cx, by = k.cy;
      const inkPts = [];
      for (const p of k.px) { const x = p % w, y = (p / w) | 0; for (const q of [p - 1, p + 1, p - w, p + w]) if (ink[q]) { inkPts.push([x, y]); break; } }
      for (const p of k.px) { const x = p % w, y = (p / w) | 0; let m = 1e9; for (const [ix, iy] of inkPts) { const dd = (ix - x) ** 2 + (iy - y) ** 2; if (dd < m) m = dd; } if (m > best) { best = m; bx = x; by = y; } }
      k.r = Math.sqrt(best) / S; k.cx = bx / S; k.cy = by / S; k.area = k.n / S / S; delete k.px;
    }
    return holes.sort((a, b) => a.cx - b.cx);
  };

  // mount the canvas and the sub-frame accumulation: scene(ctx, ts, T) draws the frame's state at ts (T: the frame's time)
  L.mount = ({ tl, scene, samples = () => 5, shutter = 1 / 60 }) => {
    const main = K.el("canvas", { width: W, height: H, style: { position: "absolute", left: "0px", top: "0px", width: W + "px", height: H + "px" } });
    const off = L.off(), m = main.getContext("2d"), o = off.getContext("2d", { willReadFrequently: true });
    const acc = new Float32Array(W * H * 4);
    return (T) => {
      L.reset(m); m.clearRect(0, 0, W, H);
      const n = Math.max(1, samples(T) | 0);
      if (n === 1) { scene(m, T, T); L.reset(m); return; }
      acc.fill(0);
      for (let i = 0; i < n; i++) {   // float accumulation, premultiplied: exact, no banding on the paper
        const ts = Math.max(0, T + shutter * (i / (n - 1) - 0.5));
        tl().seek(ts, false);
        L.reset(o); o.clearRect(0, 0, W, H); scene(o, ts, T); L.reset(o);
        const d = o.getImageData(0, 0, W, H).data;
        for (let p = 0; p < d.length; p += 4) { const a = d[p + 3]; if (!a) continue; acc[p] += d[p] * a; acc[p + 1] += d[p + 1] * a; acc[p + 2] += d[p + 2] * a; acc[p + 3] += a; }
      }
      const img = m.createImageData(W, H), q = img.data;
      for (let p = 0; p < q.length; p += 4) { const a = acc[p + 3]; if (!a) continue; q[p] = acc[p] / a; q[p + 1] = acc[p + 1] / a; q[p + 2] = acc[p + 2] / a; q[p + 3] = a / n + 0.5; }
      m.putImageData(img, 0, 0);
      tl().seek(T, false); L.reset(m);
    };
  };
  // a samples() helper: n sub-frames inside the given windows [[a, b], …], 1 elsewhere
  L.windows = (wins, n = 12) => T => wins.some(([a, b]) => T >= a && T <= b) ? n : 1;

  // a hole's depth: the paper's shadow falling into the cut, drawn over what shows through it (the face)
  // shape(ctx) fills the hole's path(s) in frame px
  const sh = L.off(), shc = sh.getContext("2d"), sh2 = L.off(), sh2c = sh2.getContext("2d");
  L.holeShadow = (ctx, shape, { a = 0.42, dx = 5, dy = 16, blur = 14 } = {}) => {
    L.reset(shc); shc.clearRect(0, 0, W, H);
    shc.fillStyle = `rgba(14,12,20,${a})`; shape(shc);                                    // the hole, dark
    L.reset(sh2c); sh2c.clearRect(0, 0, W, H); sh2c.fillStyle = "#000"; shape(sh2c);
    shc.globalCompositeOperation = "destination-out"; shc.filter = `blur(${blur}px)`; shc.drawImage(sh2, dx, dy);   // minus itself shifted: the rim
    L.reset(shc); ctx.drawImage(sh, 0, 0);
  };
})();
