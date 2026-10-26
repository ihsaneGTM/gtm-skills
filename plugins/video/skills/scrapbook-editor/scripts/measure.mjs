// HOW LOUD EACH SOUND IS AS HEARD, against the voice — by subtraction on the EFFECTS BUS, before
// the loudness pass: the bus rendered without one role (NO_CUES) is taken from the full bus, which
// leaves that role exactly (the bus is a plain sum), and its momentary loudness (EBU R128, 400 ms)
// is read against the voice's momentary median, on the same pre-loudnorm scale. Both then take the
// same programme gain, so « LU under the voice » is what the master plays.
//
// Why not subtract the two finished mixes, as audio-spec.md does for a bed: the dynamic loudnorm
// does not give two mixes the same gain curve, and the voice that does not cancel sits 21-24 LU
// under the programme (measured on the style-01 cut of this take, 2026-10-05): every sound quieter
// than that disappears in it. A click does.
//
//   node measure.mjs           # from the project, after build.sh: every role in the edit
//   node measure.mjs paper click
//
// Prints, per role, how many LU under the voice it plays (the median of its cues' peaks; for the
// music bed, its momentary median), the role's aim (book.mjs SOUNDS, project.json bedUnder), and
// the same figure for the house sounds as validated in style 01 on the same take
// (pipecorn-sales-calls, measured this way). Restores sfx.wav / sfx.json after.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const E = path.resolve(HERE, "../../short-editor/scripts");
// LU under the voice, measured this way on the style-01 cut of the same take (validated in review)
// (click 5 cues, the felt 4: the median; sheet_in is the sheet's own sound UNDER the whoosh)
export const HOUSE = { click: 25.3, whoosh: 18.6, glitch: 21.9, flash: 18.5, riser: 19.9, section: 29.6, mark: 29.9 };

const ff = args => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
export function momentary(file) {
  const r = ff(["-i", file, "-af", "ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M", "-f", "null", "-"]);
  const out = [], txt = (r.stdout || "") + (r.stderr || "");
  let t = null;
  for (const line of txt.split("\n")) {
    const mt = line.match(/pts_time:([\d.]+)/); if (mt) t = +mt[1];
    const mv = line.match(/lavfi\.r128\.M=(-?[\d.]+|-inf)/); if (mv && t != null) out.push([t, mv[1].includes("inf") ? -120 : +mv[1]]);
  }
  return out;
}
export function voiceMedian(file = "voice.wav") {
  const v = momentary(file).filter(([, x]) => x > -50).map(([, x]) => x).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}
// the momentary peak of one role on the bus, per cue: [{ t, under }]
export function roleLevels(cuesOfRole, noCues, vmed) {
  fs.copyFileSync("sfx.wav", ".levels.sfx.wav"); fs.copyFileSync("sfx.json", ".levels.sfx.json");
  try {
    const r = spawnSync("node", [path.join(E, "sfx.mjs")], { env: { ...process.env, NO_CUES: noCues }, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`sfx.mjs failed: ${r.stderr}`);
    fs.renameSync("sfx.wav", ".levels.no.wav");
    ff(["-y", "-i", ".levels.sfx.wav", "-i", ".levels.no.wav", "-filter_complex", "[1:a]volume=-1[n];[0:a][n]amix=inputs=2:normalize=0", "-c:a", "pcm_s16le", ".levels.diff.wav"]);
    const m = momentary(".levels.diff.wav");
    // the bed plays all along: its momentary MEDIAN where it sounds, not a peak
    if (cuesOfRole.some(c => c.role === "bed")) {
      const v = m.map(([, x]) => x).filter(x => x > -60).sort((a, b) => a - b);
      return [{ t: 0, under: v.length ? vmed - v[Math.floor(v.length / 2)] : 120 }];
    }
    return cuesOfRole.map(c => ({ t: c.t, under: vmed - Math.max(-120, ...m.filter(([t]) => t >= c.t - 0.05 && t <= c.t + 0.75).map(([, x]) => x)) }));
  } finally {
    fs.renameSync(".levels.sfx.wav", "sfx.wav"); fs.renameSync(".levels.sfx.json", "sfx.json");
    for (const f of [".levels.no.wav", ".levels.diff.wav"]) fs.rmSync(f, { force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const f of ["voice.wav", "sfx.wav", "sfx.json", "edl.mjs"]) if (!fs.existsSync(f)) { console.error(`${f} missing: run build.sh first`); process.exit(1); }
  const { sfxCues } = await import(pathToFileURL(path.resolve("edl.mjs")).href);
  const cues = sfxCues();
  const roles = [...new Set(cues.map(c => c.role).filter(Boolean))];
  const want = process.argv.slice(2).length ? process.argv.slice(2) : roles;
  const vmed = voiceMedian();
  const { SOUNDS } = await import(pathToFileURL(path.join(HERE, "book.mjs")).href);
  const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
  const aim = role => (role === "bed" ? P.bedUnder ?? 15 : SOUNDS[role]?.lu);
  console.log(`voice: momentary median ${vmed.toFixed(1)} LUFS (before the loudness pass)\n`);
  console.log("role       cues   LU under the voice (median · min-max)    aim     style 01, same take");
  for (const role of want) {
    const mine = cues.filter(c => c.role === role);
    if (!mine.length) { console.log(`${role.padEnd(10)} —`); continue; }
    const u = roleLevels(mine, `^${role}$`, vmed).map(x => x.under).sort((a, b) => a - b);
    const med = u[Math.floor(u.length / 2)];
    console.log(`${role.padEnd(10)} ${String(mine.length).padStart(3)}    ${med.toFixed(1).padStart(5)} LU  (${u[0].toFixed(1)} … ${u[u.length - 1].toFixed(1)})`.padEnd(60)
      + (aim(role) != null ? `${aim(role).toFixed(1)}`.padEnd(8) : "".padEnd(8)) + (HOUSE[role] != null ? `${HOUSE[role].toFixed(1)} LU` : ""));
  }
}
