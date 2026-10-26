/* The blocks of the article videos: the scenes that come back in every episode, as the series validated them
   (2026-10-10/11). Each video calls them from film/story.js; a block is corrected in the skill's template, never
   in one video.

   B.decision   the end of the hook: the document ready to sign (or the email ready to send, the checkout ready to
                pay), the pen or the cursor on it, "So, do we sign?"
   B.titles     the opening titles on the brand's colour: the episode's real documents in black and white, the
                series' stamp, "a <Brand> series · <Subject>", the ink and tear transitions with their sounds
   B.notYet     "Not yet." slamming after the titles
   B.chapter    a chapter page: P3 collage for a numbered step, V for a new part (no number)
   B.sticker    the sticker of a product, a car, an object the voice names (white outline), the moment it is said
   B.method     the method: a big centred list, straight when still, the rules not yet said pixelated
   B.brand      the brand's own segment on its colour: a grid of dots, a counter that slams, the brand's card whose
                items land each on its word, a chip
   B.summary    the summary: the document pinned on the left, the brand's photo on the right, then the call (B.cta)
   B.cta        "A question? Call us, or book on <site>": the contact card (the site and its button's words, the
                phone when the brand has one; each row styled by its kind)
   B.end        the end card: the series' stamp, the site and the phone, the logo
   B.ink / B.tear / B.depth   simple transitions with their sounds
   B.host       the brand's host (appearances, never speaking), only when the user gave cut-outs (img/host/<pose>.png)
   B.dust       a light dust over the whole film (off during full-screen videos)
   Small tools: B.I (icons), B.ic, B.big, B.card, B.ph (the run's photos for the collages). */
(function () {
  'use strict';
  const { clamp, lerp, E } = F;
  const B = (window.B = {});
  const BR = (B.BRAND = { name: '', logo: null, site: '', phone: '', ...(window.BRAND || {}) });

  /* ---------- the words on screen, in the video's language (window.T_EXTRA overrides any of them) ---------- */
  // Each language's own punctuation: English puts no space before « ? », French puts a no-break one.
  B.STRINGS = {
    en: {
      notYet: 'Not <em>yet.</em>', series: (b) => (b ? `a ${b} series` : 'a series'), step: 'Step', point: 'Point', remember: 'Remember',
      method: 'The method', watchOut: 'But watch out', moreThan: 'More than', verified: 'Verified', ctaQuestion: 'A question before you start?',
      book: 'Book a call', allEpisodes: 'Every episode on', viaGiphy: 'via GIPHY',
      sign: { title: 'Contract · ready to sign', line: 'Your signature', question: 'So, do we sign<em>?</em>' },
      send: { title: 'New message', to: 'To', subject: 'Subject', button: 'Send', question: 'So, do we send it<em>?</em>' },
      buy: { title: 'Checkout', total: 'Total', button: 'Pay now', question: 'So, do we buy<em>?</em>' },
    },
    fr: {
      notYet: 'Pas tout <em>de suite.</em>', series: (b) => (b ? `une série ${b}` : 'une série'), step: 'Étape', point: 'Point', remember: 'À retenir',
      method: 'La méthode', watchOut: 'Mais attention', moreThan: 'Plus de', verified: 'Certifié', ctaQuestion: 'Une question avant de vous lancer&nbsp;?',
      book: 'Prendre rendez-vous', allEpisodes: 'Tous les épisodes sur', viaGiphy: 'via GIPHY',
      sign: { title: 'Contrat · prêt à signer', line: 'Votre signature', question: 'Alors, on signe&nbsp;<em>?</em>' },
      send: { title: 'Nouveau message', to: 'À', subject: 'Objet', button: 'Envoyer', question: 'Alors, on envoie&nbsp;<em>?</em>' },
      buy: { title: 'Paiement', total: 'Total', button: 'Payer', question: 'Alors, on paie&nbsp;<em>?</em>' },
    },
  };
  const T = (window.T = { ...(B.STRINGS[F.LANG] || B.STRINGS.en), ...(window.T_EXTRA || {}) });

  /* ---------- the default music (Mixkit "Gimme That Groove!", as the validated episodes) ---------- */
  // it opens in full on the titles; before them, the same track muffled (low-pass) under the hook
  window.MUSIC = window.MUSIC || { file: 'gimme', gain: -21, start: 1.95 };
  window.MUSIC_BED = window.MUSIC_BED || (() => ({ file: window.MUSIC.file, start: 20, at: 0, until: F.GEN.t0 + 0.05, gain: -17, lowpass: 950, fadein: 0.25 }));

  /* ---------- icons (in B.ic(...) for a round chip) ---------- */
  const SVG = (d, sw = 2.4) => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  B.SVG = SVG;
  B.I = {
    check: SVG('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 3.2),
    cross: SVG('<path d="M6 6l12 12M18 6 6 18"/>', 3.2),
    cal: SVG('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    clock: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'),
    doc: SVG('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
    pin: SVG('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    receipt: SVG('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
    star: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    euro: SVG('<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h9M4 13.5h9"/>'),
    dollar: SVG('<path d="M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.4c0 4.6 9 2.6 9 7.2 0 2.2-2 3.4-4.5 3.4s-4.5-1.1-4.5-3"/>'),
    warn: SVG('<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
    down: SVG('<path d="M4 7l6 6 4-4 6 6M20 10v5h-5"/>'),
    up: SVG('<path d="M4 17l6-6 4 4 6-6M20 14V9h-5"/>'),
    bookmark: SVG('<path d="M6 3h12v18l-6-4.5L6 21V3Z"/>'),
    arrow: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', 3),
    wrench: SVG('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
    car: SVG('<path d="M4 16v-3l2-5h12l2 5v3zM6.5 16v2.5M17.5 16v2.5M4 13h16"/><circle cx="8" cy="13.6" r=".6"/><circle cx="16" cy="13.6" r=".6"/>'),
    search: SVG('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    shield: SVG('<path d="M12 3 4.5 6v6c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    info: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>'),
    ban: SVG('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    eye: SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>'),
    gauge: SVG('<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-5"/>'),
    road: SVG('<path d="M8 3 5 21M16 3l3 18M12 4v2M12 10v2M12 16v2"/>'),
    phone: SVG('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    mail: SVG('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
    link: SVG('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    users: SVG('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>'),
    chart: SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    bolt: SVG('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    target: SVG('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    globe: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    lock: SVG('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  };
  B.ic = (x) => `<i>${x}</i>`;

  /* ---------- small builders ---------- */
  // a giant text ("Not yet", "4 things to check"); <em>…</em> in the accent colour
  B.big = (s, html, x, y, o = {}) => F.item(s, F.el('div', 'big', s.cam, html), x, y, { in: 'pop', float: 0.3, focusable: true, lift: false, ...o });
  // the enlargement of a zone of a real document (a card that swings in), tied to the document with F.link
  B.card = (s, name, region, x, y, t0, o = {}) => F.view(s, name, x, y, { frame: 'card', region, w: o.w || 760, t0, in: o.in || 'swing', r: o.r ?? 0.8, sfx: 'p:mixkit-paper-quick-movement-2380', gain: -16, ...o });
  // the run's photos for the collages (film/img/photos/<name>.jpg): 6 per chapter, chosen for its subject,
  // never the same from one chapter to the next
  B.ph = (...names) => names.map((x) => (x.includes('/') || x.includes('.') ? x : `photos/${x}.jpg`));
  // every photo of the run (scripts/photos.mjs writes window.PHOTOS); a chapter without its own takes 6 of them,
  // a different window of the pool each time
  B.PHOTOS = (window.PHOTOS || []).map((x) => `photos/${x}`);
  B.pool = (i, n = 6) => { const P = B.PHOTOS; if (!P.length) return []; return Array.from({ length: Math.min(n, P.length) }, (_, k) => P[(i * 3 + k) % P.length]); };

  /* ---------- the end of the hook: the decision, "So, do we sign?" ---------- */
  // o: { tAsk ("So"), tAction ("sign", "send"…), kind: 'sign' | 'send' | 'buy', title, lines, to, subject, total,
  //      button, question (html) }. The camera of s0 must come back to the centre (960, 540, 1) at tAsk - 0.15.
  // Returns { card, tool, question, tip } — tip: where the titles' ink starts (the pen's nib, the cursor's point).
  const CURSOR = `<svg viewBox="0 0 48 64" width="96" height="128"><path d="M6 4 L6 52 L18 41 L27 60 L35 56 L26 37 L42 37 Z" fill="#fff" stroke="#14121F" stroke-width="3.4" stroke-linejoin="round"/></svg>`;
  B.decision = (s0, o) => {
    F.when(o.tAsk, 'B.decision tAsk'); F.when(o.tAction, 'B.decision tAction');
    const kind = o.kind || 'sign', K = T[kind] || T.sign;
    let html;
    if (kind === 'send') html = `<small>${o.title || K.title}</small><p class="gd-f"><span>${K.to}</span>${o.to || ''}</p><p class="gd-f"><span>${K.subject}</span>${o.subject || ''}</p><i></i><i></i><i></i><b class="gd-btn">${o.button || K.button}</b>`;
    else if (kind === 'buy') html = `<small>${o.title || K.title}</small><i></i><i></i><p class="gd-f gd-tot"><span>${K.total}</span>${o.total || ''}</p><b class="gd-btn">${o.button || K.button}</b>`;
    else html = `<small>${o.title || K.title}</small><i></i><i></i><i></i><i></i><div class="g-sigl">${o.line || K.line}</div>`;
    const doc = F.el('div', `g-card g-${kind} lift`, s0.cam, html);
    const ct = F.item(s0, doc, 820, 560, { t0: o.tAsk - 0.12, in: 'rise', r: -2, float: 0.3, sfx: 'p:mixkit-paper-slide-1530', gain: -13 });
    s0.focusOn(o.tAsk - 0.1, [ct]);
    let tool, tip;
    if (kind === 'sign') {
      // a fountain pen (img/pen.png, 1040 × 653, its nib's point at about 68, 586: made with Nano Banana 2 on 2026-10-14, no
      // brand on it, cut out on chroma green), shown 520 wide: the point lands on the
      // signature line, 230 px left of and 133 px under the pen's centre
      const pen = F.el('div', 'g-pen', s0.cam);
      F.img('pen.png', '', pen);
      tool = F.item(s0, pen, 760, 650, { t0: o.tAction - 0.35, in: 'drop', r: -2, float: 0, focusable: false, lift: false });
      tip = { x: 530, y: 783 };
    } else {
      const cur = F.el('div', 'g-cursor', s0.cam, CURSOR);
      tool = F.item(s0, cur, 1110, 860, { t0: o.tAction - 0.45, in: 'rise', float: 0, focusable: false, lift: false });
      // the pointer goes to the button (theme.css puts its centre at 1080, 770), then presses it; the arrow's point is
      // 36 px left and 56 px above the cursor's centre
      const bx = 1080, by = 770;
      tool.xf = (T2) => lerp(1300, bx + 36, E.io(clamp((T2 - o.tAction + 0.35) / 0.4)));
      tool.yf = (T2) => lerp(980, by + 56, E.io(clamp((T2 - o.tAction + 0.35) / 0.4)));
      tool.sf = (T2) => 1 - 0.12 * Math.sin(clamp((T2 - o.tAction - 0.05) / 0.18) * Math.PI);
      F.sfx(o.tAction + 0.05, 'm:ui-button', -16);
      tip = { x: bx, y: by };
    }
    tool.zi = 900;
    const q = B.big(s0, o.question || K.question, 1450, 150, { t0: o.tAction - 0.12, in: 'pop', r: -3, sfx: 'm:premium-pop-2', gain: -14 });
    q.zi = 1200; q.t1 = F.GEN.t0 - 0.32; q.kout = 'pop'; q.dout = 0.25;
    B.TIP = tip;
    return { card: ct, tool, question: q, tip };
  };

  /* ---------- the opening titles on the brand's colour ---------- */
  // s0: the hook, sg: the titles' screen (F.screen('titles', F.GEN.t0, F.GEN.t1, { accent: true, dof: 0, push: 0.05 })),
  // s1: the screen after. o: { docs: 4 pictures (the episode's real documents, printed black and white),
  // series: 'Before you sign', subject: 'The PureTech engine' }. NEVER an episode number on screen.
  B.titles = (s0, sg, s1, o) => {
    const G = sg.t0;
    (o.docs || []).slice(0, 4).forEach((src, i) => {
      const [x, y, r, z] = [[330, 240, -8, -520], [1600, 250, 7, -380], [300, 860, 5, -640], [1620, 860, -6, -460]][i];
      const e = F.photoEl(sg.cam, src, 600, 360, { seed: 90 + i, cls: 'bw' });
      F.item(sg, e, x, y, { t0: G + 0.05 + i * 0.06, in: 'deep', r, z, float: 1, focusable: false, lift: false });
    });
    const st = F.el('div', 'g-stamp3', sg.cam, o.series || '');
    const sti = F.item(sg, st, 960, 480, { t0: G + 0.55, in: 'slam', din: 0.3, r: -4, float: 0.2, focusable: false, lift: false });
    sti.zi = 3000;
    const sub = F.el('div', 'g-sub2 lift', sg.cam, `${BR.logo ? `<img src="${BR.logo}">` : ''} ${T.series(BR.name)}${o.subject ? ` · <b>${o.subject}</b>` : ''}`);
    const subIt = F.item(sg, sub, 960, 700, { t0: G + 0.95, in: 'rise', float: 0.2, focusable: false });
    subIt.zi = 3000;
    if (BR.logo) {
      // the brand's mark, a tile that lands on the right (where a mascot would stand)
      const tile = F.el('div', 'g-tile lift', sg.cam, `<img src="${BR.logo}">`);
      const ti = F.item(sg, tile, 1590, 860, { t0: G + 0.4, in: 'pop', r: 6, float: 1, focusable: false });
      ti.zi = 2800;
    }
    const dc = F.el('canvas', 'dust', sg.root); dc.width = 1920; dc.height = 1080;
    const dust = F.dust(dc, { n: 64, seed: 4, color: '255,255,255', size: 1.2 });
    F.on((T2) => dust(T2, 1));
    F.leak(G + 0.5, 1.6, 0.6, 'w');
    F.rgb(G + 0.77, 0.35, 8); F.shake(G + 0.77, 0.35, 7);
    // the riser rises under the end of the hook, the BOOM impact lands with the stamp
    F.sfx(G - 1.3, 'grit', -19, { end: G + 0.02, key: true });
    F.sfx(G + 0.77, 'boom', -12, { key: true }); F.sfx(G + 0.75, 'm:cinematic-low-whoosh', -17, { align: 'peak', key: true });
    F.sfx(G + 0.95, 'm:premium-pop-2', -14);
    sg.camTo(G + 0.05, 960, 540, 1.07, 3.1);
    // hook → titles: an ink blot spreading from the pen's nib (or the cursor's point)
    const tip = o.inkFrom || B.TIP || { x: 960, y: 560 };
    B.ink(s0, sg, G + 0.2, tip.x, tip.y, 0.5);
    F.sfx(G - 0.02, 'p:mixkit-paper-quick-movement-2380', -14);
    // titles → what follows: the accent page tears away upward
    B.tear(sg, s1, sg.t1 - 0.05);
  };

  /* ---------- "Not yet." ---------- */
  B.notYet = (s, t0, t1, html) => {
    F.when(t0, 'B.notYet t0'); F.when(t1, 'B.notYet t1');
    const b = B.big(s, html || T.notYet, 660, 450, { t0: t0 - 0.08, in: 'slam', r: -2 });
    b.t1 = t1; b.kout = 'deep'; b.dout = 0.45;
    F.sfx(t0 - 0.02, 'm:thump-click', -12);
    return b;
  };

  /* ---------- chapter pages ---------- */
  // a numbered step (style P3, the default): o = { t0, t2, num, over: 'Point', title, photos: B.ph(...) }
  // a new part, no number (style V: "But watch out", "Remember"): o = { t0, t2, over, title, photos, style: 'V' }
  // t0 = 0.5 s before the first word announcing the chapter; t2 = the end of its title as said + 0.02 to 0.15 s.
  // The content of screen B starts at tr.reveal (returned).
  let chN = 0;
  B.chapter = (A, Bs, o) => {
    const i = chN++;
    const st = o.style || 'P3';
    return F.chapter(A, Bs, { style: st, over: o.over || (st === 'V' ? T.remember : T.point), num: st === 'V' ? null : (o.num ?? i + 1), title: o.title, photos: o.photos || B.pool(i), t0: o.t0, t2: o.t2, cur: i, idx: i });
  };

  /* ---------- a sticker ---------- */
  // key: the file img/stickers/<key>.png (plugins/video/motion/sticker.mjs). It spins in, floats, a sheen passes once.
  B.sticker = (s, key, x, y, t0, o = {}) => {
    F.when(t0, `the sticker « ${key} »`); F.whens(o, ['t1'], `the sticker « ${key} »`);
    const src = `img/stickers/${key}.png`;
    const st = F.el('div', 'car-st', s.cam), inn = F.el('div', 'car-in', st);
    if (o.w) st.style.width = o.w + 'px';
    F.img(`stickers/${key}.png`, '', inn);
    const sh = F.el('i', '', inn);
    const m = `url(${src}) center/100% 100% no-repeat`;
    sh.style.webkitMask = m; sh.style.mask = m;
    const it = F.item(s, st, x, y, F.defined({ t0, t1: o.t1, in: 'pop', float: 0.5, focusable: false, lift: false, sfx: 'm:premium-pop-1', gain: -14 }));
    F.sfx(t0 + 0.14, 'm:normal-pop-3', -17);
    const r0 = o.r ?? -6;
    F.on((T2) => {
      const d = T2 - t0, k = clamp(d / 0.55);
      inn.style.transform = `rotate(${(r0 - (1 - E.back(k)) * 18 + 1.2 * Math.sin(T2 * 2.4)).toFixed(2)}deg)`;
      sh.style.backgroundPosition = `${lerp(110, -10, clamp((d - 0.3) / 0.5)).toFixed(1)}% 0`;
    });
    return it;
  };

  /* ---------- the method: a big centred list ---------- */
  // s: the method's screen, R: when its content starts (tr.reveal of the "Remember" page).
  // rules: [[html, tStart, tCheck], …] (3 rules, short: 28 characters at most, or the list gets too small).
  //   tStart = when the voice starts the rule (the camera goes down to it, its text un-pixelates),
  //   tCheck = the end of the rule (its box ticks).
  // o: { stamp: { html, t, line (0, 1, 2), x }, blur: [[t0, t1], …] (when a GIF passes in front), tOverview }
  B.method = (s, R, rules, o = {}) => {
    F.when(R, 'B.method: when the list starts (ch.reveal)');
    rules.forEach(([h, a, b], i) => { F.when(a, `B.method rule ${i + 1} (« ${String(h).replace(/<[^>]*>/g, '')} ») tStart`); F.when(b, `B.method rule ${i + 1} tCheck`); });
    if (o.stamp) F.when(o.stamp.t, 'B.method stamp t');
    (o.blur || []).forEach(([a, b]) => { F.when(a, 'B.method blur t0'); F.when(b, 'B.method blur t1'); });
    F.whens(o, ['tOverview'], 'B.method');
    const N = rules.length;
    const tOv = o.tOverview ?? rules[N - 1][2] + 0.15;
    const mc = F.el('div', 'mt-cam', s.tw);
    const list = F.el('div', 'mt-list', mc, rules.map(([h], i) => `<div class="mt-row"><b>${i + 1}</b><i class="p1-box"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1" stroke-dashoffset="1"/></svg></i><span><em class="p1-mark"></em><u>${h}</u><u class="p1-ink">${h}</u></span></div>`).join(''));
    const rows = [...list.querySelectorAll('.mt-row')];
    const ROWH = 250, starts = rules.map((r) => r[1]);
    let stamp = null;
    if (o.stamp) {
      stamp = F.el('div', 'mt-stamp', list, o.stamp.html);
      stamp.style.left = (o.stamp.x ?? 520) + 'px'; stamp.style.top = ((o.stamp.line ?? 1) * ROWH + 186) + 'px';
    }
    let W = 0;                                             // the list's real width, measured once shown
    const blurs = o.blur || [];
    // the text of the rules not yet said, pixelated (a low-definition canvas enlarged without smoothing)
    const pix = rows.map((row) => {
      const sp = row.querySelector('span'), u = row.querySelector('u');
      const c = F.el('canvas', 'mt-pix', sp);
      return { c, u, ink: row.querySelector('.p1-ink'), txt: u.textContent, key: -1 };
    });
    const face = getComputedStyle(document.documentElement).getPropertyValue('--title').trim() || 'sans-serif';
    const drawPix = (p, bs) => {
      const w = p.u.offsetWidth, h = p.u.offsetHeight;
      if (!w) return;
      const k = Math.round(bs * 10);
      if (k === p.key) return;
      p.key = k;
      const cw = Math.max(1, Math.ceil(w / bs)), chh = Math.max(1, Math.ceil(h / bs));
      p.c.width = cw; p.c.height = chh;
      p.c.style.width = cw * bs + 'px'; p.c.style.height = chh * bs + 'px';
      if (!p.full) {                                       // the text at full definition, once
        p.full = document.createElement('canvas'); p.full.width = w; p.full.height = h;
        const f = p.full.getContext('2d');
        f.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2A2840';
        f.font = `700 106px ${face}`; f.textBaseline = 'middle'; f.letterSpacing = '-4.8px';
        f.fillText(p.txt, 0, h / 2);
      }
      const g = p.c.getContext('2d');
      g.clearRect(0, 0, cw, chh);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(p.full, 0, 0, cw, chh);
    };
    const MOVE = 0.8;
    // the motion blur of the slide (vertical, strongest mid-move)
    F.MB.push((T2) => { let v = 0; for (let i = 1; i < N; i++) { const u = clamp((T2 - starts[i] + 0.1) / MOVE); v = Math.max(v, Math.sin(u * Math.PI) ** 2); } return T2 > s.t0 - 0.3 && T2 < s.t1 ? [0, v * 22] : [0, 0]; });
    F.on((T2) => {
      if (T2 < s.t0 - 0.6 || T2 > s.t1 + 0.6) return;
      if (!W) W = Math.max(...rows.map((r) => r.querySelector('span').offsetLeft + r.querySelector('u').offsetWidth));
      if (!W) return;
      let cur = 0; for (let i = 0; i < N; i++) if (T2 >= starts[i]) cur = i;
      const yOf = (i) => i * ROWH + ROWH / 2;
      let cy = yOf(0), mv = 0;
      for (let i = 1; i < N; i++) {
        const u = clamp((T2 - starts[i] + 0.1) / MOVE);
        cy = lerp(cy, yOf(i), E.io(u));
        mv = Math.max(mv, Math.sin(u * Math.PI));            // moving: in perspective; still: straight
      }
      const ov = E.io(clamp((T2 - tOv) / 0.9));
      cy = lerp(cy, ((N - 1) * ROWH) / 2 + ROWH / 2, ov);
      const uIn = clamp((T2 - R + 0.1) / 1.0), ein = E.out5(uIn);
      // round 11 (Ihsane: « it should simply go down, a bit with a motion effect; the list tilting back up is too weird »):
      // straight at every moment, no perspective; from one rule to the next the list slides, with a vertical motion blur
      const rx = 0, ry = 0, rz = 0;
      const sc = lerp(0.9, 1, ein) * lerp(1, N > 3 ? 0.78 : 0.86, ov);
      list.style.transformOrigin = `${W / 2}px ${cy}px`;
      list.style.transform = `translate(${960 - W / 2}px,${(540 - cy).toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      let gif = 0;
      for (const [a, b] of blurs) if (T2 >= a && T2 < b) gif = Math.max(gif, Math.min(E.out(clamp((T2 - a) / 0.25)), 1 - E.in(clamp((T2 - b + 0.3) / 0.3))));
      rows.forEach((row, i) => {
        const bl = (1 - ein) * 6 + gif * 7;
        row.style.filter = bl > 0.1 ? `blur(${bl.toFixed(1)}px)` : '';
        const unlock = clamp((T2 - starts[i] + 0.05) / 0.35);
        const p = pix[i];
        if (unlock < 1) { drawPix(p, lerp(16, 3, E.in2(unlock))); p.c.style.display = 'block'; p.c.style.opacity = (1 - E.in(unlock)).toFixed(3); }
        else p.c.style.display = 'none';
        p.u.style.opacity = E.out(unlock).toFixed(3);
        row.style.opacity = (T2 < starts[i] - 0.2 ? 0.75 : 1).toFixed(2);
        const km = F.p(T2, starts[i] + 0.05, 0.4, E.out);
        row.querySelector('.p1-mark').style.transform = `scaleX(${km.toFixed(3)})`;
        p.ink.style.clipPath = `inset(-20% ${((1 - km) * 100).toFixed(1)}% -20% -2%)`;
        const kc = F.p(T2, rules[i][2], 0.3, E.io);
        F.draw(row.querySelector('path'), kc);
        const pop = T2 >= rules[i][2] && T2 < rules[i][2] + 0.35 ? Math.sin(((T2 - rules[i][2]) / 0.35) * Math.PI) * 0.18 : 0;
        row.querySelector('.p1-box').style.transform = `scale(${(1 + pop).toFixed(3)})`;
      });
      if (stamp) {
        const ks = E.out5(clamp((T2 - o.stamp.t + 0.05) / 0.3));
        stamp.style.opacity = clamp(ks * 4).toFixed(3);
        stamp.style.transform = `rotate(${(-8 + (1 - ks) * -6).toFixed(2)}deg) scale(${lerp(2.2, 1, ks).toFixed(3)})`;
        stamp.style.filter = ks < 1 ? `blur(${((1 - ks) * 10).toFixed(1)}px)` : '';
      }
    });
    for (let i = 1; i < N; i++) F.MB.push((T2) => { const u = clamp((T2 - starts[i] + 0.1) / MOVE); return [0, u > 0 && u < 1 ? Math.sin(u * Math.PI) * 14 : 0]; });
    rules.forEach(([, a, b], i) => { F.sfx(a + 0.05, 'p:mixkit-paper-quick-movement-2380', -15); F.sfx(b + 0.15, 'm:ui-select', -13); F.rgb(b + 0.1, 0.3, 4); if (i) F.sfx(a - 0.05, 'm:smooth-fast-whoosh', -20, { align: 'peak' }); });
    F.sfx(R + 0.2, 'm:cinematic-fast-normal-whoosh', -18, { align: 'peak' });
    if (stamp) { F.sfx(o.stamp.t + 0.15, 'm:thump-click', -10); F.shake(o.stamp.t + 0.17, 0.3, 5); }
    F.sfx(tOv + 0.3, 'm:cinematic-low-whoosh', -18, { align: 'peak' });
    F.leak(tOv + 0.2, 1.4, 0.45, 'w');
    return { list, rows };
  };

  /* ---------- the brand's segment, on its colour, sharp (never torn or worn) ---------- */
  // s: F.screen('brand', …, { accent: true, dof: 0, push: 0.03 }).
  // o: { tName (the brand's name said), tCount (the word where the counter starts, just after),
  //      tBefore ("more than"), tNumber (the number said: it slams), tAfter (what it counts: "checkpoints"),
  //      number: 400, numberText: '400', before: 'More than', after: 'checkpoints',
  //      card: { title, subtitle, badge, grade: 'A' | null, items: [the N items the voice lists] }, tCard (its arrival),
  //      items: [an instant per item: each lands on its word, highlighted], chip: { html, t } }
  B.brand = (s, o) => {
    F.when(o.tName, 'B.brand tName'); F.when(o.tNumber, 'B.brand tNumber'); F.when(o.tCard, 'B.brand tCard');
    F.whens(o, ['tCount', 'tBefore', 'tAfter'], 'B.brand');
    (o.items || []).forEach((t, i) => F.when(t, `B.brand items[${i}]`));
    if (o.chip) F.when(o.chip.t, 'B.brand chip t');
    const tNum = o.tNumber + 0.04, tBefore = o.tBefore ?? o.tNumber - 0.5, tCard = o.tCard, tA = tCard + 0.45;
    const logo = F.el('div', 'c-logo', s.cam, `${BR.logo ? `<img src="${BR.logo}">` : ''}${BR.name}`);
    const lIt = F.item(s, logo, 960, 170, { t0: o.tName - 0.12, in: 'pop', float: 0.2, focusable: false, lift: false, sfx: 'm:premium-pop-3', gain: -15 });
    lIt.zi = 3000;
    // a grid of dots: one dot is born in the middle, opens in a wave, then swirls and becomes the card's outline
    const cv = F.el('canvas', 'c-dots', s.cam); cv.width = 1920; cv.height = 1080;
    const g = cv.getContext('2d');
    const GX = 25, GY = 12, SP = 62, dots = [];
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) dots.push({ x: 960 + (i - (GX - 1) / 2) * SP, y: 560 + (j - (GY - 1) / 2) * SP, r: F.rand(i * 31 + j * 7) });
    const per = (k) => {
      const w = 620, h = 760, Lp = 2 * (w + h), d = k * Lp;
      if (d < w) return [960 - w / 2 + d, 560 - h / 2];
      if (d < w + h) return [960 + w / 2, 560 - h / 2 + d - w];
      if (d < 2 * w + h) return [960 + w / 2 - (d - w - h), 560 + h / 2];
      return [960 - w / 2, 560 + h / 2 - (d - 2 * w - h)];
    };
    const tDot = (o.tCount ?? o.tName + 0.4) - 0.15;
    const onV = getComputedStyle(document.documentElement).getPropertyValue('--on-v').trim() || '#fff';
    s.on((T2) => {
      g.clearRect(0, 0, 1920, 1080);
      if (T2 < tDot) return;
      const swirl = E.io(clamp((T2 - tCard + 0.35) / 0.6)), gone = clamp((T2 - tCard - 0.35) / 0.25);
      if (gone >= 1) return;
      dots.forEach((d, k) => {
        const dist = Math.hypot(d.x - 960, d.y - 560);
        const ap = clamp((T2 - tDot - 0.12 - dist / 1500) / 0.18);
        if (ap <= 0 && T2 > tDot + 0.12) return;
        const wave = Math.max(0, 1 - Math.abs((T2 - tNum) * 1400 - dist) / 120);
        const [px, py] = per(k / dots.length);
        const a = swirl * Math.PI * 1.4;
        const cx = 960 + (d.x - 960) * Math.cos(a) - (d.y - 560) * Math.sin(a), cyy = 560 + (d.x - 960) * Math.sin(a) + (d.y - 560) * Math.cos(a);
        const x = lerp(cx, px, swirl), y = lerp(cyy, py, swirl);
        const r = T2 < tDot + 0.12 ? (k === Math.floor(dots.length / 2) ? 7 * E.back(clamp((T2 - tDot) / 0.12)) : 0) : 3.2 + wave * 3;
        g.globalAlpha = (T2 < tDot + 0.12 ? 1 : ap * (0.35 + 0.35 * d.r + wave * 0.5)) * (1 - gone);
        g.fillStyle = onV;
        g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.2832); g.fill();
      });
      g.globalAlpha = 1;
    });
    // "More than 400 checkpoints": the counter rolls, then slams
    const plus = F.el('div', 'c-plus', s.cam, o.before ?? T.moreThan);
    if (o.before !== '') F.item(s, plus, 960, 380, { t0: tBefore - 0.08, t1: tCard - 0.1, in: 'pop', out: 'fade', float: 0, focusable: false, lift: false });
    const cnt = F.el('div', 'c-count', s.cam, '<span>0</span>');
    F.item(s, cnt, 960, 540, { t0: tBefore, t1: tCard - 0.1, in: 'fade', out: 'fly', float: 0, focusable: false, lift: false });
    const num = cnt.querySelector('span');
    const target = +o.number || 0, fmt = (v) => (o.numberText && v === target ? o.numberText : Math.round(v).toLocaleString(F.LANG === 'fr' ? 'fr-FR' : 'en-US'));
    const pts = F.el('div', 'c-sub', s.cam, o.after || '');
    if (o.after) F.item(s, pts, 960, 700, { t0: (o.tAfter ?? tNum + 0.3) - 0.06, t1: tCard - 0.1, in: 'rise', out: 'fade', float: 0, focusable: false, lift: false });
    s.on((T2) => {
      const k = clamp((T2 - tBefore) / Math.max(0.2, tNum - tBefore));
      num.textContent = fmt(k >= 1 ? target : target * E.out(k));
      const imp = T2 >= tNum ? Math.exp(-(T2 - tNum) * 9) : 0;
      num.style.transform = `scale(${(1 + 0.12 * imp).toFixed(3)})`;
    });
    F.rgb(tNum, 0.35, 9); F.shake(tNum, 0.3, 6); F.leak(tNum, 1.2, 0.5, 'w');
    F.sfx(tDot, 'm:premium-pop-1', -15); F.sfx(tDot + 0.14, 'm:data-whoosh', -17); F.sfx(tBefore, 'm:cinematic-fast-normal-whoosh', -19, { align: 'peak' });
    F.sfx(tNum, 'm:thump-click', -8); F.sfx(tNum + 0.02, 'm:cinematic-low-whoosh', -16, { align: 'peak' });
    // the brand's card arrives in perspective; the grade (if any) slams
    const C = o.card || {};
    const items = C.items || [];
    const grades = C.grade ? ['A', 'B', 'C', 'D', 'E'].map((x) => `<i class="${x === C.grade ? 'a' : ''}">${x}</i>`).join('') : '';
    const card = F.el('div', 'c-card', s.cam, `<div class="cc-h">${BR.logo ? `<img src="${BR.logo}">` : ''}<div><b>${C.title || ''}</b><small>${C.subtitle || ''}</small></div>${C.badge !== '' ? `<span>${C.badge || T.verified}</span>` : ''}</div>${grades ? `<div class="cc-g">${grades}</div>` : ''}<ul>${items.map((x) => `<li>${x}<em>${B.I.check}</em></li>`).join('')}</ul>`);
    const kIt = F.item(s, card, 960, 585, { t0: tCard, in: 'none', float: 0.4, focusable: false, lift: false });
    const big = card.querySelector('.cc-g .a'), lis = [...card.querySelectorAll('li')];
    // o.items: when the voice says each item: each line lands on its word, highlighted, and the camera comes closer:
    // towards the items (y 600) and up to 1.12, as close as the 60 px margins allow until the end of the screen's slow
    // push (the logo at the top, the chip or the card at the bottom), measured once the faces are loaded
    const fam = o.items && o.items.length === items.length && items.length ? o.items : null;
    let pinEl = null;
    if (fam) {
      const key = [fam[0] - 0.35, 960, 600, 1.12, 0.8];
      s.keys.push(key);
      F.MEASURE.push(() => {
        if (!card.offsetHeight) return;
        const top = 170 - logo.offsetHeight / 2, bottom = Math.max(585 + (card.offsetHeight * 1.06) / 2, pinEl ? 1000 + pinEl.offsetHeight / 2 : 0);
        const z = Math.max(1, Math.min(1.12, (1080 - 2 * 60) / ((bottom - top) * (1 + s.push)))), half = 480 / (z * (1 + s.push));
        key[2] = Math.min(Math.max(600, bottom - half), top + half);
        key[3] = z;
      });
      fam.forEach((t) => F.sfx(t - 0.08, 'm:ui-select', -16));
    }
    const fkOf = (T2) => E.back2(T2 >= tCard ? clamp((T2 - tCard) / 0.7) : 0);
    kIt.rf = (T2) => { const f1 = fkOf(T2); return [38 * (1 - f1) + 3 * Math.sin(T2 * 0.9), -46 * (1 - f1) + 5 * Math.sin(T2 * 0.7 + 1)]; };
    kIt.sf = (T2) => lerp(0.45, 1.06, Math.min(fkOf(T2), 1.03));
    s.on((T2) => {
      const fk = T2 >= tCard ? clamp((T2 - tCard) / 0.7) : 0;
      card.style.opacity = clamp(fk * 5).toFixed(3);
      if (big) { const ak = clamp((T2 - tA) / 0.3); big.style.transform = `scale(${T2 < tA ? 1 : lerp(2.6, 1, E.out5(ak)).toFixed(3)})`; big.classList.toggle('on', T2 >= tA); }
      lis.forEach((li, i) => {
        const t0 = fam ? fam[i] - 0.08 : tA + 0.15 + i * 0.07;
        const k2 = E.back(clamp((T2 - t0) / 0.3)); li.style.opacity = clamp(k2 * 3).toFixed(2); li.style.transform = `translateX(${((1 - k2) * 40).toFixed(1)}px)`;
        if (fam) { const h = T2 >= t0 ? Math.max(0, 1 - (T2 - t0) / 0.9) : 0; li.style.setProperty('--hl', h.toFixed(3)); }
      });
    });
    F.sfx(tCard, 'm:smooth-fast-whoosh', -17, { align: 'peak' });
    if (big) { F.sfx(tA, 'boom', -14, { key: true }); F.rgb(tA, 0.3, 6); }
    if (o.chip) {
      const pin = (pinEl = F.el('div', 'c-loc', s.cam, o.chip.html));
      const pinIt = F.item(s, pin, 960, 1000, { t0: o.chip.t - 0.05, in: 'rise', float: 0.2, focusable: false, lift: false, sfx: 'm:premium-pop-2', gain: -16 });
      pinIt.zi = 3000;
    }
  };

  /* ---------- the summary ---------- */
  // o: { left: { src (the document's picture, printed and pinned), label (html), t },
  //      right: { src (the brand's photo: a real one, reportage-like, never a montage), t, tLabel, label (html) },
  //      cta: { … B.cta's options } }
  B.summary = (s, o) => {
    F.when(o.left.t, 'B.summary left.t'); F.when(o.right.t, 'B.summary right.t'); F.whens(o.right, ['tLabel'], 'B.summary right');
    const g = o.left, d = o.right;
    const de = F.photoEl(s.cam, g.src, 760, 480, { seed: 71, pin: true, cls: g.cls || '' });
    const dIt = F.item(s, de, 560, 450, { t0: s.t0, in: 'drop', r: -3, lift: false });
    const l1 = F.callout(s, g.label, 560, 830, { cls: 'dark', t0: g.t });
    let pIt;
    if (d.src) {
      const ph = F.el('div', 'c-photo', s.cam, `<img src="img/${d.src}">`);
      pIt = F.item(s, ph, 1380, 450, { t0: d.t - 0.2, in: 'fly', r: 3, lift: false, sfx: 'm:cinematic-fast-normal-whoosh', gain: -19 });
    } else {
      // no photo of the brand: its mark, big, on a white card
      const ph = F.el('div', 'c-photo c-mark', s.cam, BR.logo ? `<img src="${BR.logo}">` : `<b>${BR.name}</b>`);
      pIt = F.item(s, ph, 1380, 450, { t0: d.t - 0.2, in: 'fly', r: 3, lift: false, sfx: 'm:cinematic-fast-normal-whoosh', gain: -19 });
    }
    const l2 = F.callout(s, d.label || `<b style="position:static">${BR.name}</b>`, 1360, 830, { cls: 'v', t0: (d.tLabel ?? d.t + 0.4) - 0.1 });
    s.focusOn(g.t - 0.1, [dIt, l1]).focusOn(d.t - 0.2, [pIt, l2]);
    if (o.cta) { l1.t1 = l2.t1 = o.cta.t - 0.15; B.cta(s, o.cta); }
  };

  /* ---------- the call (on a horizontal video, never "save this video": the site on screen, and the phone when the
     brand has one) ---------- */
  // o: { t (the question starts), title (html; T.ctaQuestion by default),
  //      rows: [{ icon: 'phone' | 'cal' | 'mail' | 'link', text, small (the button's words), t (its word), kind }],
  //      place (html, optional: where the brand is) }. The summary recedes, the contact card arrives in the middle.
  // A row's look follows its kind, never its place: 'tel' (the phone: the accent's tint), 'web' (the site, a mail, a
  // link); kind is read from the icon when it is not given. A call with the site alone is a normal call.
  B.cta = (s, o) => {
    F.when(o.t, 'B.cta t');
    const rows = o.rows || [];
    rows.forEach((r, i) => F.whens(r, ['t'], `B.cta row ${i + 1}`));
    const kindOf = (r) => (r.kind === 'tel' || r.kind === 'web' ? r.kind : r.icon === 'phone' ? 'tel' : 'web');
    const card = F.el('div', 'c-cta lift', s.cam, `<div class="cta-h">${BR.logo ? `<img src="${BR.logo}">` : ''}<b>${o.title || T.ctaQuestion}</b></div>`
      + rows.map((r) => `<div class="cta-row ${kindOf(r)}"><i>${B.I[r.icon] || B.I.link}</i><span>${r.text}</span>${r.small ? `<small>${r.small}</small>` : ''}</div>`).join('')
      + (o.place ? `<div class="cta-loc">${B.I.pin} ${o.place}</div>` : ''));
    const it = F.item(s, card, 960, 540, { t0: o.t - 0.1, in: 'fly', float: 0.3, focusable: true, lift: true, sfx: 'm:cinematic-fast-normal-whoosh', gain: -18 });
    it.zi = 4000;
    s.focusOn(o.t - 0.1, [it]);
    [...card.querySelectorAll('.cta-row')].forEach((r, i) => {
      const t = rows[i].t ?? o.t + 0.4 + i * 0.5;
      F.on((T2) => { const k = E.back(clamp((T2 - t + 0.08) / 0.35)); r.style.opacity = clamp(k * 3).toFixed(3); r.style.transform = `translateX(${((1 - k) * 60).toFixed(1)}px) scale(${lerp(0.9, 1, clamp(k)).toFixed(3)})`; });
      F.sfx(t - 0.08, 'm:premium-pop-2', -15);
    });
    if (rows.length) F.leak(rows[rows.length - 1].t ?? o.t + 1, 1.2, 0.4, 'v');
  };

  /* ---------- the end card ---------- */
  // o: { series (the stamp), contact: true (the site and the phone; else "Every episode on <site>") }
  B.end = (sPrev, se, o = {}) => {
    const E0 = se.t0;
    const st = F.el('div', 'g-stamp2 end', se.cam, o.series || '');
    const sti = F.item(se, st, 800, 440, { t0: E0 + 0.25, in: 'slam', r: -5, float: 0.3, focusable: false, lift: false });
    sti.zi = 3000;
    F.sfx(E0 + 0.45, 'm:thump-click', -9);
    const line = o.contact ? `<b>${BR.site || ''}</b>${BR.phone ? `&nbsp;·&nbsp;${BR.phone}` : ''}` : `${T.allEpisodes} <b>${BR.site || ''}</b>`;
    const sub = F.el('div', 'g-sub lift', se.cam, `${BR.logo ? `<img src="${BR.logo}">` : ''} ${line}`);
    F.item(se, sub, 800, 630, { t0: E0 + 0.6, in: 'rise' });
    F.cut(sPrev, se, se.t0, 'cut', 0.04);
    if (BR.logo) {
      const tile = F.el('div', 'g-tile lift', se.cam, `<img src="${BR.logo}">`);
      F.item(se, tile, 1500, 520, { t0: E0 + 0.7, in: 'pop', r: 5, float: 1, focusable: false });
    }
    const H = B.host();
    if (H.poses.includes(o.hostPose || 'thumbs')) H.show({ t0: E0 + 0.5, t1: F.DUR + 2, pose: o.hostPose || 'thumbs', x: 1560, y: 1100, h: 820, from: 'bottom' });
  };

  /* ---------- simple transitions, with their sounds ---------- */
  // an ink blot from (cx, cy): towards an accent screen (the titles, the brand's segment)
  B.ink = (A, Bs, T2, cx = 960, cy = 560, d = 0.55) => {
    const tr = F.cut(A, Bs, T2, 'ink', d); tr.cx = cx; tr.cy = cy;
    F.sfx(T2 - 0.24, 'm:cinematic-fast-normal-whoosh', -17, { align: 'peak' });
    return tr;
  };
  // the page on top goes up, its edge torn: to leave an accent screen
  B.tear = (A, Bs, T2) => {
    const tr = F.cut(A, Bs, T2, 'tear', 0.5);
    F.sfx(T2 - 0.23, 'p:mixkit-paper-slide-1530', -12); F.sfx(T2 - 0.01, 'm:smooth-fast-whoosh', -18, { align: 'peak' });
    return tr;
  };
  // receding in depth: between two screens of one part, without a chapter page
  B.depth = (A, Bs, T2) => F.cut(A, Bs, T2, 'depth', 0.5);

  /* ---------- the host ---------- */
  // appearances without speaking, a different pose and place each time, never over a list, a stamp or a photo.
  // Declare them AT THE END of STORY (after the chapters): an appearance that falls during a chapter page waits for
  // its end. Only when the user gave cut-outs: window.HOST = ['explains', 'points-left', …] (img/host/<pose>.png).
  B.host = () => {
    if (B.H) return B.H;
    const poses = window.HOST || [];
    if (!poses.length) { B.H = { poses: [], show() { return B.H; }, update() {} }; return B.H; }
    const P = F.character(F.over, poses, (p) => `host/${p}.png`);
    const show = P.show;
    P.show = (o) => { for (const c of F.trans.filter((x) => x.kind === 'chap')) if (o.t0 > c.t0 - 0.2 && o.t0 < c.t3) o.t0 = c.t3 - 0.05; return show(o); };
    F.on((T2) => P.update(T2));
    B.H = P;
    return P;
  };

  /* ---------- a light dust over the whole film ---------- */
  B.dust = () => {
    const dc = F.el('canvas', 'dust', F.post); dc.width = 1920; dc.height = 1080;
    const dust = F.dust(dc, { n: 34, seed: 9, alpha: 0.75 });
    F.on((T2) => dust(T2, F.mediaOn(T2) ? 0 : 1));
  };
})();
