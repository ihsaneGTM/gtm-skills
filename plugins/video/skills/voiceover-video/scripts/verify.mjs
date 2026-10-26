#!/usr/bin/env node
// The checks before delivery (after assemble.mjs): ✓ / ⚠ / ✗, and <run>/verify.json for the app.
//
//   node verify.mjs <run-dir> [--4k]
//
// The voice of each part (the clone, its prefix, 0.25 s), each scenario (the format's settled rules, the pictures and
// the media it names), the media (how many shots and GIFs, their licences, their credits), the final video (its length
// against its parts, -14 LUFS ± 1, true peak ≤ -2 dBTP, no black frame) and every junction between a filmed clip and a
// motion part: the frame on each side of the join compared (PSNR: the motion part starts on the clip's last frame and
// ends on the next clip's first, so they must be the same picture: ≥ 40 dB; the validated video: 43 to 51 dB), saved in
// stills/junction-<k>-a.jpg / -b.jpg to look at. ✗ = to fix; ⚠ = to look at. Exit 1 if any ✗.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { step } from "../../../motion/progress.mjs";
import { ROOT } from "../../../motion/brand.mjs";
import { loudness } from "./sound.mjs";

const a = process.argv.slice(2);
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const K4 = a.includes("--4k");
const ok = [], ko = [], warn = [];
const check = (cond, good, bad, level = "ko") => (cond ? ok.push(good) : (level === "ko" ? ko : warn).push(bad));
const read = f => { try { return fs.readFileSync(path.join(RUN, f), "utf8"); } catch { return null; } };
const json = f => { try { return JSON.parse(read(f)); } catch { return null; } };
const dur = f => +String(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).stdout).trim();
const run = json("run.json") || {}, slug = run.slug || path.basename(RUN);
const parts = fs.existsSync(path.join(RUN, "vo")) ? fs.readdirSync(path.join(RUN, "vo")).map(d => +((/^part-(\d+)$/.exec(d) || [])[1] || 0)).filter(Boolean).sort((x, y) => x - y) : [];
check(parts.length > 0, `${parts.length} motion part(s), ${(run.cut?.cutbacks || []).length} cutback(s)`, "no motion part (vo/part-<n>/)");

// ── the voice ──────────────────────────────────────────────────────────────────────────────────
const vc = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "workspace", "motion", "profile.json"), "utf8")).voiceClone; } catch { return null; } })();
for (const n of parts) {
  const vo = json(`vo/part-${n}/vo.json`) || {};
  // the facecam mode: the part says the user's real voice, cut from the take (facecam.mjs)
  if (vo.real) check(fs.existsSync(path.join(RUN, "vo", `part-${n}`, "voix", "prise.wav")), `part ${n}: your real voice, from the take`, `part ${n}: vo/part-${n}/voix/prise.wav is missing (facecam.mjs)`);
  else check(!!vo.voice, `part ${n}: voice ${vo.voice_name || vo.voice}${vc?.id === vo.voice ? " (your clone)" : ""}`, `part ${n}: no voice in vo/part-${n}/vo.json (scripts/clone.mjs)`);
  if (vc?.id && vo.voice && !vo.real && (vc.kind || "clone") === "clone") check(vc.id === vo.voice, `part ${n}: the voice is your clone`, `part ${n}: the voice is ${vo.voice}, not your clone ${vc.id}`, "warn");
  if ((vo.prefix || "").trim()) check(String(vo.text || "").trim().startsWith(vo.prefix.trim()), `part ${n}: the clone's prefix is on the text`, `part ${n}: the text does not start with the clone's prefix ${JSON.stringify(vo.prefix.trim())}`);
  const words = json(`vo/part-${n}/words.json`);
  if (words) { const ap = words.filter(w => w.approx).length; check(ap <= 12, `part ${n}: ${ap} word(s) timed approximately`, `part ${n}: ${ap} words approximate (read what Scribe heard: a word said wrong?)`, "warn"); }
  else ko.push(`part ${n}: vo/part-${n}/words.json is missing (voice.mjs take)`);
  const segs = (() => { try { return JSON.parse((/window\.SEGS=(\[.*?\]);/.exec(read(`film/words-${n}.js`) || "") || [])[1]); } catch { return null; } })();
  if (segs) check(Math.abs(segs[0].at - 0.25) < 0.01, `part ${n}: the voice starts at 0.25 s`, `part ${n}: the voice starts at ${segs[0].at} s (the rule: 0.25 s, no dead air after a filmed clip)`);
  else ko.push(`part ${n}: film/words-${n}.js is missing (prep.mjs)`);
}

// ── the scenarios ──────────────────────────────────────────────────────────────────────────────
const media = n => fs.existsSync(path.join(RUN, "film", "media", n)) ? fs.readdirSync(path.join(RUN, "film", "media", n)).filter(f => f.endsWith(".jpg")).length : 0;
let nShots = 0, nGifs = 0, motionSec = 0;
for (const n of parts) {
  const story = read(`film/story-${n}.js`) || "";
  const code = story.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  if (!code.trim()) { ko.push(`part ${n}: film/story-${n}.js is missing`); continue; }
  for (const [re, good, bad, lvl] of [
    [/F\.stamp\(|B\.stamp\(/, "no stamps", "a stamp: refused (it reads as AI slop): an editorial line ed(), a marker or a slim bar"],
    [/F\.captions\(/, "no subtitles", "subtitles: never in this format"],
    [/\bAcme\b/i, "no « Acme »", "« Acme » on screen: a fictional company has a real-sounding name and a small logo", "warn"],
    [/rotateX\(|rotateY\(|translateZ|perspective\(|F\.TK\.\w+\s*=|F\.cut\([^)]*'(push|dive)'/, "no 3D dive or push-through", "a 3D move (rotateX/Y, a push-through, a dive): refused in this style", "warn"],
  ]) check(!re.test(code), `part ${n}: ${good}`, `part ${n}: ${bad}`, lvl);
  if (run.mode !== "ai") check(/PART\.in|intro-last\.png|cutback-\d+-last\.png|cutback-last\.png/.test(code), `part ${n}: it starts on the previous clip's last frame`, `part ${n}: it does not start on the previous filmed clip's last frame (junctionIn)`);
  check(/F\.DUR\s*=/.test(code), `part ${n}: its end is set`, `part ${n}: F.DUR is not set (0.3 s after the last word, 2.5 s on the end card)`, "warn");
  for (const [, im] of code.matchAll(/['"`(]img\/([\w./-]+\.(?:png|jpe?g))/g)) if (!im.includes("${")) check(fs.existsSync(path.join(RUN, "film", "img", im)), `part ${n}: picture ${im}`, `part ${n}: picture missing: film/img/${im}`);
  const phs = new Set([...code.matchAll(/B\.ph\(([^)]*)\)/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => (x[1].includes("/") || x[1].includes(".") ? x[1] : `photos/${x[1]}.jpg`))));
  const miss = [...phs].filter(x => !fs.existsSync(path.join(RUN, "film", "img", x)));
  check(!miss.length, `part ${n}: chapter page photos, all here (${phs.size})`, `part ${n}: chapter page photos missing (B.ph): ${miss.join(", ")}`);
  // the stock shots and GIFs it names: their frames are there (n of the call ≤ the frames)
  const used = [...code.matchAll(/(?:shot|one)\(\s*'([a-z0-9-]+)',\s*(\d+)/g), ...code.matchAll(/name:\s*'([a-z0-9-]+)',\s*n:\s*(\d+)/g), ...code.matchAll(/shot\(\s*'([a-z0-9-]+)',\s*(\d+)/g)].map(m => [m[1], +m[2]]);
  const gifs = [...code.matchAll(/(?:gif|G|F\.gifPrint)\(\s*s\d*,\s*'([a-z0-9-]+)',\s*(\d+)/g)].map(m => [m[1], +m[2]]);
  for (const [nm, k] of [...new Map(used)]) { nShots++; check(media(nm) >= k, `part ${n}: shot ${nm} (${media(nm)} frames)`, `part ${n}: shot ${nm}: ${media(nm)} frames for n = ${k} (media.mjs frames ${nm})`); }
  for (const [nm, k] of [...new Map(gifs)]) { nGifs++; check(media(nm) >= k, `part ${n}: GIF ${nm} (${media(nm)} frames)`, `part ${n}: GIF ${nm}: ${media(nm)} frames for n = ${k}`); }
  const pj = json(`build/part-${n}.json`); if (pj) motionSec += pj.duration;
}
if (motionSec) {
  const per4 = x => (x * 240 / Math.max(60, motionSec)).toFixed(1);
  check(nShots >= 1.6 * motionSec / 60 && nShots <= 3.5 * motionSec / 60, `stock shots: ${nShots} (${per4(nShots)} per 4 min)`, `stock shots: ${nShots} for ${(motionSec / 60).toFixed(1)} min of motion (aim at 8 to 12 per 4 min: a professional editor diversifies)`, "warn");
  check(nGifs >= 2 && nGifs <= 6, `GIFs: ${nGifs}`, `GIFs: ${nGifs} (aim at 3 to 5 per 4 min, never full screen)`, "warn");
}
for (const dir of ["assets/clips", "assets/gifs"]) for (const f of fs.existsSync(path.join(RUN, dir)) ? fs.readdirSync(path.join(RUN, dir)).filter(x => x.endsWith(".mp4")) : []) {
  const s = json(`${dir}/${f.replace(/\.mp4$/, ".source.json")}`);
  check(!!s?.licence, `${f}: ${(s?.licence || "").split("(")[0].trim()}`, `${dir}/${f}: no .source.json (its source and licence: media.mjs get, or write it)`, "warn");
  if (s && /Restricted/i.test(s.licence || "")) ko.push(`${f}: a Restricted licence (personal use only): replace it`);
}
check(/<!-- media -->/.test(read("README.md") || ""), "the README credits the media", "the README has no Media section (media.mjs <run> credits)", "warn");

// ── the final video ────────────────────────────────────────────────────────────────────────────
const asm = K4 ? run.assembly4k : run.assembly;
const out = asm?.out ? path.join(ROOT, asm.out) : path.join(ROOT, "workspace", "videos", `${slug}${K4 ? "-4k" : ""}.mp4`);
if (fs.existsSync(out) && asm) {
  const D = dur(out), sum = asm.parts.reduce((x, p) => x + p.d, 0);
  check(Math.abs(D - sum) <= 0.15, `length: ${D.toFixed(2)} s (the parts: ${sum.toFixed(2)} s)`, `length: ${D.toFixed(2)} s for ${sum.toFixed(2)} s of parts: a part lost or gained frames`);
  const L = loudness(out);
  check(Math.abs(L.I + 14) <= 1, `loudness: ${L.I.toFixed(1)} LUFS`, `loudness: ${L.I.toFixed(1)} LUFS (-14 ± 1 expected: assemble.mjs again)`);
  check(L.TP <= -2, `true peak: ${L.TP.toFixed(1)} dBTP`, `true peak: ${L.TP.toFixed(1)} dBTP (≤ -2 expected)`);
  const v = spawnSync("ffmpeg", ["-nostdin", "-i", out, "-vf", "blackdetect=d=0.1:pix_th=0.05,freezedetect=n=0.002:d=3", "-an", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const blacks = [...v.matchAll(/black_start:([\d.]+)/g)].map(m => (+m[1]).toFixed(2)), frz = [...v.matchAll(/freeze_start: ([\d.]+)/g)].map(m => (+m[1]).toFixed(2));
  check(!blacks.length, "no black frame", `black frames at ${blacks.join(", ")} s`);
  check(!frz.length, "no picture frozen for 3 s", `a picture that does not move for 3 s at ${frz.join(", ")} s`, "warn");
  if (!K4) check(fs.existsSync(out.replace(/\.mp4$/, "-preview.mp4")), "the 720p preview to send", "no preview (assemble.mjs makes it)", "warn");
  // every junction between a filmed clip and a motion part: the two frames around the join
  const dir = path.join(RUN, "stills"); fs.mkdirSync(dir, { recursive: true });
  // frame i by seeking half a frame before it (the same decoded picture as select=eq(n,i), 0.25 s instead of 6-8 s, § 10)
  const frameAt = (i, f) => spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", ((i - 0.5) / 30).toFixed(6), "-i", out, "-frames:v", "1", "-q:v", "2", f]);
  const psnr = (x, y) => { const m = /average:([\d.]+|inf)/.exec(spawnSync("ffmpeg", ["-nostdin", "-i", x, "-i", y, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf8" }).stderr); return m ? (m[1] === "inf" ? 99 : +m[1]) : NaN; };
  let at = 0;
  asm.parts.slice(0, -1).forEach((p, k) => {
    at += p.d;
    // a join on the same frame only between a filmed clip and a motion part (two parts of the AI voice mode simply follow)
    if (p.kind === "part" && asm.parts[k + 1].kind === "part") return;
    const nx = asm.parts[k + 1], i = Math.round(at * 30), fa = path.join(dir, `junction-${k + 1}-a.jpg`), fb = path.join(dir, `junction-${k + 1}-b.jpg`);
    frameAt(i - 1, fa); frameAt(i, fb);
    const q = psnr(fa, fb), what = `junction ${k + 1} at ${at.toFixed(2)} s (${p.kind}${p.n ? ` ${p.n}` : ""} → ${nx.kind}${nx.n ? ` ${nx.n}` : ""})`;
    check(q >= 40, `${what}: the same picture (PSNR ${q.toFixed(1)} dB)`, `${what}: the frames differ (PSNR ${q.toFixed(1)} dB): look at stills/junction-${k + 1}-a.jpg and -b.jpg (a junction frame from an older render of the clip? its colour chunks?)`, q >= 30 ? "warn" : "ko");
  });
} else ko.push(`no final video yet: node plugins/video/skills/voiceover-video/scripts/assemble.mjs workspace/projects/${slug}${K4 ? " --4k" : ""}`);

for (const x of ok) console.log("✓", x);
for (const x of warn) console.log("⚠", x);
for (const x of ko) console.log("✗", x);
console.log(`\n${ok.length} ✓ · ${warn.length} ⚠ · ${ko.length} ✗`);
fs.writeFileSync(path.join(RUN, "verify.json"), JSON.stringify({ ok, warn, ko, at: Date.now(), language: run.language || "en", size: K4 ? "4k" : "1080" }, null, 1) + "\n");
step(RUN, "checks", ko.length ? "failed" : "done", ko.length ? `${ko.length} thing${ko.length > 1 ? "s" : ""} to fix` : `${ok.length} checks passed${warn.length ? `, ${warn.length} to look at` : ""}`);
process.exit(ko.length ? 1 : 0);
