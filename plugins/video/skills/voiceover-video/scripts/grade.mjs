// The voiceover video's colour grade: the engine of /video-color-grade, copied here so the skill carries it (the grade
// skill is not in every app; its own page is not needed for the intro). Kept identical to
// plugins/video/skills/color-grade/scripts/grade.mjs: a change there is copied here.
//
// Color grade a raw take: the exposure brought down to where the bright zones sit right, the
// whitest zones pulled back (Premiere's Highlights slider), a touch of contrast and of vibrance.
// The original colours, no effect, no filter. Validated by Ihsane on 2026-10-12 ("Fort + vibrance
// + contraste") on four iPhone takes; this script measures each new take and adapts the exposure.
//
//   node grade.mjs <video> [--out <file>] [--strength auto|light|medium|strong|<EV>]
//                  [--vibrance 0.28] [--contrast 1.06] [--control] [--dry] [--status <file.json>]
//
// - An iPhone take is HDR (HLG, BT.2020): it STAYS HDR. Converting it to SDR first changes the
//   picture before any grade, and that was the whole problem of the first tries. HEVC Main 10,
//   HLG tags; the Dolby Vision metadata of the iPhone file is not kept (the HLG picture is).
// - An SDR take (Rec.709) gets the same moves, in SDR, H.264.
// - The exposure: the take's 90th percentile of luma (its bright zones) is brought to the level
//   Ihsane validated (HLG 0.775, SDR 0.80). Never brighter than the source (a dark take is barely
//   touched), never more than -1.2 EV. --strength scales it (light 0.5, medium 0.75, auto 1, strong 1.25,
//   never past -1.5 EV).
// - --control: the same chain with no move at all, to prove it leaves the picture as it was.
// Writes <out> and <out>.grade.json (what was measured, what was done, before and after);
// --status <file> keeps {state, step, progress} there while it runs (for the app's page).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const has = k => args.includes(k);
const STATUS = opt("--status", null);
const status = v => { if (STATUS) { const t = STATUS + ".tmp"; fs.writeFileSync(t, JSON.stringify({ ...v, pid: process.pid, at: Date.now() })); fs.renameSync(t, STATUS); } };
const input = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--control", "--dry"].includes(args[i - 1])));
process.on("uncaughtException", e => { status({ state: "error", error: e.message }); console.error(e.message); process.exit(1); });
if (!input || !fs.existsSync(input)) { console.error("usage: node grade.mjs <video> [--out file] [--strength auto|light|medium|strong|<EV>]"); process.exit(2); }

const run = (cmd, a, opts = {}) => {
  const r = spawnSync(cmd, a, { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || "").toString().slice(-600)}`);
  return r.stdout;
};

// ---------- what the take is ----------
function probe(f) {
  const j = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries",
    "stream=codec_type,codec_name,width,height,color_transfer,color_primaries,pix_fmt:stream_side_data=rotation:format=duration",
    "-of", "json", f]).toString());
  const v = j.streams.find(s => s.codec_type === "video");
  const rot = Math.abs(Number(v.side_data_list?.find(d => d.rotation != null)?.rotation || 0)) % 180 === 90;
  const transfer = v.color_transfer || "";
  return {
    duration: Number(j.format.duration), audio: j.streams.some(s => s.codec_type === "audio"),
    width: rot ? v.height : v.width, height: rot ? v.width : v.height,
    transfer, hdr: transfer === "arib-std-b67" ? "hlg" : transfer === "smpte2084" ? "pq" : null,
    tenBit: /10|12/.test(v.pix_fmt || ""),
  };
}

// the luma of 16 frames spread over the take (signal values, full range 0..1)
function measure(f, info, n = 16) {
  const all = [];
  for (let i = 0; i < n; i++) {
    const t = (info.duration * (i + 0.5)) / n;
    const buf = run("ffmpeg", ["-v", "error", "-ss", t.toFixed(2), "-i", f, "-frames:v", "1",
      "-vf", "scale=270:-2,scale=in_range=tv:out_range=pc,format=gray16le", "-f", "rawvideo", "-"]);
    for (let k = 0; k + 1 < buf.length; k += 2) all.push(buf.readUInt16LE(k) / 65535);
  }
  all.sort((a, b) => a - b);
  const pc = p => all[Math.min(all.length - 1, Math.floor((p / 100) * all.length))];
  const blown = all.filter(x => x > (info.hdr ? 0.88 : 0.95)).length / all.length;
  return { p10: +pc(10).toFixed(3), p50: +pc(50).toFixed(3), p90: +pc(90).toFixed(3), p98: +pc(98).toFixed(3), blownPct: +(blown * 100).toFixed(1) };
}

// ---------- transfer functions ----------
const A = 0.17883277, B = 0.28466892, C = 0.55991073;
const hlgToLin = e => (e <= 0.5 ? (e * e) / 3 : (Math.exp((e - C) / A) + B) / 12);
const linToHlg = l => (l <= 1 / 12 ? Math.sqrt(3 * Math.max(l, 0)) : A * Math.log(Math.max(12 * l - B, 1e-9)) + C);
const sdrToLin = e => Math.pow(Math.max(e, 0), 2.4);
const linToSdr = l => Math.pow(Math.max(l, 0), 1 / 2.4);

// ---------- the decision ----------
const STRENGTH = { light: 0.5, medium: 0.75, auto: 1, strong: 1.25 };
function decide(info, before) {
  const toLin = info.hdr ? hlgToLin : sdrToLin;
  const target = info.hdr ? 0.785 : 0.80;
  const s = opt("--strength", "auto");
  let ev;
  if (has("--control")) ev = 0;
  else if (STRENGTH[s] == null && isFinite(Number(s))) ev = Number(s);
  else {
    const full = Math.log2(toLin(target) / Math.max(toLin(before.p90), 1e-6));
    ev = Math.max(-1.5, Math.max(-1.2, Math.min(0, full)) * (STRENGTH[s] ?? 1));
  }
  const control = has("--control");
  return {
    exposureEV: +ev.toFixed(2),
    highlights: control ? null : { knee: info.hdr ? 0.62 : 0.70, amount: 0.55 },
    contrast: control ? 1 : Number(opt("--contrast", 1.06)),
    vibrance: control ? 0 : Number(opt("--vibrance", 0.28)),
  };
}

// ---------- the LUT (65^3, .cube) ----------
function lut(info, d, file) {
  const N = 65, toLin = info.hdr ? hlgToLin : sdrToLin, toSig = info.hdr ? linToHlg : linToSdr;
  const W = info.hdr ? [0.2627, 0.6780, 0.0593] : [0.2126, 0.7152, 0.0722];
  const gain = Math.pow(2, d.exposureEV);
  const lines = [`TITLE "GTM color grade"`, `LUT_3D_SIZE ${N}`];
  for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
    let lin = [ri, gi, bi].map(x => toLin(x / (N - 1)) * gain);
    // highlights: a soft knee on the signal luma, colours kept (scaled together in linear)
    if (d.highlights) {
      const Ys = Math.max(lin[0] * W[0] + lin[1] * W[1] + lin[2] * W[2], 1e-9);
      const Y = toSig(Ys), { knee, amount } = d.highlights;
      const t = Math.min(1, Math.max(0, (Y - knee) / (1 - knee)));
      const k = toLin(Y - (1 - knee) * amount * t * t) / Ys;
      lin = lin.map(x => x * k);
    }
    let o = lin.map(x => Math.min(1, Math.max(0, toSig(x))));
    let Y = o[0] * W[0] + o[1] * W[1] + o[2] * W[2];
    // contrast on the mids (pivot 0.45), the highlights left to the knee
    if (d.contrast !== 1) {
      const Yc = Math.min(1, Math.max(0, 0.45 + (Y - 0.45) * d.contrast));
      const w = 1 - Math.min(1, Math.max(0, (Y - 0.6) / 0.3));
      o = o.map(x => x + (Yc - Y) * w);
      Y = o[0] * W[0] + o[1] * W[1] + o[2] * W[2];
    }
    // vibrance: the dull colours lifted, the saturated ones and skin mostly left alone
    if (d.vibrance) {
      const mx = Math.max(...o), mn = Math.min(...o), s = (mx - mn) / Math.max(mx, 1e-6);
      const skin = o[0] > o[1] && o[1] > o[2] && s > 0.15 && s < 0.6;
      const k = 1 + d.vibrance * (1 - Math.min(1, s / 0.5)) * (skin ? 0.4 : 1);
      o = o.map(x => Y + (x - Y) * k);
    }
    lines.push(o.map(x => Math.min(1, Math.max(0, x)).toFixed(6)).join(" "));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
}

// ---------- the render ----------
function encoders() { return run("ffmpeg", ["-hide_banner", "-encoders"]).toString(); }
function render(info, cube, out) {
  const enc = encoders();
  const matrix = info.hdr ? "bt2020" : "bt709";
  const vf = `scale=in_color_matrix=${matrix}:in_range=tv:out_range=pc,format=gbrp16le,` +
    `lut3d=file='${cube.replace(/'/g, "'\\''")}':interp=tetrahedral,scale=out_color_matrix=${matrix}:out_range=tv,` +
    `format=${info.hdr || info.tenBit ? "yuv420p10le" : "yuv420p"}`;
  let v;
  if (info.hdr) {
    const tags = ["-color_primaries", "bt2020", "-color_trc", "arib-std-b67", "-colorspace", "bt2020nc", "-color_range", "tv", "-tag:v", "hvc1"];
    v = /libx265/.test(enc)
      ? ["-c:v", "libx265", "-crf", "16", "-preset", "medium", "-x265-params", "log-level=error:colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc:range=limited", ...tags]
      : ["-c:v", "hevc_videotoolbox", "-profile:v", "main10", "-q:v", "70", ...tags];
  } else {
    v = ["-c:v", "libx264", "-crf", "17", "-preset", "medium", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"];
  }
  return new Promise((ok, ko) => {
    const c = spawn("ffmpeg", ["-v", "error", "-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-vf", vf, ...v,
      "-c:a", "copy", "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", out]);
    let err = "", buf = "";
    c.stderr.on("data", x => { err += x; });
    c.stdout.on("data", x => {
      buf += x; const m = [...buf.matchAll(/out_time_us=(\d+)/g)].at(-1);
      if (m) status({ state: "running", step: "render", progress: Math.min(0.99, +m[1] / 1e6 / info.duration) });
      buf = buf.slice(-200);
    });
    c.on("close", code => code === 0 ? ok() : ko(new Error("ffmpeg failed: " + err.slice(-400))));
  });
}

// ---------- main ----------
const info = probe(input);
if (info.hdr === "pq") { console.error("This take is HDR10 (PQ): not supported yet, only iPhone HLG and SDR."); process.exit(3); }
status({ state: "running", step: "measure", progress: 0 });
const before = measure(input, info);
const d = decide(info, before);
const ext = info.hdr ? ".mov" : ".mp4";
const out = path.resolve(opt("--out", path.join(path.dirname(input), path.basename(input, path.extname(input)) + (has("--control") ? "-control" : "-graded") + ext)));
console.log(`take: ${info.width}x${info.height}, ${info.duration.toFixed(1)} s, ${info.hdr ? "HDR (HLG), stays HDR" : "SDR"}`);
console.log(`before: bright zones (p90) ${before.p90}, middle ${before.p50}, burnt white ${before.blownPct}%`);
console.log(`grade: exposure ${d.exposureEV} EV, highlights ${d.highlights ? "pulled" : "untouched"}, contrast ${d.contrast}, vibrance ${d.vibrance}`);
const report = { source: path.resolve(input), out, at: new Date().toISOString(), take: info, before, grade: d };
if (has("--dry")) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grade-"));
const cube = path.join(tmp, "grade.cube");
lut(info, d, cube);
fs.mkdirSync(path.dirname(out), { recursive: true });
const t0 = Date.now();
status({ state: "running", step: "render", progress: 0 });
await render(info, cube, out);
status({ state: "running", step: "check", progress: 1 });
fs.copyFileSync(cube, out + ".cube");
fs.rmSync(tmp, { recursive: true, force: true });

// check: the same length, the burnt white gone (or the same picture for --control)
const done = probe(out), after = measure(out, done);
report.after = after;
report.seconds = Math.round((Date.now() - t0) / 1000);
report.checks = {
  sameLength: Math.abs(done.duration - info.duration) < 0.15,
  staysHdr: !info.hdr || done.hdr === "hlg",
  burntWhite: has("--control") ? Math.abs(after.p50 - before.p50) < 0.01 : after.blownPct <= Math.min(before.blownPct, 2),
};
fs.writeFileSync(out + ".grade.json", JSON.stringify(report, null, 2));
console.log(`after: bright zones (p90) ${after.p90}, middle ${after.p50}, burnt white ${after.blownPct}%`);
console.log(`checks: ${Object.entries(report.checks).map(([k, v]) => `${k} ${v ? "ok" : "FAILED"}`).join(", ")}`);
console.log(`out: ${out} (${report.seconds} s)`);
const ok = Object.values(report.checks).every(Boolean);
status(ok ? { state: "done", out, report: out + ".grade.json" } : { state: "error", error: "a check failed", checks: report.checks });
if (!ok) process.exit(1);
