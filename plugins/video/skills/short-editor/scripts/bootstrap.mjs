// Makes the machine ready, so nobody has to.
//
//   node bootstrap.mjs [--check]
//
// The engine needs a native canvas binding and a speech model, and asking
// users to run installs by hand is how a tool quietly stops being used. So it
// provisions itself on first run: idempotent, silent once done, and it never
// touches anything outside the skill folder, the shared music shelf and
// ~/.venv/whisper.
//
// The one thing it will NOT install is ffmpeg: that needs Homebrew and a
// password. If it is missing, this says so and stops.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, "..");
const CHECK = process.argv.includes("--check");
const WHISPER = process.env.WHISPER_PY || path.join(os.homedir(), ".venv", "whisper", "bin", "python");
const done = [], todo = [];

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { encoding: "utf8", stdio: CHECK ? "pipe" : "inherit", ...opts });

// --- ffmpeg: required, not installable from here ------------------------------
if (spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status !== 0) {
  console.error("ffmpeg is missing. It is the one prerequisite this cannot install");
  console.error("(Homebrew asks for a password):  brew install ffmpeg");
  process.exit(1);
}

// --- node deps ----------------------------------------------------------------
const canvas = path.join(SKILL, "node_modules", "@napi-rs", "canvas");
if (!fs.existsSync(canvas)) {
  todo.push("node dependencies");
  if (!CHECK) {
    process.stderr.write("→ installing node dependencies (once per machine)…\n");
    const r = run("npm", ["install", "--no-audit", "--no-fund", "--silent"], { cwd: SKILL });
    if (r.status !== 0 || !fs.existsSync(canvas)) {
      console.error("npm install failed; run it by hand in " + SKILL);
      process.exit(1);
    }
    done.push("node dependencies");
  }
}

// --- faster-whisper -------------------------------------------------------------
// macOS ships a PEP 668 Python, so a plain `pip install` is refused: the venv is
// not a preference, it is the only way in.
// The two imports that check it cost 1.5 to 3.5 s (mlx loads Metal), and this runs before every
// render and transcription: what they found is kept in the venv, until its packages change (pip
// adds or removes them in site-packages, which changes its date).
const VENV = path.dirname(path.dirname(WHISPER)), STAMP = path.join(VENV, ".gtm-checked");
const siteDate = () => {
  try { const lib = path.join(VENV, "lib"), v = fs.readdirSync(lib).find(d => d.startsWith("python")); return v ? fs.statSync(path.join(lib, v, "site-packages")).mtimeMs : null; }
  catch { return null; }
};
const site = siteDate(), SIG = site == null ? null : `${WHISPER} ${site}`;
const known = (() => { try { const [sig, ...ok] = fs.readFileSync(STAMP, "utf8").trim().split("\n"); return sig === SIG ? ok : []; } catch { return []; } })();
const whisperOk = fs.existsSync(WHISPER) && (known.includes("faster_whisper") ||
  spawnSync(WHISPER, ["-c", "import faster_whisper"], { encoding: "utf8" }).status === 0);
if (!whisperOk) {
  todo.push("faster-whisper");
  if (!CHECK) {
    process.stderr.write("→ installing faster-whisper (once per machine, ~15 s)…\n");
    const venv = path.dirname(path.dirname(WHISPER));
    if (!fs.existsSync(WHISPER)) run("python3", ["-m", "venv", venv]);
    const pip = path.join(venv, "bin", "pip");
    if (!fs.existsSync(pip)) {
      console.error(`could not create the venv ${venv}; create it by hand, or point WHISPER_PY elsewhere`);
      process.exit(1);
    }
    run(pip, ["install", "-q", "faster-whisper"]);
    if (spawnSync(WHISPER, ["-c", "import faster_whisper"], { encoding: "utf8" }).status !== 0) {
      console.error("faster-whisper does not import after install; check the pip output above");
      process.exit(1);
    }
    done.push("faster-whisper");
  }
}

// --- mlx-whisper: the same transcription on an Apple Silicon Mac's GPU -----------
// About five times faster than faster-whisper on the CPU (asr.py has the numbers). Optional:
// if it does not install, asr.py stays on faster-whisper, so a failure is a warning.
const mlxOk = () => spawnSync(WHISPER, ["-c", "import mlx_whisper"], { encoding: "utf8" }).status === 0;
let mlxReady = false;
if (process.platform === "darwin" && process.arch === "arm64" && fs.existsSync(WHISPER)) {
  mlxReady = known.includes("mlx_whisper") || mlxOk();
  if (!mlxReady && CHECK) process.stderr.write("⚠ mlx-whisper not installed: transcription runs on the CPU, about 5× slower\n");
  else if (!mlxReady) {
    process.stderr.write("→ installing mlx-whisper, transcription on the Mac's GPU (once per machine)…\n");
    run(path.join(path.dirname(WHISPER), "pip"), ["install", "-q", "mlx-whisper"]);
    mlxReady = mlxOk();
    if (mlxReady) done.push("mlx-whisper");
    else process.stderr.write("⚠ mlx-whisper did not install; transcription stays on the CPU\n");
  }
}

// what was found, for the next run (nothing is kept when the venv is not there or not whole)
if (fs.existsSync(WHISPER) && !todo.includes("faster-whisper")) {
  const now = siteDate();
  const ok = ["faster_whisper", ...(mlxReady ? ["mlx_whisper"] : [])];
  if (now != null) try { fs.writeFileSync(STAMP, [`${WHISPER} ${now}`, ...ok].join("\n") + "\n"); } catch {}
}

// --- music shelf ----------------------------------------------------------------
// The Mixkit License allows use of these tracks in your videos, not their
// redistribution in a repo, so they are fetched from mixkit.co on first run
// instead of being committed. A failed download is a warning, never fatal:
// only an edit that picks that track needs it.
const MUSIC = path.resolve(SKILL, "../../assets/music");
const TRACKS = [
  ["mixkit-complicated-281.mp3", "https://assets.mixkit.co/music/281/281.mp3"],
  ["mixkit-deep-urban-623.mp3", "https://assets.mixkit.co/music/623/623.mp3"],
  ["mixkit-gimme-that-groove-872.mp3", "https://assets.mixkit.co/music/872/872.mp3"],
  ["mixkit-hip-hop-02-738.mp3", "https://assets.mixkit.co/music/738/738.mp3"],
];
const missingTracks = TRACKS.filter(([f]) => !fs.existsSync(path.join(MUSIC, f)));
const warnings = [];
if (missingTracks.length) {
  if (CHECK) {
    warnings.push(`music shelf: ${missingTracks.length} track(s) not downloaded yet (${missingTracks.map(([f]) => f).join(", ")})`);
  } else {
    process.stderr.write(`→ downloading ${missingTracks.length} music track(s) from mixkit.co (once per machine)…\n`);
    let got = 0;
    for (const [file, url] of missingTracks) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(MUSIC, { recursive: true });
        const tmp = path.join(MUSIC, `${file}.part`);
        fs.writeFileSync(tmp, buf);
        fs.renameSync(tmp, path.join(MUSIC, file));
        got++;
      } catch (e) {
        warnings.push(`music shelf: could not download ${file} (${e.message}); get it from ${url} into ${MUSIC}`);
      }
    }
    if (got) done.push(`music shelf (${got} track${got > 1 ? "s" : ""})`);
  }
}
for (const w of warnings) process.stderr.write(`⚠ ${w}\n`);

if (CHECK) {
  console.log(todo.length ? `to provision: ${todo.join(", ")}` : "ready");
  process.exit(todo.length ? 1 : 0);
}
if (done.length) process.stderr.write(`✓ ${done.join(" + ")}; nothing left to do on this machine\n`);
// The whisper weights (~1.5 GB) download on the first transcription and cache
// in ~/.cache/huggingface. Nothing to do here; transcribe.py just takes longer
// the first time.
