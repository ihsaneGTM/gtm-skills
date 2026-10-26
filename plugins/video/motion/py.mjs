#!/usr/bin/env node
// The Python of the motion skills, started from node, so every command a skill types starts with `node`: no
// shell variable, no `~`, nothing a session started from the app would refuse.
//
//   node plugins/video/motion/py.mjs <script.py> [args…]      runs it with ~/.venv/gtm-motion's Python
//
// The venv is the one bootstrap.mjs --python makes (GTM_MOTION_VENV moves it). Its output and its exit code are
// the script's own.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const VENV = process.env.GTM_MOTION_VENV || path.join(os.homedir(), ".venv", "gtm-motion");
const PY = path.join(VENV, "bin", "python");
const args = process.argv.slice(2);
if (!args.length) { console.log("usage: node plugins/video/motion/py.mjs <script.py> [args…]"); process.exit(2); }
if (!fs.existsSync(PY)) {
  console.error(`The motion skills' Python is not set up yet (${VENV}): node plugins/video/motion/bootstrap.mjs --python`);
  process.exit(3);
}
const child = spawn(PY, args, { stdio: "inherit", env: { ...process.env, PYTHONUNBUFFERED: "1" } });
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, sig) => process.exit(code ?? (sig ? 1 : 0)));
child.on("error", e => { console.error(e.message); process.exit(1); });
