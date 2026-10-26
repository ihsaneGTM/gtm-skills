/* THE REFERENCE, motion part 2 (the last) of the voiceover video « Waterfall enrichers » (style « Document »): the version
   Ihsane called « quasiment parfait » on 2026-10-13 (workspace/videos/waterfall-complete-2d.mp4), then round 13 the same day
   (workspace/videos/waterfall-final.mp4): the benchmark's figures SOURCED, its first passage said again by the clone (a
   voice patch) and drawn again (the study's real page, the tester's real logo, the reps on the phone, the rule). After the
   dressed cutback « So now, which waterfall? ». Read it whole before writing a part: the study, the benchmark, the three
   reasons, the method, the brand's tool, the community, the end.
   What makes it (each kept from a review; references/decisions.md says when and why):
   - the in-junction from the cutback's last frame; the print leaves at 1 s (round 10) and the market's cards take the centre;
   - the study first (round 13): its real page at the full viewport in a browser frame with its address, the tester's real
     logo (cut out from its own site) with « Independent test · Hyperline », the reps on the phone (a stock shot), the rule
     « Counted only if it reached the right person » with the marker on its words when the voice says them;
   - the benchmark: TWO charts, never the same bars animated to a lower metric (round 12: it read as the stats dropping):
     EMAILS under a crafted Gmail app-icon tile, then PHONES under the iOS Phone icon, bars from zero; each card as tall as
     its rows; a group with no source is left out (the single providers' phones); the source line in mono, bottom right;
   - the yellow V pages for the big parts (Reason 1, 2, 3, the special tool), each with its light swish;
   - generic providers (A–F) inside the competitors' waterfalls: which providers each real tool uses is not known;
   - the method as a big list that slides DOWN from rule to rule with a vertical motion blur (round 11: never a
     perspective re-raise);
   - the brand's own tool rebuilt as « an illustration of the flow », marked as such; no community figure (none given);
   - 9 stock shots in the frame on the paper (F.framed, on their words; one pair of consecutive shots) and 4 GIFs as
     pinned prints on the right with a short caption (F.gifPrint), the scene stepping back behind them;
   - the end: the CTA of the user's profile (like, subscribe, comment; the first link in the description), the user's
     print back for « we're just starting » (their own end, not a junction), the yellow end card held 2.5 s.
   Facts (round 13, 2026-10-13: the benchmark is now SOURCED): one phone test run by Hyperline (Quentin Kozyra, Head of
   Growth), published at pipecorn.com/pipecorn-vs-fullenrich (2026; six providers on the same 290 contacts, US, UK and
   France, each on its own; reps called every number, a number only counted if it reached the right person). Phones:
   Pipecorn 83, FullEnrich 75 (on the page), BetterContact 72 (the same test, said by Ihsane); emails 89 / 83 / 80 (the
   same study, not on the page, said by Ihsane); single providers' email rates from Pipecorn's site chart; their phone rates
   (invented in the draft) removed. Every chart carries its source line; « Illustrative figures » is gone. The page says
   Hyperline is a Pipecorn customer today: the video's description says it too. Phone numbers are in Ofcom's drama ranges. */
window.SLUG = 'waterfall-v1-part2';
window.STORY = () => {
  'use strict';
  const { el, item, sfx, clamp, lerp, E } = F;
  const A = (q, n = 1, after = 0) => F.at(q, n, after);
  const Z = (q, n = 1, after = 0) => F.end(q, n, after);
  const { I, ic } = B;
  F.DUR = +(F.VO_END + 2.5).toFixed(3);   // the video's real end: the end card is held 2.5 s after the last word


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
    const mk = o.markAt ?? (t0 + d - 0.15);   // the marker on its word when the voice says it later (markAt)
    if (u) marker(u, mk, 0.42);
    if (o.bar) { const b = el('i', 'bar', e); F.on((T) => b.style.setProperty('--b', F.p(T, t0 + 0.1, 0.45, E.io).toFixed(3))); }
    sfx(t0 + 0.02, 'k:click', -17);
    if (u) sfx(mk + 0.03, 'p:mixkit-paper-quick-movement-2380', -20);
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
    ['emma', 'Emma Clarke', 'Quillstone'], ['david', 'David Kim', 'Ardenta'], ['julia', 'Julia Rossi', 'Vexley'], ['omar', 'Omar Haddad', 'Pellatrix'],
    ['aisha', 'Aisha Benali', 'Quillstone'], ['ben', 'Ben Whitaker', 'Halvorn']];
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
  // a real page (a crop of the homepage, captured 2026-10-12)
  const PAGE = { apollo: [1400, 820], lusha: [1400, 711], kaspr: [1400, 711], fullenrich: [1400, 711], bettercontact: [1400, 793], pipecorn: [2560, 702], 'pc-extension': [2560, 1110] };
  // round 11 (Ihsane: « show the whole viewport height »): the real pages are now the full above-the-fold viewport
  // (1440×900 at ×2, captured 2026-10-13, banners hidden), in a browser frame; H is then the viewport's
  const VP = { pipecorn: 'pipecorn.com', apollo: 'apollo.io', lusha: 'lusha.com', kaspr: 'kaspr.io', study: 'pipecorn.com/pipecorn-vs-fullenrich' };
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



  /* ---------- this part's own cards (same faces, same shadows, same small palette as part 1) ---------- */
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

  const LOGO = { pipecorn: 'img/logos/pipecorn.png', fullenrich: 'img/logos/fullenrich.png', bettercontact: 'img/logos/bettercontact.png', apollo: 'img/logos/apollo.png', lusha: 'img/logos/lusha.png', kaspr: 'img/logos/kaspr.png', hyperline: 'img/logos/hyperline.png' };
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
    const e = el('div', 'lg lift', s.cam, `<img src="${LOGO[key]}">`);
    return item(s, e, x, y, { t0, in: 'pop', float: 0.3, focusable: false, sfx: 'm:premium-pop-1', gain: -15, ...o });
  };
  // a number that counts in an element's text
  const counter = (elx, t0, t1, v0, v1, fmt = (v) => String(v)) => F.on((T) => { const u = E.out(clamp((T - t0) / (t1 - t0))); elx.textContent = fmt(Math.round(lerp(v0, v1, u))); });

  /* ---------- instants (film time = take time + 0.25 s) ---------- */
  const t = {};
  t.few = A('few'); t.three = A('three'); t.test0 = A('test'); t.hyperline = A('hyperline'); t.independent = A('independent'); t.their = A('their');
  t.only = A('only'); t.right0 = A('right'); t.personE = Z('person');
  t.and1 = A('and', 1, t.personE); t.great = A('great'); t.next = A('next'); t.single = A('single'); t.match = A('match'); t.least = A('least'); t.switching = A('switching');
  t.but = A('but'); t.same1 = A('same'); t.yourre = A("you're"); t.how = A('how'); t.they2 = A('they', 2); t.same2 = A('same', 2); t.right1 = A('right', 1, t.same2); t.well = A('well');
  t.andR1 = A('and', 1, A('really')); t.reasonE = Z('reason', 1, t.andR1);
  t.each = A('each'); t.picks = A('picks'); t.deals = A('deals'); t.pay = A('pay'); t.because = A('because'); t.free = A('free'); t.every = A('every', 1, t.because); t.costs = A('costs');
  t.negotiate = A('negotiate'); t.choose = A('choose'); t.two = A('two'); t.inside = A('inside'); t.notHave = A('not', 1, A('look'));
  t.theR2 = A('the', 1, t.inside + 0.3); t.orderE = Z('order'); t.remember = A('remember'); t.valid = A('valid'); t.emails = A('emails'); t.numbers2 = A('numbers', 1, t.emails);
  t.person = A('person', 1, t.emails); t.now = A('now'); t.gets = A('gets'); t.everyC = A('every', 1, t.gets); t.soBad = A('so', 1, A('first', 1, t.now) + 1); t.bad1 = A('bad'); t.fills = A('fills');
  t.forty = A('forty'); t.fortyE = Z('forty'); t.forty2 = A('forty', 2); t.bad3 = A('bad', 3); t.andBreak = A('and', 1, t.bad3); t.breaks = A('breaks'); t.everythingE = Z('everything');
  t.andR3 = A('and', 1, t.everythingE); t.checking1 = A('checking'); t.dataR3E = Z('data', 1, t.checking1);
  t.lot = A('lot'); t.find = A('find'); t.save = A('save'); t.never = A('never'); t.months = A('months'); t.still = A('still'); t.but3 = A('but', 1, t.still);
  t.anymore = A('anymore'); t.someone = A('someone'); t.findOut = A('find', 2); t.callE = Z('call', 1, t.findOut);
  t.soRecap = A('so', 1, t.callE); t.check3 = A('check', 2); t.provR = A('providers', 1, t.check3); t.provRE = Z('providers', 1, t.check3);
  t.orderR = A('order', 1, t.check3); t.orderRE = Z('order', 1, t.check3); t.howR = A('how', 1, t.orderR); t.dataRE = Z('data', 1, t.howR);
  t.soP = A('so', 1, t.dataRE); t.checkingE = Z('checking', 1, t.soP); t.pipecorn = A('pipecorn'); t.yes = A('yes'); t.show = A('show'); t.refreshed = A('refreshed');
  t.butP = A('but', 1, t.refreshed); t.special2 = A('special', 2); t.community = A('community');
  t.everyT = A('every', 1, t.community); t.sdr = A('sdr'); t.calls = A('calls'); t.pipecorn2 = A('pipecorn', 2); t.calling = A('calling'); t.extension = A('extension');
  t.wrong = A('wrong'); t.press = A('press'); t.oneB = A('one', 1, t.press); t.thatsIt = A("that's", 1, t.oneB); t.click = A('click'); t.know = A('know');
  t.nowC = A('now', 1, t.know); t.big = A('big'); t.lots = A('lots'); t.everyDay = A('every', 1, t.lots); t.soC = A('so', 1, t.everyDay); t.checked = A('checked');
  t.top = A('top'); t.always = A('always'); t.thatSmall = A('that', 1, A('updated')); t.small = A('small'); t.difference = A('difference');
  t.oneLast = A('one', 1, t.difference); t.starting = A('starting'); t.soE = A('so', 1, t.starting); t.helped = A('helped'); t.like = A('like'); t.subscribe = A('subscribe');
  t.comment = A('comment'); t.its = A("it's", 1, t.comment); t.algorithm = A('algorithm'); t.helps = A('helps'); t.people = A('people', 1, t.helps); t.best = A('best', 1, t.people); t.methods = A('methods');
  t.andTry = A('and', 1, t.methods); t.tryP = A('try'); t.first3 = A('first', 1, t.tryP); t.description = A('description'); t.test = A('test', 1, t.description); t.see = A('see');
  F.T = t;

  // the post (grain, vignette, light, dust) is off on the first frame: the junction with the real clip is its real frame
  F.on((T) => { F.post.style.opacity = clamp(T / 0.3).toFixed(3); });

  /* ========== 0 · from the cutback's last frame: « There are a few on the market. So we looked at three of them, in a test
     made by Hyperline, an independent start-up. Their reps called every number, and a number only counted if it reached
     the right person. » (round 13: the study's real page, Hyperline's real logo, the reps on the phone, the rule) ========== */
  const s0 = F.screen('market', 0, t.and1 - 0.25, { push: 0 });
  {
    // the real frame snaps into a pinned print in 0.42 s (the in-junction of part 1)
    const ph = el('div', 'ihs lift', s0.cam, `<img src="img/cutback-1-last.png"><i class="pin"></i>`);
    ph.querySelector('.pin').style.cssText = 'left:50%;top:-40px;width:80px;height:80px;margin-left:-40px';
    const K1 = 0.42, PX = 500, PY = 520, PS = 0.4;
    const k = (T) => E.io5(clamp(T / K1));
    const it = item(s0, ph, 960, 540, { t0: 0, in: 'none', float: 0, lift: true });
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
    // round 10 (Ihsane): the photo stays about 1 s once pinned, then slides out; the market's cards take the centre
    const tOut = 1.0; it.t1 = tOut; it.kout = 'slide-l'; it.dout = 0.45;
    const toC = (T) => E.io5(clamp((T - tOut - 0.1) / 0.55));
    // « a few on the market »: three empty slots; « three of them »: the three waterfalls' real logos land in them
    const keys = ['pipecorn', 'fullenrich', 'bettercontact'];
    const tUp = t.test0 - 0.1, tGone = t.their + 0.35;   // the row rises on « test »; the scene leaves under the stock shot
    const cards = keys.map((key, i) => {
      const c = logoCard(s0, key, 1390, 300 + i * 190, t.few - 0.1 + i * 0.1, { r: [1, -1, 1.5][i] });
      const tf = t.three - 0.05 + i * 0.12;
      s0.on((T) => c.el.classList.toggle('ghost', T < tf));
      c.sf = (T) => 1 + 0.08 * Math.sin(Math.PI * clamp((T - tf) / 0.3));
      // « in a test »: the three go up into a row at the top
      const mv = (T) => E.io5(clamp((T - tUp - i * 0.05) / 0.6));
      c.xf = (T) => lerp(lerp(1390, 960, toC(T)), 560 + i * 400, mv(T));
      c.yf = (T) => lerp(300 + i * 190, 150, mv(T));
      c.t1 = tGone; c.kout = 'deep'; c.dout = 0.4;
      return c;
    });
    sfx(t.three - 0.05, 'm:premium-pop-2', -15);
    // « a test made by Hyperline »: the study's real page, its full viewport in a browser frame with its address
    const pg = page1(s0, 'study', 960, 0, 700, 606, { t0: t.test0 + 0.15, r: -1 });
    pg.it.t1 = tGone; pg.it.kout = 'deep'; pg.it.dout = 0.4;
    // « Hyperline, an independent start-up »: its real logo (cut from hyperline.co), then the line, the marker on « Hyperline »
    const hl = logoCard(s0, 'hyperline', 1530, 470, t.hyperline - 0.08, { r: 2 });
    hl.t1 = tGone; hl.kout = 'deep'; hl.dout = 0.4;
    ed(s0, 'Independent test · <u>Hyperline</u>', 1530, 650, t.independent - 0.15, { cls: 'sm', t1: tGone });
    // « Their reps called every number »: the stock shot of a call floor (below); « a number only counted if it reached the
    // right person »: the rule, as soon as the shot closes, the marker on « right person » when the voice says it
    ed(s0, 'Counted only if it reached the <u>right person</u>', 960, 540, t.only - 0.35, { markAt: t.right0 - 0.02 });
    void cards;
  }

  /* ========== 1 · the benchmark: « they all have great numbers. Next to a single provider, there's no match. At least twenty
     percent more contacts, just by switching to a waterfall. But the three are not the same. » ========== */
  const s1 = F.screen('chart', t.and1 - 0.25, t.yourre - 0.25);
  B.depth(s0, s1, s1.t0);
  {
    // round 13: the figures are Hyperline's test (emails and phones of the three waterfalls), the single providers' email
    // rates Pipecorn's site chart; the single providers' phone rates were not in any study: the phones chart has no singles
    const BM = { pipecorn: [89, 83], fullenrich: [83, 75], bettercontact: [80, 72], apollo: [65, null], lusha: [65, null], kaspr: [59, null] };
    const ROWS = [['pipecorn', 'wf pc'], ['fullenrich', 'wf'], ['bettercontact', 'wf'], ['apollo', 'sp'], ['lusha', 'sp'], ['kaspr', 'sp']];
    const ROWS_P = ROWS.slice(0, 3);
    const Y = [178, 270, 362, 504, 596, 688];
    const SOURCE = 'Source: Hyperline phone &amp; email test, 2026 · pipecorn.com/pipecorn-vs-fullenrich';
    // round 12 (Ihsane: « switching from email to phone, we see the stats go down: it makes no sense »): two charts, never a
    // bar shrinking. EMAILS first, under the real Gmail mark on an app-icon tile; on « switching » that chart leaves and
    // the PHONES chart comes in under the iOS Phone icon, its bars growing from zero.
    const GMAIL = '<svg viewBox="52 42 88 66"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>';
    const PHONE = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>';
    // each chart: its own rows, its own height (the card fits its rows), the source line in mono at the bottom right
    const mkChart = (k, rows) => el('div', 'chart lift', s1.cam, `<div class="ihd"><i class="app ${k ? 'ph' : 'gm'}">${k ? PHONE : GMAIL}</i><div class="ihx"><b>${k ? 'Phones' : 'Emails'}</b><span>Valid ${k ? 'numbers' : 'emails'} found, % of the list</span></div></div>
      <div class="grp" style="top:174px">Waterfalls</div>${rows.length > 3 ? '<div class="grp" style="top:500px">Single providers</div>' : ''}
      ${rows.map(([k2, cls], i) => `<div class="row ${cls}" style="top:${Y[i] + 24}px"><div class="lgo"><img src="${LOGO[k2]}"></div><div class="trk"><div class="bar"></div></div><div class="val">0%</div></div>`).join('')}
      ${k ? '' : `<div class="mono src">Single providers' email rates: pipecorn.com</div>`}<div class="mono note">${SOURCE}</div>`);
    const tPh = t.switching - 0.1;                                                                   // the phones chart
    const chE = mkChart(0, ROWS), chP = mkChart(1, ROWS_P);
    chP.style.height = '534px';
    const iE = item(s1, chE, 960, 540, { t0: s1.t0, in: 'none', float: 0 });
    iE.xf = (T) => 960 - E.in(clamp((T - tPh) / 0.45)) * 2100; iE.t1 = tPh + 0.45; iE.kout = 'fade'; iE.dout = 0.05;   // fully off the left edge
    item(s1, chP, 960, 540, { t0: tPh + 0.12, in: 'slide-r', float: 0, sfx: 'p:mixkit-paper-slide-1530', gain: -15 });
    const tW = (i) => (i < 3 ? t.great - 0.1 + i * 0.12 : t.single - 0.05 + (i - 3) * 0.12);     // emails grow
    const tWp = (i) => tPh + 0.5 + i * 0.09;                                                        // phones grow, from zero
    const bars = (ch, k, tw) => {
      const rows = [...ch.querySelectorAll('.row')];
      s1.on((T) => rows.forEach((r, i) => {
        const v = BM[ROWS[i][0]][k] * E.out5(clamp((T - tw(i)) / 0.8)), g = clamp((T - tw(i)) / 0.05);
        r.querySelector('.bar').style.width = (9.4 * v).toFixed(1) + 'px';
        const val = r.querySelector('.val');
        val.textContent = Math.round(v) + '%';
        val.style.left = (290 + 9.4 * v + 18).toFixed(1) + 'px';
        val.style.opacity = g > 0.02 ? '1' : '0';
        // « the three are not the same »: the single providers step back, the three waterfalls stay
        r.style.opacity = (1 - 0.7 * (i >= 3 ? F.p(T, t.but - 0.1, 0.4) : 0)).toFixed(3);
      }));
    };
    bars(chE, 0, tW); bars(chP, 1, tWp);
    for (let i = 0; i < ROWS_P.length; i++) sfx(tWp(i), 'k:click', -24);
    for (let i = 0; i < 6; i++) sfx(tW(i), 'k:click', -22);
    sfx(tPh, 'm:smooth-fast-whoosh', -20, { align: 'peak' });
    // « no match »: a bracket between the two groups; « at least twenty percent more »: the line under the chart
    const br = F.svg(s1.cam, 1920, 1080, 'link-ink'); br.style.left = '0'; br.style.top = '0'; br.style.zIndex = '2300';
    const bp = F.path(br, 'M 1530 446 C 1580 446, 1580 446, 1580 496 L 1580 722 C 1580 772, 1580 772, 1530 772', { class: 'ink' });
    F.on((T) => { F.draw(bp, F.p(T, t.match - 0.1, 0.4, E.io)); br.style.opacity = (1 - F.p(T, tPh - 0.3, 0.25)).toFixed(3); });
    const nm = chipx(s1, `${ic(I.up)}No match`, 1700, 609, t.match - 0.05, { t1: tPh - 0.2 });
    void nm;
    s1.camTo(t.least - 0.3, 960, 520, 0.86, 0.8);
    ed(s1, 'At least <u>20% more</u> contacts', 960, 1035, t.least - 0.15, { t1: tPh - 0.15 });
    // « the three are not the same »: the three waterfall values circled one after the other
    const ink2 = F.svg(s1.cam, 1920, 1080, 'link-ink'); ink2.style.left = '0'; ink2.style.top = '0'; ink2.style.zIndex = '2300';
    void ink2;
    ed(s1, 'Not the same', 960, 905, t.but + 0.05, { bar: true });   // round 13: under the shorter phones card
  }

  /* ========== 2 · « how is that possible? They all use the same providers, right? Well, not really. » ========== */
  const s2 = F.screen('same', t.yourre - 0.25, t.andR1 - 0.3);
  B.depth(s1, s2, s2.t0);
  {
    ed(s2, 'How is that <u>possible?</u>', 960, 150, t.how - 0.1);
    const keys = ['pipecorn', 'fullenrich', 'bettercontact'];
    const X = [440, 960, 1480];
    const cards = keys.map((key, i) => {
      const e = el('div', 'wfc lift', s2.cam, `<div class="hd"><img src="${LOGO[key]}"></div>
        <div class="sl a"><img src="${LOGO.apollo}"></div><div class="sl b"><img src="${LOGO.lusha}"></div><div class="sl c"><img src="${LOGO.kaspr}"></div>`);
      item(s2, e, X[i], 600, { t0: s2.t0 + 0.1 + i * 0.1, in: 'drop', float: 0.3, r: [-1, 1, -1][i], sfx: i ? null : 'p:mixkit-paper-slide-1530', gain: -14 });
      return e;
    });
    // « the same providers, right? »: the same three logos inside each (what you might think); « not really »: unknown,
    // different insides (which providers each tool uses is theirs to say)
    const slots = cards.map((c) => [...c.querySelectorAll('.sl')]);
    const tSame = t.same2 - 0.1, tNo = t.well + 0.1;
    s2.on((T) => slots.forEach((ss, i) => ss.forEach((sl, j) => {
      const on = T >= tSame + j * 0.08;
      sl.style.opacity = on ? '1' : '0';
      const flip = T >= tNo + i * 0.12 + j * 0.06;
      sl.classList.toggle('q', flip);
      if (flip && !sl.dataset.f) { sl.dataset.f = 1; sl.innerHTML = '?'; }
      if (!flip && sl.dataset.f) { sl.dataset.f = ''; sl.innerHTML = `<img src="${LOGO[['apollo', 'lusha', 'kaspr'][j]]}">`; }
    })));
    sfx(tSame, 'k:click', -19); sfx(tNo, 'k:glitch', -21);
    [700, 1220].forEach((x, i) => {
      const e = el('div', 'eq lift', s2.cam, '=');
      const it2 = item(s2, e, x, 600, { t0: t.same2 + i * 0.08, in: 'pop', float: 0, focusable: false, sfx: 'm:normal-pop-3', gain: -18 });
      it2.zi = 2500;
      s2.on((T) => { const no = T >= tNo + 0.1; e.textContent = no ? '≠' : '='; e.classList.toggle('red', no); });
    });
    ed(s2, 'Not really.', 960, 960, t.well + 0.2, { cls: 'red', bar: true });
  }

  /* ========== V page · Reason 1: « the providers » ========== */
  const s3 = F.screen('reason1', t.andR1 - 0.3, t.theR2 - 0.3);
  const ch1 = B.chapter(s2, s3, { t0: t.andR1 - 0.5, t2: t.reasonE + 0.05, over: 'Reason 1', title: 'The providers', style: 'V', photos: B.ph('fullenrich', 'bettercontact', 'pipecorn', 'apollo', 'lusha', 'kaspr') });

  /* ========== 3 · « Each tool picks its own providers… deals… what they can pay. Data is not free… they negotiate, and they
     choose. Two waterfalls can look the same, and not have the same providers inside. » (generic tools and providers) ========== */
  {
    const R = ch1.reveal;
    const CX = [520, 1400];
    const cols = CX.map((x, i) => {
      const e = el('div', 'wfc xl lift', s3.cam, `<div class="hd"><b>Waterfall ${'AB'[i]}</b></div><div class="sl q"></div><div class="sl q"></div><div class="sl q"></div><div class="cover"><b>Waterfall ${'AB'[i]}</b><small>Emails &amp; phones</small></div>`);
      item(s3, e, x, 520, { t0: R + 0.05 + i * 0.1, in: 'drop', float: 0.2, sfx: i ? null : 'p:mixkit-paper-slide-1530', gain: -14 });
      return e;
    });
    // the pool of providers, at the bottom
    const POOL = [[480, 850], [960, 850], [1440, 850], [480, 955], [960, 955], [1440, 955]];
    const PICK = [[0, 2, 4], [1, 3, 5]];                     // what each one picks (illustrative)
    const slotPos = (c, j) => [CX[c], 472 + j * 96];
    const tiles = PROV.map((p, k) => {
      const tl = pv(s3, k, POOL[k][0], POOL[k][1], { t0: R + 0.25 + k * 0.06 });
      tl.zi = 2200;
      const c = PICK[0].includes(k) ? 0 : 1, j = PICK[c].indexOf(k);
      const tg = t.picks - 0.1 + (c * 3 + j) * 0.09;
      const go = (T) => E.io5(clamp((T - tg) / 0.5));
      const [sx, sy] = slotPos(c, j);
      tl.xf = (T) => lerp(POOL[k][0], sx, go(T));
      tl.yf = (T) => lerp(POOL[k][1], sy, go(T)) - Math.sin(go(T) * Math.PI) * 50;
      return tl;
    });
    sfx(t.picks - 0.1, 'm:cinematic-fast-normal-whoosh', -19, { align: 'peak' });
    // the deals and the budget
    chipx(s3, `${ic(I.receipt)}Their deals`, 960, 330, t.deals - 0.1, { t1: t.because - 0.2 });
    chipx(s3, `${ic(DOLLAR)}What they can pay`, 960, 440, t.pay - 0.25, { t1: t.because - 0.2 });
    ed(s3, 'Data is <u>not free</u>', 960, 150, t.because, { t1: t.two - 0.3 });
    // « every provider costs them money »: a price tag on each; « they negotiate, and they choose »: the tags shrink, ticks
    tiles.forEach((tl, k) => {
      const tag = el('span', 'ptag', tl.el, '$');
      s3.on((T) => {
        const a = E.back(clamp((T - t.costs + 0.1 - k * 0.06) / 0.35)), nego = F.p(T, t.negotiate, 0.4, E.io), out = F.p(T, t.choose + 0.3, 0.3);
        tag.style.transform = `scale(${(a * (1 - 0.35 * nego) * (1 - out)).toFixed(3)})`;
        tag.style.opacity = clamp(a * 3 * (1 - out)).toFixed(2);
      });
    });
    sfx(t.costs - 0.05, 'm:normal-pop-1', -18);
    PICK.forEach((pk, c) => pk.forEach((k, j) => { const [x, y] = slotPos(c, j); badge(s3, true, x + 170, y - 30, t.choose - 0.05 + (c * 3 + j) * 0.06).t1 = t.two - 0.2; }));
    // « two waterfalls can look the same »: their covers come down, identical; « not the same inside »: the covers lift
    cols.forEach((c) => {
      const cv = c.querySelector('.cover');
      s3.on((T) => {
        const dn = E.out5(clamp((T - t.two + 0.1) / 0.45)), up = E.io(clamp((T - t.notHave + 0.05) / 0.5));
        cv.style.transform = `scaleY(${(dn * (1 - up)).toFixed(3)})`;
        cv.style.opacity = dn > 0.01 && up < 0.99 ? '1' : '0';
      });
    });
    tiles.forEach((tl) => { s3.on((T) => { const hid = T > t.two + 0.15 && T < t.notHave + 0.3; tl.el.style.visibility = hid ? 'hidden' : ''; }); });
    sfx(t.two - 0.05, 'p:mixkit-paper-slide-1530', -15); sfx(t.notHave, 'p:mixkit-paper-slide-1530', -15);
    const eq = el('div', 'eq lift', s3.cam, '=');
    const eqIt = item(s3, eq, 960, 520, { t0: t.two + 0.1, in: 'pop', float: 0, focusable: false, sfx: 'm:normal-pop-3', gain: -18 });
    eqIt.zi = 2500;
    s3.on((T) => { const no = T >= t.notHave + 0.3; eq.textContent = no ? '≠' : '='; eq.classList.toggle('red', no); });
    ed(s3, 'Same look, <u>not the same inside</u>', 960, 930, t.notHave + 0.1);
  }

  /* ========== V page · Reason 2: « the order » ========== */
  const s4 = F.screen('reason2', t.theR2 - 0.3, t.andR3 - 0.3);
  const ch2 = B.chapter(s3, s4, { t0: t.theR2 - 0.5, t2: t.orderE + 0.05, over: 'Reason 2', title: 'The order', style: 'V', photos: B.ph('pipecorn', 'apollo', 'fullenrich', 'kaspr', 'bettercontact', 'lusha') });

  /* ========== 4 · « what we count here is valid data. Emails that work. Numbers that ring the right person. The first provider
     gets every contact first. If it is bad… forty percent of your list… forty percent of bad contacts. It breaks everything. » ========== */
  {
    const R = ch2.reveal;
    const [pk, pn, pc] = PEOPLE[0];
    const v1 = ed(s4, 'Remember: we count <u>valid</u> data', 960, 320, t.remember - 0.1, { t1: t.now - 0.3 });
    void v1;
    const r1 = el('div', 'row1 lift', s4.cam, `<i>${I.mail}</i>sarah.whitfield@halvorn.io<em>${I.check}Delivered</em>`);
    const r1i = item(s4, r1, 960, 560, { t0: t.emails - 0.1, in: 'rise', float: 0.3, sfx: 'm:premium-pop-1', gain: -15 });
    const r2 = el('div', 'row1 lift', s4.cam, `<i>${I.phone}</i>+44 20 7946 0958<img src="img/people/${pk}.jpg">${pn}<em>${I.check}Right person</em>`);
    const r2i = item(s4, r2, 960, 740, { t0: t.numbers2 - 0.1, in: 'rise', float: 0.3, sfx: 'm:premium-pop-2', gain: -15 });
    r1i.t1 = r2i.t1 = t.now - 0.25; r1i.kout = r2i.kout = 'deep';
    void R; void pc;
    // the waterfall, on the left: tier 1 gets every contact first
    const TY = [360, 510, 660, 810];
    const tiers = [0, 1, 2, 3].map((i) => {
      const e = el('div', 'tier lift', s4.cam, `<i style="background:${PROV[i][1]}"></i>Provider ${PROV[i][0]}`);
      const it = item(s4, e, 420, TY[i], { t0: t.now - 0.05 + i * 0.08, in: 'pop', float: 0, focusable: false, sfx: i ? null : 'm:premium-pop-1', gain: -15 });
      const tg = el('div', 'w-tag', s4.cam, `Tier ${i + 1}`);
      item(s4, tg, 300, TY[i] - 56, { t0: t.now + 0.05 + i * 0.08, in: 'pop', float: 0, focusable: false, lift: false }).zi = 2300;
      return it;
    });
    const ln = F.svg(s4.cam, 1920, 1080, 'link-ink'); ln.style.left = '0'; ln.style.top = '0'; ln.style.zIndex = '900';
    [0, 1, 2].forEach((i) => { const p = F.path(ln, `M 420 ${TY[i] + 48} L 420 ${TY[i + 1] - 48}`, { class: 'link' }); F.on((T) => F.draw(p, F.p(T, t.now + 0.1 + i * 0.1, 0.3, E.io))); });
    // every contact falls into tier 1 first
    const ppl = PEOPLE.slice(0, 8);
    ppl.forEach(([k2], i) => {
      const e = el('img', 'avb', s4.cam); e.src = `img/people/${k2}.jpg`;
      const t0 = t.everyC - 0.3 + i * 0.13;
      const a = item(s4, e, 420, 170, { t0, in: 'pop', float: 0, focusable: false, lift: false });
      a.zi = 2700;
      const x0 = 260 + i * 46;
      a.xf = (T) => lerp(x0, 420, E.in2(clamp((T - t0) / 0.5)));
      a.yf = (T) => lerp(170, TY[0], E.in2(clamp((T - t0) / 0.5)));
      a.sf = (T) => lerp(1, 0.4, E.in2(clamp((T - t0) / 0.5)));
      a.t1 = t0 + 0.5; a.kout = 'pop'; a.dout = 0.12;
    });
    sfx(t.everyC - 0.3, 'm:smooth-fast-whoosh', -21, { align: 'peak' });
    // « if that provider is bad »: tier 1 in red
    s4.on((T) => tiers[0].el.classList.toggle('bad', T >= t.bad1 - 0.05));
    chipx(s4, `${ic(I.warn)}Bad data`, 690, TY[0], t.bad1 - 0.05, { cls: 'red' });
    // the list on the right: 10 people; « forty percent comes from it »: 4 rows tagged Tier 1, then red
    const S = sheet(s4, 10);
    const shIt = item(s4, S.e, 1250, 640, { t0: t.fills - 0.15, in: 'drop', float: 0, s: 0.8, sfx: 'p:mixkit-paper-slide-1530', gain: -14 });
    void shIt;
    const BAD = [0, 3, 5, 8];
    BAD.forEach((r, i) => {
      const row = S.rows[r];
      row.children[0].textContent = ''; const tag = el('span', 't1', row.children[0], 'T1');
      s4.on((T) => {
        tag.style.opacity = F.p(T, t.forty - 0.1 + i * 0.1, 0.25).toFixed(2);
        row.classList.toggle('bad', T >= t.forty2 + i * 0.08);
      });
    });
    S.cE.forEach((c, i) => s4.on((T) => { const bad = BAD.includes(i) && T >= t.bad3; c.textContent = bad ? 'Bounced' : (T >= t.fills ? (i % 3 === 1 ? 'Valid' : 'Valid') : '—'); c.classList.toggle('miss', bad); }));
    S.cP.forEach((c, i) => s4.on((T) => { const bad = BAD.includes(i) && T >= t.bad3 + 0.1; c.textContent = bad ? 'Wrong person' : (T >= t.fills ? 'Valid' : '—'); c.classList.toggle('miss', bad); }));
    const big = el('div', 'big2', s4.cam, '<em><span class="cnt">0</span>%</em><small>of the list</small>');
    const bIt = item(s4, big, 1250, 200, { t0: t.forty - 0.12, in: 'none', float: 0.2, focusable: false, lift: false });
    bIt.zi = 2600;
    counter(big.querySelector('.cnt'), t.forty - 0.1, t.fortyE + 0.15, 0, 40);
    for (let k = 0; k < 5; k++) sfx(t.forty - 0.1 + k * 0.1, 'k:click', -24 - k);
    reveal(big.querySelector('small'), t.forty + 0.3);
    s4.on((T) => { big.querySelector('em').style.opacity = T < t.forty - 0.1 ? '0' : '1'; });
    // « and it breaks everything »
    F.shake(t.breaks, 0.4, 7); sfx(t.breaks, 'k:glitch', -18);
    ed(s4, 'It breaks <u>everything</u>', 1250, 1010, t.andBreak - 0.05, { cls: 'sm' });
  }

  /* ========== V page · Reason 3: « checking the data » ========== */
  const s5 = F.screen('reason3', t.andR3 - 0.3, t.soRecap - 0.3);
  const ch3 = B.chapter(s4, s5, { t0: t.andR3 - 0.5, t2: t.dataR3E + 0.05, over: 'Reason 3', title: 'Checking the data', style: 'V', photos: B.ph('kaspr', 'pipecorn', 'lusha', 'fullenrich', 'apollo', 'bettercontact') });

  /* ========== 5 · « tools find a number, save it, and never check it again. Not for months. Still in their database. Doesn't work
     anymore. Or someone else's phone. You only find out when you call. » (a specimen record) ========== */
  {
    const R = ch3.reveal;
    const [tk, tn, tc] = PEOPLE[1];
    const [lk, ln2, lc] = PEOPLE[9];
    // the person the number belonged to (a LinkedIn-like specimen); « someone else's phone »: another profile slides over it
    const prof = (k2, n, role, co) => `<div class="li-ban" style="background:linear-gradient(120deg,${MARK[co][0]},#8DB7FF)"></div><img class="li-ph" src="img/people/${k2}.jpg"><div class="li-co">${mark(co, 28)}${co}</div><h4>${n}</h4><p>${role} at ${co}</p><small>Manchester, United Kingdom</small><div class="li-need"></div>`;
    const p1 = el('div', 'li lift', s5.cam, prof(tk, tn, 'VP Sales', tc));
    item(s5, p1, 500, 470, { t0: R + 0.05, in: 'drop', float: 0.3, r: -1, sfx: 'p:mixkit-paper-slide-1530', gain: -14 });
    reveal(p1.querySelector('h4'), R + 0.3);
    const p2 = el('div', 'li lift', s5.cam, prof(lk, ln2, 'Account Executive', lc));
    const p2i = item(s5, p2, 500, 470, { t0: t.someone - 0.15, in: 'slide-r', float: 0.3, r: 1.5, sfx: 'm:smooth-fast-whoosh', gain: -18 });
    p2i.zi = 2100;
    chipx(s5, `${ic(I.user)}Now someone else`, 500, 760, t.someone + 0.15, { cls: 'red' });
    // the database record of the tool
    const rec = el('div', 'rec lift', s5.cam, `<div class="rh">${DB}Their database<span class="rf">${REFRESH}</span></div>
      <div class="f"><span>CONTACT</span><b>${tn}</b></div>
      <div class="f"><span>PHONE</span><b class="num">—</b><em class="st1 gr">Searching</em></div>
      <div class="f"><span>SAVED</span><b class="sv">—</b></div>
      <div class="f"><span>LAST CHECKED</span><b class="lc">—</b><em class="st2 gr">Never again</em></div>`);
    item(s5, rec, 1330, 470, { t0: t.lot - 0.1, in: 'drop', float: 0.3, r: 1, sfx: 'p:mixkit-paper-slide-1530', gain: -14 });
    const num = rec.querySelector('.num'), st1 = rec.querySelector('.st1'), sv = rec.querySelector('.sv'), lc2 = rec.querySelector('.lc'), st2 = rec.querySelector('.st2');
    s5.on((T) => {
      const found = T >= t.find + 0.2;
      num.textContent = found ? '+44 161 496 0742' : '—';
      st1.className = 'st1 ' + (T >= t.anymore ? 'no' : T >= t.still ? 'ok' : found ? 'ok' : 'gr');
      st1.textContent = T >= t.anymore ? 'Doesn’t work' : T >= t.still ? 'Still saved' : found ? 'Found' : 'Searching';
      sv.textContent = T >= t.save ? 'January' : '—';
      lc2.textContent = T >= t.never ? 'January' : '—';
      st2.style.opacity = T >= t.never + 0.2 ? '1' : '0';
    });
    sfx(t.find + 0.2, 'm:ui-select', -17); sfx(t.save, 'k:click', -18);
    // « not for months »: a calendar whose months run
    const cal = el('div', 'cal lift', s5.cam, '<div class="ct">Last check</div><div class="cm">Jan</div><div class="cy">months ago</div>');
    const calI = item(s5, cal, 1330, 870, { t0: t.months - 0.4, in: 'pop', float: 0.2, sfx: 'm:premium-pop-1', gain: -15 });
    calI.zi = 2300; calI.t1 = t.but3 - 0.1;
    const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    s5.on((T) => { const i = Math.floor(clamp((T - t.months + 0.3) / 1.1) * 9.99); cal.querySelector('.cm').textContent = MO[i]; });
    for (let i = 1; i < 10; i++) sfx(t.months - 0.3 + i * 0.11, 'k:click', -27);
    // « you only find out when you call »: the call
    const cb = el('div', 'callbar lift', s5.cam, `<i>${I.phone}</i><span class="cl">Calling +44 161 496 0742…</span>`);
    const cbi = item(s5, cb, 960, 950, { t0: t.findOut - 0.1, in: 'rise', float: 0, focusable: false, sfx: 'm:premium-pop-2', gain: -15 });
    cbi.zi = 2600;
    s5.on((T) => { const w = T >= t.callE - 0.25; cb.classList.toggle('red', w); cb.querySelector('.cl').textContent = w ? 'Wrong person' : 'Calling +44 161 496 0742…'; });
  }

  /* ========== 6 · « check three things: their providers, their order, and how often they check the data » (the method list) ========== */
  const s6 = F.screen('three', t.soRecap - 0.3, t.soP - 0.3);
  B.depth(s5, s6, s6.t0);
  B.method(s6, s6.t0 + 0.25, [
    ['Their providers', t.provR - 0.15, t.provRE + 0.05],
    ['Their order', t.orderR - 0.15, t.orderRE + 0.05],
    ['How often they check', t.howR - 0.2, t.dataRE + 0.15],
  ], { tOverview: t.howR - 0.1 });

  /* ========== V page · « Which tool goes the furthest on checking? » ========== */
  const s7 = F.screen('pipecorn', t.soP - 0.3, t.everyT - 0.3);
  const ch4 = B.chapter(s6, s7, { t0: t.soP - 0.5, t2: t.checkingE + 0.05, over: 'The special tool', title: 'Who checks the most?', style: 'V', photos: B.ph('pipecorn', 'ihsane', 'fullenrich', 'bettercontact', 'pipecorn', 'apollo') });

  /* ========== 7 · « For me, it's Pipecorn. Yes, it's our tool. Our database is refreshed very often. But that's not the special
     part. The special part is the community. » ========== */
  {
    const R = ch4.reveal;
    const pg = page1(s7, 'pipecorn', 1180, 0, 960, 470, { t0: t.pipecorn - 0.15, r: -1 });
    void R;
    chipx(s7, `${ic(I.check)}Yes, our tool`, 1420, 650, t.yes - 0.05, { t1: t.refreshed - 0.3 });
    pg.it.t1 = t.refreshed - 0.6; pg.it.kout = 'deep';
    s7.camTo(t.show - 0.1, 960, 470, 1.06, 0.9).camTo(t.refreshed - 0.4, 960, 540, 1, 0.6);
    // the database, refreshed: a record whose « updated » runs a cycle
    const [mk, mn, mc] = ['marcus', 'Marcus Bell', 'Fernquist'];
    const rec = el('div', 'rec lift', s7.cam, `<div class="rh"><img src="img/logo.png" style="width:30px;height:30px;border-radius:8px">Pipecorn database<span class="rf">${REFRESH}</span></div>
      <div class="f"><span>CONTACT</span><b>${mn}</b></div><div class="f"><span>COMPANY</span><b>${mark(mc, 26)}&nbsp;${mc}</b></div>
      <div class="f"><span>PHONE</span><b>+44 20 7946 0644</b><em class="ok">Valid</em></div><div class="f"><span>UPDATED</span><b class="up">Just now</b></div>`);
    const recI = item(s7, rec, 960, 540, { t0: t.refreshed - 0.25, in: 'drop', float: 0.3, sfx: 'p:mixkit-paper-slide-1530', gain: -14 });
    const rf = rec.querySelector('.rf'), up = rec.querySelector('.up');
    s7.on((T) => {
      const a = Math.max(0, T - t.refreshed) * 300;
      rf.style.transform = `rotate(${a.toFixed(0)}deg)`;
      const cyc = (T - t.refreshed) % 1.2;
      up.style.opacity = T > t.refreshed && cyc < 0.2 ? (cyc / 0.2).toFixed(2) : '1';
    });
    sfx(t.refreshed, 'm:smooth-fast-whoosh', -20, { align: 'peak' });
    recI.t1 = t.butP - 0.15; recI.kout = 'deep';
    ed(s7, 'Refreshed <u>very often</u>', 960, 880, t.refreshed + 0.1, { t1: t.butP - 0.15 });
    ed(s7, 'But that’s not the special part', 960, 540, t.butP + 0.25, { cls: 'sm', t1: t.special2 - 0.15 });
    // « the special part is the community »: the people around, the line in the middle
    const ring = ['sarah', 'tom', 'nina', 'lucas', 'emma', 'david', 'julia', 'omar', 'aisha', 'ben', 'sofia', 'kenji', 'chloe', 'marcus'];
    ring.forEach((k2, i) => {
      const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      const e = el('img', 'avb', s7.cam); e.src = `img/people/${k2}.jpg`; e.style.width = e.style.height = '104px';
      item(s7, e, 960 + Math.cos(a) * 640, 540 + Math.sin(a) * 360, { t0: t.community - 0.3 + i * 0.05, in: 'pop', float: 0.6, focusable: false, lift: false, sfx: i % 4 ? null : 'm:normal-pop-' + (1 + (i % 3)), gain: -19 });
    });
    ed(s7, 'The special part: <u>the community</u>', 960, 540, t.special2 - 0.05);
  }

  /* ========== 8 · the calling tool (an illustration of the flow, rebuilt, not a screenshot): « every time an SDR calls a number with
     Pipecorn, from our calling tool or the extension, and the number is wrong, they press one button. That's it. One click, and we know. » ========== */
  const s8 = F.screen('call', t.everyT - 0.3, t.nowC - 0.3);
  B.depth(s7, s8, s8.t0);
  {
    const [mk, mn] = ['marcus', 'Marcus Bell'];
    const d = el('div', 'dial lift', s8.cam, `<div class="top"><img src="img/logos/pipecorn.png"><div class="tb t1" style="left:430px">Calling tool</div><div class="tb t2" style="left:600px">Extension</div></div>
      <div class="who"><img src="img/people/${mk}.jpg"><b>${mn}</b><p>+44 20 7946 0644</p><span class="stt">Ready</span></div>
      <div class="bt" style="left:60px">${MIC}</div><div class="bt" style="left:176px">${NOTE}</div><div class="bt hang" style="left:292px">${HANG}</div>
      <div class="wn">${FLAG}Wrong number</div><div class="mono ill">Illustration of the flow</div>`);
    item(s8, d, 700, 540, { t0: s8.t0, in: 'none', float: 0 });
    const tb1 = d.querySelector('.t1'), tb2 = d.querySelector('.t2'), stt = d.querySelector('.stt'), wn = d.querySelector('.wn'), num = d.querySelector('.who p');
    chipx(s8, `${ic(I.user)}SDR`, 1440, 220, t.sdr - 0.1, { t1: t.wrong - 0.2 });
    s8.on((T) => {
      tb1.classList.toggle('on', T >= t.calling - 0.05 && T < t.extension - 0.05);
      tb2.classList.toggle('on', T >= t.extension - 0.05 && T < t.extension + 0.7);
      let s = 'Ready', c = 'stt';
      if (T >= t.calls) { const sec = Math.floor(Math.max(0, T - t.calls - 0.5)); s = T < t.calls + 0.5 ? 'Calling…' : `Connected · 0:${String(sec).padStart(2, '0')}`; c = 'stt go'; }
      if (T >= t.wrong) { s = 'Wrong person'; c = 'stt red'; }
      if (T >= t.click + 0.2) { s = 'Number reported'; c = 'stt red'; }
      stt.textContent = s; stt.className = c;
      wn.classList.toggle('on', T >= t.oneB + 0.05);
      num.style.textDecoration = T >= t.click + 0.2 ? 'line-through' : '';
    });
    sfx(t.calls, 'k:click', -18);
    // the extension, briefly, on the side
    const ext = el('div', 'ext lift', s8.cam, `<div class="eh"><img src="img/logo.png">Pipecorn extension</div><p><img src="img/people/${mk}.jpg">${mn}</p><p>${I.phone}&nbsp;+44 20 7946 0644</p>`);
    const exI = item(s8, ext, 1450, 430, { t0: t.extension - 0.1, in: 'slide-r', float: 0.3, sfx: 'm:smooth-fast-whoosh', gain: -19 });
    exI.t1 = t.wrong - 0.1; exI.kout = 'slide-r';
    // the cursor goes to the button and presses it
    const cur = el('div', 'cur', s8.cam, CURSOR);
    const cI = item(s8, cur, 1300, 900, { t0: t.press - 0.5, in: 'rise', float: 0, focusable: false, lift: false });
    cI.zi = 2900;
    const bx = 700 - 380 + 410 + 290 + 24, by = 540 - 350 + 548 + 37;
    cI.xf = (T) => lerp(1300, bx, E.io(clamp((T - t.press + 0.3) / 0.5)));
    cI.yf = (T) => lerp(900, by, E.io(clamp((T - t.press + 0.3) / 0.5)));
    cI.sf = (T) => 1 - 0.14 * Math.sin(clamp((T - t.oneB) / 0.2) * Math.PI);
    sfx(t.oneB + 0.03, 'm:ui-button', -15);
    s8.camTo(t.press - 0.2, 860, 640, 1.12, 0.8).camTo(t.thatsIt + 0.1, 960, 540, 1, 0.7);
    // « that's it. One click, and we know »
    const toast = el('div', 'toast lift', s8.cam, `${I.check}<span>Reported · thanks</span>`);
    const toI = item(s8, toast, 1440, 360, { t0: t.thatsIt - 0.05, in: 'pop', float: 0.3, sfx: 'm:ui-select', gain: -15 });
    toI.zi = 2800;
    reveal(toast.querySelector('span'), t.thatsIt + 0.02);
    const kn = el('div', 'rec lift', s8.cam, `<div class="rh"><img src="img/logo.png" style="width:30px;height:30px;border-radius:8px">Pipecorn database</div><div class="f"><span>PHONE</span><b style="text-decoration:line-through">+44 20 7946 0644</b><em class="no">Wrong · flagged</em></div>`);
    item(s8, kn, 1440, 640, { t0: t.know - 0.25, in: 'drop', float: 0.3, s: 0.8, sfx: 'p:mixkit-paper-slide-1530', gain: -15 }).zi = 2700;
  }

  /* ========== 9 · « picture that with a big community. Lots of calls, every day. Numbers checked by real calls, all the time, on top
     of a database that's always updated. That small button makes all the difference. » ========== */
  const s9 = F.screen('community', t.nowC - 0.3, t.oneLast - 0.3);
  B.depth(s8, s9, s9.t0);
  {
    const ppl = ['sarah', 'tom', 'nina', 'lucas', 'emma', 'david', 'julia', 'omar', 'aisha', 'ben', 'sofia', 'kenji', 'chloe', 'marcus'];
    const cells = [];
    for (const y of [170, 320, 760, 910]) for (let c = 0; c < 6; c++) cells.push([290 + c * 268, y]);
    // the order they appear: scattered, faster and faster (no figure on screen: there is none given)
    const order = cells.map((_, i) => i).sort((a, b) => F.rand(a * 7.3) - F.rand(b * 7.3));
    const tC = t.nowC - 0.1;
    order.forEach((ci, n) => {
      const [x, y] = cells[ci];
      const k2 = ppl[ci % ppl.length];
      const red = F.rand(ci * 3.1) > 0.72;
      const e = el('div', 'cc lift', s9.cam, `<img src="img/people/${k2}.jpg"><div class="ph">${I.phone}</div><span class="fl ${red ? 'red' : 'ok'}">${red ? 'Wrong' : 'Checked'}</span>`);
      const t0 = tC + 3.2 * Math.pow(n / order.length, 0.7);
      const it = item(s9, e, x, y, { t0, in: 'pop', float: 0.2, focusable: false, sfx: n % 6 ? null : 'k:click', gain: -22 });
      const fl = e.querySelector('.fl');
      s9.on((T) => fl.style.setProperty('--f', F.p(T, t0 + 0.35 + F.rand(ci) * 0.6, 0.2).toFixed(2)));
      it.t1 = t.small - 0.2 + F.rand(ci * 2.2) * 0.2; it.kout = 'deep'; it.dout = 0.4;
      cells[ci].push(it);
    });
    ed(s9, 'Lots of calls, <u>every day</u>', 960, 540, t.lots - 0.05, { t1: t.soC - 0.2 });
    // « checked by real calls… on top of a database that's always updated »: the database in the middle, the grid dimmed
    const veil = el('div', '', s9.cam); veil.style.cssText = 'left:0;top:0;width:1920px;height:1080px;background:rgba(250,250,252,.72)';
    const vI = item(s9, veil, 960, 540, { t0: t.soC - 0.1, in: 'fade', float: 0, focusable: false, lift: false }); vI.zi = 2900;
    const rec = el('div', 'rec lift', s9.cam, `<div class="rh"><img src="img/logo.png" style="width:30px;height:30px;border-radius:8px">Pipecorn database<span class="rf">${REFRESH}</span></div>
      <div class="f"><span>CHECKED BY</span><b>Real calls</b><em class="ok">All the time</em></div><div class="f"><span>UPDATED</span><b>Always</b><em class="ok">${REFRESH.replace('1em', '18px').replace('1em', '18px')}</em></div>`);
    const rI = item(s9, rec, 960, 540, { t0: t.soC + 0.1, in: 'deep', float: 0.3, focusable: false, sfx: 'm:premium-pop-2', gain: -15 });
    rI.zi = 3000; rI.t1 = t.small - 0.3; rI.kout = 'deep';
    const rf = rec.querySelector('.rf');
    s9.on((T) => { rf.style.transform = `rotate(${(Math.max(0, T - t.top) * 300).toFixed(0)}deg)`; });
    // « that small button makes all the difference »
    const bb = el('div', 'btnbig lift', s9.cam, `${FLAG}Wrong number`);
    const bI = item(s9, bb, 960, 470, { t0: t.small - 0.1, in: 'pop', float: 0.3, focusable: false, sfx: 'm:premium-pop-1', gain: -14 });
    bI.zi = 3100;
    ed(s9, 'That small button makes <u>all the difference</u>', 960, 700, t.small, { cls: 'sm' });
  }

  /* ========== 10 · « One last thing. We're just starting these videos. If this one helped you: like it, subscribe, and leave a
     comment. A small push for the algorithm. It helps us help more people in the community use the best tools and methods. » ========== */
  const s10 = F.screen('end', t.oneLast - 0.3, t.andTry - 0.3);
  B.depth(s9, s10, s10.t0);
  {
    const ph = el('div', 'ihs lift', s10.cam, `<img src="img/ihsane-print.png"><i class="pin"></i>`);
    ph.querySelector('.pin').style.cssText = 'left:50%;top:-40px;width:80px;height:80px;margin-left:-40px';
    ph.style.boxShadow = '0 0 0 34px #fff, 0 60px 120px -40px rgba(28,26,46,.55)';
    ph.style.setProperty('--pin', '1');
    const pI = item(s10, ph, 500, 470, { t0: s10.t0, in: 'none', float: 0, s: 0.4, r: -3 });
    pI.t1 = t.algorithm + 0.6; pI.kout = 'slide-l';
    ed(s10, 'We’re just <u>starting</u>', 500, 830, t.starting - 0.2, { cls: 'sm', t1: t.algorithm + 0.5 });
    const Y = [300, 470, 640];
    const yts = [[THUMB, 'Like', t.like], [BELL, 'Subscribe', t.subscribe], [BUBBLE, 'Comment', t.comment]].map(([ico, lb, tw], i) => {
      const e = el('div', 'yt lift', s10.cam, `${ico}<span>${lb}</span>`);
      const it = item(s10, e, 1360, Y[i], { t0: t.helped + i * 0.12, in: 'pop', float: 0.3, focusable: false, sfx: i ? null : 'm:premium-pop-1', gain: -15 });
      s10.on((T) => e.classList.toggle('on', T >= tw));
      it.sf = (T) => 1 - 0.08 * Math.sin(clamp((T - tw) / 0.25) * Math.PI);
      sfx(tw, 'm:ui-button', -16);
      it.t1 = t.algorithm + 0.5; it.kout = 'slide-r';
      return it;
    });
    void yts;
    // « a small push for the algorithm »: a line that rises
    const lnv = F.svg(s10.cam, 1920, 1080, 'link-ink'); lnv.style.left = '0'; lnv.style.top = '0'; lnv.style.zIndex = '2400';
    const lp = F.path(lnv, 'M 1150 900 C 1300 880, 1400 860, 1480 820 S 1640 700, 1720 620', { class: 'ink', 'stroke-width': 7 });
    F.on((T) => { F.draw(lp, F.p(T, t.its, 0.7, E.io)); lnv.style.opacity = (1 - F.p(T, t.helps - 0.2, 0.3)).toFixed(3); });
    chipx(s10, `${ic(UP)}A small push`, 1440, 960, t.its + 0.1, { t1: t.helps - 0.2 });
    // « help more people in the community use the best tools and the best methods »
    const ppl = ['sarah', 'tom', 'nina', 'lucas', 'emma', 'david', 'julia', 'omar', 'aisha', 'ben', 'sofia', 'kenji'];
    ppl.forEach((k2, i) => {
      const e = el('img', 'avb', s10.cam); e.src = `img/people/${k2}.jpg`; e.style.width = e.style.height = '96px';
      item(s10, e, 410 + i * 100, 420, { t0: t.people - 0.3 + i * 0.05, in: 'pop', float: 0.4, focusable: false, lift: false, sfx: i % 4 ? null : 'm:normal-pop-2', gain: -19 });
    });
    chipx(s10, `${ic(I.star)}The best tools`, 760, 640, t.best - 0.05);
    chipx(s10, `${ic(I.check)}The best methods`, 1180, 640, t.methods - 0.1);
  }

  /* ========== 11 · « if you want to try Pipecorn, the first link in the description lets you test it for free » ========== */
  const s11 = F.screen('try', t.andTry - 0.3, t.see - 0.3);
  B.depth(s10, s11, s11.t0);
  {
    page1(s11, 'pipecorn', 820, 0, 960, 330, { t0: s11.t0, in: 'none', r: -1 });
    const ds = el('div', 'desc lift', s11.cam, `<small>Description</small><span class="l1"><u>Try Pipecorn for free</u>: pipecorn.com</span><span class="lo">——————————————</span><span class="lo">———————————</span>`);
    item(s11, ds, 960, 740, { t0: t.first3 - 0.25, in: 'rise', float: 0.2, sfx: 'p:mixkit-paper-slide-1530', gain: -14 });
    marker(ds.querySelector('u'), t.description - 0.1, 0.45);
    reveal(ds.querySelector('.l1'), t.first3 - 0.1);
    chipx(s11, `${ic(I.check)}Test it for free`, 1460, 600, t.test - 0.05);
  }

  /* ========== 12 · « See you in the next one. »: the end card, on the yellow, held 2.5 s after the last word ========== */
  const s12 = F.screen('card', t.see - 0.3, F.DUR + 1, { accent: true, dof: 0, push: 0.03 });
  B.ink(s11, s12, s12.t0 + 0.1);
  {
    const e = el('div', 'endc', s12.cam, `<i class="lgw"><img src="img/logo.png"></i><b>Try Pipecorn free</b><p>First link in the description</p>`);
    item(s12, e, 960, 540, { t0: s12.t0 + 0.25, in: 'none', float: 0.2, focusable: false, lift: false });
    reveal(e.querySelector('b'), s12.t0 + 0.4); reveal(e.querySelector('p'), s12.t0 + 0.7, { step: 0.05 });
    const lg = e.querySelector('.lgw');
    s12.on((T) => { const k2 = E.back(clamp((T - s12.t0 - 0.2) / 0.5)); lg.style.transform = `scale(${k2.toFixed(3)})`; lg.style.opacity = clamp(k2 * 3).toFixed(2); });
    sfx(s12.t0 + 0.25, 'm:premium-pop-2', -14);
  }

  /* ---------- round 10: the stock shots in the Fr1 frame and the GIFs as pinned prints (waterfall-media/PLAN.md), on their
     words. Shots: F.framed (framed.js), the screen open on the first word, the scene underneath going on (what appears during
     a shot is there when it ends). Not used: #4 (the CRM card already says « their own CRM »), G5 (the « Wrong number »
     button of the calling tool already lands « one button »), consecutive shots only for #11 → #12. ---------- */
  {
    const at = (q, n = 1, after = 0) => F.at(q, n, after);
    const shot = (name, n, t0, t1, start) => ({ name, n, t0, t1, start });
    const one = (name, n, t0, t1, start) => F.framed({ t0, t1, shots: [shot(name, n, t0, t1, start)] });
    let a, b;
    a = at('their'); one('agencies-team', 126, a - 0.05, at('and', 1, a) - 0.2, 1.0);   // round 13: « Their reps called every number »
    a = at('because'); one('money-cash', 120, a, at('every', 1, a) - 0.18, 1.0);
    a = at('so', 1, at('costs')); one('deal-handshake', 150, a, at('two', 1, a) - 0.26, 1.2);
    a = at('numbers', 1, at('emails')); one('phone-answer', 87, a, at('now', 1, a) - 0.23, 0.4);
    a = at('so', 1, at('months')); one('server-racks', 120, a, at('but', 1, a) - 0.17, 1.0);
    const tW = at('and', 1, at('phone', 1, at('anymore'))); one('call-worried', 114, tW, at('so', 1, tW) - 0.38, 1.0);
    a = at('every', 1, at('community')); one('sdr-headset', 135, a, at('from', 1, a) - 0.11, 1.0);
    a = at('now', 1, at('know')); b = at('lots', 1, a);
    F.framed({ t0: a, t1: at('so', 1, b) - 0.25, shots: [shot('crowd-community', 114, a, b - 0.05, 1.0), shot('calls-every-day', 105, b - 0.05, at('so', 1, b) - 0.25, 0.9)] });
    // the GIFs: pinned prints on the right, the scene recedes behind them
    const G = (s, name, n, t0, t1, o) => F.gifPrint(s, name, n, 1390, 560, 660, 420, { t0, t1, fps: 15, cls: 'v', r: -3, ...o });
    a = at('how', 1, at('thinking')) - 0.05; G(s2, 'how-possible', 69, a, a + 2.15, { cap: 'same providers??' });
    a = at('breaks') - 0.3; G(s4, 'this-is-fine', 50, a, s4.t1 - 0.1, { cap: 'your pipeline, 40% bad data', start: 1.5 });
    a = at('or', 1, at('anymore')) - 0.03; G(s5, 'new-phone', 21, a, tW - 0.45, { cap: 'wrong person' });
    a = at('yes'); G(s7, 'wink', 21, a, at('so', 1, a) - 0.05, { cap: 'full disclosure' });
  }

  B.dust();
};
