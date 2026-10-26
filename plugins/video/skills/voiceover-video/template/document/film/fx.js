/* Effects of the edit (after engine.js): photos with torn edges, pins, dust, the chapter pages P3 "collage in
   depth" (numbered steps: the one the series kept, "perfect, don't change it") and V "new part", and two custom
   transitions: "ink" (an accent-coloured ink blot, hook → titles) and "tear" (the accent page tears away upward,
   titles → what follows). Other chapter styles were tried and refused: they are not here on purpose. */
(function () {
  'use strict';
  const { clamp, lerp, E } = F;
  const CH = F.CH;
  const L = () => window.T || {};

  /* ---------- torn edges: an SVG mask (an irregular polygon) ---------- */
  F.tornURL = (w, h, seed = 1, amp = 6, step = 7) => {
    const R = (i) => F.rand(seed * 131.7 + i * 7.13);
    const pts = [];
    let i = 0;
    const edge = (x0, y0, x1, y1, nx, ny) => {
      const Lg = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.round(Lg / step));
      for (let k = 0; k < n; k++, i++) {
        const t = k / n;
        let d = amp * (0.3 + 0.3 * (0.5 + 0.5 * Math.sin(i * 0.41 + seed)) + 0.4 * R(i));
        if (R(i + 999) > 0.965) d += amp * 1.5;
        pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
      }
    };
    edge(0, 0, w, 0, 0, 1); edge(w, 0, w, h, -1, 0); edge(w, h, 0, h, 0, -1); edge(0, h, 0, 0, 1, 0);
    const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}" fill="#000"/></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  };
  F.mask = (el, url) => { el.style.webkitMaskImage = url; el.style.maskImage = url; el.style.webkitMaskSize = '100% 100%'; el.style.maskSize = '100% 100%'; el.style.webkitMaskRepeat = 'no-repeat'; };

  /* ---------- a photo printed on paper: torn edges, shadow, pin ---------- */
  F.photoEl = (parent, src, w, h, o = {}) => {
    const pad = o.pad ?? 14;
    const it = F.el('div', 'ph ' + (o.cls || ''), parent);
    it.style.width = w + 'px'; it.style.height = h + 'px';
    const sh = F.el('div', 'ph-sh', it);
    const pp = F.el('div', 'ph-paper', sh);
    pp.style.padding = pad + 'px';
    F.mask(pp, F.tornURL(w, h, o.seed || 1, o.amp ?? 4, 9));
    const im = F.el('img', 'ph-img', pp);
    im.src = 'img/' + src; im.decoding = 'sync'; im.draggable = false;
    if (o.pos) im.style.objectPosition = o.pos;
    F.mask(im, F.tornURL(w - 2 * pad, h - 2 * pad, (o.seed || 1) + 50, o.ampIn ?? 6, 6));
    if (o.pin) F.el('i', 'pin', it);
    if (o.cap) F.el('b', 'ph-cap', it, o.cap);
    return it;
  };

  /* ---------- dust (canvas, deterministic) ---------- */
  F.dust = (canvas, { n = 40, seed = 1, color = '110,108,130', alpha = 1, size = 1 } = {}) => {
    const g = canvas.getContext('2d');
    const P = [...Array(n)].map((_, i) => ({ x: F.rand(seed + i) * 1920, y: F.rand(seed + i + 77) * 1080, r: 0.8 + F.rand(seed + i + 33) * 2.2 * size, a: 0.2 + F.rand(seed + i + 55) * 0.55, vx: (F.rand(seed + i + 11) - 0.5) * 22, vy: -8 - F.rand(seed + i + 22) * 16, b: F.rand(seed + i + 44) > 0.65 }));
    return (T, k = 1, ox = 0, oy = 0) => {
      g.clearRect(0, 0, 1920, 1080);
      if (k <= 0.01) return;
      for (const p of P) {
        const par = 0.4 + p.r / 3;
        const x = (((p.x + p.vx * T + ox * par) % 1920) + 1920) % 1920, y = (((p.y + p.vy * T + oy * par) % 1080) + 1080) % 1080;
        const r = p.b ? p.r * 2.4 : p.r;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${color},${(p.a * k * alpha * (p.b ? 0.5 : 1)).toFixed(3)})`); gr.addColorStop(1, `rgba(${color},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.2832); g.fill();
      }
    };
  };
  const canvas = (parent, cls = 'dust') => { const c = F.el('canvas', cls, parent); c.width = 1920; c.height = 1080; return c; };

  /* ---------- the background: clean white, a light grid visible in patches; or the brand's accent ---------- */
  F.paperBg = (el, seed = 1, o = {}) => {
    el.classList.add('paperbg');
    const r = (k) => F.rand(seed * 17 + k);
    el.style.setProperty('--gx1', (15 + r(1) * 30).toFixed(0) + '%'); el.style.setProperty('--gy1', (15 + r(2) * 35).toFixed(0) + '%');
    el.style.setProperty('--gx2', (55 + r(3) * 35).toFixed(0) + '%'); el.style.setProperty('--gy2', (50 + r(4) * 35).toFixed(0) + '%');
    if (o.accent || o.violet) el.classList.add('accent');
    return el;
  };

  /* ======================================================================================================
     P3 · the collage in depth, integrated: one continuous camera move. The screen recedes and becomes a card of
     the collage; the camera glides to the title (torn paper) among photos at several depths; then it moves
     towards the next screen, already visible in the collage, until it fills the frame.
     ====================================================================================================== */
  const P3 = { FOC: 1100, A: { x: -1500, y: 210, z: 1100 }, B: { x: 1420, y: 160, z: 1100 }, H: { x: 0, y: -60, z: -1300 }, PULL: 0.95 };
  const p3cam = (tr, T) => {
    const pull = E.io(clamp((T - tr.t0) / P3.PULL));
    const hold = clamp((T - tr.t0 - P3.PULL) / Math.max(0.3, tr.t2 - tr.t0 - P3.PULL));
    const push = E.io(clamp((T - tr.t2) / (tr.t3 - tr.t2)));
    const x0 = lerp(P3.A.x, P3.H.x, pull) + 70 * hold, y0 = lerp(P3.A.y, P3.H.y, pull), z0 = lerp(0, P3.H.z, pull) + 90 * hold;
    return { x: lerp(x0, P3.B.x, push), y: lerp(y0, P3.B.y, push), z: lerp(z0, 0, push) };
  };
  CH.P3 = {
    D: [0.5, 0.8, 0.95],
    vis: (tr) => [tr.t3, tr.t0 + 0.25],
    build(tr, o) {
      const bg = F.paperBg(F.el('div', 'chP3-bg', F.world), o.cur + 21);
      const far = F.el('div', 'chP3-far', F.world);
      const near = F.el('div', 'chP3', F.world);
      const spots = [[-930, -560, 300, -7, 560], [980, -540, 420, 6, 520], [-160, 640, 520, 4, 520], [480, 700, 800, -5, 480], [-120, -900, 1800, 3, 640], [2300, 980, 2100, -4, 640], [-2350, -620, 1500, 6, 600], [2400, -700, 1600, -6, 600]];
      const photos = spots.map(([x, y, z, r, w], i) => {
        const h = Math.round(w * 0.62);
        const e = F.photoEl(z > P3.FOC ? far : near, o.photos[i % o.photos.length], w, h, { seed: o.cur * 13 + i + 1, cls: i % 3 === 1 ? '' : 'bw' });
        return { e, x, y, z, r };
      });
      // the label over the title: "Point 1", "Step 2"… (the number is added for a numbered step)
      const over = `${o.over}${o.num != null ? '&nbsp;' + o.num : ''}`;
      const tt = F.el('div', 'p3c-title', near, `${o.num != null ? `<b class="p3-num">${String(o.num).padStart(2, '0')}</b>` : ''}<div class="p3c-sh"><div class="p3c-card"><small>${over}</small><h2>${o.title}</h2></div></div>`);
      F.mask(tt.querySelector('.p3c-card'), F.tornURL(1240, 330, o.cur + 31, 5, 10));
      const tObj = { e: tt, x: P3.H.x, y: P3.H.y - 235, z: P3.H.z + P3.FOC, r: -1.5 };
      const dust = F.dust(canvas(near), { n: 60, seed: o.cur * 3 + 2, size: 1.2 });
      tr.cam = (T) => p3cam(tr, T);
      F.on((T) => {
        const on = T >= tr.t0 && T < tr.t3;
        bg.style.display = far.style.display = near.style.display = on ? 'block' : 'none';
        if (!on) return;
        const c = p3cam(tr, T);
        const place = (it, isTitle) => {
          const d = it.z - c.z;
          if (d < 90) { it.e.style.visibility = 'hidden'; return; }
          const k = P3.FOC / d;
          const x = 960 + (it.x - c.x) * k, y = 540 + (it.y - c.y) * k;
          const blur = isTitle ? Math.min(14, Math.abs(d - P3.FOC) * 0.006) : Math.min(12, Math.abs(d - P3.FOC) * 0.0075);
          it.e.style.visibility = 'inherit';
          it.e.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(it.r + (isTitle ? 0 : Math.sin(T * 0.7 + it.x) * 1.2)).toFixed(2)}deg) scale(${k.toFixed(4)})`;
          it.e.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : '';
          it.e.style.opacity = (isTitle ? 1 : clamp((d - 90) / 220)).toFixed(3);
          it.e.style.zIndex = String(Math.round(10000 - d));
        };
        photos.forEach((p) => place(p, false));
        place(tObj, true);
        bg.style.transform = `translate(${(-c.x * 0.03).toFixed(1)}px,${(-c.y * 0.03).toFixed(1)}px)`;
        dust(T, 1, -c.x * 0.4, -c.y * 0.4);
      });
      F.MB.push((T) => {
        if (T < tr.t0 || T >= tr.t3) return [0, 0];
        const v = Math.abs(p3cam(tr, T + 0.01).x - p3cam(tr, T).x) / 0.01;
        return [Math.min(16, v * 0.005), 0];
      });
      F.sfx(tr.t0 + P3.PULL * 0.5, 'm:cinematic-low-whoosh', -15, { align: 'peak' });
      F.sfx(tr.t0 + 0.45, 'p:mixkit-paper-quick-movement-2380', -19);
      F.sfx(tr.t0 + P3.PULL - 0.1, 'm:premium-pop-2', -19);
      F.sfx(tr.t2 + (tr.t3 - tr.t2) * 0.55, 'm:cinematic-medium-whoosh', -16, { align: 'peak' });
      F.sfx(tr.t2 + 0.3, 'p:mixkit-paper-slide-1530', -19);
    },
    state(tr, T, side, st) {
      const c = p3cam(tr, T), P = side === 'A' ? P3.A : P3.B;
      const d = P.z - c.z, k = P3.FOC / d;
      st.x = (P.x - c.x) * k; st.y = (P.y - c.y) * k; st.s = k;
      st.card = clamp((0.995 - k) / 0.05);
      st.blur = Math.min(3.5, Math.abs(d - P3.FOC) * 0.003) * st.card;
      st.z = side === 'A' ? 2 : 3;
      return st;
    },
  };

  /* ======================================================================================================
     V · a new part (not a step): an accent-coloured torn sheet rises and covers the screen, the title shows among
     floating black and white prints, then the sheet goes on upward and unveils what follows. The titles' language.
     ====================================================================================================== */
  const tornEdge = (y, seed, top) => {
    const pts = [];
    for (let x = -20, i = 0; x <= 1940; x += 24, i++) pts.push([x, y + Math.sin(i * 0.9 + seed) * 10 + (F.rand(seed + i) - 0.5) * 26 + Math.sin(i * 0.23) * 18]);
    return top ? pts : pts.reverse();
  };
  CH.V = {
    D: [0.45, 1.0, 0.5],
    vis: (tr) => [tr.t1 + 0.02, tr.t2 - 0.02],
    build(tr, o) {
      const ov = F.el('div', 'chV', F.world);
      F.sfx(tr.t0 + 0.25, 'm:deep-light-whoosh', -12, { align: 'peak' });   // round 10: a light swish on the yellow page's sweep (Ihsane heard nothing)
      F.paperBg(F.el('div', 'v-bg', ov), o.cur + 51, { accent: true });
      const world = F.el('div', 'v-world', ov);
      const spots = [[300, 250, -6, 0.62, 7], [1640, 240, 7, 0.58, 9], [260, 850, 5, 0.6, 8], [1660, 860, -5, 0.64, 6], [960, 130, 3, 0.45, 12], [980, 960, -3, 0.48, 11]];
      const photos = spots.map(([x, y, r, k, b], i) => {
        const e = F.photoEl(world, o.photos[i % o.photos.length], 620, 384, { seed: o.cur * 17 + i + 3, cls: 'bw' });
        return { e, x, y, r, k, b, ph: F.rand(o.cur + i) * 6 };
      });
      const tt = F.el('div', 'v-title', ov, `<small>${o.over}</small><h2>${o.title}</h2><i class="v-line"></i>`);
      const line = tt.querySelector('.v-line');
      const dust = F.dust(canvas(ov), { n: 60, seed: o.cur * 7 + 5, color: '255,255,255', size: 1.2 });
      F.on((T) => {
        if (T < tr.t0 || T >= tr.t3) { ov.style.display = 'none'; return; }
        ov.style.display = 'block';
        // a torn top edge rising (in), then a torn bottom edge rising (out)
        const up = E.io5(clamp((T - tr.t0) / (tr.t1 - tr.t0)));
        const out = E.io(clamp((T - tr.t2) / (tr.t3 - tr.t2)));
        const top = lerp(1140, -60, up), bot = lerp(1140, -80, out);
        const pts = T < tr.t2 ? tornEdge(top, o.cur + 3, true).concat([[1940, 1200], [-20, 1200]]) : [[-20, -300], [1940, -300]].concat(tornEdge(bot, o.cur + 9, false));
        ov.style.clipPath = `path('M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z')`;
        const drift = clamp((T - tr.t0) / (tr.t3 - tr.t0));
        photos.forEach((p) => {
          const k = p.k * (1 + 0.06 * drift);
          p.e.style.transform = `translate(-50%,-50%) translate(${(p.x + Math.sin(T * 0.6 + p.ph) * 10).toFixed(1)}px,${(p.y - 40 * drift + (1 - up) * 160).toFixed(1)}px) rotate(${(p.r + Math.sin(T * 0.8 + p.ph) * 1.2).toFixed(2)}deg) scale(${k.toFixed(4)})`;
          p.e.style.filter = `blur(${p.b}px) brightness(.95)`;
        });
        const ki = E.out5(clamp((T - tr.t0 - 0.3) / 0.5)), ko = E.in(clamp((T - tr.t2) / 0.3));
        tt.style.transform = `translate(-50%,-50%) translate(960px,${(540 + (1 - ki) * 90 - ko * 140).toFixed(1)}px) scale(${(1 + 0.03 * drift).toFixed(4)})`;
        tt.style.opacity = (clamp(ki * 1.5) * (1 - ko)).toFixed(3);
        line.style.transform = `scaleX(${F.p(T, tr.t0 + 0.55, 0.45, E.out).toFixed(3)})`;
        dust(T, 1, 0, -(1 - up) * 300);
      });
      F.sfx(tr.t0 + 0.05, 'p:mixkit-paper-slide-1530', -12);
      F.sfx(tr.t0 + 0.22, 'm:cinematic-fast-normal-whoosh', -18, { align: 'peak' });
      F.sfx(tr.t0 + 0.55, 'm:premium-pop-2', -17);
      F.sfx(tr.t2 + 0.05, 'p:mixkit-paper-slide-1530', -13);
      F.sfx(tr.t2 + 0.25, 'm:smooth-fast-whoosh', -18, { align: 'peak' });
      F.MB.push((T) => [0, T >= tr.t0 && T < tr.t1 ? Math.sin(clamp((T - tr.t0) / (tr.t1 - tr.t0)) * Math.PI) * 16 : T >= tr.t2 && T < tr.t3 ? Math.sin(clamp((T - tr.t2) / (tr.t3 - tr.t2)) * Math.PI) * 16 : 0]);
      F.leak(tr.t0 + 0.3, 1.4, 0.5, 'w');
    },
    state(tr, T, side, st) {
      if (side === 'A') { const e = E.io(clamp((T - tr.t0) / (tr.t1 - tr.t0))); st.cs = 1 - 0.05 * e; st.cblur = 5 * e; st.z = 2; }
      else { const e = E.out(clamp((T - tr.t2) / (tr.t3 - tr.t2 + 0.2))); st.cs = 1.05 - 0.05 * e; st.cblur = 6 * (1 - e); st.z = 2; }
      return st;
    },
  };

  /* ---------- a GIF as a pinned print (never full screen): torn edges, a caption, the rest of the screen recedes ---------- */
  F.gifPrint = (s, name, n, x, y, w, h, o = {}) => {
    F.when(o.t0, `the GIF « ${name} » t0`); F.when(o.t1, `the GIF « ${name} » t1`);
    const fps = o.fps || 15;
    const e = F.photoEl(s.cam, `../media/${name}/f0001.jpg`, w, h, { seed: o.seed || 7, pin: true, pad: 16 });
    const im = e.querySelector('.ph-img');
    if (o.cap) { const c = F.el('div', 'callout ' + (o.cls || 'red') + ' gif-cap', e, o.cap); c.style.left = '50%'; c.style.top = '100%'; }
    F.el('small', 'gif-credit', e, o.credit || L().viaGiphy || 'via GIPHY');
    const it = F.item(s, e, x, y, { t0: o.t0, t1: o.t1, in: 'pop', out: 'pop', dout: 0.25, r: o.r ?? -4, z: 80, focusable: false, lift: false, float: 0.4, sfx: 'p:mixkit-paper-quick-movement-2380', gain: -15 });
    it.zi = 3500;
    F.sfx(o.t0 + 0.08, 'm:premium-pop-2', -16);
    s.focusOn(o.t0, [it]).focusOn(o.t1, 'all');
    let cur = 0;
    F.LAZY.push((T, pend) => {
      if (T < o.t0 - 0.05 || T > o.t1 + 0.3) return;
      const i = (Math.floor((T - o.t0 + (o.start || 0)) * fps + 1e-6) % n + n) % n;
      if (i !== cur) { cur = i; im.src = `media/${name}/f${String(i + 1).padStart(4, '0')}.jpg`; pend.push(im.decode().catch(() => {})); }
    });
    return it;
  };

  /* ---------- "ink": an accent-coloured blot spreading from a point (hook → titles, → the brand segment) ---------- */
  const blob = (cx, cy, R, seed, T) => {
    const n = 160, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = 1 + 0.08 * Math.sin(a * 5 + seed + T * 3) + 0.05 * Math.sin(a * 9 + seed * 2) + 0.025 * Math.sin(a * 17 + seed * 3 + T * 5) + 0.012 * Math.sin(a * 31 + seed);
      pts.push(`${(cx + Math.cos(a) * R * w).toFixed(1)} ${(cy + Math.sin(a) * R * w).toFixed(1)}`);
    }
    return `path('M${pts.join('L')}Z')`;
  };
  F.TK.ink = {
    state(tr, T, side, st, u) {
      if (side === 'B') { st.z = 3; st.clip = u >= 1 ? '' : blob(tr.cx ?? 960, tr.cy ?? 540, E.in2(u) * 2300 + 6, 3, T); }
      else st.z = 2;
      return st;
    },
  };
  /* ---------- "tear": the page on top goes up, its edge torn (titles → what follows, leaving an accent screen) ---------- */
  const tearPath = (b, seed) => {
    const pts = ['-20 -400', '1940 -400'];
    for (let x = 1940, i = 0; x >= -20; x -= 24, i++) {
      const j = Math.sin(i * 0.9 + seed) * 10 + (F.rand(seed + i) - 0.5) * 26 + Math.sin(i * 0.23) * 18;
      pts.push(`${x} ${(b + j).toFixed(1)}`);
    }
    return `path('M${pts.join('L')}Z')`;
  };
  F.TK.tear = {
    state(tr, T, side, st, u) {
      if (side === 'A') { const e = E.io(u); st.z = 3; st.clip = tearPath(lerp(1120, -60, e), 5); st.y = -40 * e; }
      else { const e = E.out(u); st.z = 2; st.cs = 1.06 - 0.06 * e; st.cblur = 6 * (1 - e); }
      return st;
    },
    mb: (tr, T) => { const u = clamp((T - tr.t0) / (tr.t1 - tr.t0)); return [0, Math.sin(u * Math.PI) * 18]; },
  };
})();
