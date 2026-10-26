// THE CALL RECORD — the words of the call, typed out as they are said (review, 2026-10-03).
//
// The big Impact headlines of the vertical language were judged too loud for a recorded
// call: no big bold words, no pops, no combination of faces. Four calm treatments were
// tested on the reference call (a live transcription panel, a message thread, classic
// subtitles, this one); the review picked THIS one, after trying the thread:
//   a monospaced transcript (Geist Mono 500, 37 px at 1080 wide) in the lower part of the
//   frame, the speaker's NAME in a column (bold; the caller yellow, the other voice white),
//   one paragraph per turn, each word typed letter by letter from its measured onset, a
//   block cursor, and the older rows scrolling up and fading out
// The record starts again at the bam: the hook is typed on its own, then the call.
//
//   record(U, { frame, names, labels, end })   U = utterances() of call.mjs
import fs from "node:fs";
import path from "node:path";
const ENGINE = new URL("../../short-editor/scripts/", import.meta.url).href;
const { F, GlobalFonts, clamp01, easeOutCubic } = await import(ENGINE + "scene.mjs");

// Geist Mono (Vercel, SIL Open Font License): fonts.mjs puts it in the project's
// assets/fonts; a copy installed on the Mac works too. Registered under its family name,
// both weights, so the CSS weight picks the file.
const FAMILY = "Geist Mono";
(function register() {
  const dirs = [path.resolve(process.cwd(), "assets", "fonts")];
  let n = 0;
  for (const d of dirs) for (const f of ["GeistMono-Medium.ttf", "GeistMono-Bold.ttf", "GeistMono-Medium.otf", "GeistMono-Bold.otf"]) {
    const p = path.join(d, f);
    try { if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, FAMILY)) n++; } catch {}
  }
  if (!n && !GlobalFonts.families.some(f => f.family === FAMILY))
    console.error(`  ⚠ ${FAMILY} not found: run the skill's fonts.mjs in the project (the record falls back to a system mono)`);
})();
const MONO = (w, s) => F(w, s, `"${FAMILY}", Menlo, monospace`);

function scrimBottom(ctx, W, H, top, alpha) {
  const g = ctx.createLinearGradient(0, top * H, 0, H);
  g.addColorStop(0, "rgba(8,9,12,0)"); g.addColorStop(0.45, `rgba(8,9,12,${(alpha * 0.6).toFixed(3)})`); g.addColorStop(1, `rgba(8,9,12,${alpha})`);
  ctx.fillStyle = g; ctx.fillRect(0, top * H, W, H - top * H);
}
const activeIndex = (U, t) => { let i = -1; for (let j = 0; j < U.length; j++) if (U[j].from <= t) i = j; else break; return i; };

export function record(U, {
  id = "dialogue", frame = { w: 1080, h: 1920 }, end,
  names = { A: "ME", B: "PROSPECT" }, labels = { A: "#FFD90D", B: "rgba(255,255,255,.80)" },
  // inside the feed's safe area (short-editor/scripts/safezones.mjs, 2026-10-05): the newest line
  // above the band where the feed writes the account and the caption (y 0.79), the lines ending
  // before the column of its buttons (x 0.84); it was bottom 0.80, x 0.07, width 0.86
  bottom = 0.755, x = 0.10, width = 0.74, size = 37, rows = 6,
}) {
  const W = frame.w, H = frame.h, K = W / 1080;
  const font = MONO(500, Math.round(size * K)), bold = MONO(700, Math.round(size * K));
  const LH = size * 1.45 * K, X = x * W;
  const col = Math.max(10, ...Object.values(names).map(n => n.length + 2));
  let built = null;
  const build = ctx => {
    ctx.font = font;
    const cw = ctx.measureText("M").width, per = Math.max(10, Math.floor((width * W) / cw) - col);
    // each turn is a paragraph: the name in its column, the words wrapped beside it
    const out = [];
    U.forEach((u, ui) => {
      let line = [], len = 0, first = true;
      const flush = () => { out.push({ ui, session: u.session, who: u.who, label: first, items: line }); line = []; len = 0; first = false; };
      u.words.forEach((w, wi) => {
        const L = w.disp.length;
        if (line.length && len + 1 + L > per) flush();
        const next = u.words[wi + 1]?.t ?? w.t + 0.4;
        line.push({ w, col: line.length ? len + 1 : 0, dt: Math.min(0.045, Math.max(0.012, (next - w.t) / Math.max(1, L))) });
        len = line.length > 1 ? len + 1 + L : L;
      });
      if (line.length) flush();
      out.push({ ui, session: u.session, gap: true, items: [] });
    });
    out.forEach(r => { r.t = r.items.length ? r.items[0].w.t : U[r.ui].to; });
    return { cw, rows: out };
  };
  const sessionAt = t => { let s = 0; for (const u of U) if (u.from <= t) s = u.session; else break; return s; };
  return {
    id, kind: "dialogue", from: 0, to: end, layer: "over", mutesCaptions: false, cues: () => [], utterances: U,
    draw(ctx, t, o = {}) {
      if (!built) built = build(ctx);
      const { cw, rows: R } = built;
      const session = sessionAt(t);
      const live = R.filter(r => r.session === session && r.t <= t);
      if (!live.length) return;
      const i = activeIndex(U, t);
      if (i < 0 || t > U[i].to + (U[i + 1] ? 0 : 0.3)) return;
      ctx.save();
      ctx.globalAlpha = clamp01((t - live[0].t) / 0.25);
      if (!o.ghost) scrimBottom(ctx, W, H, 0.44, 0.55);
      ctx.restore();
      // the newest row sits on the last line; the rows above move up as one is added
      const n = live.length, lastT = live[n - 1].t;
      const scroll = (n - 1) - (1 - easeOutCubic(clamp01((t - lastT) / 0.18)));
      ctx.save();
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 12 * K; ctx.shadowOffsetY = 3 * K;
      let cursor = null;
      live.forEach((r, k) => {
        const y = bottom * H - (scroll - k) * LH;
        const top = bottom * H - (rows - 1) * LH;
        const a = clamp01((y - (top - LH)) / (1.6 * LH));
        if (a <= 0 || r.gap) return;
        ctx.save(); ctx.globalAlpha *= a;
        if (r.label) { ctx.font = bold; ctx.fillStyle = labels[r.who] ?? "#FFFFFF"; ctx.fillText(names[r.who] ?? r.who, X, y); }
        ctx.font = font; ctx.fillStyle = "#FFFFFF";
        for (const it of r.items) {
          const typed = Math.min(it.w.disp.length, Math.floor((t - it.w.t) / it.dt) + 1);
          if (typed <= 0) continue;
          const xs = X + (col + it.col) * cw;
          ctx.fillText(it.w.disp.slice(0, typed), xs, y);
          cursor = { x: xs + typed * cw, y };
        }
        ctx.restore();
      });
      if (cursor && Math.floor(t * 2.2) % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(cursor.x + 3 * K, cursor.y - size * 0.78 * K, cw * 0.55, size * 0.92 * K); }
      ctx.restore();
    },
  };
}
