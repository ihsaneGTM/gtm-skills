#!/usr/bin/env node
// THE FEED'S SAFE ZONES — where a text or an important element may sit on a vertical short, every
// style (plugins/video/references/safe-zones.md). Ihsane, 2026-10-05, on two screenshots of a
// Reel: Instagram, TikTok and the others lay their own interface over the video (the account, the
// caption, the buttons, the progress bar), and our headlines were "tout collés en haut".
// Measured on those screenshots (923 × 2000, the video filling the screen), as fractions of the frame:
//   · SAFE      x 0.095 – 0.905, y 0.128 – 0.774: where text and what matters go
//   · FORBIDDEN the bottom band, y ≥ 0.79 (the account, the caption, the music, the bar), and the
//               column of buttons on the right, x ≥ 0.84 from y 0.425 down: never a text there,
//               never an important element
//   · DANGER    the rest (the top band under the app's tabs, the side margins): a small part of an
//               element may overflow into it when the framing forces it (a very tight shot), never
//               a whole line of text, and never as the rule
//
//   import { SAFE, zoneOf, clampToSafe } from "./safezones.mjs"
//   node safezones.mjs --overlay in.mp4 out.mp4   the zones drawn over a video,
//                                                  as on the screenshots
export const SAFE = { x0: 0.095, x1: 0.905, y0: 0.128, y1: 0.774 };
export const FORBIDDEN = [
  { x0: 0, x1: 1, y0: 0.79, y1: 1, name: "the bottom band (account, caption, bar)" },
  { x0: 0.84, x1: 1, y0: 0.425, y1: 1, name: "the buttons on the right" },
];
// the widest a centred element may be at a height y (the right column narrows the safe band)
export const halfWidthAt = (y0, y1 = y0) => (y1 > FORBIDDEN[1].y0 ? FORBIDDEN[1].x0 - 0.5 : SAFE.x1 - 0.5);

const inter = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
// a box in frame fractions { x0, x1, y0, y1 } → how much of it is forbidden, how much is outside the
// safe area, and its zone: "forbidden" if any of it is, "danger" if any of it is out of the safe
// area, else "safe"
export function zoneOf(b) {
  const area = Math.max(1e-9, (b.x1 - b.x0) * (b.y1 - b.y0));
  // the two forbidden rectangles overlap in their corner: count it once
  const f = inter(b, FORBIDDEN[0]) + inter(b, FORBIDDEN[1]) - inter(b, { x0: FORBIDDEN[1].x0, x1: 1, y0: FORBIDDEN[0].y0, y1: 1 });
  const out = area - inter(b, SAFE);
  // (half a percent of slack: a line fitted to the edge measures a hair over it)
  return { zone: f / area > 0.005 ? "forbidden" : out / area > 0.005 ? "danger" : "safe", forbidden: f / area, outside: out / area,
    where: FORBIDDEN.filter(z => inter(b, z) > 1e-6).map(z => z.name) };
}
// a box in px on a frame { w, h }
export const zoneOfPx = (b, frame) => zoneOf({ x0: b.x0 / frame.w, x1: b.x1 / frame.w, y0: b.y0 / frame.h, y1: b.y1 / frame.h });
// the shift (in frame fractions) that brings a box inside the safe area, when it fits there
export function clampToSafe(b) {
  const hw = halfWidthAt(b.y0, b.y1);
  const right = b.y1 > FORBIDDEN[1].y0 ? 0.5 + hw : SAFE.x1;
  let dx = 0, dy = 0;
  if (b.x0 < SAFE.x0) dx = SAFE.x0 - b.x0; else if (b.x1 > right) dx = right - b.x1;
  if (b.y0 < SAFE.y0) dy = SAFE.y0 - b.y0; else if (b.y1 > SAFE.y1) dy = SAFE.y1 - b.y1;
  return { dx, dy };
}

// ── the review overlay: the zones drawn over a video, as on the screenshots ──────────────────
const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("/safezones.mjs");
if (isMain) {
  const argv = process.argv.slice(2), i = argv.indexOf("--overlay");
  if (i < 0) { console.log("node safezones.mjs --overlay in.mp4 out.mp4"); process.exit(0); }
  const [IN, OUT] = [argv[i + 1], argv[i + 2]];
  const { spawnSync } = await import("node:child_process");
  const box = (z, color) => `drawbox=x=iw*${z.x0}:y=ih*${z.y0}:w=iw*${(z.x1 - z.x0).toFixed(4)}:h=ih*${(z.y1 - z.y0).toFixed(4)}:color=${color}:t=fill`;
  // the danger zone: the frame outside SAFE, a light red; the forbidden zones over it, a strong red
  const D = "red@0.22", F = "red@0.45";
  const danger = [{ x0: 0, x1: 1, y0: 0, y1: SAFE.y0 }, { x0: 0, x1: 1, y0: SAFE.y1, y1: 1 },
    { x0: 0, x1: SAFE.x0, y0: SAFE.y0, y1: SAFE.y1 }, { x0: SAFE.x1, x1: 1, y0: SAFE.y0, y1: SAFE.y1 }];
  const f1 = FORBIDDEN[0], f2 = { ...FORBIDDEN[1], y1: FORBIDDEN[0].y0 };
  const vf = [...danger.map(z => box(z, D)), box(f1, F), box(f2, F),
    `drawbox=x=iw*${SAFE.x0}:y=ih*${SAFE.y0}:w=iw*${(SAFE.x1 - SAFE.x0).toFixed(4)}:h=ih*${(SAFE.y1 - SAFE.y0).toFixed(4)}:color=white@0.7:t=3`];
  const still = /\.(jpe?g|png)$/i.test(OUT);
  const enc = still ? ["-frames:v", "1", "-q:v", "3"] : ["-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"];
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", IN, "-vf", vf.join(","), ...enc, OUT], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
