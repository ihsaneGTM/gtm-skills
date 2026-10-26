/* __TITLE__ · a filmed clip, dressed: the intro, or a cutback (intro.mjs writes this skeleton as film/intro-story.js or
   film/cutback-<n>-story.js; write it from references/example-intro-story.js or example-cutback-story.js). ONLY the layer
   BEHIND the user is drawn here, on a transparent page: intro.mjs composes it with ffmpeg on the real footage (30 fps,
   never through Chrome), the camera's punches applied to the footage and to the user's mask, the user cut out on top.
   Timed on the clip's own words (A(), Z()), at its speed.
   The text is the landscape editor's (settled in nine rounds, 2026-09): stacked lockups beside the head, left
   (x 0.055) or right (x 0.945), one side at a time, every row popping on the onset of the word it quotes, mixed type
   (a heavy sans, an italic serif), the payoff word big on the yellow marker; ink, one wide soft shadow. A screenshot =
   ONE big window behind the user; the tools = their square app icons out from behind the shoulders. The intro: two
   punches (1.20), none on its ending, its last block (the subject) held to the cut. A cutback: one lockup held to the
   cut, at most one lighter punch (1.12). Verbatim: every word on screen is said at that moment. */
window.SLUG = '__SLUG__';
window.STORY = () => {
  'use strict';
  const { el, item, sfx, clamp, lerp, E } = F;
  const A = (q, n = 1, after = 0) => F.at(q, n, after);
  const Z = (q, n = 1, after = 0) => F.end(q, n, after);
  const { I } = B;
  F.DUR = +(window.INTRO.n / 30).toFixed(3);

  /* ---------- the camera: punches on the footage (intro.mjs applies them; the cards do not move) ---------- */
  // [t, zoom, in (s), release (s)]: the landscape editor's validated punch (2026-09-07): 1.20 in 0.09 s on the payoff
  // word, released linearly over 5 s, anchored on the centre of the HEAD measured on the matte (x: the centroid of the
  // band 18 % under the top of the skull at the punch instants, 0.494–0.510 → 0.502; y: the eyes, 0.35). Two in the intro,
  // never one on the ending.
  window.INTRO_CAM = { anchor: [0.502, 0.35], punches: [] };
  const punch = (t, z = 1.2, din = 0.09, rel = 5) => window.INTRO_CAM.punches.push([F.when(t, 'a punch'), z, din, rel]);

  const css = document.createElement('style');
  css.textContent = `
  html,body,#stage{background:transparent!important}
  .post,.scr-bg{display:none!important}
  @font-face{font-family:"GTM Serif";src:url(fonts/InstrumentSerif-Italic.ttf) format("truetype")}
  .lk{left:0;top:0;width:1920px;height:1080px}
  .win{left:0;top:0;width:900px;border-radius:22px;background:#fff;overflow:hidden;box-shadow:0 40px 90px -30px rgba(28,26,46,.55),0 10px 30px -12px rgba(28,26,46,.35)}
  .win *{position:relative}
  .win-bar{display:flex;align-items:center;gap:10px;height:46px;padding:0 18px;background:#F4F4F6;border-bottom:1.5px solid #E8E7EE}
  .win-bar i{width:13px;height:13px;border-radius:50%;background:#D9D8DF}
  .win-bar span{margin-left:14px;font:600 19px/1 var(--text);color:#8A8896}
  .wsheet{width:900px;font:500 21px/1 var(--text);color:var(--ink)}
  .ws-bar{display:flex;align-items:center;gap:14px;height:62px;padding:0 22px;border-bottom:2px solid #EEEDF2;font:700 25px/1 var(--title);letter-spacing:-.02em;white-space:nowrap}
  .ws-bar b{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--v);color:var(--ink);font-size:22px}
  .ws-bar b svg{position:static}
  .ws-row{display:grid;grid-template-columns:44px 232px 176px 256px 192px;height:50px;border-bottom:1.5px solid #F0EEF6}
  .ws-row>div{display:flex;align-items:center;gap:10px;padding:0 12px;white-space:nowrap;overflow:hidden;border-right:1.5px solid #F0EEF6}
  .ws-row>div:last-child{border-right:0}
  .ws-row .av{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:none}
  .ws-row svg{flex:none}
  .ws-head{height:46px;background:#F7F7F9}
  .ws-head>div{font:700 16px/1 var(--text);letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}
  .ws-head>div.mk{background:var(--v);color:var(--ink)}
  .ws-n{justify-content:center;color:#A9A7B5;font-size:18px!important}
  .ws-e{color:#C9C6D8}
  .ws-e.got{color:var(--ink);font-size:18px}
  .ws-e.miss{background:#FFE9EA;color:var(--red);font:700 18px/1 var(--text)}
  .appico{left:0;top:0;width:210px;height:210px;background:none;border-radius:26%;filter:drop-shadow(0 28px 34px rgba(28,26,46,.38)) drop-shadow(0 8px 12px rgba(28,26,46,.22))}
  .appico img{left:-1px;top:-1px;width:212px;height:212px;display:block;clip-path:inset(1px round 26%)}
  `;
  document.head.appendChild(css);

  /* ---------- the lockups: the landscape editor's title(), drawn on a canvas, in the style « Document » ---------- */
  const s0 = F.screen('intro', 0, F.DUR + 1, { push: 0, dof: 0 });
  const cv = document.createElement('canvas'); cv.className = 'lk'; cv.width = 1920; cv.height = 1080;
  s0.root.appendChild(cv);
  const ctx = cv.getContext('2d');
  const spring = (u, freq = 3.1, damp = 5.2) => (u >= 1 ? 1 : u <= 0 ? 0 : 1 - Math.exp(-damp * u) * Math.cos(freq * Math.PI * u));
  const outQuint = (u) => 1 - Math.pow(1 - u, 5);
  const ioCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  // the words on the face shots: WHITE, the payoff word white on the yellow marker (Ihsane, 2026-10-15, acquisition-b2b:
  // picked over black words and over white words with the payoff word in yellow); a darker shadow carries the white on a light wall
  const INK = '#FFFFFF', YEL = getComputedStyle(document.documentElement).getPropertyValue('--v').trim() || '#FFD90D', RED = '#E5484D';
  const font = (r) => (r.k === 'serif' ? `400 ${r.size}px "GTM Serif"` : `800 ${r.size}px "GTM Title"`);
  const sans = (text, size, o = {}) => ({ text, k: 'sans', size, ...o });
  const serif = (text, size, o = {}) => ({ text, k: 'serif', size: Math.round(size * 1.12), ...o });
  const row = (t, ...runs) => ({ t, runs });
  const L = { x: 0.055, align: 'left' }, R = { x: 0.945, align: 'right' };
  const BLOCKS = [];
  // title({ from, to, x, y, align, lines, emerge }): rows land on their word (a spring pop, 0.72 → 1, a 44 px rise),
  // the hot run on its own yellow marker; the block leaves together in 0.3 s; `emerge`: it starts behind the user
  const title = (o) => {
    const b = { y: 0.13, exit: 0.3, enter: 0.42, leading: 0.98, emerge: 0, ...o };
    F.when(b.from, 'a title from'); F.when(b.to, 'a title to');
    b.lines.forEach((l) => { F.when(l.t, 'a title row'); l.runs.forEach((r) => { if (r.hot) sfx(l.t + 0.02, 'm:premium-pop-1', -19); }); });
    sfx(b.lines[0].t - 0.03, 'm:fast-whoosh-2', -26, { align: 'peak' });
    BLOCKS.push(b);
    return b;
  };
  const drawBlock = (b, T) => {
    if (T < b.from || T > b.to) return;
    const outK = 1 - ioCubic(clamp((T - (b.to - b.exit)) / b.exit));
    if (outK <= 0.005) return;
    ctx.save(); ctx.textBaseline = 'alphabetic';
    const rows = b.lines.map((l) => {
      let w = 0, size = 0;
      const parts = l.runs.map((r) => {
        ctx.font = font(r);
        const tx = typeof r.text === 'function' ? r.text(T) : r.text;
        // a counter (text as a function) is laid out on what it shows now: a right-aligned one grows to the left, its
        // right edge on the margin (acquisition-b2b: « 907K » measured as « 1M » ran off the frame); `rest` keeps its room
        // only when given, and the marker covers the value shown (tw)
        const rw = ctx.measureText(typeof r.text === 'function' && r.rest ? r.rest : tx).width;
        w += rw; size = Math.max(size, r.size);
        return { ...r, tx, w: rw, tw: typeof r.text === 'function' ? ctx.measureText(tx).width : rw };
      });
      return { ...l, parts, w, size };
    });
    const bw = Math.max(...rows.map((r) => r.w));
    const ax = b.x * 1920, ay = b.y * 1080;
    let cy = ay;
    rows.forEach((r) => { r.base = cy + r.size * 0.8; cy += r.size * b.leading; });
    const bx = b.align === 'right' ? ax - bw : ax;
    // a block never reaches the head (Ihsane's take, 2026-10-14: 600 px did, under a punch): scaled down to fit
    const fit = Math.min(1, (b.maxW || 520) / bw);
    if (fit < 1) { ctx.translate(ax, ay); ctx.scale(fit, fit); ctx.translate(-ax, -ay); }
    const drift = (1 - outK) * -18;
    const emK = b.emerge ? outQuint(clamp((T - rows[0].t) / (b.enter * 1.7))) : 1;
    if (b.emerge) ctx.translate((1 - emK) * b.emerge * 1920 * (b.align === 'right' ? -1 : 1), 0);
    for (const r of rows) {
      const k = spring(clamp((T - r.t) / b.enter));
      if (k <= 0.005) continue;
      let x = b.align === 'right' ? bx + bw - r.w : bx;
      for (const p of r.parts) {
        const rk = p.t != null ? spring(clamp((T - p.t) / b.enter)) : k;
        if (rk <= 0.005) { x += p.w; continue; }
        const slide = b.emerge ? 0 : (1 - outQuint(clamp(rk))) * 44;
        const sc = lerp(0.72, 1, clamp(rk)), rot = p.hot ? (1 - outQuint(clamp(rk))) * -0.06 : 0;
        ctx.save();
        ctx.globalAlpha = clamp(rk * 1.6) * outK;
        const px = x + p.w / 2, py = r.base - p.size * 0.36;
        ctx.translate(px, py + slide + drift); ctx.scale(sc, sc); ctx.rotate(rot); ctx.translate(-px, -py);
        ctx.font = font(p);
        if (p.hot) {                                   // the yellow marker passes under the payoff word once it landed
          const mk = ioCubic(clamp((T - (p.t ?? r.t) - 0.18) / 0.4));
          if (mk > 0) {
            ctx.save();
            ctx.shadowColor = 'rgba(28,26,46,.22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
            ctx.fillStyle = YEL;
            ctx.fillRect(x - p.size * 0.05, r.base - p.size * 0.36, (p.tw + p.size * 0.1) * mk, p.size * 0.42);
            ctx.restore();
          }
        }
        // ONE wide soft shadow under the ink (the landscape editor's rule: no tight rim)
        // a tight dark halo first, then ONE wide soft shadow (the landscape editor's rule: no tight rim of colour)
        ctx.shadowColor = 'rgba(20,18,30,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
        ctx.fillStyle = p.color || INK; ctx.fillText(p.tx, x, r.base);
        ctx.shadowColor = 'rgba(20,18,30,.45)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
        ctx.fillStyle = p.color || INK;
        ctx.fillText(p.tx, x, r.base);
        if (p.strike != null) {                        // struck out in red on its word (Document's slim bar)
          const sk = ioCubic(clamp((T - p.strike) / 0.4));
          if (sk > 0) { ctx.shadowColor = 'transparent'; ctx.fillStyle = RED; ctx.fillRect(x - 6, r.base - p.size * 0.3, (p.w + 12) * sk, Math.max(6, p.size * 0.07)); }
        }
        ctx.restore();
        x += p.w;
      }
    }
    ctx.restore();
  };
  s0.on((T) => { ctx.clearRect(0, 0, 1920, 1080); BLOCKS.forEach((b) => drawBlock(b, T)); });

  /* ---------- a window behind the user (a screenshot, a sheet): out from behind them, back the same way ---------- */
  const win = (html, label, x, y, t0, t1, fromX, o = {}) => {
    const e = el('div', 'win', s0.cam, `<div class="win-bar"><i></i><i></i><i></i><span>${label}</span></div>${html}`);
    const it = item(s0, e, x, y, { t0, t1: t1 + 0.34, in: 'none', float: 0, focusable: false, lift: false, r: o.r || 0, s: o.s || 1 });
    const k = (T) => outQuint(clamp((T - t0) / 0.5)) * (1 - ioCubic(clamp((T - t1) / 0.34)));
    it.xf = (T) => lerp(fromX, x, k(T));
    sfx(t0, 'p:mixkit-paper-slide-1530', -17);
    sfx(t1, 'm:fast-whoosh-2', -24, { align: 'peak' });
    return e;
  };
  // a real logo on a white chip, out from behind a shoulder, tilted, no label
  const chip = (html, x, y, t0, t1, fromX, r) => {
    const e = el('div', 'appico', s0.cam, html);   // not « chip »: the engine's theme has one, white
    const it = item(s0, e, x, y, { t0, t1: t1 + 0.3, in: 'none', out: 'fade', float: 0, focusable: false, lift: false, r });
    const k = (T) => outQuint(clamp((T - t0) / 0.45)) * (1 - ioCubic(clamp((T - t1) / 0.3)));
    it.xf = (T) => lerp(fromX, x, k(T));
    sfx(t0, 'm:premium-pop-1', -17);
    return e;
  };

  /* ---------- instants: the intro's own words (film/intro-words.js, made by intro.mjs) ---------- */
  const t = {};
  // TO WRITE, in the order of the text: t.lets = A("let's"); t.leads = A('leads'); …
  F.T = t;

  /* ========== one block per phrase that carries the hook, one side at a time (look.md § The intro, dressed) ========== */
  // title({ ...L, from: t.lets - 0.05, to: t.so + 0.1, lines: [
  //   row(t.lets, sans("Let's say", 72)),
  //   row(t.looking, serif("you're looking for", 80)),
  //   row(t.leads, sans('leads', 178, { hot: true })),
  // ] });
  // punch(t.leads);
  // chip('<img src="img/logos/apollo-icon.png">', 470, 600, t.apollo - 0.04, t.isE + 0.25, 860, -7);   // a named tool: its square icon
  // const w = win(sheetHTML, 'leads.csv', 1460, 500, t.list - 0.1, t.next - 0.35, 1000, { s: 0.92, r: 1.5 }); // a screenshot
  // the subject's name, out from behind the head, held to the last frame:
  // title({ ...L, from: t.called - 0.05, to: F.DUR + 1, emerge: 0.18, lines: [row(t.called, serif('called', 96)), row(t.name, sans('…', 150, { hot: true }))] });
};
