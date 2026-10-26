// A SCREENSHOT OF A PUBLIC PAGE the speaker names (a GitHub repo, a pricing page, a product's
// site), when the user has no capture of their own: Chrome, headless, on this Mac.
//
//   node capture.mjs <https-url> --name repo [--phone] [--size 1280x900] [--wait 2500]
//
// --phone renders it the way the reference shows a README: a phone's width (430 px at 2x, a mobile
// user agent), for a tall `phone` card; --tall makes the capture 3 screens long, for a card that
// SCROLLS through it (cards.mjs `scroll`). Writes assets/media/<name>.png. Only a page anyone can
// open: never a page behind the user's login, never a private document.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const url = argv[0], name = arg("--name");
if (!url || !/^https:\/\//i.test(url) || !name) { console.error("usage: node capture.mjs <https-url> --name <name> [--phone] [--tall] [--size 1280x900]"); process.exit(2); }
const CHROME = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"].find(p => fs.existsSync(p));
if (!CHROME) { console.error("no Chrome-family browser in /Applications: ask the user for a screenshot instead"); process.exit(3); }
const phone = argv.includes("--phone");
const tall = argv.includes("--tall");
const [w, h0] = (arg("--size", phone ? "430x932" : "1280x900")).split("x").map(Number);
const h = tall ? h0 * 3 : h0;
fs.mkdirSync(path.resolve("assets", "media"), { recursive: true });
fs.mkdirSync(path.resolve("tmp", "chrome-profile"), { recursive: true });
const out = path.resolve("assets", "media", `${name}.png`);
const args = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${path.resolve("tmp", "chrome-profile")}`, `--window-size=${w},${h}`, `--virtual-time-budget=${arg("--wait", "2500")}`,
  `--screenshot=${out}`];
if (phone) args.push("--force-device-scale-factor=2", "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
args.push(url);
const r = spawnSync(CHROME, args, { encoding: "utf8", timeout: 60000 });
if (!fs.existsSync(out)) { console.error(`no screenshot (${(r.stderr || "").split("\n").slice(-3).join(" ")})`); process.exit(1); }
fs.rmSync(path.resolve("tmp", "chrome-profile"), { recursive: true, force: true });
const s = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "json", out], { encoding: "utf8" }).stdout).streams[0];
console.log(`assets/media/${name}.png — ${s.width}x${s.height} (aspect h/w ${(s.height / s.width).toFixed(3)}) · ${url}`);
