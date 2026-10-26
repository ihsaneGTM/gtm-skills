/* A white page of a short (/video-long-to-shorts), drawn by the long video's engine (« Document »): THE content to write at the
   end. Its words: « There is the people who are in charge, who can directly buy your solution, buy your product, and then there is people who can influence the decision. For example, if »
   Lay it in the central column x 360-1560, y 0-1080 (what lands on the vertical sheet); the sheet and its
   paper are the short's. Blocks and their use: voiceover-video/references/example-story-part1.js and part2.js. */
window.SLUG = 'deciders';
window.STORY = () => {
  'use strict';
  const { el, item, sfx, clamp, lerp, E } = F;
  const A = (q, n = 1, after = 0) => F.at(q, n, after);   // the start of the n-th word q (the WHOLE word), after `after`
  const Z = (q, n = 1, after = 0) => F.end(q, n, after);  // the end of that word
  const { I, ic } = B;
  // which part this is, and the real frames it joins (prep.mjs): in = the previous filmed clip's last frame, out = the
  // next clip's first frame (null: the last part, which ends on the end card). The AI voice mode (no facecam): in and out
  // are null, and `next` says another part follows (the film ends 0.3 s after its last word, no end card)
  const PART = window.PART || { n: 1, total: 1, in: 'img/intro-last.png', out: null };
  F.DUR = +(F.VO_END + (PART.out || PART.next ? 0.3 : 2.5)).toFixed(3);

  /* ---------- the look of the format's cards (one type family, soft shadows, small palette) ---------- */
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
  // an editorial label: words rising out of their masks, an optional marker on its <u> (o.markAt: on its spoken word,
  // e.g. t.right0 for « the right person »; by default once the words are up), an optional slim bar under it
  const ed = (s, html, x, y, t0, o = {}) => {
    const e = el('div', 'w-ed ' + (o.cls || ''), s.cam, html);
    const it = item(s, e, x, y, { t0, in: 'none', float: 0, focusable: false, lift: false, t1: o.t1 ?? 1e9, out: 'fade', r: o.r || 0 });
    it.zi = 2600;
    const d = reveal(e, t0, o);
    const u = e.querySelector('u');
    const mk = o.markAt ?? (t0 + d - 0.15);
    if (u) marker(u, mk, 0.42);
    if (o.bar) { const b = el('i', 'bar', e); F.on((T) => b.style.setProperty('--b', F.p(T, t0 + 0.1, 0.45, E.io).toFixed(3))); }
    sfx(t0 + 0.02, 'k:click', -17);
    if (u) sfx(mk + 0.03, 'p:mixkit-paper-quick-movement-2380', -20);
    return it;
  };
  // a label of the engine (pop), its words then rising
  const callout = (s, html, x, y, o) => { const it = F.callout(s, html, x, y, o); reveal(it.el, it.t0 + 0.06, { step: 0.045, dur: 0.42 }); return it; };

  /* ---------- the fictional people (photos made with Nano Banana 2) and their fictional companies ---------- */
  // the video's fictional companies: a name that sounds real and a small geometric logo on a 24 grid (never « Acme »)
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
  // the video's fictional people: [key (img/people/<key>.jpg), name, company of MARK]; never a real person
  const PEOPLE = [['sarah', 'Sarah Whitfield', 'Halvorn'], ['tom', 'Tom Becker', 'Cobaltine']];
  const SH_W = 1120, SH_H = (n) => 72 + 56 + n * 58 + 60;
  const COL = { email: [580, 870], phone: [870, 1120] };
  const sheet = (s, n = 8) => {
    const e = el('div', 'wsheet lift', s.cam);
    e.innerHTML = `<div class="ws-bar"><i>${I.users}</i>leads.csv<span>100 rows</span></div>
      <div class="ws-row ws-head"><div class="ws-n">#</div><div>Name</div><div>Company</div><div class="hE">Email</div><div class="hP">Phone</div></div>
      ${PEOPLE.slice(0, n).map(([k, n, c], i) => `<div class="ws-row"><div class="ws-n">${i + 1}</div><div><img class="av" src="img/people/${k}.jpg">${n}</div><div>${mark(c, 24)}${c}</div><div class="ws-e cE">—</div><div class="ws-e cP">—</div></div>`).join('')}
      <div class="ws-foot">+ ${100 - n} more people</div>`;
    const ink = svgIn(e, SH_W, SH_H(n), 'ws-ink');
    return { e, ink, rows: [...e.querySelectorAll('.ws-row:not(.ws-head)')], hE: e.querySelector('.hE'), hP: e.querySelector('.hP'), cE: [...e.querySelectorAll('.cE')], cP: [...e.querySelectorAll('.cP')] };
  };
  // a real page: its homepage at the FULL viewport (1440×900 at ×2: img/pages/<key>-vp.jpg, capture.mjs) in a browser
  // frame with the site's name (round 11: « show the whole viewport height », never a thin top band). VP: key → domain.
  // A page not in VP is a plain crop (img/pages/<key>.jpg, W × H given).
  const VP = { apollo: 'apollo.io' };
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

  /* ---------- more of the format's cards: charts, records, the calling tool, the end card ---------- */
  const css2 = document.createElement('style');
  css2.textContent = `
  .mono{font:500 17px/1 ui-monospace,Menlo,monospace!important;letter-spacing:.02em;color:#8B8996}
  .lg{left:0;top:0;width:330px;height:118px;border-radius:26px;background:#fff;display:grid;place-items:center}
  .lg img{position:static;max-width:250px;max-height:52px;display:block}
  .lg.ghost{background:rgba(255,255,255,.45)!important;box-shadow:none!important;outline:3px dashed #CFCDD9;outline-offset:-3px}
  .lg.ghost img{opacity:0}
  .ag{left:0;top:0;width:150px;height:150px;border-radius:26px;background:#fff;display:grid;place-items:center;color:var(--ink)}
  .ag svg{position:static;width:58px;height:58px}
  .crm{left:0;top:0;width:1060px;border-radius:20px;background:#fff;overflow:hidden;font:500 24px/1 var(--text);color:var(--ink)}
  .crm *{position:relative}
  .crm .cb{display:flex;align-items:center;gap:14px;height:68px;padding:0 24px;border-bottom:2px solid #EEEDF2;font:700 26px/1 var(--title)}
  .crm .cb i{display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:var(--ink);color:#fff;font-size:22px}
  .crm .cb i svg{position:static}
  .crm .cb span{margin-left:auto;font:600 20px/1 var(--text);color:var(--ink2)}
  .crm .cr{display:grid;grid-template-columns:330px 260px 230px 1fr;align-items:center;height:62px;padding:0 24px;border-bottom:1.5px solid #F0EEF6}
  .crm .cr div{display:flex;align-items:center;gap:12px;white-space:nowrap}
  .crm .cr img{width:38px;height:38px;border-radius:50%;object-fit:cover}
  .crm .st{padding:7px 12px;border-radius:999px;background:#F1F0F5;font:600 18px/1 var(--text);color:var(--ink2)}
  .chart{left:0;top:0;width:1560px;height:860px;border-radius:30px;background:#fff}
  .chart *{position:absolute}
  .chart .tabs{left:56px;top:46px;display:flex;gap:8px;padding:6px;border-radius:16px;background:#F1F0F5}
  .chart .tabs b{position:relative;padding:12px 22px;border-radius:12px;font:700 24px/1 var(--title);letter-spacing:-.02em;color:var(--ink2)}
  .chart .tabs b.on{background:#fff;color:var(--ink);box-shadow:0 4px 10px -4px rgba(28,26,46,.3)}
  .chart .ttl{left:380px;top:58px;font:700 34px/1 var(--title);letter-spacing:-.03em;color:var(--ink)}
  .chart .ihd{left:56px;top:38px;display:flex;align-items:center;gap:26px}
  .chart .ihd *{position:relative}
  .chart .app{display:grid;place-items:center;width:104px;height:104px;border-radius:24px;box-shadow:0 2px 4px rgba(28,26,46,.10),0 16px 28px -12px rgba(28,26,46,.38)}
  .chart .app.gm{background:#fff;box-shadow:0 0 0 1.5px #ECEBF0,0 2px 4px rgba(28,26,46,.10),0 16px 28px -12px rgba(28,26,46,.38)}
  .chart .app.gm svg{width:68px;height:51px}
  .chart .app.ph{background:linear-gradient(180deg,#62F57E 0%,#2CD24A 55%,#0DBA2C 100%)}
  .chart .app.ph svg{width:62px;height:62px;transform:translate(2px,1px)}
  .chart .ihx b{display:block;font:800 52px/1 var(--title);letter-spacing:-.035em;color:var(--ink)}
  .chart .ihx span{display:block;margin-top:10px;font:600 24px/1 var(--text);color:var(--ink2)}
  .chart .grp{left:56px;font:700 18px/1 var(--text);letter-spacing:.16em;text-transform:uppercase;color:var(--ink2)}
  .chart .row{left:56px;width:1448px;height:84px}
  .chart .row .lgo{left:0;top:10px;width:250px;height:64px;border-radius:16px;background:#F6F6F8;display:grid;place-items:center}
  .chart .row .lgo img{position:static;max-width:200px;max-height:40px}
  .chart .row .trk{left:290px;top:22px;width:940px;height:40px;border-radius:12px;background:#F1F0F5;overflow:hidden}
  .chart .row .bar{left:0;top:0;height:40px;border-radius:12px;background:var(--ink);transform-origin:0 50%}
  .chart .row.wf .bar{background:var(--ink)}
  .chart .row.pc .bar{background:var(--v)}
  .chart .row.sp .bar{background:#B9B7C4}
  .chart .row .val{top:20px;font:700 40px/1 var(--title);letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
  .chart .note{right:44px;bottom:30px}
  .chart .src{left:56px;bottom:30px}
  .eq{left:0;top:0;width:92px;height:92px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 54px/1 var(--title)}
  .eq.red{background:var(--red)}
  .wfc{left:0;top:0;width:420px;border-radius:28px;background:#fff;padding:24px}
  .wfc *{position:relative}
  .wfc .hd{display:flex;align-items:center;justify-content:center;height:70px;border-bottom:2px solid #F0EEF6;margin-bottom:14px}
  .wfc .hd img{max-width:230px;max-height:46px;display:block}
  .wfc .hd b{font:700 34px/1 var(--title);letter-spacing:-.03em;color:var(--ink)}
  .wfc .sl{display:flex;align-items:center;justify-content:center;height:70px;margin-top:12px;border-radius:18px;background:#F6F6F8;font:700 28px/1 var(--title);color:var(--ink2)}
  .wfc .sl img{max-width:150px;max-height:36px;display:block}
  .wfc.xl{width:520px}
  .wfc.xl .sl{height:84px}
  .wfc .sl.q{background:#fff;outline:3px dashed #CFCDD9;outline-offset:-3px;color:#B9B7C4}
  .wfc .cover{position:absolute!important;left:0;top:0;width:100%;height:100%;border-radius:28px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;transform-origin:50% 0}
  .wfc .cover b{font:700 40px/1 var(--title);letter-spacing:-.03em;color:var(--ink)}
  .wfc .cover small{font:600 22px/1 var(--text);color:var(--ink2)}
  .pv{left:0;top:0;width:300px;height:72px;white-space:nowrap;border-radius:20px;background:#fff;display:flex;align-items:center;justify-content:center;gap:12px;font:700 28px/1 var(--title);letter-spacing:-.02em;color:var(--ink)}
  .pv *{position:relative}
  .pv i{width:22px;height:22px;border-radius:7px;display:block}
  .pv .ptag{position:absolute!important;right:-14px;top:-18px;padding:7px 11px;border-radius:10px;background:var(--ink);color:#fff;font:700 22px/1 var(--text);transform-origin:50% 50%}
  .pv .tag{position:absolute!important;right:-14px;top:-16px;padding:6px 10px;border-radius:10px;background:var(--ink);color:#fff;font:700 20px/1 var(--text)}
  .chipx{left:0;top:0;display:flex;align-items:center;gap:12px;padding:14px 22px;border-radius:16px;background:#fff;font:700 30px/1 var(--title);letter-spacing:-.02em;color:var(--ink);white-space:nowrap}
  .chipx *{position:relative}
  .chipx svg{position:static}
  .chipx.ok{color:var(--okd)}.chipx.red{color:var(--red)}
  .row1{left:0;top:0;display:flex;align-items:center;gap:18px;padding:22px 30px;border-radius:24px;background:#fff;font:600 38px/1 var(--title);letter-spacing:-.02em;color:var(--ink);white-space:nowrap}
  .row1 *{position:relative}
  .row1 i{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;background:#F1F0F5;color:var(--ink);font-style:normal;font-size:30px}
  .row1 i svg{position:static}
  .row1 img{width:58px;height:58px;border-radius:50%;object-fit:cover}
  .row1 em{font-style:normal;margin-left:10px;padding:10px 16px;border-radius:999px;background:#DCFCE7;color:var(--okd);font:700 24px/1 var(--text);display:flex;align-items:center;gap:8px}
  .row1 em svg{position:static}
  .tier{left:0;top:0;width:300px;height:96px;border-radius:24px;background:#fff;display:flex;align-items:center;justify-content:center;gap:12px;font:700 30px/1 var(--title);color:var(--ink)}
  .tier *{position:relative}
  .tier i{width:24px;height:24px;border-radius:8px;display:block}
  .tier.bad{box-shadow:0 0 0 6px var(--red),0 24px 50px -20px rgba(28,26,46,.45)!important}
  .avb{left:0;top:0;width:72px;height:72px;border-radius:50%;border:4px solid #fff;object-fit:cover;box-shadow:0 10px 20px -8px rgba(28,26,46,.45)}
  .wsheet .ws-row.bad>div{background:#FFE9EA}
  .wsheet .ws-row .t1{padding:5px 9px;border-radius:8px;background:var(--ink);color:#fff;font:700 15px/1 var(--text);letter-spacing:.08em}
  .big2{left:0;top:0;font:700 150px/1 var(--title);letter-spacing:-.055em;color:var(--ink);white-space:nowrap}
  .big2 .cnt{position:relative!important;display:inline-block;text-align:right;font-variant-numeric:tabular-nums}
  .big2 em{position:relative!important;font-style:normal;background:linear-gradient(transparent 54%,var(--v) 54%,var(--v) 90%,transparent 90%);padding:0 .07em}
  .big2 small{position:relative!important;font-size:52px;letter-spacing:-.02em;margin-left:.25em}
  .rec{left:0;top:0;width:640px;border-radius:24px;background:#fff;padding:26px 30px}
  .rec *{position:relative}
  .rec .rh{display:flex;align-items:center;gap:12px;padding-bottom:16px;border-bottom:2px solid #F0EEF6;font:700 20px/1 var(--text);letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
  .rec .rh svg{position:static}
  .rec .rh .rf{margin-left:auto;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#F1F0F5;color:var(--ink)}
  .rec .f{display:flex;align-items:center;height:62px;border-bottom:1.5px solid #F4F3F8;font:600 28px/1 var(--title);color:var(--ink);white-space:nowrap}
  .rec .f span{width:200px;font:600 20px/1 var(--text);letter-spacing:.04em;color:var(--ink2)}
  .rec .f b{font-weight:700}
  .rec .f .ok{margin-left:auto;padding:7px 12px;border-radius:999px;background:#DCFCE7;color:var(--okd);font:700 18px/1 var(--text)}
  .rec .f .no{margin-left:auto;padding:7px 12px;border-radius:999px;background:#FFE4E6;color:var(--red);font:700 18px/1 var(--text)}
  .rec .f .gr{margin-left:auto;padding:7px 12px;border-radius:999px;background:#F1F0F5;color:var(--ink2);font:700 18px/1 var(--text)}
  .cal{left:0;top:0;width:260px;height:260px;border-radius:30px;background:#fff;overflow:hidden;text-align:center}
  .cal *{position:absolute}
  .cal .ct{left:0;top:0;width:100%;height:74px;background:var(--red);color:#fff;font:700 30px/74px var(--title);letter-spacing:.06em;text-transform:uppercase}
  .cal .cm{left:0;top:96px;width:100%;font:700 96px/1 var(--title);letter-spacing:-.04em;color:var(--ink)}
  .cal .cy{left:0;top:204px;width:100%;font:600 24px/1 var(--text);color:var(--ink2)}
  .callbar{left:0;top:0;display:flex;align-items:center;gap:16px;padding:18px 26px;border-radius:999px;background:var(--ink);color:#fff;font:700 30px/1 var(--title);white-space:nowrap}
  .callbar *{position:relative}
  .callbar i{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:var(--ok);font-style:normal}
  .callbar i svg{position:static}
  .callbar.red i{background:var(--red)}
  .dial{left:0;top:0;width:760px;height:700px;border-radius:30px;background:#fff;overflow:hidden}
  .dial *{position:absolute}
  .dial .top{left:0;top:0;width:100%;height:84px;border-bottom:2px solid #F0EEF6}
  .dial .top img{left:28px;top:24px;height:36px}
  .dial .top .tb{top:22px;padding:12px 18px;border-radius:12px;font:700 20px/1 var(--text);color:var(--ink2)}
  .dial .top .tb.on{background:var(--v);color:var(--ink)}
  .dial .who{left:0;top:120px;width:100%;text-align:center}
  .dial .who img{position:relative;width:128px;height:128px;border-radius:50%;object-fit:cover;display:block;margin:0 auto}
  .dial .who b{position:relative;display:block;margin-top:18px;font:700 40px/1 var(--title);letter-spacing:-.03em;color:var(--ink)}
  .dial .who p{position:relative;display:block;margin-top:12px;font:600 34px/1 var(--title);letter-spacing:.01em;color:var(--ink);font-variant-numeric:tabular-nums}
  .dial .who .stt{position:relative;display:inline-block;margin-top:16px;padding:9px 16px;border-radius:999px;background:#F1F0F5;font:700 20px/1 var(--text);color:var(--ink2)}
  .dial .who .stt.go{background:#DCFCE7;color:var(--okd)}
  .dial .who .stt.red{background:#FFE4E6;color:var(--red)}
  .dial .bt{top:500px;width:96px;height:96px;border-radius:50%;background:#F1F0F5;display:grid;place-items:center;color:var(--ink)}
  .dial .bt svg{position:static;width:40px;height:40px}
  .dial .bt.hang{background:var(--red);color:#fff}
  .dial .wn{left:410px;top:508px;height:80px;padding:0 26px;border-radius:20px;border:3px solid var(--ink);display:flex;align-items:center;gap:10px;font:700 28px/1 var(--title);color:var(--ink);background:#fff;white-space:nowrap}
  .dial .wn svg{position:static}
  .dial .wn.on{background:var(--ink);color:#fff}
  .dial .ill{left:28px;bottom:22px}
  .cur{left:0;top:0;width:64px;height:84px;filter:drop-shadow(0 10px 10px rgba(20,18,31,.3))}
  .cur svg{position:static;display:block}
  .toast{left:0;top:0;display:flex;align-items:center;gap:14px;padding:18px 26px;border-radius:18px;background:var(--ok);color:#fff;font:700 30px/1 var(--title);white-space:nowrap}
  .toast *{position:relative}
  .toast svg{position:static}
  .ext{left:0;top:0;width:380px;border-radius:20px;background:#fff;padding:20px 22px;font:600 22px/1.2 var(--text);color:var(--ink)}
  .ext *{position:relative}
  .ext .eh{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:2px solid #F0EEF6;font:700 22px/1 var(--title)}
  .ext .eh img{width:34px;height:34px;border-radius:9px}
  .ext p{margin-top:12px;display:flex;align-items:center;gap:10px}
  .ext p img{width:40px;height:40px;border-radius:50%;object-fit:cover}
  .cc{left:0;top:0;width:250px;height:96px;border-radius:20px;background:#fff;display:flex;align-items:center;gap:14px;padding:0 16px}
  .cc *{position:relative}
  .cc img{width:58px;height:58px;border-radius:50%;object-fit:cover;flex:none}
  .cc .ph{width:40px;height:40px;border-radius:50%;background:#F1F0F5;display:grid;place-items:center;color:var(--ink)}
  .cc .ph svg{position:static}
  .cc .fl{margin-left:auto;padding:7px 10px;border-radius:999px;font:700 16px/1 var(--text);opacity:var(--f,0)}
  .cc .fl.red{background:#FFE4E6;color:var(--red)}.cc .fl.ok{background:#DCFCE7;color:var(--okd)}
  .btnbig{left:0;top:0;display:flex;align-items:center;gap:18px;padding:30px 46px;border-radius:30px;border:5px solid var(--ink);background:#fff;font:700 64px/1 var(--title);letter-spacing:-.03em;color:var(--ink);white-space:nowrap}
  .btnbig svg{position:static}
  .yt{left:0;top:0;display:flex;align-items:center;gap:14px;padding:22px 34px;border-radius:999px;background:#fff;font:700 40px/1 var(--title);color:var(--ink);white-space:nowrap}
  .yt *{position:relative}
  .yt svg{position:static;width:40px;height:40px}
  .yt.on{background:var(--ink);color:#fff}
  .desc{left:0;top:0;width:1000px;border-radius:24px;background:#fff;padding:32px 40px;font:500 34px/1.5 var(--text);color:var(--ink)}
  .desc *{position:relative}
  .desc small{display:block;font:700 18px/1 var(--text);letter-spacing:.16em;text-transform:uppercase;color:var(--ink2);margin-bottom:16px}
  .desc .l1{display:block;font-weight:700}
  .desc .l1 u{text-decoration:none;padding:0 .06em;background:linear-gradient(transparent 58%,var(--v) 58%,var(--v) 94%,transparent 94%) no-repeat 0 0/var(--m,0%) 100%}
  .desc .lo{display:block;color:#B9B7C4}
  .endc{left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:30px;text-align:center}
  .endc *{position:relative}
  .endc .lgw{display:grid;place-items:center;width:230px;height:230px;border-radius:54px;background:#fff;box-shadow:0 30px 60px -24px rgba(28,26,46,.45);font-style:normal}
  .endc img{width:170px;height:170px;border-radius:40px}
  .endc b{font:700 92px/1 var(--title);letter-spacing:-.05em;color:var(--ink);white-space:nowrap}
  .endc p{font:600 38px/1 var(--title);letter-spacing:-.02em;color:var(--ink);white-space:nowrap;padding:14px 26px;border-radius:999px;background:#fff}
  `;
  document.head.appendChild(css2);

  // the real logos: img/logos/<key>.png (cut from the captures, the white made transparent)
  const LOGO = {};
  const logoSrc = (k) => LOGO[k] || `img/logos/${k}.png`;
  const BLD = B.SVG('<path d="M4 21V6l8-3 8 3v15M9 21v-4h6v4M8 9h2M14 9h2M8 13h2M14 13h2"/>');
  const DOLLAR = B.SVG('<path d="M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.4c0 4.6 9 2.6 9 7.2 0 2.2-2 3.4-4.5 3.4s-4.5-1.1-4.5-3"/>');
  const REFRESH = B.SVG('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>');
  const MIC = B.SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>');
  const NOTE = B.SVG('<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>');
  const HANG = B.SVG('<path d="M3 15c5-4 13-4 18 0l-2 3-4-1v-3c-2-.6-4-.6-6 0v3l-4 1z"/>');
  const FLAG = B.SVG('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>');
  const THUMB = B.SVG('<path d="M7 10v11H3V10zM7 10l4-7c1.5 0 2.5 1 2.5 2.5V9h5.5a2 2 0 0 1 2 2.3l-1.2 7.5a2 2 0 0 1-2 1.7H7"/>');
  const BELL = B.SVG('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>');
  const BUBBLE = B.SVG('<path d="M4 5h16v11H9l-5 4z"/>');
  const UP = B.SVG('<path d="M4 17l6-6 4 4 6-7M20 8v5M20 8h-5"/>');
  const CURSOR = `<svg viewBox="0 0 48 64" width="64" height="84"><path d="M6 4 L6 52 L18 41 L27 60 L35 56 L26 37 L42 37 Z" fill="#fff" stroke="#14121F" stroke-width="3.4" stroke-linejoin="round"/></svg>`;
  // generic providers (never a real brand inside a competitor's waterfall: what each tool really uses is not known here)
  const PROV = [['A', '#2F6FED'], ['B', '#16A34A'], ['C', '#F59E0B'], ['D', '#7C3AED'], ['E', '#DC2626'], ['F', '#0EA5E9']];
  const pv = (s, k, x, y, o = {}) => {
    const [n, c] = PROV[k];
    const e = el('div', 'pv lift', s.cam, `<i style="background:${c}"></i>Provider ${n}`);
    return item(s, e, x, y, { in: 'pop', float: 0, focusable: false, sfx: 'm:normal-pop-' + (1 + (k % 4)), gain: -18, ...o });
  };
  const chipx = (s, html, x, y, t0, o = {}) => {
    const e = el('div', 'chipx lift ' + (o.cls || ''), s.cam, html);
    const it = item(s, e, x, y, { t0, in: 'pop', float: 0.3, focusable: false, sfx: 'm:premium-pop-1', gain: -16, ...o });
    reveal(e, t0 + 0.06, { step: 0.045, dur: 0.42 });
    return it;
  };
  const logoCard = (s, key, x, y, t0, o = {}) => {
    const e = el('div', 'lg lift', s.cam, `<img src="${logoSrc(key)}">`);
    return item(s, e, x, y, { t0, in: 'pop', float: 0.3, focusable: false, sfx: 'm:premium-pop-1', gain: -15, ...o });
  };
  // a number that counts in an element's text
  const counter = (elx, t0, t1, v0, v1, fmt = (v) => String(v)) => F.on((T) => { const u = E.out(clamp((T - t0) / (t1 - t0))); elx.textContent = fmt(Math.round(lerp(v0, v1, u))); });

  /* ---------- the format's blocks, generalised from the reference (example-story-part1.js, part2.js) ---------- */
  // leaving for good: off the right (dir 1) or the left (-1) edge from `t`, with the engine's motion blur; the exit is
  // computed from where the element stands, so it really leaves the screen (a 1200 px slide from the centre left cards
  // half on screen, round 12)
  const offAt = (it, x, t, dir = 1, d = 0.5) => { it.xf = (T) => x + dir * E.in(clamp((T - t) / d)) * 1700; return it; };
  // a card whose text is still to come, scrambled into pixels (a teased tool, never named before the voice names it)
  const lockCard = (s, x, y, t0, o = {}) => {
    const e = el('div', 'w-ag lift lock', s.cam, `<b>${I.lock}</b><canvas class="px" width="56" height="8"></canvas><i class="sh"></i><em class="tg">${o.tag || 'Special tool'}</em>`);
    const it = item(s, e, x, y, { t0, in: 'swing', r: o.r ?? -1.5, float: 0.3, sfx: 'p:mixkit-paper-slide-1530', gain: -15 });
    const cv = e.querySelector('canvas'), g = cv.getContext('2d');
    const drawPx = (seed, sharp) => {
      g.fillStyle = '#26262B'; g.fillRect(0, 0, 56, 8);
      const R = (i) => F.rand(seed * 7.1 + i * 3.3);
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const v = R(xx + yy * 8); g.fillStyle = v > 0.35 ? `rgba(255,217,13,${(0.45 + 0.5 * v).toFixed(2)})` : `rgba(255,255,255,${(0.08 + 0.2 * v).toFixed(2)})`; g.fillRect(xx, yy, 1, 1); }
      for (let yy = 1; yy < 7; yy++) for (let xx = 11; xx < 56; xx++) {
        const word = yy < 4 ? xx < 11 + 26 + Math.floor(R(900) * 10) : xx < 11 + 38;
        const v = R(xx * 13 + yy * 101 + 7);
        const on = word && (yy === 1 || yy === 2 || (yy >= 4 && yy <= 5)) && v > 0.18 - sharp * 0.1;
        g.fillStyle = on ? `rgba(255,255,255,${(0.35 + 0.55 * v).toFixed(2)})` : `rgba(255,255,255,${(0.03 + 0.05 * v).toFixed(2)})`;
        g.fillRect(xx, yy, 1, 1);
      }
    };
    let last = -1;
    s.on((T) => {
      const sharp = o.tSharp ? F.p(T, o.tSharp, 0.6, E.io) * (1 - F.p(T, (o.tUnsharp ?? o.tSharp + 1.2), 0.5)) : 0;
      const seed = Math.floor(T / 0.12);
      if (seed !== last) { last = seed; drawPx(seed, sharp); }
      e.style.setProperty('--bl', (1.6 - 0.9 * sharp).toFixed(2) + 'px');
      if (o.tSharp) e.style.setProperty('--g', lerp(110, -10, F.p(T, o.tSharp, 0.7, E.io)).toFixed(1) + '%');
    });
    if (o.tSharp) sfx(o.tSharp, 'k:glitch', -22);
    return it;
  };
  // the top of a LinkedIn-like profile: a FICTIONAL person (img/people/<key>.jpg, Nano Banana 2) at a fictional company;
  // `need`: chips that pop on their words, e.g. [[I.mail, 'Email?', t.email], [I.phone, 'Phone?', t.phone]]
  const profileCard = (s, [key, name, co, role = 'Head of Growth', place = 'London, United Kingdom · 500+ connections'], x, y, o = {}) => {
    const e = el('div', 'li lift', s.cam, `<div class="li-ban"></div><img class="li-ph" src="img/people/${key}.jpg"><div class="li-co">${mark(co, 28)}${co}</div>
      <h4>${name}</h4><p>${role} at ${co}</p><small>${place}</small><div class="li-need">${(o.need || []).map(([ico, lb]) => `<span>${ico}${lb}</span>`).join('')}</div>`);
    const it = item(s, e, x, y, { in: 'drop', float: 0, r: -1, sfx: 'm:premium-pop-1', gain: -15, ...o });
    reveal(e.querySelector('h4'), it.t0 + 0.25); reveal(e.querySelector('p'), it.t0 + 0.4, { step: 0.04 });
    [...e.querySelectorAll('.li-need span')].forEach((c, i) => {
      const tw = o.need[i][2];
      s.on((T) => { const a = E.back(clamp((T - tw + 0.08) / 0.35)); c.style.transform = `scale(${a.toFixed(3)})`; c.style.opacity = clamp(a * 3).toFixed(2); });
      sfx(tw - 0.05, 'm:normal-pop-' + (1 + (i % 4)), -17);
    });
    return it;
  };
  // ONE bar chart per metric, under its crafted app-icon tile (APP.gmail for emails, APP.phone for phones, or an <img>);
  // the bars grow from zero on their words; never the same bars animated to a lower metric (round 12: it reads as the
  // stats dropping). A sourced chart says its source: o.note = 'Source: <study>, <year> · <url>' (mono, discreet, bottom
  // right; round 13), o.src for a second source of some rows (bottom left); « Illustrative figures » only when the user
  // marked the numbers so. A group whose numbers have no source is left out (no invented values). groups: [['Waterfalls',
  // [[key, value, 'wf pc'|'wf'|'sp'], …]], ['Single providers', […]]] (one group: its label may be ''); the card is as
  // tall as its rows. grow(i): when row i grows. Returns { el, it, rows }.
  const APP = {
    gmail: ['gm', '<svg viewBox="52 42 88 66"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>'],
    phone: ['ph', '<svg viewBox="0 0 24 24"><path fill="#fff" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>'],
  };
  const chart = (s, o) => {
    const [cls, svg] = APP[o.icon] || ['', o.icon];
    let y = 174, rows = '', all = [];
    for (const [label, list] of o.groups) {
      if (label) rows += `<div class="grp" style="top:${y}px">${label}</div>`;
      list.forEach(([key, v, rc], k) => { all.push([key, v]); rows += `<div class="row ${rc}" style="top:${y + 28 + 92 * k}px"><div class="lgo"><img src="${logoSrc(key)}"></div><div class="trk"><div class="bar"></div></div><div class="val">0%</div></div>`; });
      y += 28 + 92 * (list.length - 1) + 114;
    }
    const ch = el('div', 'chart lift', s.cam, `<div class="ihd"><i class="app ${cls}">${svg}</i><div class="ihx"><b>${o.title}</b><span>${o.sub || ''}</span></div></div>${rows}
      ${o.src ? `<div class="mono src">${o.src}</div>` : ''}${o.note ? `<div class="mono note">${o.note}</div>` : ''}`);
    ch.style.height = Math.min(860, y + 34 + (o.note || o.src ? 40 : 0)) + 'px';
    const it = item(s, ch, o.x ?? 960, o.y ?? 540, { t0: o.t0 ?? s.t0, in: o.in || 'none', float: 0, ...(o.item || {}) });
    const els = [...ch.querySelectorAll('.row')];
    s.on((T) => els.forEach((r, i) => {
      const v = all[i][1] * E.out5(clamp((T - o.grow(i)) / 0.8)), g = clamp((T - o.grow(i)) / 0.05);
      r.querySelector('.bar').style.width = (9.4 * v).toFixed(1) + 'px';
      const val = r.querySelector('.val');
      val.textContent = Math.round(v) + '%';
      val.style.left = (290 + 9.4 * v + 18).toFixed(1) + 'px';
      val.style.opacity = g > 0.02 ? '1' : '0';
      if (o.dim) r.style.opacity = (1 - 0.7 * (o.dim.rows.includes(i) ? F.p(T, o.dim.t, 0.4) : 0)).toFixed(3);
    }));
    all.forEach((_, i) => sfx(o.grow(i), 'k:click', -23));
    return { el: ch, it, rows: els };
  };
  // the end card on the brand's colour (the last part): the logo pops, its line and the call rise; held 2.5 s (F.DUR)
  const endCard = (s, o) => {
    const e = el('div', 'endc', s.cam, `<i class="lgw"><img src="img/logo.png"></i><b>${o.title}</b><p>${o.sub}</p>`);
    item(s, e, 960, 540, { t0: s.t0 + 0.25, in: 'none', float: 0.2, focusable: false, lift: false });
    reveal(e.querySelector('b'), s.t0 + 0.4); reveal(e.querySelector('p'), s.t0 + 0.7, { step: 0.05 });
    const lg = e.querySelector('.lgw');
    s.on((T) => { const k2 = E.back(clamp((T - s.t0 - 0.2) / 0.5)); lg.style.transform = `scale(${k2.toFixed(3)})`; lg.style.opacity = clamp(k2 * 3).toFixed(2); });
    sfx(s.t0 + 0.25, 'm:premium-pop-2', -14);
  };
  // stock shots in the frame on the paper (framed.js): one, or a group of consecutive shots on their words (the frame is
  // drawn ~0.4 s before the first word and kept between them; closed right after the sentence). name/n: media.mjs prints
  // them; start: the second of the clip the shot starts at
  const shot = (name, n, t0, t1, start = 1.0) => F.framed({ t0, t1, shots: [{ name, n, t0, t1, start }] });
  const shots = (list, t0, t1) => F.framed({ t0, t1, shots: list.map(([name, n, a, b, start = 1.0]) => ({ name, n, t0: a, t1: b, start })) });
  // a GIF as a pinned print on the right, its short caption under it, the scene behind stepping back and blurring;
  // never full screen; organic use only (GIPHY grants no commercial licence)
  const gif = (s, name, n, t0, t1, o = {}) => F.gifPrint(s, name, n, 1390, 560, 660, 420, { t0, t1, fps: 15, cls: 'v', r: -3, ...o });

  /* ---------- the junctions with the filmed clips ---------- */
  // IN: the previous clip's last frame, full screen at 0, snaps into a pinned print in 0.42 s (whoosh, blur); it LEAVES at
  // o.leave (1 to 2 s at most: the moment a stock shot covers the screen is the best) and never comes back
  const junctionIn = (s, o = {}) => {
    if (!PART.in) return null;              // no filmed clip before this part (the AI voice mode): it opens on its first idea
    const ph = el('div', 'ihs lift', s.cam, `<img src="${PART.in}"><i class="pin"></i>`);
    ph.querySelector('.pin').style.cssText = 'left:50%;top:-40px;width:80px;height:80px;margin-left:-40px';
    const K1 = 0.42, PX = o.x ?? 520, PY = o.y ?? 520, PS = 0.4;
    const k = (T) => E.io5(clamp(T / K1));
    const it = item(s, ph, 960, 540, { t0: 0, in: 'none', float: 0, lift: true });
    // the camera's hand-held drift is taken back while the frame is still full screen: frame 0 is the real frame
    it.xf = (T) => { const u = k(T); it.r = lerp(0, -3, u); return lerp(960 - F.noise(T * 0.45, 3) * 3, PX, u); };
    it.yf = (T) => lerp(540 - F.noise(T * 0.4, 9) * 2.4, PY, k(T));
    it.sf = (T) => lerp(1, PS, k(T));
    s.on((T) => {
      const u = k(T);
      ph.style.boxShadow = `0 0 0 ${(34 * u).toFixed(1)}px #fff, 0 ${60 * u}px ${120 * u}px -40px rgba(28,26,46,${(0.55 * u).toFixed(2)})`;
      ph.style.setProperty('--pin', clamp((T - K1 + 0.05) / 0.15).toFixed(2));
    });
    F.MB.push((T) => { const v = T < K1 ? Math.sin((T / K1) * Math.PI) * 14 : 0; return [v, v * 0.5]; });
    sfx(0.16, 'm:cinematic-fast-normal-whoosh', -16, { align: 'peak', key: true });
    sfx(K1, 'p:mixkit-paper-slide-1530', -15);
    it.t1 = o.leave ?? 1.0; it.kout = 'slide-l'; it.dout = 0.45;
    return it;
  };
  // OUT: the next clip's first frame snaps from a print to full screen, ending 0.07 s before the film's end
  const junctionOut = () => {
    if (!PART.out) return;
    const G0 = F.DUR - 0.4, G1 = F.DUR - 0.07;
    const ep = el('div', 'end-print', F.over, `<img src="${PART.out}">`);
    sfx(G1 - 0.06, 'm:cinematic-fast-normal-whoosh', -15, { align: 'peak', key: true });
    F.MB.push((T) => { const v = T > G0 && T < G1 ? Math.sin(((T - G0) / (G1 - G0)) * Math.PI) * 16 : 0; return [v, v * 0.5]; });
    F.on((T) => {
      if (T < G0) { ep.style.display = 'none'; return; }
      ep.style.display = 'block';
      const g = E.io5(clamp((T - G0) / (G1 - G0)));
      ep.style.transform = `scale(${lerp(0.46, 1, g).toFixed(4)})`;
      ep.style.opacity = clamp((T - G0) / 0.08).toFixed(3);
      const b = (1 - g) * 26;
      ep.style.boxShadow = g >= 1 ? 'none' : `0 0 0 ${b.toFixed(1)}px #fff, 0 40px 90px -30px rgba(28,26,46,${(0.5 * (1 - g)).toFixed(2)})`;
      ep.style.filter = g < 1 ? `blur(${((1 - g) * 3).toFixed(1)}px)` : '';
    });
  };
  // the post (grain, vignette, light, dust) is off on the frames that ARE the real ones: the first, and the last 0.4 s
  // before a cut to the next clip
  F.on((T) => {
    let o = clamp(T / 0.3);
    if (PART.out) { const G0 = F.DUR - 0.4, G1 = F.DUR - 0.07; o = Math.min(o, 1 - clamp((T - G0) / (G1 - G0 - 0.05))); }
    F.post.style.opacity = o.toFixed(3);
  });


  F.DUR = 8.45;
  const t = {};
  F.T = t;
  const s = F.screen('page', 0, F.DUR + 1, { push: 0.015, dof: 0.3 });
  // round 9: « a whole list of companies that are actually hiring an SDR, so you know this team is looking for
  // improvements in the sales field »: the list of companies, a radar sweeping it on « hiring », the ones hiring an SDR
  // lighting up with their job post, the others fading; then their sales going up
  t.list = A('list'); t.comp = A('companies'); t.hiring = A('hiring'); t.sdr = A('SDR,'); t.team = A('team'); t.impr = A('improvements'); t.sales = A('sales');
  const css3 = document.createElement('style');
  css3.textContent = `.co{left:0;top:0;width:330px;height:118px;border-radius:22px;background:#fff;display:flex;align-items:center;gap:16px;padding:0 22px;box-shadow:0 16px 36px -16px rgba(28,26,46,.45),0 2px 6px rgba(28,26,46,.12);font:700 30px/1 var(--title);letter-spacing:-.03em;color:var(--ink)}
  .co *{position:relative}.co svg{flex:none}
  .co.on{box-shadow:0 0 0 7px var(--v),0 20px 40px -14px rgba(28,26,46,.5)}
  .co .fl{position:absolute!important;right:-14px;top:-26px;padding:9px 14px;border-radius:12px;background:var(--ink);color:#fff;font:700 22px/1 var(--title);white-space:nowrap;opacity:0}
  .co .fl i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--v);margin-right:8px;font-style:normal;position:relative;top:-1px}
  .rad{left:0;top:0;width:1100px;height:1100px;margin:-550px 0 0 -550px;border-radius:50%;background:conic-gradient(from 0deg,rgba(255,217,13,.0) 0deg,rgba(255,217,13,.0) 300deg,rgba(255,217,13,.38) 358deg,rgba(255,217,13,.0) 360deg);pointer-events:none}
  .ring2{left:0;top:0;border-radius:50%;border:3px solid rgba(255,217,13,.55);pointer-events:none}
  .sal{left:0;top:0;width:560px;height:230px;border-radius:24px;background:#fff;box-shadow:0 18px 40px -16px rgba(28,26,46,.45);padding:24px 30px}
  .sal *{position:relative}.sal .bars{display:flex;align-items:flex-end;gap:22px;height:150px}
  .sal .bars i{display:block;width:62px;border-radius:10px 10px 4px 4px;background:#E4E3EA;transform-origin:50% 100%}
  .sal .bars i.v{background:var(--v)}
  .sal b{position:absolute!important;right:30px;top:26px;font:700 30px/1 var(--title);color:var(--ink)}`;
  document.head.appendChild(css3);
  const CO = ['Halvorn', 'Cobaltine', 'Fernquist', 'Lumavale', 'Quillstone', 'Ardenta', 'Vexley', 'Pellatrix'];
  const HIRING = new Set(['Halvorn', 'Lumavale', 'Vexley']);
  const tiles = CO.map((c, i) => {
    const x = 770 + (i % 2) * 380, y = 200 + Math.floor(i / 2) * 150;
    const e = el('div', 'co', s.cam, `${mark(c, 46)}${c}${HIRING.has(c) ? '<em class="fl"><i></i>Hiring · SDR</em>' : ''}`);
    item(s, e, x, y, { t0: t.list + i * 0.07, in: 'pop', float: 0.12, focusable: false, sfx: i % 3 ? false : 'm:normal-pop-1', gain: -19 });
    return { e, c, x, y };
  });
  // the radar: rings and a beam sweeping the list from its centre on « hiring »
  const rd = el('div', 'rad', s.cam); const rings = [0, 1, 2].map(() => el('div', 'ring2', s.cam));
  const cx = 960, cy = 425;
  s.on((T) => {
    const u = clamp((T - t.hiring + 0.2) / 1.6);
    rd.style.opacity = (T > t.hiring - 0.2 && T < t.hiring + 1.6 ? Math.sin(u * Math.PI) : 0).toFixed(3);
    rd.style.transform = `translate(${cx}px,${cy}px) rotate(${(u * 400).toFixed(1)}deg)`;
    rings.forEach((r, i) => { const v = clamp((T - t.hiring - i * 0.25) / 1.0); const R = 80 + v * 520; r.style.width = r.style.height = (2 * R) + 'px'; r.style.transform = `translate(${cx - R}px,${cy - R}px)`; r.style.opacity = (v > 0 && v < 1 ? (1 - v) : 0).toFixed(3); });
    // the beam reaching each tile: the ones hiring light up with their job post, the others fade
    tiles.forEach((tl) => {
      const ang = (Math.atan2(tl.y - cy, tl.x - cx) * 180 / Math.PI + 360) % 360, hitT = t.hiring - 0.2 + (ang / 400) * 1.6;
      const on = T >= hitT, k = E.back(clamp((T - hitT) / 0.35));
      if (HIRING.has(tl.c)) { tl.e.classList.toggle('on', on); const f = tl.e.querySelector('.fl'); f.style.opacity = clamp(k * 3).toFixed(2); f.style.transform = `scale(${k.toFixed(3)})`; }
      else tl.e.style.opacity = on ? lerp(1, 0.3, clamp((T - hitT) / 0.4)).toFixed(2) : '1';
    });
  });
  tiles.forEach((tl) => { if (HIRING.has(tl.c)) { const ang = (Math.atan2(tl.y - cy, tl.x - cx) * 180 / Math.PI + 360) % 360; sfx(t.hiring - 0.2 + (ang / 400) * 1.6, 'm:ui-select', -17); } });
  sfx(t.hiring - 0.2, 'm:smooth-fast-whoosh', -18, { align: 'peak' });
  // « looking for improvements in the sales field »: their sales, bars rising, the last one yellow
  const sl = el('div', 'sal', s.cam, `<div class="bars">${[0.35, 0.5, 0.62, 0.95].map((h, i) => `<i class="${i === 3 ? 'v' : ''}" style="height:${h * 150}px"></i>`).join('')}</div><b>Sales ↗</b>`);
  item(s, sl, 960, 840, { t0: t.impr - 0.15, in: 'rise', float: 0.1, focusable: false, sfx: 'm:premium-pop-2', gain: -16 });
  const bars = [...sl.querySelectorAll('i')];
  s.on((T) => bars.forEach((b, i) => { b.style.transform = `scaleY(${E.out(clamp((T - t.impr - 0.05 - i * 0.12) / 0.45)).toFixed(3)})`; }));
  s.camTo(0, 960, 330, 1.12, 0.01).camTo(t.list - 0.2, 960, 450, 1.0, 1.0).camTo(t.impr - 0.3, 960, 540, 1.0, 0.8);
};
