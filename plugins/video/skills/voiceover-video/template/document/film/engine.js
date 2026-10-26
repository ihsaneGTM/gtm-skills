/* The engine of the article videos (16:9): a film is an HTML page drawn as a pure function of time, F.seek(t),
   which returns a promise while the pictures of a video still load. render.mjs films it frame by frame in Chrome.
   Its language was validated frame by frame on three episodes of a real series (2026-10-10/11):
   - 2.5D depth: every element has a z (perspective, depth of field, shadow). s.focusOn brings forward what the
     voice speaks of; keep it for the moments when ONE element matters (references/look.md).
   - Fast After Effects entries (a pop that overshoots, a drop, a flight from the camera, motion blur).
   - Chapter pages: P3 "collage in depth" for numbered steps, V "new part" (fx.js). Others were refused.
   - Full-screen videos (F.media), GIFs as pinned prints (F.gifPrint, fx.js), an optional host who appears
     without speaking, post: grain, vignette, window light, light leaks, a slight RGB split on fast moves.
   - Sounds: F.sfx places a sound of the shelf (plugins/video/assets/sfx); F.soundPass thins them on export so
     the film keeps air between them. No subtitles (F.captions exists, the series removed them).
   Never edit this file inside a video: the template is the skill's (template/film/engine.js). */
(function () {
  'use strict';
  const F = (window.F = {});
  F.W = 1920; F.H = 1080;
  F.SEG = window.SEGS; F.GEN = window.GEN;
  F.LANG = window.LANG || 'en';
  const Q = new URLSearchParams(location.search);
  F.STYLE = (Q.get('tr') || 'P3').toUpperCase();
  // a light accent (a yellow, a lime, a pastel: under 3:1 on white). Its lines and words on white take --v-on-white
  // and the accent becomes a fill and a marker (theme.css § a light accent). scripts/new.mjs measures the colour and
  // says it in brand.js.
  if (window.BRAND && window.BRAND.lightAccent) document.documentElement.dataset.accent = 'light';

  /* ---------- instants: a number of seconds, or the film stops ---------- */
  // An instant that is not a number (a t.<name> never set or misspelt, set on a line a // commented out) stops the
  // film with its name and the line of story.js, the way a word that is not in the voice does: an element timed on
  // it would never show, or show at the wrong time, without a word.
  const isT = (v) => typeof v === 'number' && !Number.isNaN(v);
  const storyLine = () => { const m = /story\.js(?:\?[^:]*)?:(\d+)/.exec(new Error().stack || ''); return m ? `, story.js line ${m[1]}` : ''; };
  const notSet = (what, v) => new Error(`instant not set: ${what} is ${v === undefined ? 'undefined' : typeof v === 'number' ? 'NaN' : JSON.stringify(v)}${storyLine()} (a t.<name> never set, misspelt, or set on a line commented out)`);
  F.when = (v, what) => { if (!isT(v)) throw notSet(what, v); return v; };
  // the instants of an options object: each key written there must hold a number
  F.whens = (o, keys, what) => { if (o) for (const k of keys) if (k in o && !isT(o[k])) throw notSet(`${what} ${k}`, o[k]); return o; };
  // an options object passed on without the keys nobody wrote (an option left out stays left out)
  const defined = (F.defined = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; });

  /* ---------- time ---------- */
  const tmap = (s) => { let g = F.SEG[0]; for (const x of F.SEG) if (s >= x.s0 - 1e-6) g = x; return s - g.s0 + g.at; };
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9'-]/g, '');
  F.norm = norm;
  const WORDS = (F.WORDS = window.WORDS.map((w) => ({ w: w.w, n: norm(w.w), t0: tmap(w.s), t1: tmap(w.e) })));
  F.VO_END = WORDS[WORDS.length - 1].t1;
  F.END = F.VO_END + 0.3;
  F.DUR = F.END + 3.8;
  // what the render prints once: a lookup that had to take the start of a word, or a part of a document's line
  const warned = new Set();
  F.warn = (m) => { if (!warned.has(m)) { warned.add(m); console.warn(m); } };
  // the start of the n-th word q of the voice, after the instant `after` (accents, case and punctuation ignored).
  // The WHOLE word: A('say') never takes « says ». 'word$' says the same (its old way of writing). A word the voice
  // never says whole is looked for at the start of a word (A('catch') takes « catch-all »), with a warning in the
  // render's log: write the whole word.
  F.at = (q, n = 1, after = 0) => {
    if (!isT(after)) throw notSet(`the instant after which « ${q} » is looked for`, after);
    const strict = q.endsWith('$');
    const k = norm(strict ? q.slice(0, -1) : q);
    const where = after ? ` after ${after.toFixed(2)} s` : '';
    let c = 0;
    if (k && WORDS.some((w) => w.n === k)) {
      for (const w of WORDS) if (w.t0 >= after && w.n === k && ++c === n) return w.t0;
    } else if (k && !strict) {
      for (const w of WORDS) if (w.t0 >= after && w.n.startsWith(k) && ++c === n) {
        F.warn(`⚠ the voice never says « ${q} » whole: A('${q}'${n > 1 ? `, ${n}` : ''}) took the start of « ${w.w} » at ${w.t0.toFixed(2)} s; write the whole word`);
        return w.t0;
      }
    }
    throw new Error(`word not in the voice: ${q} #${n}${where}`);
  };
  F.end = (q, n = 1, after = 0) => { const t = F.at(q, n, after); return WORDS.find((w) => w.t0 === t).t1; };

  /* ---------- curves ---------- */
  F.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  F.lerp = (a, b, k) => a + (b - a) * k;
  F.E = {
    lin: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    out5: (x) => 1 - Math.pow(1 - x, 5),
    in: (x) => x * x * x,
    in2: (x) => x * x,
    in4: (x) => x * x * x * x,
    io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    io5: (x) => (x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2),
    sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    back: (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    back2: (x) => { const c = 1.1; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  };
  const { clamp, lerp, E } = F;
  F.p = (t, t0, d = 0.5, e = E.out) => e(clamp((t - t0) / d));
  F.noise = (t, seed = 1) => Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 3.1) * 0.3 + Math.sin(t * 5.3 + seed * 1.7) * 0.2;
  F.rand = (seed) => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

  /* ---------- DOM ---------- */
  F.el = (tag, cls, parent, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent || F.stage).appendChild(e);
    return e;
  };
  F.img = (src, cls, parent) => { const i = F.el('img', cls, parent); i.src = 'img/' + src; i.decoding = 'sync'; i.draggable = false; return i; };
  const NS = 'http://www.w3.org/2000/svg';
  F.NS = NS;
  F.svg = (parent, w, h, cls) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('width', w); s.setAttribute('height', h);
    s.setAttribute('class', cls || ''); s.style.overflow = 'visible';
    (parent || F.stage).appendChild(s);
    return s;
  };
  F.path = (svg, d, attrs = {}) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('pathLength', '1'); p.setAttribute('fill', 'none');
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('stroke-dasharray', '1 1'); p.setAttribute('stroke-dashoffset', '1');
    for (const k in attrs) p.setAttribute(k, attrs[k]);
    svg.appendChild(p);
    return p;
  };
  // hidden until it starts: a path not drawn yet would still show its round cap as a dot where it begins
  F.draw = (p, k) => { k = clamp(k); p.setAttribute('stroke-dashoffset', (1 - k).toFixed(4)); p.style.visibility = k > 0 ? '' : 'hidden'; };

  /* ---------- sounds and global effects ---------- */
  F.CUES = [];
  F.sfx = (t, name, gain = -15, opt = {}) => { F.when(t, `the sound « ${name} »`); if (t >= 0) F.CUES.push({ t: +t.toFixed(3), name, gain, ...opt }); };
  /* the sound pass (the series' review: only the shelf's own sounds, and far fewer of them):
     - a burst of the same sound (list clicks, pops in a row) keeps its first hit only;
     - at the same instant (0.28 s), two sounds at most: impact > whoosh > pop > paper;
     - paper: one every 3 s at most, never over a whoosh;
     - at the end, everything that APPEARS becomes the click of the Top 5 pack, quiet, one every 2.5 s at most.
     Sounds marked key always go through. */
  F.soundPass = (cues) => {
    const kind = (n) => n === 'boom' || /thump|drum|hit/.test(n) ? 0 : /whoosh|grit|riser/.test(n) ? 1 : /pop|ui-|click|money/.test(n) ? 2 : 3;
    let c = [...cues].sort((a, b) => a.t - b.t);
    c = c.filter((x, i) => x.key || !c.slice(0, i).some((y) => y.name.replace(/-\d$/, '') === x.name.replace(/-\d$/, '') && x.t - y.t < 0.45 && x.t - y.t >= 0 && /select|normal-pop|premium-pop/.test(x.name)));
    const out = []; let lastPaper = -9;
    for (let i = 0; i < c.length;) {
      let j = i; while (j < c.length && c[j].t - c[i].t < 0.28) j++;
      const grp = c.slice(i, j).sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || kind(a.name) - kind(b.name) || b.gain - a.gain);
      const hasWhoosh = grp.some((x) => kind(x.name) === 1);
      let n = 0;
      for (const x of grp) {
        if (!x.key && n >= 2) continue;
        if (!x.key && kind(x.name) === 3 && (hasWhoosh || x.t - lastPaper < 3)) continue;
        if (kind(x.name) === 3) lastPaper = x.t;
        out.push(x); n++;
      }
      i = j;
    }
    // air between sounds: a pop or a paper waits 0.7 s after the sound before it, a whoosh 0.5 s after the last whoosh
    const aired = []; let lastAny = -9, lastW = -9, lastT = -9;
    for (const x of out) {
      const k = kind(x.name);
      if (!x.key && k >= 2 && x.t - lastAny < 0.7 && x.t - lastT > 0.02) continue;
      if (!x.key && k === 1 && x.t - lastW < 0.5) continue;
      aired.push(x); if (Math.abs(x.t - lastT) > 0.02) lastAny = x.t; lastT = x.t; if (k === 1) lastW = x.t;
    }
    // everything that APPEARS clicks (the Top 5 pack's own rule: "the click for when things pop up on the screen");
    // a stamp (a text that slams) = a click + the pack's glitch, both quiet. No big drum.
    const fin = [];
    for (const x of aired) {
      if (x.name === 'm:thump-click') { fin.push({ ...x, name: 'k:click', gain: -18 }); continue; }
      if (/^m:(premium-pop|normal-pop|ui-select|ui-button|sweet-ui-open)/.test(x.name)) { fin.push({ ...x, name: 'k:click', gain: Math.min(x.gain, -15) - 4 }); continue; }
      fin.push(x);
    }
    // the click, rare (Ihsane, 2026-10-15: « on utilise le bruit du clic trop souvent… le clic est trop fort »): one every
    // 2.5 s at most, 4 dB under the old level, no glitch on a stamp; a sound marked key always goes through
    let lastClick = -9;
    return fin.sort((a, b) => a.t - b.t).filter((x) => {
      if (x.name !== 'k:click' || x.key) return true;
      if (x.t - lastClick < 2.5) return false;
      lastClick = x.t; return true;
    });
  };
  const FX = { rgb: [], shake: [], leak: [] };
  F.rgb = (t, d = 0.3, k = 6) => FX.rgb.push({ t: F.when(t, 'F.rgb'), d, k });
  F.shake = (t, d = 0.3, k = 6) => FX.shake.push({ t: F.when(t, 'F.shake'), d, k });
  F.leak = (t, d = 1.4, k = 0.55, c = 'w') => FX.leak.push({ t: F.when(t, 'F.leak'), d, k, c });
  const pulse = (list, T) => { let v = 0; for (const e of list) { const u = (T - e.t) / e.d; if (u >= 0 && u < 1) v = Math.max(v, e.k * (1 - u) * (1 - u)); } return v; };

  /* ---------- screens ---------- */
  F.screens = []; F.trans = [];
  // opt.accent: the brand-coloured background (titles, brand segment, V pages); opt.violet, its old name, still works
  F.screen = (name, t0, t1, opt = {}) => {
    F.when(t0, `the start of screen '${name}'`); F.when(t1, `the end of screen '${name}'`);
    const root = F.el('div', 'scr', F.world);
    root.dataset.name = name;
    const bg = F.el('div', 'scr-bg', root);
    const tw = F.el('div', 'scr-tw', root);
    const cam = F.el('div', 'scr-cam', tw);
    const fix = F.el('div', 'scr-fix', root);
    if (F.paperBg) F.paperBg(bg, F.screens.length + 1, { accent: opt.accent || opt.violet });
    const s = { name, t0, t1, root, bg, tw, cam, fix, keys: [[t0, 960, 540, 1, 0]], tilts: [[t0, opt.rx || 0, opt.ry || 0, 0]], items: [], focus: [], dof: opt.dof ?? 0.6, push: opt.push ?? 0.035, upd: [] };
    s.camTo = (t, x, y, z = 1, d = 0.9) => { s.keys.push([F.when(t, `${name}.camTo`), x, y, z, d]); return s; };
    s.tilt = (t, rx, ry, d = 1.2) => { s.tilts.push([F.when(t, `${name}.tilt`), rx, ry, d]); return s; };
    s.focusOn = (t, items) => { s.focus.push([F.when(t, `${name}.focusOn`), items]); return s; };
    s.on = (fn) => s.upd.push(fn);
    F.screens.push(s);
    return s;
  };
  // a simple transition from A to B, centred on T: depth (A recedes, B arrives from the front), whip-l, whip-r, fade, cut
  F.cut = (A, B, T, kind = 'depth', d = 0.5) => {
    F.when(T, `the ${kind} transition from '${A.name}' to '${B.name}'`);
    const tr = { A, B, kind, t0: T - d / 2, t1: T + d / 2, vA: T + d / 2, vB: T - d / 2 };
    F.trans.push(tr);
    if (kind === 'depth') { F.sfx(T - 0.04, 'm:cinematic-fast-normal-whoosh', -19, { align: 'peak' }); F.rgb(T - 0.12, 0.35, 5); }
    if (kind.startsWith('whip')) { F.sfx(T, 'm:fast-whoosh-2', -18, { align: 'peak' }); F.rgb(T - 0.15, 0.4, 7); }
    return tr;
  };
  const camAt = (s, T) => {
    let [, x, y, z] = s.keys[0];
    for (let i = 1; i < s.keys.length; i++) {
      const [t0, kx, ky, kz, d] = s.keys[i];
      if (T < t0) break;
      const u = E.io(clamp((T - t0) / d));
      x = lerp(x, kx, u); y = lerp(y, ky, u); z = lerp(z, kz, u);
    }
    z *= 1 + s.push * clamp((T - s.t0) / Math.max(1, s.t1 - s.t0));
    return { x, y, z };
  };
  const tiltAt = (s, T) => {
    let [, rx, ry] = s.tilts[0];
    for (let i = 1; i < s.tilts.length; i++) {
      const [t0, a, b, d] = s.tilts[i];
      if (T < t0) break;
      const u = E.io(clamp((T - t0) / d));
      rx = lerp(rx, a, u); ry = lerp(ry, b, u);
    }
    return { rx, ry };
  };

  /* ---------- elements: entry, exit, depth ---------- */
  const DIN = { pop: 0.42, drop: 0.5, fly: 0.6, deep: 0.6, 'slide-l': 0.5, 'slide-r': 0.5, rise: 0.5, swing: 0.55, fade: 0.35, slam: 0.3, none: 0.01 };
  F.item = (s, el, x, y, o = {}) => {
    F.whens(o, ['t0', 't1'], `an element of screen '${s.name}':`);
    const kin = o.in || 'pop';
    const it = { el, x, y, z: o.z || 0, r: o.r || 0, s: o.s || 1, rx: o.rx || 0, ry: o.ry || 0, t0: o.t0 ?? s.t0, t1: o.t1 ?? 1e9, kin, kout: o.out || 'fade', din: o.din ?? DIN[kin], dout: o.dout ?? 0.3, float: o.float ?? 1, seed: F.rand(s.items.length + x * 0.01 + y), focusable: o.focusable ?? true, lift: o.lift ?? true };
    s.items.push(it);
    if (o.sfx) F.sfx(it.t0 + (o.sfxDt || 0), o.sfx, o.gain ?? -15, o.sfxAlign ? { align: o.sfxAlign } : {});
    return it;
  };
  const enter = (it, T) => {
    const st = { x: it.x, y: it.y, z: it.z, r: it.r, s: it.s, rx: it.rx, ry: it.ry, o: 1, blur: 0 };
    if (T < it.t0) { st.o = 0; return st; }
    const k = clamp((T - it.t0) / it.din);
    switch (it.kin) {
      case 'pop': { const e = E.back(k); st.s *= lerp(0.5, 1, e); st.o = clamp(k * 4); st.blur = (1 - E.out(k)) * 5; break; }
      case 'drop': { const e = E.out5(k); st.y -= (1 - e) * 180; st.r += (1 - e) * 8; st.s *= lerp(1.12, 1, e); st.o = clamp(k * 4); st.blur = (1 - e) * 14; break; }
      case 'fly': { const e = E.out5(k); st.z += (1 - e) * 1100; st.r += (1 - e) * -7; st.o = clamp(k * 3); st.blur = (1 - e) * 22; break; }
      case 'deep': { const e = E.out5(k); st.z -= (1 - e) * 1000; st.o = clamp(k * 3); st.blur = (1 - e) * 12; break; }
      case 'slide-l': { const e = E.out5(k); st.x -= (1 - e) * 1000; st.r -= (1 - e) * 7; st.blur = (1 - e) * 18; st.o = clamp(k * 5); break; }
      case 'slide-r': { const e = E.out5(k); st.x += (1 - e) * 1000; st.r += (1 - e) * 7; st.blur = (1 - e) * 18; st.o = clamp(k * 5); break; }
      case 'rise': { const e = E.out5(k); st.y += (1 - e) * 650; st.r += (1 - e) * 5; st.blur = (1 - e) * 14; st.o = clamp(k * 5); break; }
      case 'swing': { const e = E.back2(k); st.rx += (1 - e) * -80; st.o = clamp(k * 3); st.blur = (1 - E.out(k)) * 6; break; }
      case 'slam': { const e = E.out5(k); st.s *= lerp(2.3, 1, e); st.o = clamp(k * 5); st.blur = (1 - e) * 14; st.r += (1 - e) * -8; break; }
      case 'fade': st.o = E.out(k); st.blur = (1 - E.out(k)) * 6; break;
      case 'none': break;
    }
    if (T > it.t1) {
      const u = clamp((T - it.t1) / it.dout);
      if (it.kout === 'fade') { st.o *= 1 - E.in2(u); st.blur += u * 8; }
      else if (it.kout === 'fly') { st.z += E.in(u) * 1100; st.o *= 1 - clamp(u * 1.6 - 0.6); st.blur += u * 20; }
      else if (it.kout === 'deep') { st.z -= E.in(u) * 900; st.o *= 1 - E.in2(u); st.blur += u * 10; }
      else if (it.kout === 'drop') { st.y += E.in(u) * 700; st.r += u * 8; st.blur += u * 12; }
      else if (it.kout === 'pop') { st.s *= lerp(1, 0.4, E.in(u)); st.o *= 1 - E.in(u); }
      else if (it.kout === 'slide-l') { st.x -= E.in(u) * 1200; st.blur += u * 16; }
      else if (it.kout === 'slide-r') { st.x += E.in(u) * 1200; st.blur += u * 16; }
    }
    return st;
  };
  // focus: what is spoken of comes forward (sharp, a little bigger, a stronger shadow), the rest recedes (blurred, smaller)
  const ZB = -300;
  const focusOf = (s, it, T) => {
    if (!s.focus.length || !it.focusable) return { z: 0, l: 0 };
    let pz = 0, pl = 0, cz = 0, cl = 0, tk = -1;
    for (const [t, set] of s.focus) {
      if (T < t) break;
      pz = cz; pl = cl;
      if (set === 'all') { cz = 0; cl = 0; } else if (set.includes(it)) { cz = 0; cl = 1; } else { cz = ZB; cl = 0; }
      tk = t;
    }
    if (tk < 0) return { z: 0, l: 0 };
    const u = E.io(clamp((T - tk) / 0.55));
    return { z: lerp(pz, cz, u), l: lerp(pl, cl, u) };
  };
  const PERSP = 1500;
  const place = (s, it, T, c) => {
    if (it.xf) it.x = it.xf(T);
    if (it.yf) it.y = it.yf(T);
    if (it.rf) { const [a, b] = it.rf(T); it.rx = a; it.ry = b; }
    if (it.sf) it.s = it.sf(T);
    const e = enter(it, T);
    const f = focusOf(s, it, T);
    const z = Math.min(e.z + f.z, PERSP - 60);
    const pz = PERSP / (PERSP - z);
    const fl = it.float ? F.noise(T * 0.7, it.seed * 50) : 0;
    const ex = e.x, ey = e.y + fl * 3 * it.float;
    const x = c.x + (ex - c.x) * pz, y = c.y + (ey - c.y) * pz;
    const sc = e.s * pz * (1 + 0.035 * f.l);
    const r = e.r + fl * 0.3 * it.float;
    const dof = z < 0 ? clamp(-z * 0.021, 0, 14) : 0;
    const blur = e.blur + dof;
    const bright = z < 0 ? 1 - Math.min(0.16, -z * 0.00055) : 1;
    const el = it.el;
    el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(2)}px,${y.toFixed(2)}px)${e.rx || e.ry ? ` perspective(1400px) rotateX(${e.rx.toFixed(2)}deg) rotateY(${e.ry.toFixed(2)}deg)` : ''} rotate(${r.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
    const o = clamp(e.o);
    el.style.opacity = o.toFixed(3);
    const fs = [];
    if (blur > 0.05) fs.push(`blur(${blur.toFixed(2)}px)`);
    if (bright < 0.995) fs.push(`brightness(${bright.toFixed(3)})`);
    el.style.filter = fs.join(' ');
    el.style.visibility = o <= 0.002 ? 'hidden' : 'inherit';
    if (it.lift) el.style.setProperty('--l', (f.l + clamp(z / 500, 0, 1.5)).toFixed(3));
    el.style.zIndex = String(Math.round(1000 + z + f.l * 50 + (it.zi || 0)));
    it.cur = { x, y, s: sc, r, o };
  };
  F.place = place;

  /* ---------- chapter pages (their styles live in fx.js: P3 and V) ---------- */
  const CH = (F.CH = {});
  F.TK = {};
  F.chapter = (A, B, o) => {
    F.when(o.t0, `the chapter page « ${o.title} » t0`); F.when(o.t2, `the chapter page « ${o.title} » t2`);
    const st = o.style || F.STYLE;
    const D = CH[st].D;
    const tr = { A, B, kind: 'chap', style: st, o, t0: o.t0 };
    tr.t1 = tr.t0 + D[0];
    tr.t2 = Math.max(o.t2, tr.t1 + D[1]);
    tr.t3 = tr.t2 + D[2];
    const V = CH[st].vis(tr);
    tr.vA = V[0]; tr.vB = V[1];
    tr.reveal = tr.vB;           // when the content of B may start to show
    CH[st].build(tr, o);
    F.trans.push(tr);
    F.leak(tr.t0 + 0.1, 1.6, 0.45, 'v');
    return tr;
  };

  const trState = (tr, T, side) => {
    const st = { x: 0, y: 0, s: 1, o: 1, blur: 0, bright: 1, rx: 0, ry: 0, z: side === 'B' ? 3 : 2, cs: 1, crx: 0, cry: 0, cblur: 0, cbright: 1, bgb: 0, bgbright: 1 };
    if (tr.kind === 'chap') return CH[tr.style].state(tr, T, side, st);
    const u = clamp((T - tr.t0) / (tr.t1 - tr.t0));
    if (F.TK[tr.kind]) return F.TK[tr.kind].state(tr, T, side, st, u);
    switch (tr.kind) {
      case 'depth':
        if (side === 'A') { const e = E.io(u); st.cs = 1 - 0.13 * e; st.cblur = 14 * e; st.cbright = 1 - 0.18 * e; st.bgb = 6 * e; st.o = 1 - clamp((u - 0.4) / 0.6); }
        else { const e = E.out5(u); st.cs = 1.13 - 0.13 * e; st.cblur = 16 * (1 - E.out(u)); st.bgb = 6 * (1 - E.out(u)); st.o = clamp(u * 2.4); }
        break;
      case 'whip-l': { const e = E.io5(u); st.x = (side === 'A' ? -e : 1 - e) * 1990; break; }
      case 'whip-r': { const e = E.io5(u); st.x = (side === 'A' ? e : e - 1) * 1990; break; }
      case 'fade': st.o = side === 'A' ? 1 - E.sine(u) : E.sine(u); break;
      case 'cut': st.o = side === 'A' ? (u < 0.5 ? 1 : 0) : (u >= 0.5 ? 1 : 0); break;
    }
    return st;
  };
  // the motion blur of a transition: [horizontal, vertical]
  const trBlur = (tr, T) => {
    if (tr.kind === 'chap') return CH[tr.style].mb ? CH[tr.style].mb(tr, T) : [0, 0];
    if (F.TK[tr.kind] && F.TK[tr.kind].mb) return F.TK[tr.kind].mb(tr, T);
    if (tr.kind !== 'whip-l' && tr.kind !== 'whip-r') return [0, 0];
    const u = clamp((T - tr.t0) / (tr.t1 - tr.t0));
    return [Math.sin(u * Math.PI) * 44, 0];
  };

  /* ---------- real documents: the whole view, or an enlargement of one zone ---------- */
  // where the letters of q fall in a line of text (accents, case, spaces and punctuation ignored, as the OCR may read
  // « 100 000 » or « 100000 »): one entry per place, true when it is whole (no letter or digit of the line just before
  // or just after it)
  const WORDCH = /[\p{L}\p{N}]/u;
  const finds = (t, q) => {
    const kq = norm(String(q).replace(/\s+/g, ''));
    if (!kq) return [];
    let N = '';
    const at = [];
    for (let i = 0; i < t.length; i++) for (const c of norm(t[i])) { N += c; at.push(i); }
    const out = [];
    for (let k = N.indexOf(kq); k >= 0; k = N.indexOf(kq, k + 1)) out.push(!WORDCH.test(t[at[k] - 1] || ' ') && !WORDCH.test(t[at[k + kq.length - 1] + 1] || ' '));
    return out;
  };
  F.finds = finds;
  // frame: 'sheet' (a printed capture), 'phone' (a mobile capture, scrollable), 'card' (an enlargement)
  F.view = (s, name, x, y, o = {}) => {
    const D = window.DOCS[name];
    if (!D) throw new Error(`document not prepared: ${name} (scripts/docs.mjs)`);
    F.whens(o, ['t0', 't1'], `the document « ${name} »`);
    const R = o.region || { x: 0, y: 0, w: D.w, h: D.h };
    const w = o.w || 1100, k = w / R.w;
    const vh = o.vh ? o.vh : R.h * k;
    const frame = o.frame || 'sheet';
    const pad = frame === 'phone' ? 22 : frame === 'card' ? 12 : 0;
    const root = F.el('div', 'doc lift doc-' + frame, s.cam);
    root.style.width = w + 2 * pad + 'px'; root.style.height = vh + 2 * pad + 'px';
    const scr = F.el('div', 'doc-scr', root);
    scr.style.left = pad + 'px'; scr.style.top = pad + 'px'; scr.style.width = w + 'px'; scr.style.height = vh + 'px';
    const pane = F.el('div', 'doc-pane', scr);
    const im = F.img(name + '.png', 'doc-img', pane);
    im.style.width = D.w * k + 'px'; im.style.left = -R.x * k + 'px'; im.style.top = -R.y * k + 'px';
    const ink = F.svg(pane, R.w, D.h - R.y, 'doc-ink');
    ink.setAttribute('viewBox', `${R.x} ${R.y} ${R.w} ${D.h - R.y}`);
    ink.style.width = w + 'px'; ink.style.height = (D.h - R.y) * k + 'px';
    const it = F.item(s, root, x, y, defined({ t0: o.t0, t1: o.t1, in: o.in || 'drop', din: o.din, out: o.out, r: o.r || 0, s: o.s || 1, z: o.z || 0, rx: o.rx, ry: o.ry, focusable: o.focusable ?? true, float: o.float ?? 0.5, sfx: o.sfx, gain: o.gain }));
    const scroll = [[s.t0, 0, 0]];
    const d = {
      name, D, R, it, root, pane, ink, k, w, vh, pad,
      // the box of the n-th line of text the OCR read that holds q WHOLE: its words begin and end where the line's
      // do (accents, case, spaces and punctuation ignored), so d.box('none') never takes « nonexistent ». Text no line
      // holds whole is looked for inside a line (the OCR read « 13/11/202 »), with a warning in the render's log.
      box(q, n = 1) {
        const found = D.lines.map((l) => ({ l, at: finds(l.t, q) })).filter((x) => x.at.length);
        const whole = found.filter((x) => x.at.some(Boolean));
        const pick = whole.length ? whole[n - 1] : found[n - 1];
        if (pick && !whole.length) F.warn(`⚠ no line of « ${name} » holds « ${q} » whole: d.box took it inside « ${pick.l.t} »; write the whole text (docs.mjs <run> --lines ${name})`);
        if (pick) return { x: pick.l.x, y: pick.l.y, w: pick.l.w, h: pick.l.h };
        throw new Error(`text not found in ${name}: ${q}${n > 1 ? ` #${n}` : ''} (scripts/docs.mjs <run> --lines ${name})`);
      },
      scrollTo(t, v, dur = 1.0) { scroll.push([F.when(t, `${name}.scrollTo`), v, dur]); return d; },
      scrollAt(T) { let v = 0; for (const [t0, tv, du] of scroll) { if (T < t0) break; v = lerp(v, tv, E.io(clamp((T - t0) / (du || 1e-3)))); } return v; },
      // a point (u, v) of the capture → the screen camera's coordinates (where the picture is now)
      pt(u, v, T) {
        const P = it.cur || { x: it.x, y: it.y, s: it.s, r: it.r };
        const sv = d.scrollAt(T ?? F.now);
        const W2 = (w + 2 * pad) * P.s, H2 = (vh + 2 * pad) * P.s;
        const a = (P.r * Math.PI) / 180;
        const lx = (pad + (u - R.x) * k) * P.s - W2 / 2, ly = (pad + (v - R.y - sv) * k) * P.s - H2 / 2;
        return { x: P.x + lx * Math.cos(a) - ly * Math.sin(a), y: P.y + lx * Math.sin(a) + ly * Math.cos(a) };
      },
    };
    s.on((T) => { pane.style.transform = `translateY(${(-d.scrollAt(T) * k).toFixed(1)}px)`; });
    return d;
  };
  // a white veil over a zone of a document (to bring the rest forward)
  F.veil = (d, b, t0, t1 = 1e9, o = 0.8) => {
    F.when(t0, `the veil on « ${d.name} » t0`); F.when(t1, `the veil on « ${d.name} » t1`);
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', b.x); r.setAttribute('y', b.y); r.setAttribute('width', b.w); r.setAttribute('height', b.h);
    r.setAttribute('fill', '#fff');
    d.ink.insertBefore(r, d.ink.firstChild);
    F.on((T) => r.setAttribute('opacity', (o * Math.min(F.p(T, t0, 0.35, E.io), 1 - F.p(T, t1, 0.35, E.io))).toFixed(3)));
    return r;
  };
  // a line from a zone of view A to the enlargement B
  F.link = (s, A, bA, B, t0, t1 = 1e9) => {
    F.when(t0, `the line from « ${A.name} » t0`); F.when(t1, `the line from « ${A.name} » t1`);
    const v = F.svg(s.cam, 1920, 1080, 'link-ink'); v.style.left = '0'; v.style.top = '0'; v.style.zIndex = '5000';
    const pth = document.createElementNS(NS, 'path'); pth.setAttribute('class', 'link'); pth.setAttribute('fill', 'none'); v.appendChild(pth);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '7'); dot.setAttribute('class', 'link-dot'); v.appendChild(dot);
    s.on((T) => {
      const a = A.pt(bA.x + bA.w, bA.y + bA.h / 2, T), cB = B.it.cur || B.it;
      const bx = cB.x - (B.w / 2 + B.pad) * cB.s, by = cB.y;
      const k1 = F.p(T, t0, 0.35, E.out), k2 = 1 - F.p(T, t1, 0.3, E.in2);
      const ex = lerp(a.x, bx, k1), ey = lerp(a.y, by, k1);
      pth.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${(a.x + 110).toFixed(1)} ${a.y.toFixed(1)} ${(ex - 110 * k1).toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
      const op = Math.min(k1 > 0 ? 1 : 0, k2) * Math.min(A.it.cur ? A.it.cur.o : 1, cB.o ?? 1);
      pth.style.opacity = op.toFixed(3); dot.style.opacity = op.toFixed(3);
      dot.setAttribute('cx', a.x.toFixed(1)); dot.setAttribute('cy', a.y.toFixed(1));
    });
    return pth;
  };
  // ink on a document (in the capture's pixels): circle, under, hl (highlight), box, check, arrow
  F.ink = (d, kind, b, t0, o = {}) => {
    F.when(t0, `the ink '${kind}' on « ${d.name} »`); F.whens(o, ['t1'], `the ink '${kind}' on « ${d.name} »`);
    const m = o.m ?? 10;
    const x0 = b.x - m, y0 = b.y - m, x1 = b.x + b.w + m, y1 = b.y + b.h + m, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
    let dd, cls = 'ink ' + (o.cls || '');
    if (kind === 'circle') dd = `M${cx + rx * 0.97} ${cy - ry * 0.45} C ${cx + rx * 1.1} ${cy + ry * 0.95} ${cx - rx * 0.7} ${cy + ry * 1.25} ${cx - rx * 1.03} ${cy + ry * 0.1} C ${cx - rx * 1.18} ${cy - ry * 0.95} ${cx + rx * 0.55} ${cy - ry * 1.32} ${cx + rx * 1.04} ${cy - ry * 0.2}`;
    if (kind === 'under') dd = `M${x0} ${y1 + 4} L${x1} ${y1 + 4}`;
    if (kind === 'hl') { dd = `M${x0} ${cy} L${x1} ${cy}`; cls = 'hl ' + (o.cls || ''); }
    if (kind === 'box') { const r = 12; dd = `M${x0 + r} ${y0} L${x1 - r} ${y0} Q${x1} ${y0} ${x1} ${y0 + r} L${x1} ${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} L${x0 + r} ${y1} Q${x0} ${y1} ${x0} ${y1 - r} L${x0} ${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`; cls = 'ink thin ' + (o.cls || ''); }
    if (kind === 'check') { const s2 = b.h * 0.9; const tx = x1 + 18; dd = `M${tx} ${cy} l${s2 * 0.35} ${s2 * 0.42} l${s2 * 0.75} ${-s2 * 0.95}`; }
    if (kind === 'arrow') { const [ax, ay, bx, by] = o.pts; const ang = Math.atan2(by - ay, bx - ax); const L = 26; dd = `M${ax} ${ay} Q ${(ax + bx) / 2 + (o.bend || 40)} ${(ay + by) / 2 - (o.bend || 40)} ${bx} ${by} M${bx - L * Math.cos(ang - 0.5)} ${by - L * Math.sin(ang - 0.5)} L${bx} ${by} L${bx - L * Math.cos(ang + 0.5)} ${by - L * Math.sin(ang + 0.5)}`; }
    const dur = o.dur ?? (kind === 'hl' ? 0.32 : kind === 'check' ? 0.22 : kind === 'box' ? 0.35 : 0.45);
    const p = F.path(d.ink, dd, { class: cls });
    if (kind === 'hl') p.setAttribute('stroke-width', (b.h + 2 * m) * 0.95);
    F.on((T) => { F.draw(p, F.p(T, t0, dur, E.io)); p.style.opacity = o.t1 && T > o.t1 ? 1 - clamp((T - o.t1) / 0.3) : 1; });
    if (o.sfx !== false && kind === 'check') F.sfx(t0 + dur * 0.6, 'm:ui-select', -17);
    if (o.sfx !== false && (kind === 'circle' || kind === 'under')) F.sfx(t0, 'p:mixkit-paper-quick-movement-2380', -21);
    return p;
  };

  /* ---------- labels, stamps, chips ---------- */
  // a label, tied to a point when o.anchor is given ((T) → {x, y} in the screen's camera, or a fixed point)
  const what = (html) => `« ${String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 40)} »`;
  F.callout = (s, html, x, y, o = {}) => {
    F.whens(o, ['t0', 't1'], `the label ${what(html)}`);
    const e = F.el('div', 'callout lift ' + (o.cls || ''), s.cam, html);
    const it = F.item(s, e, x, y, defined({ t0: o.t0, t1: o.t1, in: o.in || 'pop', r: o.r || 0, z: o.z || 0, float: o.float ?? 0.6, focusable: o.focusable ?? false, sfx: o.sfx ?? 'm:premium-pop-1', gain: o.gain ?? -16, sfxDt: o.anchor ? 0.12 : 0 }));
    it.zi = 2000;
    if (o.anchor) {
      it.t0 += 0.14;
      const v = F.svg(s.cam, 1920, 1080, 'link-ink'); v.style.left = '0'; v.style.top = '0'; v.style.zIndex = '2500';
      const pth = document.createElementNS(NS, 'path'); pth.setAttribute('class', 'co-line ' + (o.cls || '')); pth.setAttribute('fill', 'none'); v.appendChild(pth);
      const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '8'); dot.setAttribute('class', 'co-dot ' + (o.cls || '')); v.appendChild(dot);
      s.on((T) => {
        const a = typeof o.anchor === 'function' ? o.anchor(T) : o.anchor;
        const c = it.cur || it;
        const k1 = F.p(T, it.t0 - 0.16, 0.22, E.out), k2 = 1 - F.p(T, it.t1, 0.25, E.in2);
        const ex = lerp(a.x, c.x, k1), ey = lerp(a.y, c.y, k1);
        pth.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`);
        const op = (k1 > 0 ? 1 : 0) * k2 * (o.anchorO ? o.anchorO(T) : 1);
        pth.style.opacity = op.toFixed(3); dot.style.opacity = op.toFixed(3);
        dot.setAttribute('cx', a.x.toFixed(1)); dot.setAttribute('cy', a.y.toFixed(1));
      });
    }
    return it;
  };
  F.stamp = (s, html, x, y, o = {}) => {
    F.when(o.t0, `the stamp ${what(html)} t0`); F.whens(o, ['t1'], `the stamp ${what(html)}`);
    const e = F.el('div', 'stamp ' + (o.cls || ''), s.cam, html);
    const it = F.item(s, e, x, y, defined({ t0: o.t0, t1: o.t1, in: 'slam', r: o.r ?? -6, z: o.z || 0, float: 0.2, focusable: o.focusable ?? false, lift: false }));
    it.zi = 3000;
    F.sfx(o.t0 + 0.2, 'm:thump-click', o.gain ?? -9);
    F.sfx(o.t0 + 0.18, 'm:cinematic-low-whoosh', -23, { align: 'peak' });
    F.shake(o.t0 + 0.22, 0.32, 5); F.rgb(o.t0 + 0.2, 0.3, 5);
    return it;
  };
  F.chips = (s, list, x, y, o = {}) => {
    const its = list.map(([html, t0, cls]) => { F.when(t0, `the chip ${what(html)}`); const e = F.el('div', 'chip lift ' + (cls || ''), s.cam, html); return F.item(s, e, 0, y, { t0, in: 'pop', float: 0.4, sfx: 'm:normal-pop-' + (1 + (Math.round(t0 * 10) % 4)), gain: -16, focusable: o.focusable ?? true }); });
    // laid out centred on x, measured on the first frame (on an invisible copy: otherwise a chip shows at x = 0 for a frame)
    let laid = false;
    F.on(() => {
      if (laid) return;
      const ws = its.map((it) => { const c = it.el.cloneNode(true); c.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;display:flex;transform:none;opacity:1'; document.body.appendChild(c); const w = c.offsetWidth; c.remove(); return w; });
      if (!ws[0]) return; laid = true;
      const gap = o.gap ?? 22, tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      let cx = x - tot / 2;
      its.forEach((it, i) => { it.x = cx + ws[i] / 2; cx += ws[i] + gap; });
    });
    return its;
  };

  /* ---------- a character: appearances with no speaking (the brand's host, if the user gave cut-outs) ---------- */
  // poses: the names of img/host/<pose>.png (cut-outs on transparency, a real person of the brand who agreed to it)
  F.character = (parent, POSES, src, cls = '') => {
    const wrap = F.el('div', 'pres ' + cls, parent);
    const im = {};
    for (const p of POSES) im[p] = F.img(src(p), 'pres-img', wrap);
    const shows = [];
    const P = {
      shows, poses: POSES,
      show(o) {
        F.when(o.t0, 'an appearance of the host t0'); F.when(o.t1, 'an appearance of the host t1');
        (o.poses || []).forEach(([t]) => F.when(t, 'a pose of the host'));
        const sh = { h: 760, from: 'bottom', r: 0, ...o };
        if (!sh.poses) sh.poses = [[sh.t0, sh.pose]];
        shows.push(sh);
        F.sfx(sh.t0, 'm:smooth-fast-whoosh', -20, { align: 'peak' });
        F.sfx(sh.t0 + 0.16, 'm:premium-pop-3', -17);
        sh.poses.slice(1).forEach(([t]) => F.sfx(t, 'm:normal-pop-2', -19));
        return P;
      },
      cur: null,
      update(T) {
        const sh = shows.find((s) => T >= s.t0 && T < s.t1 + 0.35);
        P.cur = sh || null;
        if (!sh) { wrap.style.visibility = 'hidden'; return; }
        let pose = sh.poses[0][1], tp = sh.t0;
        for (const [t, p] of sh.poses) if (T >= t) { pose = p; tp = t; }
        for (const k in im) im[k].style.display = k === pose ? 'block' : 'none';
        const kin = clamp((T - sh.t0) / 0.5), kout = clamp((T - sh.t1) / 0.32);
        const ei = E.back(kin), eo = E.in(kout);
        let dx = 0, dy = 0, rr = sh.r;
        if (sh.from === 'bottom') { dy = (1 - ei) * 520 + eo * 700; rr += (1 - E.out(kin)) * -6; }
        if (sh.from === 'left') { dx = -(1 - ei) * 640 - eo * 800; rr += (1 - E.out(kin)) * -10; }
        if (sh.from === 'right') { dx = (1 - ei) * 640 + eo * 800; rr += (1 - E.out(kin)) * 10; }
        const sq = T - tp < 0.22 && tp > sh.t0 ? Math.sin(((T - tp) / 0.22) * Math.PI) * 0.05 : 0;
        const sway = Math.sin(T * 2.2 + sh.t0) * 1.1, bob = Math.sin(T * 2.9 + sh.t0) * 4;
        wrap.style.visibility = 'inherit';
        wrap.style.height = sh.h + 'px'; wrap.style.width = sh.h * 0.75 + 'px';
        wrap.style.opacity = clamp(kin * 4).toFixed(3);
        wrap.style.filter = kin < 1 || kout > 0 ? `blur(${((1 - E.out(kin)) * 6 + eo * 8).toFixed(1)}px)` : '';
        wrap.style.transform = `translate(-50%,-100%) translate(${(sh.x + dx).toFixed(1)}px,${(sh.y + dy + bob).toFixed(1)}px) rotate(${(rr + sway).toFixed(2)}deg) scale(${(sh.flip ? -1 : 1) * (1 + sq)},${1 - sq * 0.6})`;
      },
    };
    return P;
  };

  /* ---------- full-screen videos and GIFs (pictures loaded as the render goes) ---------- */
  F.MEDIA = [];
  F.media = (o) => {
    F.when(o.t0, `the media « ${o.name} » t0`); F.when(o.t1, `the media « ${o.name} » t1`); F.whens(o, ['labelAt'], `the media « ${o.name} »`);
    const m = { fps: 30, fit: 'cover', loop: false, start: 0, ...o };
    const box = F.el('div', 'media ' + m.fit, F.mediaLayer);
    if (m.fit === 'blur') m.bg = F.el('img', 'media-bg lazy', box);
    m.img = F.el('img', 'media-img lazy', box);
    if (m.credit) F.el('small', 'media-credit', box, m.credit);
    if (!m.n) F.el('div', 'media-ph', box, `video « ${m.name} »`);
    if (m.label) m.lab = F.el('div', 'media-label', box, m.label);
    m.box = box; m.cur = -1;
    F.MEDIA.push(m);
    F.sfx(m.t0, m.sfxIn || 'm:fast-whoosh-2', m.gainIn ?? -19, { align: 'peak' });
    if (m.sfx) m.sfx.forEach(([dt, n, g]) => F.sfx(m.t0 + dt, n, g));
    F.rgb(m.t0, 0.3, 7);
    return m;
  };
  const mediaSeek = (T, pend) => {
    for (const m of F.MEDIA) {
      const on = T >= m.t0 && T < m.t1;
      m.box.style.display = on ? 'block' : 'none';
      if (!on) continue;
      let i = Math.floor((T - m.t0 + m.start) * m.fps + 1e-6);
      i = m.loop ? i % m.n : Math.min(i, m.n - 1);
      if (m.n && i !== m.cur) {
        m.cur = i;
        const url = `media/${m.name}/f${String(i + 1).padStart(4, '0')}.jpg`;
        m.img.src = url; pend.push(m.img.decode().catch(() => {}));
        if (m.bg) { m.bg.src = url; pend.push(m.bg.decode().catch(() => {})); }
      }
      const ki = clamp((T - m.t0) / 0.24), ko = m.noOut ? 0 : clamp((T - (m.t1 - 0.14)) / 0.14);
      const prog = clamp((T - m.t0) / (m.t1 - m.t0));
      const sc = lerp(1.16, 1, E.out5(ki)) * (1 + (m.push ?? 0.05) * prog) * lerp(1, 1.04, ko);
      m.box.style.transform = `scale(${sc.toFixed(4)})`;
      m.box.style.opacity = Math.min(clamp(ki * 6), 1 - ko).toFixed(3);
      const b = (1 - E.out(ki)) * 14 + ko * 10;
      m.box.style.filter = b > 0.1 ? `blur(${b.toFixed(1)}px)` : '';
      if (m.lab) { const kl = E.back(clamp((T - (m.labelAt ?? m.t0 + 0.2)) / 0.4)); m.lab.style.transform = `translate(-50%,0) scale(${lerp(0.8, 1.4, kl).toFixed(3)})`; m.lab.style.opacity = clamp(kl * 3).toFixed(3); }
    }
  };
  F.mediaOn = (T) => F.MEDIA.some((m) => T >= m.t0 && T < m.t1);

  /* ---------- subtitles (off in this style: the series removed them; YouTube can show its own) ---------- */
  F.captions = (parent, { maxWords = 7, hide = [] } = {}) => {
    const box = F.el('div', 'caps', parent);
    const groups = [];
    let g = [];
    WORDS.forEach((w, i) => {
      g.push(w);
      const next = WORDS[i + 1];
      const stop = /[.!?…:]$/.test(w.w.replace(/[ »«\s]/g, '')) || (g.length >= maxWords - 1 && /[,;]$/.test(w.w)) || g.length >= maxWords + 1 || !next || next.t0 - w.t1 > 0.45;
      if (stop) { groups.push(g); g = []; }
    });
    groups.forEach((gr) => {
      gr.el = F.el('div', 'cap-line', box);
      gr.spans = gr.map((w) => F.el('span', '', gr.el, w.w.replace(/ /g, ' ').replace(/\s([?!:;»])/g, ' $1').replace(/«\s/g, '« ')));
      gr.t0 = gr[0].t0; gr.t1 = gr[gr.length - 1].t1;
    });
    return (T) => {
      const hidden = hide.some(([a, b]) => T >= a && T < b);
      groups.forEach((gr, i) => {
        const nx = groups[i + 1];
        const until = nx ? Math.min(nx.t0 - 0.1, gr.t1 + 0.7) : gr.t1 + 0.7;
        const on = !hidden && T >= gr.t0 - 0.1 && T < until;
        gr.el.style.display = on ? 'block' : 'none';
        if (!on) return;
        const k = clamp((T - gr.t0 + 0.1) / 0.14);
        gr.el.style.opacity = Math.min(k, clamp((until - T) / 0.08)).toFixed(3);
        gr.el.style.transform = `translateX(-50%) translateY(${((1 - E.out(k)) * 14).toFixed(1)}px)`;
        gr.forEach((w, j) => gr.spans[j].className = T >= w.t0 - 0.03 && T < w.t1 + 0.04 ? 'now' : T >= w.t1 ? 'past' : '');
      });
    };
  };

  /* ---------- grain ---------- */
  const grainURL = () => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const dta = g.createImageData(256, 256);
    let seed = 7;
    for (let i = 0; i < dta.data.length; i += 4) { seed = (seed * 16807) % 2147483647; const v = 128 + ((seed / 2147483647) - 0.5) * 255; dta.data[i] = dta.data[i + 1] = dta.data[i + 2] = v; dta.data[i + 3] = 255; }
    g.putImageData(dta, 0, 0);
    return c.toDataURL();
  };

  /* ---------- assembly ---------- */
  const updaters = [];
  F.on = (fn) => updaters.push(fn);
  F.MB = [];                                   // sources of global motion blur: (T) → [x, y]
  F.LAZY = [];                                 // pictures loaded as the render goes: (T, promises) → void
  F.MEASURE = [];                              // sizes read once, faces loaded, every screen still shown: () → void
  F.build = () => {
    F.stage = document.getElementById('stage');
    F.world = F.el('div', 'world');
    F.over = F.el('div', 'over', F.world);
    F.mediaLayer = F.el('div', 'media-layer', F.world);
    F.post = F.el('div', 'post');
    F.lightEl = F.el('div', 'light', F.post);
    F.vig = F.el('div', 'vig', F.post);
    F.leaks = [F.el('div', 'leak', F.post), F.el('div', 'leak', F.post)];
    F.grain = F.el('div', 'grain', F.post);
    F.grain.style.backgroundImage = `url(${grainURL()})`;
    F.ui = F.el('div', 'ui');
    F.stage.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><filter id="fx" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0 0" result="mb" id="fx-mb"/>
      <feColorMatrix in="mb" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feOffset in="r" dx="0" dy="0" result="ro" id="fx-r"/>
      <feColorMatrix in="mb" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
      <feColorMatrix in="mb" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
      <feOffset in="b" dx="0" dy="0" result="bo" id="fx-b"/>
      <feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen"/></filter></svg>`);
  };

  F.seek = (T) => {
    F.now = T;
    let mb = 0, mby = 0;
    for (const s of F.screens) {
      const tin = F.trans.find((t) => t.B === s), tout = F.trans.find((t) => t.A === s);
      const v0 = tin ? tin.vB : s.t0, v1 = tout ? tout.vA : s.t1;
      const vis = T >= v0 && T < v1;
      s.root.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      let st = { x: 0, y: 0, s: 1, o: 1, blur: 0, bright: 1, rx: 0, ry: 0, z: 1, cs: 1, crx: 0, cry: 0, cblur: 0, cbright: 1, bgb: 0, bgbright: 1 };
      for (const [tr, side] of [[tin, 'B'], [tout, 'A']]) {
        if (!tr) continue;
        const tEnd = tr.kind === 'chap' ? tr.t3 : tr.t1;
        if (T < tr.t0 || T > tEnd) continue;
        st = trState(tr, T, side);
        const b2 = trBlur(tr, T);
        mb = Math.max(mb, b2[0]); mby = Math.max(mby, b2[1]);
      }
      const r = s.root;
      r.style.zIndex = st.z;
      r.style.transform = `translate(${st.x.toFixed(1)}px,${st.y.toFixed(1)}px) perspective(2400px) rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg) scale(${st.s.toFixed(4)})`;
      r.style.opacity = st.o.toFixed(3);
      const fl = [];
      if (st.blur > 0.1) fl.push(`blur(${st.blur.toFixed(1)}px)`);
      if (st.bright < 0.995) fl.push(`brightness(${st.bright.toFixed(3)})`);
      r.style.filter = fl.join(' ');
      r.style.clipPath = st.clip || '';
      if (st.card > 0.001) {                     // a screen turned into a card (P3 transition): white edge, round corners, shadow
        const k = Math.max(0.05, st.s);
        r.style.borderRadius = (16 / k).toFixed(1) + 'px';
        r.style.boxShadow = `0 0 0 ${(12 / k).toFixed(1)}px rgba(255,255,255,${st.card.toFixed(3)}), 0 ${(28 / k).toFixed(0)}px ${(64 / k).toFixed(0)}px rgba(28,26,46,${(0.34 * st.card).toFixed(3)})`;
      } else { r.style.borderRadius = ''; r.style.boxShadow = ''; }
      const c = camAt(s, T), tl = tiltAt(s, T);
      const hx = F.noise(T * 0.45, 3) * 3, hy = F.noise(T * 0.4, 9) * 2.4;
      s.cam.style.transform = `translate(${(960 - c.x * c.z + hx).toFixed(2)}px,${(540 - c.y * c.z + hy).toFixed(2)}px) scale(${c.z.toFixed(4)})`;
      const trx = tl.rx + st.crx, tryy = tl.ry + st.cry;
      s.tw.style.transform = trx || tryy || st.cs !== 1 ? `perspective(2600px) rotateX(${trx.toFixed(2)}deg) rotateY(${tryy.toFixed(2)}deg) scale(${st.cs.toFixed(4)})` : '';
      const tf = [];
      if (st.cblur > 0.1) tf.push(`blur(${st.cblur.toFixed(1)}px)`);
      if (st.cbright < 0.995) tf.push(`brightness(${st.cbright.toFixed(3)})`);
      s.tw.style.filter = tf.join(' ');
      s.bg.style.transform = `translate(${((960 - c.x) * 0.1).toFixed(1)}px,${((540 - c.y) * 0.1).toFixed(1)}px) scale(${(1.08 + (c.z - 1) * 0.15).toFixed(4)})`;
      s.bg.style.filter = `blur(${(s.dof + Math.max(0, c.z - 1) * 4 + st.bgb).toFixed(2)}px)${st.bgbright < 0.995 ? ` brightness(${st.bgbright.toFixed(3)})` : ''}`;
      s.c = c;
      for (const it of s.items) place(s, it, T, c);
      for (const fn of s.upd) fn(T);
    }
    for (const fn of updaters) fn(T);
    const pend = [];
    mediaSeek(T, pend);
    for (const fn of F.LAZY) fn(T, pend);

    // post: RGB split, motion blur, a light shake, light leaks, grain
    const rgb = pulse(FX.rgb, T), sh = pulse(FX.shake, T);
    const sx = F.noise(T * 47, 1) * sh, sy = F.noise(T * 41, 2) * sh * 0.7;
    F.world.style.transform = sh > 0.05 ? `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)` : '';
    for (const fn of F.MB) { const b2 = fn(T); mb = Math.max(mb, b2[0]); mby = Math.max(mby, b2[1]); }
    const useF = rgb > 0.3 || mb > 0.4 || mby > 0.4;
    F.world.style.filter = useF ? 'url(#fx)' : 'none';
    if (useF) {
      document.getElementById('fx-mb').setAttribute('stdDeviation', `${mb.toFixed(1)} ${mby.toFixed(1)}`);
      document.getElementById('fx-r').setAttribute('dx', (rgb * 0.5).toFixed(1));
      document.getElementById('fx-b').setAttribute('dx', (-rgb * 0.5).toFixed(1));
    }
    F.leaks.forEach((l, i) => {
      let v = 0, ph = 0, col = 'w';
      for (const e of FX.leak) { const u = (T - e.t) / e.d; if (u >= 0 && u < 1) { const k = Math.sin(u * Math.PI) * e.k; if (k > v) { v = k; ph = u; col = e.c; } } }
      l.style.opacity = (v * (i ? 0.65 : 0.9)).toFixed(3);
      l.dataset.c = col;
      l.style.transform = `translate(${(lerp(-500, 1500, ph) + i * 320).toFixed(0)}px,${(lerp(-120, 260, ph) - i * 220).toFixed(0)}px) rotate(${(ph * 40 + i * 70).toFixed(1)}deg)`;
    });
    const fr = Math.floor(T * 12);
    F.grain.style.backgroundPosition = `${Math.floor(F.rand(fr) * 256)}px ${Math.floor(F.rand(fr + 99) * 256)}px`;
    return pend.length ? Promise.all(pend).then(() => true) : true;
  };

  // after the story, every instant it left on the film, even one set later on an element (it.t1 = t.x - 0.1)
  F.checkInstants = () => {
    const bad = (v) => v === undefined || (typeof v === 'number' && Number.isNaN(v));
    for (const s of F.screens) for (const it of s.items) for (const k of ['t0', 't1']) {
      if (bad(it[k])) throw notSet(`the ${k} of ${String(it.el.className || it.el.tagName).split(' ')[0]} ${what((it.el.innerText || it.el.textContent || '').replace(/\s+/g, ' '))} on screen '${s.name}'`, it[k]);
    }
    for (const tr of F.trans) for (const k of ['t0', 't1', 't2', 't3']) if (k in tr && bad(tr[k])) throw notSet(`the ${k} of a page into screen '${tr.B.name}'`, tr[k]);
    for (const [k, v] of Object.entries(F.T || {})) if (bad(v) || (Array.isArray(v) && v.some(bad))) throw notSet(`t.${k}`, Array.isArray(v) ? v.find(bad) : v);
  };

  F.boot = async () => {
    F.build();
    window.STORY();
    F.checkInstants();
    const imgs = [...document.images].filter((i) => !i.classList.contains('lazy'));
    await Promise.all(imgs.map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }).then(() => i.decode().catch(() => {})))));
    await document.fonts.ready;
    // the faces the film must have before a frame is taken (brand.css declares them: the brand's or the OFL defaults)
    const fams = window.FONTS || [];
    await Promise.all(fams.map((f) => document.fonts.load(f).catch(() => null)));
    F.trans.forEach((tr) => tr.measure && tr.measure());
    F.MEASURE.forEach((fn) => fn());
    window.__filmHealth = { badImages: imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')), badFonts: fams.filter((f) => !document.fonts.check(f)) };
    await F.seek(0);
    window.__film = { meta: { duration: F.DUR, slug: window.SLUG, music: window.MUSIC, bed: window.MUSIC_BED ? window.MUSIC_BED() : null, style: F.STYLE, lang: F.LANG }, seek: F.seek, cues: F.soundPass(F.CUES) };
    window.__filmReady = true;
    if (!Q.has('render')) F.preview(Q.get('t'));
  };

  F.preview = (t0) => {
    const bar = document.createElement('div');
    bar.className = 'pv';
    bar.innerHTML = '<button>▶</button><input type="range" min="0" step="0.01"><span></span>';
    document.body.appendChild(bar);
    const [btn, range, lab] = bar.children;
    range.max = F.DUR;
    let playing = false, start = 0, base = +(t0 || 0);
    const show = (t) => { F.seek(t); range.value = t; lab.textContent = t.toFixed(2) + ' s'; };
    const loop = () => { if (!playing) return; const t = base + (performance.now() - start) / 1000; if (t >= F.DUR) { playing = false; btn.textContent = '▶'; return; } show(t); requestAnimationFrame(loop); };
    btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; if (playing) { base = +range.value; start = performance.now(); loop(); } };
    range.oninput = () => { playing = false; btn.textContent = '▶'; show(+range.value); };
    const fit = () => { const k = Math.min(innerWidth / F.W, (innerHeight - 56) / F.H); F.stage.style.transform = `scale(${k})`; F.stage.style.transformOrigin = '0 0'; };
    addEventListener('resize', fit); fit();
    show(base);
  };
})();
