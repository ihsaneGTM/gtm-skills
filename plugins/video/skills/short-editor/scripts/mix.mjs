// Final audio: voice + effect bed -> a mix at the platform loudness standard.
//
//   node mix.mjs [--lufs -14] [--tp -1.0]
//
// Reads project.json from the working directory, writes mix.wav next to it.
//
// Two-pass ffmpeg `loudnorm` — the EBU R128 reference implementation, with a
// true-peak limiter built in. An earlier version of this did the whole thing by
// hand in Python (numpy + scipy: 4x oversampled peak detection, a look-ahead
// limiter, a gain loop against ebur128). It worked, and it landed within a
// tenth of a dB of loudnorm on the same material — so it was a dependency this
// skill was paying for nothing. Measured on one reference short:
//   hand-rolled   -14.1 LUFS · -0.8 dBTP · LRA 4.6
//   loudnorm      -14.15     · -1.00     · LRA 4.10
//
// Why it matters at all: platforms normalise on playback and most of them only
// turn content DOWN, so a -28 LUFS master plays quiet forever. Never a bare
// `volume=+NdB` — that clips the two mic transients every take has.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CWD = process.cwd();
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const I = parseFloat(arg("--lufs", String(P.lufs ?? -14)));
// The mix must aim BELOW the delivery ceiling, because the AAC encode after it
// manufactures inter-sample peaks of its own: a mix landing exactly on -1.0 dBTP
// came out of the muxer at -0.5 on a 9.5-minute master (-0.8 on a 42 s one, which
// is why a short working render can pass and the full one fail). `ceilingDbtp` is
// the STANDARD the finished file is measured against; `tpHeadroom` is what the
// encoder is expected to add on top. Keep them separate — lowering ceilingDbtp to
// compensate also lowers the bar verify.mjs checks, which turns a real gate into
// a moving one.
const HEADROOM = parseFloat(arg("--tp-headroom", String(P.tpHeadroom ?? 0.6)));
const TP = parseFloat(arg("--tp", String((P.ceilingDbtp ?? -1.0) - HEADROOM)));
const OUT = arg("--out", "mix.wav");

const has = f => fs.existsSync(path.resolve(CWD, f));
if (!has("voice.wav")) { console.error("voice.wav missing; build.sh extracts it from the source"); process.exit(1); }
const withSfx = has("sfx.wav");

// ffmpeg writes its reports (loudnorm's JSON, ebur128's summary) to STDERR, so
// both streams have to come back — execFileSync would hand back stdout alone.
function ff(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
  return (r.stdout || "") + (r.stderr || "");
}
const SRC = withSfx ? ["-i", "voice.wav", "-i", "sfx.wav"] : ["-i", "voice.wav"];

// --- the voice through a treatment, by zone (2026-09-29) ------------------------
// Asked for in review: a bit of a radio effect on the voice over the hook.
// project.json `voiceFx`: [{ from, to, preset, fade, trimDb, bed }]
// — between `from` and `to` (output seconds) the voice plays through a PRESET below,
// LOUDNESS-MATCHED to the dry voice over the zone (a band-passed voice measures
// several LU quieter at the same gain, and going back to the dry voice must not read
// as a jump in volume), crossfaded over `fade` s: put both edges in a silence, the
// end on a cut, where the flash covers the change. `bed: true` sends the effect bed
// (music and cues) through the same band too: the whole hook comes out of a small
// radio and everything opens on the cut. VOICE_FX=<preset>[+bed] or none swaps the
// preset of every zone for an A/B without touching project.json.
const VOICE_PRESETS = {
  // an FM broadcast: thinner and denser, still clean
  fm: { pre: 12, trim: 0,
    chain: "highpass=f=190:poles=2,highpass=f=190:poles=2,lowpass=f=7200:poles=2,lowpass=f=7200:poles=2,"
      + "equalizer=f=2700:t=q:w=1.1:g=3.5,acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:knee=3,"
      + "asoftclip=type=tanh:threshold=0.7:oversample=4",
    bed: "highpass=f=190:poles=2,highpass=f=190:poles=2,lowpass=f=7200:poles=2,lowpass=f=7200:poles=2" },
  // an old AM set: the telephone band, a nasal middle, warm drive, hiss and crackle
  am: { pre: 16, trim: 0,
    chain: "highpass=f=380:poles=2,highpass=f=380:poles=2,lowpass=f=3200:poles=2,lowpass=f=3200:poles=2,"
      + "equalizer=f=1250:t=q:w=0.9:g=6,asoftclip=type=atan:threshold=0.35:oversample=4,"
      + "acompressor=threshold=-22dB:ratio=5:attack=2:release=60:knee=3,lowpass=f=3500:poles=2",
    bed: "highpass=f=380:poles=2,highpass=f=380:poles=2,lowpass=f=3200:poles=2,lowpass=f=3200:poles=2,equalizer=f=1250:t=q:w=0.9:g=4",
    hiss: { color: "pink", hp: 400, lp: 3200, db: -30 }, crackle: { db: -33 } },
  // a walkie-talkie: a narrow band, hard drive, a crushed grain and static
  walkie: { pre: 24, trim: -1,
    chain: "highpass=f=700:poles=2,highpass=f=700:poles=2,lowpass=f=2600:poles=2,lowpass=f=2600:poles=2,"
      + "equalizer=f=1600:t=q:w=1.2:g=5,asoftclip=type=tanh:threshold=0.2:oversample=4,"
      + "acrusher=bits=7:mode=log:aa=1:mix=0.45,highpass=f=650:poles=2,lowpass=f=2800:poles=2,"
      + "acompressor=threshold=-20dB:ratio=8:attack=1:release=40:knee=2",
    bed: "highpass=f=700:poles=2,highpass=f=700:poles=2,lowpass=f=2600:poles=2,lowpass=f=2600:poles=2",
    hiss: { color: "white", hp: 700, lp: 2600, db: -24 } },
};
const FX_ENV = process.env.VOICE_FX;
const ZONES = (P.voiceFx ?? []).map(z => {
  const [name, extra] = String(FX_ENV ?? z.preset ?? "none").split("+");
  return { fade: 0.03, trimDb: 0, ...z, preset: name, bed: FX_ENV ? extra === "bed" : !!z.bed };
}).filter(z => z.preset !== "none");
for (const z of ZONES) if (!VOICE_PRESETS[z.preset]) { console.error(`voiceFx: unknown preset "${z.preset}" (${Object.keys(VOICE_PRESETS).join(", ")})`); process.exit(1); }
// the wet share of zone z at time t: 1 inside, 0 outside, a linear ramp on each edge
const wetExpr = z => {
  // inside '…' the filtergraph keeps the commas, so no escaping
  const up = z.from > 0 ? `clip((t-${z.from})/${z.fade}+0.5,0,1)` : "1";
  return `${up}*clip((${z.to}-t)/${z.fade}+0.5,0,1)`;
};
const measureI = (args, graph) => {
  const r = ff([...args, "-filter_complex", `${graph},ebur128[m]`, "-map", "[m]", "-f", "null", "-"]);
  const x = (r.split("Summary:").pop() || "").match(/^\s*I:\s*(-?[\d.]+)/m);
  return x ? parseFloat(x[1]) : NaN;
};
const noiseSrc = (z, spec, kind) => {
  const d = (z.to + z.fade + 0.2).toFixed(3);
  const band = `highpass=f=${spec.hp ?? 400}:poles=2,lowpass=f=${spec.lp ?? 3200}:poles=2`;
  return kind === "hiss"
    ? `anoisesrc=color=${spec.color ?? "pink"}:amplitude=0.5:sample_rate=48000:duration=${d}:nb_samples=256:seed=7,${band},aformat=channel_layouts=stereo`
    // vinyl-ish crackle: sparse impulses of random size, in the radio's band
    : `aevalsrc=exprs='if(lt(random(0),0.0006),(2*random(1)-1)*random(2)*random(2),0)':s=48000:d=${d}:n=256,highpass=f=900:poles=2,lowpass=f=4200:poles=2,aformat=channel_layouts=stereo`;
};
// without a zone the voice goes straight to the mix, untouched — the default path of every
// project stays byte-identical to what it was before voiceFx existed
const vChain = [ZONES.length ? `[0:a]asetnsamples=n=256:p=0,asplit=${ZONES.length + 1}[vdry${ZONES.map((_, i) => `][vw${i}`).join("")}]` : "[0:a]anull[v]"];
const sChain = [];
const vMix = ["[vd]"], sMix = ["[sd]"];
const fxReport = [];
ZONES.forEach((z, i) => {
  const pr = VOICE_PRESETS[z.preset], W = wetExpr(z);
  const trim = z.trimDb + (pr.trim ?? 0);
  const zoneTrim = `atrim=start=${z.from}:end=${z.to}`;
  const dryI = measureI(["-i", "voice.wav"], `[0:a]${zoneTrim}`);
  const wetI = measureI(["-i", "voice.wav"], `[0:a]${zoneTrim},volume=${pr.pre}dB,${pr.chain}`);
  const makeup = +(dryI - wetI + trim).toFixed(2);
  vChain.push(`[vw${i}]volume=${pr.pre}dB,${pr.chain},volume=${makeup}dB,volume=eval=frame:volume='${W}'[vx${i}]`);
  vMix.push(`[vx${i}]`);
  for (const kind of ["hiss", "crackle"]) {
    if (!pr[kind]) continue;
    const spec = { ...pr.hiss, ...pr[kind] };
    const nI = measureI([], noiseSrc(z, spec, kind));
    const g = +((dryI + trim + spec.db) - nI).toFixed(2);
    vChain.push(`${noiseSrc(z, spec, kind)},volume=${g}dB,asetnsamples=n=256:p=0,volume=eval=frame:volume='${W}'[vn${i}${kind}]`);
    vMix.push(`[vn${i}${kind}]`);
  }
  fxReport.push(`voice ${z.from}→${z.to} s: "${z.preset}"${z.bed ? " + the bed" : ""}, ${dryI.toFixed(1)} → ${wetI.toFixed(1)} LUFS before makeup, ${makeup >= 0 ? "+" : ""}${makeup} dB`);
});
if (ZONES.length) {
  const dryW = ZONES.map(wetExpr).join("-");
  vChain.push(`[vdry]volume=eval=frame:volume='1-${dryW}'[vd]`);
  vChain.push(`${vMix.join("")}amix=inputs=${vMix.length}:duration=first:normalize=0[v]`);
}
const bedZones = ZONES.filter(z => z.bed);
if (withSfx && bedZones.length) {
  sChain.push(`[1:a]asetnsamples=n=256:p=0,asplit=${bedZones.length + 1}[sdry${bedZones.map((_, i) => `][sw${i}`).join("")}]`);
  bedZones.forEach((z, i) => {
    const pr = VOICE_PRESETS[z.preset], zoneTrim = `atrim=start=${z.from}:end=${z.to}`;
    const dI = measureI(["-i", "sfx.wav"], `[0:a]${zoneTrim}`), wI = measureI(["-i", "sfx.wav"], `[0:a]${zoneTrim},${pr.bed}`);
    const mk = Number.isFinite(dI - wI) ? +(dI - wI).toFixed(2) : 0;
    sChain.push(`[sw${i}]${pr.bed},volume=${mk}dB,volume=eval=frame:volume='${wetExpr(z)}'[sx${i}]`);
    sMix.push(`[sx${i}]`);
  });
  sChain.push(`[sdry]volume=eval=frame:volume='1-${bedZones.map(wetExpr).join("-")}'[sd]`);
  sChain.push(`${sMix.join("")}amix=inputs=${sMix.length}:duration=first:normalize=0[s]`);
}
const V = vChain.join(";");
const S = withSfx ? (sChain.length ? ";" + sChain.join(";") : ";[1:a]anull[s]") : "";
// amix normalize=0 is a plain sum — the cue gains in edl.mjs are already
// relative to the voice, so letting amix rescale would undo them
const MIXG = withSfx ? `${V}${S};[v][s]amix=inputs=2:duration=first:normalize=0[a]` : `${V};[v]anull[a]`;

// --- pass 1: measure ----------------------------------------------------------
const p1 = ff([...SRC, "-filter_complex",
  `${MIXG};[a]loudnorm=I=${I}:TP=${TP}:LRA=11:print_format=json`, "-f", "null", "-"]);
const m = p1.match(/\{[\s\S]*?\}/);
if (!m) { console.error("loudnorm returned no measurement:\n" + p1.slice(-1200)); process.exit(1); }
const M = JSON.parse(m[0]);

// --- the recording's own noise floor, from ebur128's momentary track ----------
// Gain does not change signal-to-noise, but it moves the room tone across the
// threshold of audibility. Worth saying out loud rather than letting the
// reviewer discover it in the pauses.
const eb = ff([...SRC, "-filter_complex", `${MIXG};[a]ebur128`, "-f", "null", "-"]);
const mom = [...eb.matchAll(/M:\s*(-?[\d.]+)/g)].map(x => parseFloat(x[1])).filter(v => v > -100);
mom.sort((a, b) => a - b);
const floor = mom.length ? mom[Math.floor(mom.length * 0.05)] : NaN;
const gain = parseFloat(M.output_i) - parseFloat(M.input_i);

// --- pass 2: apply ------------------------------------------------------------
const ln = `loudnorm=I=${I}:TP=${TP}:LRA=11`
  + `:measured_I=${M.input_i}:measured_TP=${M.input_tp}`
  + `:measured_LRA=${M.input_lra}:measured_thresh=${M.input_thresh}`
  + `:offset=${M.target_offset}:linear=true:print_format=summary`;
ff(["-y", ...SRC, "-filter_complex", `${MIXG};[a]${ln}[o]`, "-map", "[o]",
    "-ar", "48000", "-c:a", "pcm_s16le", OUT]);
if (!has(OUT)) { console.error("loudnorm wrote nothing"); process.exit(1); }

// --- report what it cost ------------------------------------------------------
const chk = ff(["-i", OUT, "-af", "ebur128=peak=true", "-f", "null", "-"]);
const sum = chk.split("Summary:").pop() || "";
const g = k => { const x = sum.match(new RegExp(`^\\s*${k}:\\s*(-?[\\d.]+)`, "m")); return x ? parseFloat(x[1]) : NaN; };
const [oi, olra, otp] = [g("I"), g("LRA"), g("Peak")];

console.log(`input      ${(+M.input_i).toFixed(1)} LUFS · ${(+M.input_tp).toFixed(1)} dBTP · LRA ${(+M.input_lra).toFixed(1)}`);
console.log(`output     ${oi.toFixed(1)} LUFS · ${otp.toFixed(1)} dBTP · LRA ${olra.toFixed(1)}   (target ${I} / ${TP})`);
console.log(`gain       ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB · ${M.normalization_type === "linear" ? "fixed gain" : "dynamic normalisation (the limiter is working)"}`);
if (Number.isFinite(floor))
  console.log(`noise      ${floor.toFixed(1)} -> ${(floor + gain).toFixed(1)} dBFS`
    + (floor + gain > -34 ? "   ⚠ audible in the pauses" : ""));
const dLRA = parseFloat(M.input_lra) - olra;
if (dLRA > 2.5) console.log(`  ⚠ dynamics compressed by ${dLRA.toFixed(1)} LU; say so rather than deliver silently`);
if (Math.abs(oi - I) > 1.0) console.log(`  ⚠ ${oi.toFixed(1)} LUFS instead of ${I}; the source may be too short for a reliable measurement`);
for (const l of fxReport) console.log(l);
console.log(`${OUT} written`);
