// Render every sound in the library (or the kinds given) to WAV files so a
// human can audition them: the tool cannot listen, a reviewer can.
//
//   node audition.mjs --out board/sfx [kind kind …]
import fs from "node:fs";
import path from "node:path";
import { make, SR } from "./sfx.mjs";

const argv = process.argv.slice(2);
const i = argv.indexOf("--out");
const OUT = i >= 0 ? argv[i + 1] : "audition";
const kinds = argv.filter((a, k) => a !== "--out" && k !== i + 1);
const ALL = ["swoosh_in", "swoosh_out", "whoosh_in", "whoosh_out", "air_in", "flick", "rev_whoosh",
  "tap", "pop", "thump", "shutter", "glass", "impact_soft", "impact_big", "hit_tail", "bass_drop", "riser", "riser_tonal",
  "tick0", "blip", "chime", "type", "rattle", "buzz"];
fs.mkdirSync(OUT, { recursive: true });
for (const kind of (kinds.length ? kinds : ALL)) {
  const s = make(kind), n = s.length, l = s.L || s, r = s.R || s;
  let peak = 0; for (let k = 0; k < n; k++) peak = Math.max(peak, Math.abs(l[k]), Math.abs(r[k]));
  const g = peak > 0 ? 0.7 / peak : 1;                       // every file at the same −3 dBFS peak
  const pad = Math.round(0.25 * SR), total = n + pad;          // a breath of silence after each sound
  const buf = Buffer.alloc(44 + total * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + total * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(total * 4, 40);
  for (let k = 0; k < n; k++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[k] * g)) * 32767), 44 + k * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[k] * g)) * 32767), 44 + k * 4 + 2);
  }
  fs.writeFileSync(path.join(OUT, `${kind}.wav`), buf);
  console.log(`${kind.padEnd(12)} ${(n / SR).toFixed(2)} s${s.L ? "  stereo" : ""}`);
}
