// THE FRAME of the explainer language: where the speaker sits, where the stage is, and when
// the speaker is full screen. One module for the drawing (stage.mjs: the hole in the black
// background, the captions, the stage) and for the picture (layout.mjs: the camera filters
// build.sh and preview.mjs run), so the hole and the picture behind it never disagree.
//
// Measured on the reference short (a 720x1280 export, scaled here to 1080x1920):
//   · the frame: x 46-674 of 720 (69 / 942 px at 1080), its top at y 936 of 1280 (1404 px),
//     running past the bottom edge; top corners of radius 32 at 720 (48 px)
//   · the speaker's head rises out of it (the person matte), by 0.39 head widths
//   · the caption: Inter, one word, baseline at y 865 of 1280 in the split (1297 px), 823 when
//     the speaker is full screen (1235 px), 58 and 66 px
//   · the title: two lines, baselines at 111 and 148 of 1280 (166 and 222 px), 55.7 px
//   · the ground: #050505 with a grid of dots every 12 px at 720 (18 px), phase (3, 2)
// 2026-10-05, the feed's safe zones (short-editor/scripts/safezones.mjs; Ihsane on screenshots of a
// Reel): the feed writes the account and the caption over the bottom fifth of the video, its tabs
// over the top eighth. The speaker's FACE, the captions and the title are kept out of them: the frame
// rises to y 0.64 (1229 px; the reference's 1404 put the chin under the feed's caption), the title
// comes down under the tabs (its first baseline at 0.156). The frame still runs past the bottom edge:
// the speaker's body may pass under the feed's interface, as in any talking-head video.
// project.json `stage` overrides any of it; `stage.crop` and `stage.full` are measured on the
// matte (layout.mjs --measure) for every new take.
export const REF = { W: 1080, H: 1920 };

export function geometry(P = {}) {
  const W = P.width ?? 1080, H = P.height ?? 1920;
  const K = W / REF.W, KY = H / REF.H;
  const S = P.stage ?? {};
  const box = {
    x: Math.round((S.boxX ?? 69 / 1080) * W),
    w: Math.round((S.boxW ?? 942 / 1080) * W / 2) * 2,
    top: Math.round((S.boxTop ?? 1229 / 1920) * H),
    r: Math.round((S.boxR ?? 48 / 1080) * W),
  };
  // the picture inside the frame: the whole source width, scaled into it; `crop` is the row of
  // the SOURCE (a fraction of its height) that sits on the frame's top edge
  const s = box.w / W;
  const bh = Math.round((H * s) / 2) * 2;
  // `pop`: how far the head rises out of the frame, px at 1080 (88 on the reference, whatever
  // the size of the head); layout.mjs --measure sets `crop` from it and the head's measured top
  const pop = (S.pop ?? 88) * K;
  const crop = S.crop ?? 0.2;
  const y0 = Math.round(box.top - crop * bh);
  // full screen: the source zoomed `zoom` times, the head centred on `x` (a fraction of the
  // width) with its top `y` (a fraction of the height) at `topAt` of the frame
  const full = { zoom: 1.45, x: 0.5, y: 0.12, topAt: 0.11, ...(S.full ?? {}) };
  // SHOTS: a take made of several shots (a source cut) has its framing measured per shot
  // (layout.mjs --measure): [{ from, to, crop, captionY, full }] in output seconds; the frame stays
  const shots = (S.shots ?? []).map(x => ({ ...x, crop: x.crop ?? crop }));
  const shotAt = t => shots.find(x => t >= x.from - 1e-6 && t < x.to - 1e-6) ?? null;
  const capY = c => Math.round(c != null ? c * H : box.top - pop - 20 * K);
  return {
    W, H, K, KY, box, s, bh, crop, y0, full, pop, shots, shotAt,
    cropAt: t => shotAt(t)?.crop ?? crop,
    fullAt: t => ({ ...full, ...(shotAt(t)?.full ?? {}) }),
    captionAt: t => capY(shotAt(t)?.captionY ?? S.captionY),
    // the stage: everything above the speaker's frame
    stage: { top: Math.round(0.135 * H), bottom: Math.round(0.655 * H) },
    caption: {
      // the caption sits 20 px above the top of the head (the reference: 1297 px with a pop of 88)
      // (the highest of the shots' captions: the stage keeps clear of every one)
      split: { y: Math.min(capY(S.captionY), ...shots.map(x => capY(x.captionY ?? S.captionY))), size: Math.round(58 * K) },
      full: { y: Math.round((S.captionFullY ?? 1235 / 1920) * H), size: Math.round(66 * K) },
    },
    title: { y1: Math.round(300 * KY), lead: Math.round(55.5 * KY), size: 55.7 * K },
    dots: { step: 18 * K, ox: 4.5 * K, oy: 3 * KY, r: 1.5 * K },
  };
}

// a full-screen window snapped to the frames, with the same rule on both sides: the frame at
// time t (k / fps) is full screen when a - q <= t < b - q, q a quarter of a frame. A window may
// carry its own framing as a third value ({ zoom, x, y, topAt }): a shot that is not the talking
// head (b-roll, a wide shot) is shown whole with { zoom: 1 }.
export const snap = (wins = [], fps = 30) => wins
  .filter(w => Array.isArray(w) && w[1] > w[0])
  .map(([a, b, f]) => [Math.round(a * fps) / fps, Math.round(b * fps) / fps, ...(f ? [f] : [])])
  .sort((x, y) => x[0] - y[0]);
export function windowAt(t, wins, fps = 30) {
  const q = 0.25 / fps;
  for (const w of wins) if (t >= w[0] - q && t < w[1] - q) return w;
  return null;
}
export const isFull = (t, wins, fps = 30) => !!windowAt(t, wins, fps);

// ── the camera ──────────────────────────────────────────────────────────────────────────────
// The SPLIT: the source scaled to the frame's width, its row `crop` on the frame's top edge,
// the rows above kept (the head rises out of the frame through the matte; the background
// layer hides the rest of the room). The FULL: the source zoomed on the head.
function fullCrop(g, framing = {}, tag = "v") {
  const F = { ...g.full, ...framing };
  // a PREVIEW (the next video, shown in a frame): `src`, the part of the source (fractions), scaled
  // into `rect` (px at 1080x1920), black around it (the stage draws the frame and its chrome); no person matte
  // there (the speaker's cut-out would cover the frame's corners)
  if (F.rect) {
    const s0 = F.src ?? { x: 0, y: 0, w: 1, h: 1 }, r = { x: F.rect.x * g.K, y: F.rect.y * g.KY, w: F.rect.w * g.K, h: F.rect.h * g.KY }, ev = n => Math.round(n / 2) * 2;
    return `crop=w=iw*${s0.w.toFixed(6)}:h=ih*${s0.h.toFixed(6)}:x=iw*${s0.x.toFixed(6)}:y=ih*${s0.y.toFixed(6)},scale=${ev(r.w)}:${ev(r.h)}:flags=lanczos,pad=${g.W}:${g.H}:${Math.round(r.x)}:${Math.round(r.y)}:color=black${tag === "m" ? ",lutyuv=y=0:u=128:v=128" : ""}`;
  }
  const z = Math.max(1, F.zoom), f = 1 / z;
  const fx = Math.min(1 - f, Math.max(0, F.x - f / 2));
  const fy = Math.min(1 - f, Math.max(0, F.y - F.topAt * f));
  return `crop=w=iw*${f.toFixed(6)}:h=ih*${f.toFixed(6)}:x=iw*${fx.toFixed(6)}:y=ih*${fy.toFixed(6)},scale=${g.W}:${g.H}:flags=lanczos`;
}
function splitPlace(g, crop = g.crop) {
  // the rows of the scaled source that land inside the frame of the video
  const y0 = Math.round(g.box.top - crop * g.bh);
  const from = Math.max(0, -y0), to = Math.min(g.bh, g.H - y0);
  const vh = Math.max(2, Math.floor((to - from) / 2) * 2);
  return `scale=${g.box.w}:${g.bh}:flags=lanczos,crop=${g.box.w}:${vh}:0:${from},pad=${g.W}:${g.H}:${g.box.x}:${Math.max(0, y0)}:color=black`;
}
// for build.sh: the whole timeline, the full windows switched on by time (`t` is the output
// time minus `offset`, where a slice starts); `tag` keeps the picture's and the matte's labels
// apart. One branch per framing: the talking head's, and each window's own.
export function cameraFilter(P, wins, { tag = "v", offset = 0 } = {}) {
  const g = geometry(P), fps = P.fps ?? 30, q = 0.25 / fps;
  // a window without its own framing takes its shot's (the head where it is in that shot).
  // Every window and shot is kept, even one over before `offset`: the graph of an excerpt (a
  // slice, a segment of build.sh) then has the very branches of the whole one. Its shape decides
  // the matte's format (an overlay takes no gray, so the mask is converted), and an excerpt built
  // otherwise came out a different picture from the same frames (2026-10-08).
  const W = snap(wins, fps).map(([a, b, f]) => [a - offset - q, b - offset - q, f ?? (g.shots.length ? g.fullAt(a) : undefined)]);
  // the layers, bottom up: the split of the first shot, the split of each other shot when it
  // plays, each full framing when its windows play
  const sh = g.shots.length > 1 ? g.shots.map(x => [x.from - offset - q, x.to - offset - q, x.crop]) : [];
  const layers = [];
  sh.slice(1).forEach(([a, b, crop]) => layers.push({ place: splitPlace(g, crop), wins: [[a, b]] }));
  const groups = new Map();
  for (const [a, b, f] of W) { const k = JSON.stringify(f ?? {}); if (!groups.has(k)) groups.set(k, { place: null, f: f ?? {}, wins: [] }); groups.get(k).wins.push([a, b]); }
  for (const grp of groups.values()) layers.push({ place: fullCrop(g, grp.f, tag), wins: grp.wins });
  const base = splitPlace(g, sh.length ? sh[0][2] : g.crop);
  if (!layers.length) return `fps=${fps},${base}`;
  const L = s => `[ex${tag}${s}]`;
  let out = `fps=${fps},split=${layers.length + 1}${L("s")}${layers.map((_, i) => L(`f${i}`)).join("")};${L("s")}${base}${L("o0")};`;
  layers.forEach((ly, i) => {
    const en = ly.wins.map(([a, b]) => `gte(t,${a.toFixed(4)})*lt(t,${b.toFixed(4)})`).join("+");
    out += `${L(`f${i}`)}${ly.place}${L(`c${i}`)};${L(`o${i}`)}${L(`c${i}`)}overlay=0:0:enable='${en}'${i < layers.length - 1 ? `${L(`o${i + 1}`)};` : ""}`;
  });
  return out;
}
// for preview.mjs: the one instant t, a plain chain
export function cameraAt(P, wins, t, tag = "v") {
  const g = geometry(P), w = windowAt(t, snap(wins, P.fps ?? 30), P.fps ?? 30);
  return w ? fullCrop(g, w[2] ?? (g.shots.length ? g.fullAt(w[0]) : {}), tag) : splitPlace(g, g.cropAt(t));
}
