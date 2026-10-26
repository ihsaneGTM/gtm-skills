/* THE REFERENCE, motion part 1 of the voiceover video « Waterfall enrichers » (style « Document »), as it is in the video
   Ihsane called « quasiment parfait » on 2026-10-13 (workspace/videos/waterfall-complete-2d.mp4, 22.07 → 78.83 s;
   workspace/projects/waterfall-v1-media). Read it whole before writing a part: every rule of the format shows here once.
   The cut: the dressed intro (« …called Waterfall Enrichers. », 22.07 s at ×1.1) → THIS part (56.77 s, the clone: the
   agenda, then « So first, what is the difference… Really simple, right? ») → the dressed cutback (« So now, which
   waterfall? »). Its take was made in two (the agenda 0–18.4 s, the explanation from 19.0 s), hence AA() and B0 below; a
   new part has ONE take: A() and Z() alone.
   What makes it (each kept from a review; references/decisions.md says when and why):
   - the in-junction: the dressed intro's last frame snaps into a pinned print in 0.42 s; the print LEAVES as the
     waterfall shot covers the screen (round 11) and never comes back; then EVERY element is re-laid for the layout
     without it: the agenda centred, its exits drawn off the right edge, « My example » in the centre (round 12);
   - the agenda = the video's chapters as numbered cards on their words; the teased « special tool » pixelated;
   - real logos (Apollo, Lusha, Kaspr, Pipecorn), their homepages at the full viewport in a browser frame (round 11);
     fictional people as LinkedIn-like specimens (Nano Banana 2 headshots, fictional companies with drawn logos);
   - text out of masks, a counter 0 → 100, editorial lines with a marker or a slim bar instead of stamps;
   - two stock shots in the frame on the paper (F.framed: the waterfall on « what a waterfall enricher is », the
     frustrated woman on « you are not getting the email »); no GIF here (none fitted);
   - depth cuts between moments, the yellow V page (with its light swish) for « the waterfall enricher »; no 3D dive;
   - the out-junction: the dressed cutback's first frame snaps to full screen in 0.33 s. Rendered without music (the one
     bed is laid by assemble.mjs). */
window.SLUG = 'waterfall-v1';
window.STORY = () => {
  'use strict';
  const { el, item, sfx, clamp, lerp, E } = F;
  // the take: the agenda (0–18.4 s of the voice), then the explanation from 19.0 s; A/Z look in the explanation, AA in the agenda
  const AA = (q, n = 1, after = 0) => F.at(q, n, after);
  const B0 = 19.0;
  const A = (q, n = 1, after = 0) => F.at(q, n, Math.max(after, B0));
  const Z = (q, n = 1, after = 0) => F.end(q, n, Math.max(after, B0));
  const { I, ic } = B;
  F.DUR = +(F.VO_END + 0.3).toFixed(3);   // 0.3 s after « right? »

  /* ---------- the look of this video's own cards (same faces, same shadows, small palette) ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .ihs{left:0;top:0;width:1920px;height:1080px;background:#fff;overflow:visible}
  .ihs img{left:0;top:0;width:1920px;height:1080px;display:block}
  .ihs .pin{opacity:var(--pin,0)}
  .mw{position:relative!important;display:inline-block;overflow:hidden;vertical-align:top;padding:0 .02em .12em;margin:0 -.02em -.12em}
  .mwi{position:relative!important;display:inline-block;will-change:transform}
  .w-card{left:0;top:0;display:flex;align-items:center;gap:30px;padding:26px 44px 26px 26px;border-radius:30px;background:#fff}
  .w-card *{position:relative}
  .w-ic{flex:none;width:118px;height:118px;border-radius:28px;background:var(--v);display:grid;place-items:center;font-size:66px;color:var(--ink);overflow:hidden}
  .w-ic svg{position:static}
  .w-ic.logo{background:none}
  .w-ic.logo img{width:118px;height:118px;display:block}
  .w-win{flex:none;width:250px;height:118px;border-radius:24px;background:#F6F6F8;overflow:hidden}
  .w-win img{position:absolute!important;left:50%;top:50%;max-width:200px;max-height:56px;transform:translate(-50%,-50%)}
  .w-card h3{font:700 60px/1 var(--title);letter-spacing:-.045em;color:var(--ink);white-space:nowrap}
  .w-vs{left:0;top:0;width:96px;height:96px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 36px/1 var(--title);letter-spacing:-.03em}
  .wsheet{left:0;top:0;width:1120px;background:#fff;border-radius:16px;overflow:hidden;font:500 25px/1 var(--text);color:var(--ink)}
  .wsheet *{position:relative}
  .wsheet .ws-ink{position:absolute!important;left:0;top:0;overflow:visible;pointer-events:none;z-index:5}
  .ws-bar{display:flex;align-items:center;gap:16px;height:72px;padding:0 26px;border-bottom:2px solid #EEEDF2;font:700 28px/1 var(--title);letter-spacing:-.02em;white-space:nowrap}
  .ws-bar i{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:var(--v);color:var(--ink);font-size:24px}
  .ws-bar i svg{position:static}
  .ws-bar span{margin-left:auto;font:600 22px/1 var(--text);color:var(--ink2)}
  .ws-row{display:grid;grid-template-columns:60px 300px 220px 290px 250px;height:58px;border-bottom:1.5px solid #F0EEF6}
  .ws-row>div{display:flex;align-items:center;gap:12px;padding:0 16px;white-space:nowrap;overflow:hidden;border-right:1.5px solid #F0EEF6}
  .ws-row>div:last-child{border-right:0}
  .ws-row .av{width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none}
  .ws-row svg{flex:none}
  .ws-head{height:56px;background:#F7F7F9}
  .ws-head>div{font:700 19px/1 var(--text);letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}
  .ws-head>div.mk{background:var(--v);color:var(--ink)}
  .ws-n{justify-content:center;color:#A9A7B5;font-size:22px!important}
  .ws-e{color:#C9C6D8}
  .ws-e.miss{background:#FFE9EA;color:var(--red);font:700 22px/1 var(--text);letter-spacing:.02em}
  .ws-foot{display:flex;align-items:center;height:60px;padding:0 26px;font:600 22px/1 var(--text);color:var(--ink2)}
  .pg1{left:0;top:0;background:#fff;border-radius:12px;overflow:hidden}
  .pg1 img{left:0;top:0;display:block}
  .pg-bar{left:0;top:0;width:100%;display:flex!important;align-items:center;gap:.55em;padding:0 1.1em;background:#F1F0F5;border-bottom:1.5px solid #E4E2EA;box-sizing:border-box}
  .pg-bar i{position:relative;width:.75em;height:.75em;border-radius:50%;background:#D6D4DD;flex:none}
  .pg-bar span{position:relative;margin-left:1em;padding:.25em 1.2em;border-radius:.6em;background:#fff;font:600 1em/1 var(--text);color:#8A8896}
  .pg1 .pg-ink{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
  .w-tile{left:0;top:0;width:220px;height:100px;border-radius:22px;background:#fff;display:grid;place-items:center}
  .w-tile img{position:static;max-width:170px;max-height:50px;display:block}
  .w-tile.big{width:300px;height:124px;border-radius:26px}
  .w-tile.big img{max-width:230px;max-height:62px}
  .w-tile.gen{font:700 30px/1 var(--title);letter-spacing:-.03em;color:var(--ink2)}
  .w-tile.gen.more{color:var(--ink)}
  .w-tile.ghost{background:rgba(255,255,255,.4)!important;box-shadow:none!important;outline:3px dashed #CFCDD9;outline-offset:-3px}
  .w-tile.ghost img{opacity:.28}
  .w-tile.gen.ghost{color:#C9C6D8}
  .w-tile.on{box-shadow:0 0 0 6px var(--v),0 24px 50px -20px rgba(28,26,46,.45)!important}
  .w-tag{left:0;top:0;padding:8px 12px;border-radius:9px;background:var(--ink);color:#fff;font:700 17px/1 var(--text);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
  .w-badge{left:0;top:0;width:60px;height:60px;border-radius:50%;display:grid;place-items:center;font-size:34px;color:#fff;box-shadow:0 12px 24px -10px rgba(28,26,46,.5)}
  .w-badge svg{position:static}
  .w-badge.red{background:var(--red)}.w-badge.ok{background:var(--ok)}
  .w-big{left:0;top:0;width:780px;height:428px;border-radius:32px;background:#fff}
  .w-big *{position:relative}
  .w-bh{display:flex;align-items:center;gap:20px;height:90px;margin:30px 34px 0;border-bottom:2px solid #F0EEF6;padding-bottom:22px}
  .w-bh .w-ic{width:68px;height:68px;border-radius:18px}
  .w-bh .w-ic.logo img{width:68px;height:68px}
  .w-bh b{font:700 46px/1 var(--title);letter-spacing:-.04em;white-space:nowrap}
  .w-slot{position:absolute!important;width:220px;height:100px;border-radius:22px;border:3px dashed #DAD8E3}
  .li{left:0;top:0;width:600px;border-radius:22px;background:#fff;overflow:hidden}
  .li *{position:relative}
  .li-ban{height:108px;background:linear-gradient(120deg,#163a8a 0%,#2F6FED 55%,#8DB7FF 100%)}
  .li-ban::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.07) 0 2px,transparent 2px 22px)}
  .li-ph{position:absolute!important;left:28px;top:40px;width:136px;height:136px;border-radius:50%;border:5px solid #fff;object-fit:cover;display:block}
  .li-co{position:absolute!important;right:28px;top:128px;display:flex;align-items:center;gap:10px;font:700 23px/1 var(--title);letter-spacing:-.02em;color:var(--ink)}
  .li-co svg{position:static}
  .li h4{margin:80px 28px 0;font:700 36px/1 var(--title);letter-spacing:-.03em;color:var(--ink);white-space:nowrap}
  .li p{margin:10px 28px 0;font:500 23px/1.2 var(--text);color:var(--ink);white-space:nowrap}
  .li small{display:block;margin:8px 28px 0;font:500 19px/1 var(--text);color:#86848F;white-space:nowrap}
  .li-need{display:flex;gap:12px;margin:18px 28px 24px;height:46px}
  .li-need span{display:flex;align-items:center;gap:8px;padding:0 18px;border-radius:999px;background:var(--v);font:700 22px/1 var(--text);color:var(--ink)}
  .li-need span svg{position:static}
  .w-dot{left:0;top:0;width:40px;height:40px;border-radius:50%;background:var(--v);border:6px solid var(--ink);box-shadow:0 10px 20px -6px rgba(28,26,46,.5)}
  .w-res{left:0;top:0;width:600px;padding:24px 30px 26px;border-radius:24px;background:#fff;outline:4px solid var(--ok);outline-offset:-2px}
  .w-res *{position:relative}
  .w-res .rh{display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:2px solid #F0EEF6}
  .w-res .rh img{width:64px;height:64px;border-radius:50%;object-fit:cover;display:block}
  .w-res .rh b{display:block;font:700 30px/1 var(--title);letter-spacing:-.03em}
  .w-res .rh small{display:flex;align-items:center;gap:8px;margin-top:6px;font:700 16px/1 var(--text);letter-spacing:.14em;text-transform:uppercase;color:var(--okd)}
  .w-res .rh small svg{position:static}
  .w-res p{display:flex;align-items:center;gap:14px;margin-top:16px;font:600 31px/1 var(--title);letter-spacing:-.02em;white-space:nowrap}
  .w-res p i{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#DCFCE7;color:var(--okd);font-size:26px;font-style:normal}
  .w-res p i svg{position:static}
  .w-ag{left:0;top:0;display:flex;align-items:center;gap:26px;width:820px;height:116px;padding:20px 34px 20px 20px;border-radius:26px;background:#fff}
  .w-ag *{position:relative}
  .w-ag b{flex:none;display:grid;place-items:center;width:76px;height:76px;border-radius:20px;background:var(--v);color:var(--ink);font:700 42px/1 var(--title)}
  .w-ag b svg{position:static}
  .w-ag span{font:700 48px/1.05 var(--title);letter-spacing:-.04em;color:var(--ink);white-space:nowrap}
  .w-ag u{text-decoration:none}
  .w-ag .hl{padding:0 .06em;background:linear-gradient(transparent 56%,var(--v) 56%,var(--v) 92%,transparent 92%) no-repeat 0 0/var(--m,0%) 100%}
  .w-ag .few{margin-left:auto;display:flex;gap:10px;font-style:normal}
  .w-ag .few i{display:block;width:46px;height:46px;border-radius:12px;background:#F1F0F5;border:3px dashed #CFCDD9}
  .w-ag.lock{background:var(--ink);gap:22px}
  .w-ag.lock .px{width:560px;height:76px;border-radius:14px;image-rendering:pixelated;display:block;filter:blur(var(--bl,1.2px))}
  .w-ag.lock .sh{position:absolute!important;left:0;top:0;width:100%;height:100%;border-radius:26px;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%) no-repeat;background-size:300% 100%;background-position:var(--g,110%) 0}
  .w-ag.lock .tg{position:absolute!important;right:22px;top:-18px;padding:7px 12px;border-radius:9px;background:var(--v);font:700 16px/1 var(--text);letter-spacing:.16em;text-transform:uppercase;color:var(--ink)}
  .w-ed *{position:relative}
  .big .pp{position:relative!important;display:inline-block;margin-left:.2em}
  .w-ed{left:0;top:0;font:700 58px/1.05 var(--title);letter-spacing:-.04em;color:var(--ink);white-space:nowrap}
  .w-ed u{text-decoration:none;padding:0 .06em;background:linear-gradient(transparent 58%,var(--v) 58%,var(--v) 94%,transparent 94%) no-repeat 0 0/var(--m,0%) 100%}
  .w-ed.sm{font-size:44px}
  .w-ed.red{color:var(--red);font-size:40px}
  .w-ed .bar{position:absolute!important;left:0;bottom:-16px;width:100%;height:6px;border-radius:3px;background:currentColor;transform-origin:0 50%;transform:scaleX(var(--b,0))}
  .big .cnt{position:relative!important;display:inline-block;width:2.05em;text-align:right;font-variant-numeric:tabular-nums}
  .end-print{left:0;top:0;width:1920px;height:1080px;transform-origin:50% 50%;z-index:90}
  .end-print img{left:0;top:0;width:1920px;height:1080px;display:block}
  `;
  document.head.appendChild(css);

  const DB = B.SVG('<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>');
  const PIPE = `<div class="w-ic logo"><img src="img/logo.png"></div>`;
  const rectD = (x0, y0, x1, y1, r = 12) => `M${x0 + r} ${y0} L${x1 - r} ${y0} Q${x1} ${y0} ${x1} ${y0 + r} L${x1} ${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} L${x0 + r} ${y1} Q${x0} ${y1} ${x0} ${y1 - r} L${x0} ${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
  // an ink stroke inside an element (its own coordinates): drawn from t0, gone after t1
  const inkIn = (svg, d, t0, o = {}) => {
    const p = F.path(svg, d, { class: 'ink ' + (o.cls || '') });
    if (o.w) p.setAttribute('stroke-width', o.w);
    const dur = o.dur ?? 0.4;
    F.on((T) => { F.draw(p, F.p(T, t0, dur, E.io)); p.style.opacity = o.t1 && T > o.t1 ? (1 - clamp((T - o.t1) / 0.3)).toFixed(3) : '1'; });
    if (o.sfx !== false) sfx(t0, 'p:mixkit-paper-quick-movement-2380', -21);
    return p;
  };
  const svgIn = (parent, w, h, cls) => { const s = F.svg(parent, w, h, cls); s.style.width = w + 'px'; s.style.height = h + 'px'; return s; };

  /* ---------- text entrances: every word rises out of its own mask, one after the other ---------- */
  const reveal = (root, t0, o = {}) => {
    const words = [];
    const walk = (n) => {
      for (const c of [...n.childNodes]) {
        if (c.nodeType === 3) {
          const parts = c.textContent.split(/(\s+)/);
          if (!parts.some((p) => p.trim())) continue;
          const frag = document.createDocumentFragment();
          for (const p of parts) {
            if (!p) continue;
            if (!p.trim()) { frag.appendChild(document.createTextNode(p)); continue; }
            const m = document.createElement('span'); m.className = 'mw';
            const i = document.createElement('span'); i.className = 'mwi'; i.textContent = p;
            m.appendChild(i); frag.appendChild(m); words.push(i);
          }
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && !/^(svg|i|img|canvas|b)$/i.test(c.tagName) && !c.classList.contains('cnt') && !c.classList.contains('hw')) walk(c);
      }
    };
    walk(root);
    const step = o.step ?? 0.055, dur = o.dur ?? 0.5;
    F.on((T) => words.forEach((w, k) => {
      const u = E.out5(clamp((T - t0 - k * step) / dur));
      w.style.transform = u >= 1 ? '' : `translate3d(0,${((1 - u) * 108).toFixed(1)}%,0) rotate(${((1 - u) * 4).toFixed(2)}deg)`;
    }));
    return words.length * step + dur;
  };
  // a marker pass on <u> (--m from 0 to 100 %)
  const marker = (elx, t0, d = 0.4) => F.on((T) => elx.style.setProperty('--m', (100 * F.p(T, t0, d, E.io)).toFixed(1) + '%'));
  // an editorial label: words rising out of their masks, an optional marker on its <u>, an optional slim bar under it
  const ed = (s, html, x, y, t0, o = {}) => {
    const e = el('div', 'w-ed ' + (o.cls || ''), s.cam, html);
    const it = item(s, e, x, y, { t0, in: 'none', float: 0, focusable: false, lift: false, t1: o.t1 ?? 1e9, out: 'fade', r: o.r || 0 });
    it.zi = 2600;
    const d = reveal(e, t0, o);
    const u = e.querySelector('u');
    if (u) marker(u, t0 + d - 0.15, 0.42);
    if (o.bar) { const b = el('i', 'bar', e); F.on((T) => b.style.setProperty('--b', F.p(T, t0 + 0.1, 0.45, E.io).toFixed(3))); }
    sfx(t0 + 0.02, 'k:click', -17);
    if (u) sfx(t0 + d - 0.12, 'p:mixkit-paper-quick-movement-2380', -20);
    return it;
  };
  // a label of the engine (pop), its words then rising
  const callout = (s, html, x, y, o) => { const it = F.callout(s, html, x, y, o); reveal(it.el, it.t0 + 0.06, { step: 0.045, dur: 0.42 }); return it; };

  /* ---------- the fictional people (photos made with Nano Banana 2) and their fictional companies ---------- */
  const MARK = {
    Halvorn: ['#2F6FED', '<rect x="1" y="1" width="22" height="22" rx="6" fill="#2F6FED"/><path d="M6 10l6-4 6 4M6 16l6-4 6 4" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
    Cobaltine: ['#1E3A8A', '<circle cx="12" cy="12" r="11" fill="#1E3A8A"/><circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="2.6"/>'],
    Fernquist: ['#15803D', '<path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" fill="#15803D"/><path d="M5 19L15 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
    Lumavale: ['#F59E0B', '<path d="M2 17a10 10 0 0 1 20 0z" fill="#F59E0B"/><rect x="2" y="19" width="20" height="2.6" rx="1.3" fill="#F59E0B"/>'],
    Quillstone: ['#7C3AED', '<path d="M12 1.5l10 10.5-10 10.5L2 12z" fill="#7C3AED"/><path d="M12 7l5 5-5 5" stroke="#fff" stroke-width="2.2" fill="none"/>'],
    Ardenta: ['#DC2626', '<path d="M12 2.5l10 18.5H2z" fill="#DC2626"/>'],
    Vexley: ['#0EA5E9', '<path d="M2 3.5h6l4 9.5 4-9.5h6l-10 18z" fill="#0EA5E9"/>'],
    Pellatrix: ['#DB2777', '<path d="M12 1.5l9.5 5.3v10.4L12 22.5l-9.5-5.3V6.8z" fill="#DB2777"/><circle cx="12" cy="12" r="3.4" fill="#fff"/>'],
  };
  const mark = (co, px = 26) => `<svg viewBox="0 0 24 24" width="${px}" height="${px}">${MARK[co][1]}</svg>`;
  const PEOPLE = [['sarah', 'Sarah Whitfield', 'Halvorn'], ['tom', 'Tom Becker', 'Cobaltine'], ['nina', 'Nina Patel', 'Fernquist'], ['lucas', 'Lucas Moreau', 'Lumavale'],
    ['emma', 'Emma Clarke', 'Quillstone'], ['david', 'David Kim', 'Ardenta'], ['julia', 'Julia Rossi', 'Vexley'], ['omar', 'Omar Haddad', 'Pellatrix']];
  const SH_W = 1120, SH_H = 72 + 56 + 8 * 58 + 60; // 652
  const COL = { email: [580, 870], phone: [870, 1120] }, ROW1 = 128 + 8 * 58;
  const sheet = (s) => {
    const e = el('div', 'wsheet lift', s.cam);
    e.innerHTML = `<div class="ws-bar"><i>${I.users}</i>leads.csv<span>100 rows</span></div>
      <div class="ws-row ws-head"><div class="ws-n">#</div><div>Name</div><div>Company</div><div class="hE">Email</div><div class="hP">Phone</div></div>
      ${PEOPLE.map(([k, n, c], i) => `<div class="ws-row"><div class="ws-n">${i + 1}</div><div><img class="av" src="img/people/${k}.jpg">${n}</div><div>${mark(c, 24)}${c}</div><div class="ws-e cE">—</div><div class="ws-e cP">—</div></div>`).join('')}
      <div class="ws-foot">+ 92 more people</div>`;
    const ink = svgIn(e, SH_W, SH_H, 'ws-ink');
    return { e, ink, hE: e.querySelector('.hE'), hP: e.querySelector('.hP'), cE: [...e.querySelectorAll('.cE')], cP: [...e.querySelectorAll('.cP')] };
  };
  // a real page (a crop of the homepage, captured 2026-10-12)
  const PAGE = { apollo: [1400, 820], lusha: [1400, 711], kaspr: [1400, 711] };
  // round 11 (Ihsane: « show the whole viewport height »): the real pages are now the full above-the-fold viewport
  // (1440×900 at ×2, captured 2026-10-13, banners hidden), in a browser frame; H is then the viewport's
  const VP = { pipecorn: 'pipecorn.com', apollo: 'apollo.io', lusha: 'lusha.com', kaspr: 'kaspr.io' };
  const page1 = (s, key, W, H, x, y, o = {}) => {
    const e = el('div', 'pg1 lift', s.cam);
    let top = 0;
    if (VP[key]) {
      top = Math.round(14 + W * 0.022); H = Math.round(W * 0.625) + top;
      const bar = el('div', 'pg-bar', e, `<i></i><i></i><i></i><span>${VP[key]}</span>`);
      bar.style.height = top + 'px'; bar.style.fontSize = Math.round(top * 0.42) + 'px';
    }
    e.style.width = W + 'px'; e.style.height = H + 'px';
    const im = F.img(`pages/${key}${VP[key] ? '-vp' : ''}.jpg`, '', e);
    im.style.width = W + 'px'; im.style.top = top + 'px';
    const ink = svgIn(e, W, H, 'pg-ink');
    const it = item(s, e, x, y, { in: 'drop', float: 0, sfx: 'p:mixkit-paper-slide-1530', gain: -15, ...o });
    return { e, ink, it, W, H };
  };
  const tile = (s, key, x, y, o = {}) => {
    const e = el('div', 'w-tile lift' + (o.big ? ' big' : ''), s.cam, `<img src="img/logos/${key}.png">`);
    return item(s, e, x, y, { in: 'pop', float: 0, focusable: false, sfx: 'm:premium-pop-1', gain: -15, ...o });
  };
  const genTile = (s, html, x, y, o = {}) => {
    const e = el('div', 'w-tile gen lift' + (o.more ? ' more' : ''), s.cam, html);
    return item(s, e, x, y, { in: 'pop', float: 0, focusable: false, sfx: 'm:normal-pop-2', gain: -16, ...o });
  };
  const badge = (s, ok, x, y, t0) => {
    const e = el('div', 'w-badge ' + (ok ? 'ok' : 'red'), s.cam, ok ? I.check : I.cross);
    const it = item(s, e, x, y, { t0, in: 'pop', float: 0, focusable: false, lift: false, sfx: ok ? 'm:ui-select' : 'm:normal-pop-3', gain: ok ? -14 : -17 });
    it.zi = 2600;
    return it;
  };
  const path = (keys) => (T) => {
    if (T <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) {
      const [t1, x1, y1] = keys[i], [t0, x0, y0] = keys[i - 1];
      if (T < t1) { const u = E.io(clamp((T - t0) / (t1 - t0))); return [lerp(x0, x1, u), lerp(y0, y1, u)]; }
    }
    const L = keys[keys.length - 1]; return [L[1], L[2]];
  };

  /* ---------- instants (film time = take time + 0.25 s) ---------- */
  const t = {};
  t.so = A('so');
  t.diff = A('difference');
  t.single = A('single');
  t.wf = A('waterfall');
  t.lets = A("let's");
  t.example = A('example');
  t.list = A('list');
  t.hundred = A('one');
  t.hundredE = Z('hundred');
  t.people = A('people');
  t.enrich = A('enrich');
  t.emails = A('emails');
  t.phone = A('phone');
  t.with = A('with');
  t.single2 = A('single', 2);
  t.look = A('look');
  t.one2 = A('one', 2);
  t.database = A('database');
  t.only = A('only');
  t.apollo = A('apollo');
  t.lusha = A('lusha');
  t.kaspr = A('kaspr');
  t.dont = A("don't");
  t.info = A('information');
  t.you3 = A('you', 1, t.info);
  t.email = A('email');
  t.phone2 = A('phone', 2);
  t.numberE = Z('number');
  t.a2 = A('a', 1, t.numberE);
  t.enricher2E = Z('enricher', 2);
  t.tool = A('tool');
  t.brings = A('brings');
  t.all = A('all');
  t.providers = A('providers');
  t.one3 = A('one', 3);
  t.subscription = A('subscription');
  t.so3 = A('so', 3);
  t.access = A('access');
  t.when = A('when');
  t.email2 = A('email', 2);
  t.phone3 = A('phone', 3);
  t.searches = A('searches');
  t.each = A('each');
  t.one4 = A('one', 4);
  t.one5 = A('one', 5);
  t.finds = A('finds');
  t.info2 = A('information', 2);
  t.really = A('really');
  t.rightE = Z('right');
  F.T = t;

  // the junctions: the post (grain, vignette, light, dust) is off on the first frame and on the last frames, so they are
  // the real frames of the clips around
  const G0 = F.DUR - 0.4, G1 = F.DUR - 0.07;
  F.on((T) => { F.post.style.opacity = Math.min(clamp(T / 0.3), 1 - clamp((T - G0) / (G1 - G0 - 0.05))).toFixed(3); });

  /* ========== 0 · from Ihsane's last frame (it snaps into a pinned print), then the agenda ========== */
  const s0 = F.screen('open', 0, t.list - 0.25, { push: 0 });
  {
    const ph = el('div', 'ihs lift', s0.cam, `<img src="img/intro-last.png"><i class="pin"></i>`);
    const pin = ph.querySelector('.pin');
    pin.style.cssText = 'left:50%;top:-40px;width:80px;height:80px;margin-left:-40px';
    const K1 = 0.42, PX = 520, PY = 520, PS = 0.4;
    const k = (T) => E.io5(clamp(T / K1));
    const it = item(s0, ph, 960, 540, { t0: 0, in: 'none', float: 0, lift: true });
    // the camera's hand-held drift is taken back while the frame is still full screen: frame 0 is the real frame
    it.xf = (T) => { const u = k(T); it.r = lerp(0, -3, u); return lerp(960 - F.noise(T * 0.45, 3) * 3, PX, u); };
    it.yf = (T) => lerp(540 - F.noise(T * 0.4, 9) * 2.4, PY, k(T));
    it.sf = (T) => lerp(1, PS, k(T));
    s0.on((T) => {
      const u = k(T);
      ph.style.boxShadow = `0 0 0 ${(34 * u).toFixed(1)}px #fff, 0 ${60 * u}px ${120 * u}px -40px rgba(28,26,46,${(0.55 * u).toFixed(2)})`;
      ph.style.setProperty('--pin', clamp((T - K1 + 0.05) / 0.15).toFixed(2));
    });
    F.MB.push((T) => { const v = T < K1 ? Math.sin((T / K1) * Math.PI) * 14 : 0; return [v, v * 0.5]; });
    sfx(0.16, 'm:cinematic-fast-normal-whoosh', -16, { align: 'peak', key: true });
    sfx(K1, 'p:mixkit-paper-slide-1530', -15);
    // round 11 (Ihsane): the print leaves while the waterfall shot covers the page, never comes back; the agenda is
    // recentred under the shot, so the page that comes back shows only the four points
    const tWf0 = F.at('what') - 0.05, tWf1 = F.at('how', 1, tWf0) - 0.15;
    it.t1 = tWf0 + 0.15; it.kout = 'slide-l'; it.dout = 0.4;
    const toC = (T) => E.io5(clamp((T - (tWf1 - 0.3)) / 0.4));
    // the agenda: the video's four chapters, each as it is said; the 4th, the special tool, stays hidden (pixelated)
    const ag = [
      [`<b>1</b><span>What it is<u class="hw"> &amp; how it works</u></span>`, AA('what')],
      [`<b>2</b><span>vs <u class="hl">single providers</u></span>`, AA('compares') - 0.1],
      [`<b>3</b><span>How to choose <u class="hl">the best</u></span><em class="few"><i></i><i></i><i></i></em>`, AA('how', 3) - 0.05],
      [`<b>${I.lock}</b><canvas class="px" width="56" height="8"></canvas><i class="sh"></i><em class="tg">Special tool</em>`, AA('specific') - 0.05],
    ];
    const rows = ag.map(([html, t0], i) => {
      const e = el('div', 'w-ag lift' + (i === 3 ? ' lock' : ''), s0.cam, html);
      const r = item(s0, e, 1390, 282 + i * 172, { t0, in: i === 3 ? 'swing' : 'drop', r: [1, -1, 1.2, -1.5][i], float: 0.3, sfx: i === 3 ? 'p:mixkit-paper-slide-1530' : 'm:premium-pop-1', gain: -15 });
      // round 12: no photo any more, so everything is centred; the exit is drawn here (from the centre a 1200 px slide
      // left the cards half on screen): off the right edge (the engine's motion blur)
      const tOutR = t.so - 0.2 + i * 0.06;
      r.xf = (T) => lerp(1390, 960, toC(T)) + E.in(clamp((T - tOutR) / 0.5)) * 1700;
      const sp = e.querySelector('span');
      if (sp) reveal(sp, t0 + 0.14);
      return e;
    });
    const hw = rows[0].querySelector('.hw'), hl2 = rows[1].querySelector('.hl'), hl3 = rows[2].querySelector('.hl'), lockE = rows[3];
    const tHow = AA('how') - 0.05, tClassic = AA('classic') - 0.05, tBest = AA('best') - 0.05, tTech = AA('technique') - 0.1, tUn = AA('unmatched');
    reveal(hw, tHow + 0.02);
    marker(hl2, tClassic, 0.4); marker(hl3, tBest, 0.4);
    const few = [...rows[2].querySelectorAll('.few i')], tFew = AA('few') - 0.1;
    few.forEach((e, i) => sfx(tFew + i * 0.18, 'm:normal-pop-' + (i + 1), -19));
    // the special tool: a product card scrambled into pixels, its blocks shuffling; it sharpens a little on « technique »,
    // never enough to be read
    const cv = lockE.querySelector('canvas'), g = cv.getContext('2d');
    const drawPx = (seed, sharp) => {
      g.fillStyle = '#26262B'; g.fillRect(0, 0, 56, 8);
      const R = (i) => F.rand(seed * 7.1 + i * 3.3);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = R(x + y * 8); g.fillStyle = v > 0.35 ? `rgba(255,217,13,${(0.45 + 0.5 * v).toFixed(2)})` : `rgba(255,255,255,${(0.08 + 0.2 * v).toFixed(2)})`; g.fillRect(x, y, 1, 1); }
      for (let y = 1; y < 7; y++) for (let x = 11; x < 56; x++) {
        const word = y < 4 ? x < 11 + 26 + Math.floor(R(900) * 10) : x < 11 + 38;
        const v = R(x * 13 + y * 101 + 7);
        const on = word && (y === 1 || y === 2 || (y >= 4 && y <= 5)) && v > 0.18 - sharp * 0.1;
        g.fillStyle = on ? `rgba(255,255,255,${(0.35 + 0.55 * v).toFixed(2)})` : `rgba(255,255,255,${(0.03 + 0.05 * v).toFixed(2)})`;
        g.fillRect(x, y, 1, 1);
      }
    };
    let lastSeed = -1;
    s0.on((T) => {
      few.forEach((e, i) => { const kk = E.back(clamp((T - tFew - i * 0.18) / 0.35)); e.style.transform = `scale(${kk.toFixed(3)})`; e.style.opacity = clamp(kk * 3).toFixed(2); });
      const sharp = F.p(T, tTech, 0.6, E.io) * (1 - F.p(T, tUn + 0.4, 0.5));
      const seed = Math.floor(T / 0.12);
      if (seed !== lastSeed) { lastSeed = seed; drawPx(seed, sharp); }
      lockE.style.setProperty('--bl', (1.6 - 0.9 * sharp).toFixed(2) + 'px');
      lockE.style.setProperty('--g', lerp(110, -10, F.p(T, tTech, 0.7, E.io)).toFixed(1) + '%');
    });
    sfx(tHow, 'm:normal-pop-2', -18);
    sfx(tTech, 'k:glitch', -22);
    s0.camTo(AA('few') - 0.2, 960, 540, 1.02, 1.4).camTo(t.so - 0.3, 960, 540, 1, 0.8);
    // « …its data quality unmatched »: an editorial line under the hidden tool, a marker on its key word
    ed(s0, '<u>Unmatched</u> data quality', 960, 935, tUn - 0.25, { cls: 'sm', t1: t.so - 0.3 });
    // the two ideas: the single provider's window shows the real tools one after the other; the enricher: Pipecorn
    const c1 = el('div', 'w-card lift', s0.cam, `<div class="w-win"><img src="img/logos/apollo.png"><img src="img/logos/lusha.png"><img src="img/logos/kaspr.png"></div><h3>Single provider</h3>`);
    const i1 = item(s0, c1, 960, 330, { t0: t.single - 0.12, in: 'drop', r: 1.5, float: 0.4, sfx: 'm:premium-pop-1', gain: -15 });
    reveal(c1.querySelector('h3'), t.single - 0.02);
    const logos = [...c1.querySelectorAll('.w-win img')], tc0 = t.single - 0.12;
    s0.on((T) => {
      const ph2 = Math.max(0, (T - tc0) / 0.62), n = Math.floor(ph2), f = ph2 - n;
      const sw = E.io5(clamp((f - 0.72) / 0.28));
      logos.forEach((im, j) => {
        let y = 160;
        if (j === n % 3) y = -sw * 110;
        else if (j === (n + 1) % 3) y = (1 - sw) * 110;
        im.style.transform = `translate(-50%, calc(-50% + ${y.toFixed(1)}px))`;
        im.style.opacity = Math.abs(y) > 120 ? '0' : '1';
      });
    });
    const vs = el('div', 'w-vs lift', s0.cam, 'vs');
    const iv = item(s0, vs, 960, 530, { t0: t.diff - 0.1, in: 'pop', float: 0.3, sfx: 'm:normal-pop-1', gain: -17 });
    const c2 = el('div', 'w-card lift', s0.cam, `${PIPE}<h3>Waterfall enricher</h3>`);
    const i2 = item(s0, c2, 960, 730, { t0: t.wf - 0.12, in: 'drop', r: -1.5, float: 0.4, sfx: 'm:premium-pop-2', gain: -15 });
    reveal(c2.querySelector('h3'), t.wf - 0.02);
    // « Let's take my example back »: the camera goes to Ihsane, the rest recedes
    // round 12: the photo has gone, so « My example » lands in the centre and the camera stays centred
    s0.camTo(t.lets - 0.15, 960, 540, 1.04, 0.8);
    callout(s0, `${ic(I.bookmark)}My example`, 960, 560, { cls: 'dark', t0: t.example - 0.15, r: -2, z: 40 });
    [i1, iv, i2].forEach((x, i) => { const tO = t.lets - 0.12 + i * 0.05; x.xf = (T) => 960 + E.in(clamp((T - tO) / 0.5)) * 1700; });
    sfx(t.lets - 0.1, 'm:smooth-fast-whoosh', -20, { align: 'peak' });
  }

  /* ========== 1 · « a list of 100 people… emails and phone numbers » → « a single provider: one database only » ========== */
  const s1 = F.screen('list', t.list - 0.25, t.apollo - 0.3);
  B.depth(s0, s1, s1.t0);
  {
    const S = sheet(s1);
    const sh = item(s1, S.e, 960, 640, { t0: s1.t0, in: 'none', float: 0 });
    const mv = (T) => E.io(clamp((T - t.with + 0.05) / 0.6));
    sh.xf = (T) => lerp(960, 450, mv(T));
    sh.yf = (T) => lerp(640, 560, mv(T));
    sh.sf = (T) => lerp(1, 0.56, mv(T));
    // « one hundred people »: a counter rolling from 0 to 100, then « people » rising out of its mask
    const big = B.big(s1, '<em><span class="cnt">0</span></em> <span class="pp">people</span>', 860, 170, { t0: t.hundred - 0.12, in: 'none', r: -2 });
    big.t1 = t.with - 0.15; big.kout = 'deep';
    const cnt = big.el.querySelector('.cnt');
    const tc = t.hundred - 0.1, tcE = t.hundredE + 0.08;
    s1.on((T) => { const u = E.out(clamp((T - tc) / (tcE - tc))); cnt.textContent = String(Math.round(100 * u)); big.el.querySelector('em').style.opacity = T < tc ? '0' : '1'; });
    reveal(big.el.querySelector('.pp'), t.people - 0.08, { dur: 0.45 });
    for (let k = 0; k < 6; k++) sfx(tc + k * ((tcE - tc) / 6), 'k:click', -24 - k);
    sfx(t.people - 0.06, 'p:mixkit-paper-quick-movement-2380', -20);
    callout(s1, `${ic(I.bolt)}To enrich`, 1450, 175, { cls: 'v', t0: t.enrich - 0.1, t1: t.with - 0.15, r: 3 });
    s1.on((T) => {
      S.hE.classList.toggle('mk', T >= t.emails - 0.05);
      S.hP.classList.toggle('mk', T >= t.phone - 0.05);
    });
    inkIn(S.ink, rectD(COL.email[0] + 6, 78, COL.email[1] - 6, ROW1 - 4, 14), t.emails - 0.05, { t1: t.with - 0.1 });
    inkIn(S.ink, rectD(COL.phone[0] + 6, 78, COL.phone[1] - 8, ROW1 - 4, 14), t.phone - 0.05, { t1: t.with - 0.1 });
    s1.camTo(t.emails - 0.2, 1030, 600, 1.08, 0.7).camTo(t.with - 0.1, 960, 540, 1, 0.7);
    const ap = page1(s1, 'apollo', 840, 492, 1360, 540, { t0: t.single2 - 0.1, r: 1 });
    const ar = F.svg(s1.cam, 1920, 1080, 'link-ink'); ar.style.left = '0'; ar.style.top = '0'; ar.style.zIndex = '2400';
    const arP = F.path(ar, 'M 780 560 C 830 520, 880 520, 925 545', { class: 'ink' });
    const arH = F.path(ar, 'M 902 522 L 928 547 L 896 560', { class: 'ink' });
    F.on((T) => { F.draw(arP, F.p(T, t.look - 0.05, 0.3, E.io)); F.draw(arH, F.p(T, t.look + 0.22, 0.15, E.io)); ar.style.opacity = (1 - F.p(T, t.only - 0.2, 0.3)).toFixed(3); });
    sh.t1 = t.only - 0.2; sh.kout = 'deep'; sh.dout = 0.45;
    sfx(t.look - 0.05, 'm:smooth-fast-whoosh', -21, { align: 'peak' });
    inkIn(ap.ink, rectD(8, 8, ap.W - 8, ap.H - 8, 14), t.one2 - 0.08, { w: 7, dur: 0.45 });
    callout(s1, `${ic(DB)}One database`, 1360, 880, { t0: t.database - 0.1, r: -2 });
    s1.camTo(t.only - 0.15, 1300, 610, 1.12, 0.8);
  }

  /* ========== 2 · « So if Apollo, Lusha or Kaspr don't have the information »: their real pages land one per name ========== */
  const s2 = F.screen('providers', t.apollo - 0.3, t.you3 - 0.3);
  B.depth(s1, s2, s2.t0);
  {
    const P = [['apollo', 420, t.apollo, -2], ['lusha', 960, t.lusha, 1], ['kaspr', 1500, t.kaspr, -1]];
    const pages = P.map(([key, x, tw, r], i) => {
      const H = Math.round(PAGE[key][1] * (500 / 1400));
      // Apollo is there from the cut (the depth cut needs something on the new screen), the others drop on their name
      const p = page1(s2, key, 500, H, x, 590, { t0: i === 0 ? s2.t0 : tw - 0.1, in: i === 0 ? 'none' : 'drop', r });
      const tl = tile(s2, key, x, 330, { t0: i === 0 ? s2.t0 + 0.2 : tw - 0.02, big: true, r: -r * 1.5 });
      tl.zi = 2200;
      return p;
    });
    // « don't have the information »: each page crossed out in red, the label under them
    pages.forEach((p, i) => inkIn(p.ink, `M 40 40 L ${p.W - 40} ${p.H - 40} M ${p.W - 40} 40 L 40 ${p.H - 40}`, t.dont + 0.05 + i * 0.16, { cls: 'red', w: 9, dur: 0.3, sfx: i === 0 }));
    callout(s2, `${ic(I.cross)}They don't have the information`, 960, 880, { cls: 'red', t0: t.info - 0.15 });
  }

  /* ========== 3 · « you are not getting the email. You are not getting the phone number. » ========== */
  const s3 = F.screen('missing', t.you3 - 0.3, t.a2 - 0.3);
  B.depth(s2, s3, s3.t0);
  {
    const S = sheet(s3);
    S.hE.classList.add('mk'); S.hP.classList.add('mk');
    item(s3, S.e, 960, 580, { t0: s3.t0, in: 'none', float: 0 });
    s3.on((T) => {
      S.cE.forEach((c, i) => { const on = T >= t.email - 0.1 + i * 0.04; c.classList.toggle('miss', on); c.textContent = on ? 'Not found' : '—'; });
      S.cP.forEach((c, i) => { const on = T >= t.phone2 - 0.1 + i * 0.04; c.classList.toggle('miss', on); c.textContent = on ? 'Not found' : '—'; });
    });
    // the sheet's top-left: 400, 254; the email column's centre at x 1125, the phone column's at 1395
    s3.camTo(t.you3 - 0.2, 1130, 560, 1.18, 0.8).camTo(t.phone2 - 0.35, 1250, 560, 1.12, 0.8);
    // editorial labels over the columns, a slim red bar drawing under each (no stamps)
    ed(s3, 'No email', 1125, 196, t.email - 0.08, { cls: 'red', bar: true });
    ed(s3, 'No phone', 1395, 196, t.phone2 - 0.08, { cls: 'red', bar: true });
  }

  /* ========== V page: « A waterfall enricher » (kept as validated) ========== */
  const s4 = F.screen('enricher', t.a2 - 0.3, t.when - 0.3);
  const ch = B.chapter(s3, s4, { t0: t.a2 - 0.5, t2: t.enricher2E + 0.05, over: 'The other way', title: 'The waterfall enricher', style: 'V', photos: B.ph('apollo', 'lusha', 'kaspr', 'ihsane', 'kaspr', 'apollo') });

  /* ========== 4 · « a tool that brings all these providers into one subscription. So you have access to all of them. » ========== */
  {
    const card = el('div', 'w-big lift', s4.cam, `<div class="w-bh">${PIPE}<b>Waterfall enricher</b></div>`);
    const SL = [[34, 144], [280, 144], [526, 144], [157, 270], [403, 270]];
    SL.forEach(([x, y]) => { const d = el('div', 'w-slot', card); d.style.left = x + 'px'; d.style.top = y + 'px'; });
    item(s4, card, 960, 540, { t0: ch.reveal + 0.05, in: 'deep', float: 0, sfx: 'm:premium-pop-2', gain: -15 });
    reveal(card.querySelector('b'), ch.reveal + 0.2);
    const slotXY = SL.map(([x, y]) => [570 + x + 110, 326 + y + 50]);
    const FROM = [[330, 270], [1590, 270], [330, 800], [1590, 800], [960, 140]];
    const T_IN = [t.brings - 0.05, t.brings + 0.15, t.all - 0.05, t.all + 0.15, t.providers + 0.05];
    const tiles = [
      tile(s4, 'apollo', 0, 0, { t0: T_IN[0] }),
      tile(s4, 'lusha', 0, 0, { t0: T_IN[1] }),
      tile(s4, 'kaspr', 0, 0, { t0: T_IN[2] }),
      genTile(s4, 'Provider 4', 0, 0, { t0: T_IN[3] }),
      genTile(s4, '+ more', 0, 0, { t0: T_IN[4], more: true }),
    ];
    tiles.forEach((tl, i) => {
      const go = (T) => E.io5(clamp((T - (t.one3 - 0.35 + i * 0.07)) / 0.5));
      tl.xf = (T) => lerp(FROM[i][0], slotXY[i][0], go(T));
      tl.yf = (T) => lerp(FROM[i][1], slotXY[i][1], go(T)) - Math.sin(go(T) * Math.PI) * 60;
      tl.sf = (T) => lerp(1.15, 1, go(T));
      tl.zi = 2100;
    });
    sfx(t.one3 - 0.3, 'm:cinematic-fast-normal-whoosh', -18, { align: 'peak' });
    // « one subscription »: once the tiles are in, an editorial line writes itself under the card, a marker on « One »
    ed(s4, '<u>One</u> subscription', 960, 880, t.one3 + 0.5);
    slotXY.forEach(([x, y], i) => badge(s4, true, x + 100, y - 42, t.access - 0.05 + i * 0.13));
    s4.camTo(t.so3 - 0.1, 960, 580, 1.05, 0.9);
  }

  /* ========== 5 · « it searches each provider, one by one, until it finds the information » ========== */
  const s5 = F.screen('cascade', t.when - 0.3, F.DUR + 1, { push: 0.02 });
  B.depth(s4, s5, s5.t0);
  {
    const [pk, pn, pc] = PEOPLE[0];
    // who we look for: the top of a profile, as on LinkedIn (a specimen: fictional person, fictional company)
    const q = el('div', 'li lift', s5.cam, `<div class="li-ban"></div><img class="li-ph" src="img/people/${pk}.jpg"><div class="li-co">${mark(pc, 28)}${pc}</div>
      <h4>${pn}</h4><p>Head of Growth at ${pc}</p><small>London, United Kingdom · 500+ connections</small>
      <div class="li-need"><span class="qe">${I.mail}Email?</span><span class="qp">${I.phone}Phone?</span></div>`);
    const qe = q.querySelector('.qe'), qp = q.querySelector('.qp');
    item(s5, q, 400, 262, { t0: s5.t0, in: 'none', float: 0, r: -1 });
    reveal(q.querySelector('h4'), s5.t0 + 0.25); reveal(q.querySelector('p'), s5.t0 + 0.4, { step: 0.04 });
    s5.on((T) => {
      const a = E.back(clamp((T - t.email2 + 0.08) / 0.35)), b = E.back(clamp((T - t.phone3 + 0.08) / 0.35));
      qe.style.transform = `scale(${a.toFixed(3)})`; qe.style.opacity = clamp(a * 3).toFixed(2);
      qp.style.transform = `scale(${b.toFixed(3)})`; qp.style.opacity = clamp(b * 3).toFixed(2);
    });
    sfx(t.email2 - 0.05, 'm:normal-pop-1', -17); sfx(t.phone3 - 0.05, 'm:normal-pop-4', -17);
    // the tiers, as a waterfall: a step down each time
    const TX = [440, 760, 1080, 1400], TY = [530, 660, 790, 920];
    const tags = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
    // the tiers are laid out from the cut as dashed, empty slots (the screen is never half empty), then each one fills
    // in on « searches », the lines of the waterfall drawing between them
    const tA = t.searches - 0.1, tG = s5.t0 + 0.35;
    const tiers = [
      tile(s5, 'apollo', TX[0], TY[0], { t0: tG, big: true }),
      tile(s5, 'lusha', TX[1], TY[1], { t0: tG + 0.08, big: true }),
      tile(s5, 'kaspr', TX[2], TY[2], { t0: tG + 0.16, big: true }),
      genTile(s5, 'Provider 4', TX[3], TY[3], { t0: tG + 0.24 }),
    ];
    tiers[3].el.classList.add('big');
    const more = genTile(s5, '+ more', 1690, 920, { t0: tG + 0.32, more: true });
    [...tiers, more].forEach((tl, i) => {
      const tf = tA + i * 0.12;
      s5.on((T) => tl.el.classList.toggle('ghost', T < tf));
      tl.sf = (T) => 1 + 0.08 * Math.sin(Math.PI * clamp((T - tf) / 0.3));
    });
    sfx(tA, 'm:premium-pop-1', -15);
    tags.forEach((g, i) => { const e = el('div', 'w-tag', s5.cam, g); const it = item(s5, e, TX[i] - 92, TY[i] - 62, { t0: tG + i * 0.08 + 0.1, in: 'pop', float: 0, focusable: false, lift: false }); it.zi = 2300; });
    const ln = F.svg(s5.cam, 1920, 1080, 'link-ink'); ln.style.left = '0'; ln.style.top = '0'; ln.style.zIndex = '900';
    const segs = [`M ${TX[0]} 452 L ${TX[0]} ${TY[0] - 64}`];
    for (let i = 0; i < 3; i++) segs.push(`M ${TX[i] + 150} ${TY[i]} L ${TX[i + 1]} ${TY[i]} L ${TX[i + 1]} ${TY[i + 1] - 62}`);
    segs.push(`M ${TX[3] + 150} ${TY[3]} L 1580 ${TY[3]}`);
    segs.forEach((d, i) => {
      const p = F.path(ln, d, { class: 'link' });
      F.on((T) => F.draw(p, F.p(T, tA + 0.05 + i * 0.12, 0.35, E.io)));
    });
    const dot = el('div', 'w-dot', s5.cam);
    const dIt = item(s5, dot, TX[0], 452, { t0: t.each - 0.45, in: 'pop', float: 0, focusable: false, lift: false });
    dIt.zi = 2800;
    const dp = path([
      [t.each - 0.4, TX[0], 452], [t.each - 0.02, TX[0], TY[0] - 62],
      [t.each + 0.5, TX[0], TY[0] - 62], [t.each + 0.7, TX[0] + 150, TY[0]], [t.one4 - 0.2, TX[1], TY[0]], [t.one4 + 0.02, TX[1], TY[1] - 62],
      [t.one4 + 0.12, TX[1], TY[1] - 62], [t.one4 + 0.24, TX[1] + 150, TY[1]], [t.one5 - 0.05, TX[2], TY[1]], [t.one5 + 0.2, TX[2], TY[2] - 62],
    ]);
    dIt.xf = (T) => dp(T)[0];
    dIt.yf = (T) => dp(T)[1];
    dIt.t1 = t.finds - 0.05; dIt.kout = 'pop';
    const hits = [t.each, t.one4 + 0.02, t.one5 + 0.2];
    s5.on((T) => tiers.forEach((tl, i) => tl.el.classList.toggle('on', i < 3 && T >= hits[i] - 0.02 && (i === 2 || T < hits[i] + 0.55))));
    badge(s5, false, TX[0] + 185, TY[0] - 40, t.each + 0.15);
    badge(s5, false, TX[1] + 185, TY[1] - 40, t.one4 + 0.12);
    badge(s5, true, TX[2] + 185, TY[2] - 40, t.finds - 0.05);
    sfx(t.each - 0.02, 'm:normal-pop-2', -18);
    s5.on((T) => { const o = 1 - 0.6 * clamp((T - t.finds - 0.1) / 0.4); tiers[3].el.style.opacity = (Math.min(+tiers[3].el.style.opacity || 1, o)).toFixed(3); more.el.style.opacity = (Math.min(+more.el.style.opacity || 1, o)).toFixed(3); });
    // the information found (specimen data: Ofcom's drama range, 020 7946 0xxx, is set aside for fiction)
    const res = el('div', 'w-res lift', s5.cam, `<div class="rh"><img src="img/people/${pk}.jpg"><div><b>${pn}</b><small>${I.check}Found on tier 3</small></div></div>
      <p class="r1"><i>${I.mail}</i>sarah.whitfield@halvorn.io</p><p class="r2"><i>${I.phone}</i>+44 20 7946 0958</p>`);
    const rIt = item(s5, res, 1440, 330, { t0: t.info2 - 0.15, in: 'swing', float: 0.3, sfx: 'm:premium-pop-2', gain: -14 });
    rIt.zi = 2400;
    reveal(res.querySelector('.r1'), t.info2 + 0.05, { step: 0.04 }); reveal(res.querySelector('.r2'), t.info2 + 0.2, { step: 0.04 });
    const rl = F.svg(s5.cam, 1920, 1080, 'link-ink'); rl.style.left = '0'; rl.style.top = '0'; rl.style.zIndex = '950';
    const rp = F.path(rl, `M ${TX[2] + 150} ${TY[2] - 20} C 1280 700, 1400 620, 1420 ${330 + 128}`, { class: 'link' });
    F.on((T) => F.draw(rp, F.p(T, t.info2 - 0.1, 0.35, E.io)));
    s5.camTo(t.searches - 0.3, 960, 540, 1, 1.2).camTo(t.really - 0.15, 960, 540, 0.98, 0.9);
  }

  /* ========== the junction out: the next clip's first frame snaps from a print to full screen in 0.3 s, on a whoosh ========== */
  {
    const ep = el('div', 'end-print', F.over, `<img src="img/cutback-1-first.png">`);
    sfx(G1 - 0.06, 'm:cinematic-fast-normal-whoosh', -15, { align: 'peak', key: true });
    F.MB.push((T) => { const v = T > G0 && T < G1 ? Math.sin(((T - G0) / (G1 - G0)) * Math.PI) * 16 : 0; return [v, v * 0.5]; });
    F.on((T) => {
      if (T < G0) { ep.style.display = 'none'; return; }
      ep.style.display = 'block';
      const g = E.io5(clamp((T - G0) / (G1 - G0)));
      const sc = lerp(0.46, 1, g);
      ep.style.transform = `scale(${sc.toFixed(4)})`;
      ep.style.opacity = clamp((T - G0) / 0.08).toFixed(3);
      const b = (1 - g) * 26;
      ep.style.boxShadow = g >= 1 ? 'none' : `0 0 0 ${b.toFixed(1)}px #fff, 0 40px 90px -30px rgba(28,26,46,${(0.5 * (1 - g)).toFixed(2)})`;
      ep.style.filter = g < 1 ? `blur(${((1 - g) * 3).toFixed(1)}px)` : '';
    });
  }

  /* ---------- round 10 (waterfall-v1-media, the version without 3D): stock shots in the Fr1 frame (waterfall-media/PLAN.md),
     on their words (framed.js). #2 the waterfall, on « what a waterfall enricher is » right after the intro's « Waterfall
     Enrichers » (the agenda's first item lands under it, « how it works » after it); #1 on « you are not getting the email. »
     (then the film's own No email / No phone table lands « …the phone number »). No GIF in part 1: none of the plan's fits. ---------- */
  {
    const at = (q, n = 1, after = 0) => F.at(q, n, after);
    let a = at('what') - 0.05, b = at('how', 1, a) - 0.15;
    F.framed({ t0: a, t1: b, shots: [{ name: 'waterfall', n: 120, t0: a, t1: b, start: 1.0 }] });
    a = t.you3; b = at('you', 1, t.email) - 0.05;
    F.framed({ t0: a, t1: b, shots: [{ name: 'no-data-frustrated', n: 105, t0: a, t1: b, start: 0.8 }] });
  }

  B.dust();
};
