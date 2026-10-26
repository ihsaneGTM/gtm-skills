#!/usr/bin/env node
// THE END CARD of a short that is an extract of a long video (Ihsane, 2026-10-15: « l'écran s'éteigne, avec un petit son
// d'écran qui s'éteint, et on met un petit Watch the entire video… la miniature YouTube… comme si c'était cliquable »).
// A motion page (motionpage.mjs, OPAQUE: it starts on the short's last frame, img/last.png) rendered after the short, then
// joined to it: its pack sounds mixed at the short's level, the music powering down with the screen (the bed's tail
// slowed down and cut, a tape stop), the whole re-encoded once.
//
//   node endcard.mjs <short> --variant <v> [--out <file.mp4>]      (the page: motion/cta/<v>.html, rendered first)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import * as SOUND from "../../voiceover-video/scripts/sound.mjs";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const D = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const V = opt("variant");
const P = JSON.parse(fs.readFileSync(path.join(D, "project.json"), "utf8"));
const SRC = path.join(D, "assets", "media", `mp-cta-${V}`);
if (!V || !fs.existsSync(path.join(SRC, "meta.json"))) { console.error(`✗ --variant <v>: assets/media/mp-cta-<v>/ (render motion/cta/<v>.html first)`); process.exit(2); }
const meta = JSON.parse(fs.readFileSync(path.join(SRC, "meta.json"), "utf8"));
const OUT = opt("out") || P.out.replace(/\.mp4$/, `-cta-${V.replace(/^cta-/, "")}.mp4`);
const DUR = meta.frames / meta.fps;
const TMP = path.join(D, "tmp", "endcard"); fs.mkdirSync(TMP, { recursive: true });
const run = (args) => { const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 }); if (r.status) throw new Error(r.stderr.slice(-800)); };

// the master gain the short's mix applied (mix.mjs: "gain +x dB"), so the card's sounds sit where the page's did
const log = (() => { try { return fs.readFileSync(path.join(D, "build.log"), "utf8"); } catch { return ""; } })();
const master = +((log.match(/gain\s+\+?(-?[\d.]+) dB/g) || []).at(-1)?.match(/(-?[\d.]+)/)[1] ?? 20);
const bedGain = (() => { try { return JSON.parse(fs.readFileSync(path.join(D, "sfx.json"), "utf8")).find(c => c.kind === "sample:music.wav")?.gain ?? -42; } catch { return -42; } })();

// ── the sound: the pack cues + the bed's tail powering down (0.45 s, slowed to a stop), then silence ──────────────
const ins = [], parts = [];
const bed = path.join(D, P.bed || "music.wav");
if (fs.existsSync(bed)) {
  ins.push("-ss", String(P.duration), "-t", "0.6", "-i", bed);
  parts.push(`[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asetrate=48000*0.62,aresample=48000,afade=t=out:st=0.15:d=0.4,volume=${(bedGain + master).toFixed(1)}dB[bed]`);
}
for (const c of meta.cues || []) {
  let f; try { f = SOUND.sfxPath(c.name); } catch { console.error(`  ⚠ ${c.name}: not on the shelf`); continue; }
  const k = ins.filter(x => x === "-i").length, al = SOUND.alignOf(f, c.align || "attack");
  const at = Math.max(0, c.t - al), ms = Math.round(at * 1000);
  ins.push("-i", f);
  parts.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms},volume=${((c.gain ?? -16) - 16 + master).toFixed(1)}dB[c${k}]`);
}
const labels = parts.map(p => p.match(/\[(\w+)\]$/)[1]);
const wav = path.join(TMP, `${V}.wav`);
run([...ins, "-filter_complex", `${parts.join(";")};${labels.map(l => `[${l}]`).join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,apad,atrim=0:${DUR.toFixed(3)},alimiter=limit=0.89[a]`, "-map", "[a]", "-ar", "48000", wav]);

// ── the picture: the card's frames, then the short and the card joined ───────────────────────────────────────────
const card = path.join(TMP, `${V}.mp4`);
run(["-framerate", String(meta.fps), "-i", path.join(SRC, "f%04d.png"), "-i", wav, "-filter_complex", "[0:v]format=yuv420p,setsar=1[v]", "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-r", String(P.fps || 30), "-c:a", "aac", "-b:a", "256k", "-ar", "48000", card]);
run(["-i", P.out, "-i", card, "-filter_complex", "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[0:a]aresample=48000[a0];[1:a]aresample=48000[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-aspect", "9:16", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", OUT]);
const L = SOUND.loudness(OUT);
console.log(`${path.relative(process.cwd(), OUT)} — the short + the card ${V} (${DUR.toFixed(2)} s) · ${L.I} LUFS, true peak ${L.TP} dBTP`);
