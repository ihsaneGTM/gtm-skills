// WHERE THE FACE IS, on the output timeline — so a meme lands ON the face and the crew stands
// AROUND the head, as on the reference.
//
//   node face.mjs            # from the project, after tighten.py: assets/faces.json (5 a second)
//
// As a library (plan.mjs): const F = faces(P, cam); F.at(t) → { x, y, w, h } (fractions of the
// frame, the face's box), F.slot() → where EVERY polaroid of the video lands, F.around(t, n) → n
// spots around the head, alternately left and right, F.top(t) → the height above the head.
// `cam` (book.mjs camera(STEPS)) maps them through the camera's zoom, so a figure set by the head
// stays by the head when the picture punches in. Without assets/faces.json (no swiftc),
// project.json `face` ({ x, y, w, h }, read on a preview frame) or a centred default stands in.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, "../../short-editor/scripts");
const FILE = () => path.resolve(process.cwd(), "assets", "faces.json");

export function faces(P = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8")), cam = null) {
  let data = null;
  try { data = JSON.parse(fs.readFileSync(FILE(), "utf8")); } catch {}
  const fallback = P.face ?? { x: 0.35, y: 0.30, w: 0.30, h: 0.17 };
  const at = t => {
    if (!data?.faces?.length) return fallback;
    const i = t * data.fps, a = Math.max(0, Math.min(data.faces.length - 1, Math.floor(i))), b = Math.min(data.faces.length - 1, a + 1);
    const fa = data.faces[a] ?? data.median, fb = data.faces[b] ?? fa, k = i - a;
    if (!fa) return fallback;
    return { x: fa[0] + (fb[0] - fa[0]) * k, y: fa[1] + (fb[1] - fa[1]) * k, w: fa[2] + (fb[2] - fa[2]) * k, h: fa[3] + (fb[3] - fa[3]) * k };
  };
  // the mean box over a window: a card does not follow the head, it is put where the face is
  const over = (t0, t1) => {
    const n = 6, acc = { x: 0, y: 0, w: 0, h: 0 };
    for (let i = 0; i < n; i++) { const f = at(t0 + (t1 - t0) * (i + 0.5) / n); acc.x += f.x / n; acc.y += f.y / n; acc.w += f.w / n; acc.h += f.h / n; }
    return acc;
  };
  // a point of the picture on screen at t (through the camera's zoom, when there is one)
  const scr = (t, p) => (cam ? { ...p, ...cam.map(t, p.x, p.y) } : p);
  const med = data?.median ? { x: data.median[0], y: data.median[1], w: data.median[2], h: data.median[3] } : fallback;
  return {
    known: !!data?.faces?.length,
    at, over, screen: scr,
    // where EVERY meme of the video goes (v3: « placés de manière beaucoup trop aléatoire »): one
    // place for the whole video, on the frame's centre line, so the polaroids land where the last one
    // did. v3.4 (« les gifs un peu trop petits: plus gros, un peu plus bas, pour qu'on les voie
    // bien »): 0.08 under the median face's centre (0.44-0.50), the middle of the screen, the
    // picture 0.80 of the width (cards.mjs), its chin clear of the captions
    // (2026-10-05, the feed's safe zones: x the middle of the band the print has between x 0.095
    // and 0.84, where card() fits it; the print shorter, so it ends above the captions)
    slot() { return { x: 0.4675, y: +Math.min(0.50, Math.max(0.44, med.y + med.h * 0.5 + 0.08)).toFixed(3) }; },
    // the face's own line: the frame's centre line at the median height of the face's centre
    // (0.36-0.50), for the key ideas and punch phrases written over the face
    faceLine() { return { x: 0.5, y: +Math.min(0.50, Math.max(0.36, med.y + med.h * 0.5)).toFixed(3) }; },
    // the centre of a card on the face (measured: the card's middle sits a little under the eyes)
    onFace(t0, t1 = t0 + 0.6) { const f = over(t0, t1); return { x: f.x + f.w / 2, y: f.y + f.h * 0.52 }; },
    // where a MEME goes: OVER THE FACE. Measured on 9 of the reference's: on the frame's centre line
    // (x 0.5) while the face was at 0.46-0.50, at the height of the face's centre. So: snapped to
    // the centre line when the face is within 0.06 of it, on the face when it is not (a speaker
    // sitting to one side must not peep out from behind the meme), never out of the frame.
    meme(t0, t1 = t0 + 0.6, w = 0.57) {
      const f = over(t0, t1), cx = f.x + f.w / 2;
      const x = Math.abs(cx - 0.5) < 0.06 ? 0.5 : Math.min(1 - w / 2 - 0.02, Math.max(w / 2 + 0.02, cx));
      return { x: +x.toFixed(3), y: +Math.min(0.62, Math.max(0.34, f.y + f.h * 0.5)).toFixed(3) };
    },
    // n spots around the head, alternately left and right, top to bottom (the crew of the hook)
    around(t0, t1, n = 6) {
      const f = over(t0, t1), cx = f.x + f.w / 2, out = [];
      const rows = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
        const dx = f.w * (0.95 + 0.25 * (row % 2)), y = f.y + f.h * (0.15 + row * (1.35 / Math.max(1, rows - 1)));
        const p = scr((t0 + t1) / 2, { x: cx + side * dx, y });
        // (sticker() keeps it inside the feed's safe area)
        out.push({ x: Math.max(0.19, Math.min(0.81, p.x)), y: Math.min(0.62, p.y) });
      }
      return out;
    },
    // above the head: a header or a keyword cluster sits there
    top(t0, t1 = t0 + 0.6) { const f = over(t0, t1); return Math.max(0.16, scr((t0 + t1) / 2, { x: 0.5, y: f.y - f.h * 0.75 }).y); },
  };
}

// ── the measurement ───────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
  const BIN = path.join(HERE, "native", "face"), SRC = path.join(HERE, "native", "face.swift");
  if (!fs.existsSync(BIN) || fs.statSync(BIN).mtimeMs < fs.statSync(SRC).mtimeMs) {
    console.error("compiling the Vision face tool (once per machine)…");
    const r = spawnSync("swiftc", ["-O", "-o", BIN, SRC], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) { console.error("swiftc failed (xcode-select --install); set project.json `face` by hand instead"); process.exit(1); }
  }
  const FPS = 5, TMP = path.resolve("tmp", "faces");
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  // the frames on the OUTPUT timeline: the engine's cuts and the speed, exactly as build.sh does
  const { videoGraph, cutsOf } = await import(pathToFileURL(path.join(ENGINE, "cuts.mjs")).href);
  const vcut = cutsOf(P).length ? videoGraph(P, "0:v", "vsrc") : "";
  const speed = P.speed ?? 1;
  const pre = speed !== 1 ? `setpts=PTS/${speed},` : "";
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", P.source, "-filter_complex",
    `${vcut}${vcut ? "[vsrc]" : "[0:v]"}${pre}fps=${FPS},scale=360:-2[out]`, "-map", "[out]",
    "-frames:v", String(Math.ceil(P.duration * FPS)), "-q:v", "4", path.join(TMP, "f%05d.jpg")], { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) process.exit(1);
  const files = fs.readdirSync(TMP).filter(f => f.endsWith(".jpg")).sort();
  fs.writeFileSync(path.join(TMP, "list.txt"), files.map(f => path.join(TMP, f)).join("\n"));
  const out = spawnSync(BIN, ["--list", path.join(TMP, "list.txt")], { encoding: "utf8", maxBuffer: 1 << 26 }).stdout;
  const byFile = new Map(out.split("\n").filter(Boolean).map(l => { const o = JSON.parse(l); return [path.basename(o.f), o]; }));
  const raw = files.map(f => { const o = byFile.get(f); return o && !o.none ? [o.x, o.y, o.w, o.h] : null; });
  // a median of 3 against a frame where Vision blinks
  const med = (arr, i, k) => { const v = [arr[i - 1], arr[i], arr[i + 1]].filter(Boolean).map(a => a[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const sm = raw.map((f, i) => (f ? [0, 1, 2, 3].map(k => +med(raw, i, k).toFixed(4)) : null));
  const found = sm.filter(Boolean);
  const median = found.length ? [0, 1, 2, 3].map(k => +found.map(f => f[k]).sort((a, b) => a - b)[Math.floor(found.length / 2)].toFixed(4)) : null;
  fs.mkdirSync("assets", { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify({ fps: FPS, median, faces: sm }));
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`assets/faces.json — a face on ${found.length}/${sm.length} frames` + (median ? ` · median box x ${median[0]} y ${median[1]} w ${median[2]} h ${median[3]}` : ""));
  if (found.length < sm.length * 0.6) console.log("  ⚠ the face is often not found: check a preview frame and set project.json `face` if the placements look off");
}
