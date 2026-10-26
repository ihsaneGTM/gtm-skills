// AN OLD-SCHOOL LOOK on one stretch of the picture (2026-09-29) — a visual
// old-school "radio" effect, asked for in review for
// the hook of the GTM OS short, whose voice already plays through an old radio set
// (mix.mjs voiceFx). The picture follows it: until the cut, the frame is an old
// medium; the flash on the cut (titles.mjs flash) hides the switch back to today.
//
//   project.json  "look": { "from": 0, "to": 4.076, "preset": "film" }
//   LOOK=<preset>|none   overrides it for an A/B (build.sh and plan.mjs both read it)
//
// A look has two halves, and they have to agree:
//   · a FILTER on the composited picture — footage, the titles behind the speaker, the speaker —
//     built here and spliced into build.sh's graph on the [bg] stream, BEFORE the
//     over layer: `node looks.mjs --ffmpeg [--offset A]` prints it (empty: no look)
//   · OVERLAY beats on the over layer — dust, an on-screen display, scanlines —
//     that plan.mjs adds with lookBeats(), UNDER the flash, so the white covers them
//
// Grading the speaker's footage is otherwise forbidden (references/pitfalls.md): this is an
// EFFECT asked for on a bounded stretch, never a colour correction of the take.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------------
// The presets. `chain` runs on the stretch only (a copy of the picture, trimmed, then
// laid back over the original while t < to); `fps` holds frames like a projector.
export const LOOKS = {
  // Super 8 film: 12 images a second (the paper already moves at 8 — the same hand),
  // the gate weaving, faded warm colour (monochrome sepia turned the yellow words
  // khaki), grain that changes with every image, a flicker, a vignette; dust and
  // scratches drawn on the over layer
  film: {
    fps: 12,
    chain: [
      "crop=w=iw-28:h=ih-28:x='14+7*sin(2*PI*t*1.7)+3*sin(2*PI*t*5.3)':y='14+6*sin(2*PI*t*1.1+1.3)+2*sin(2*PI*t*6.1)'",
      "scale=W:H:flags=bicubic",
      "eq=saturation=0.40:contrast=1.12:gamma=0.92:brightness='-0.02+0.035*sin(2*PI*t*3.7)+0.03*(random(0)-0.5)':eval=frame",
      "curves=preset=vintage",
      "colorbalance=rs=0.06:gs=0.01:bs=-0.07:rm=0.05:gm=0.01:bm=-0.06:rh=0.03:bh=-0.04",
      "gblur=sigma=0.9",
      "noise=alls=26:allf=t+u",
      "vignette=angle=PI/3.6",
    ],
  },
  // a VHS tape: half the resolution, bleeding colour, the chroma off its luma, a
  // tracking band rolling up through the picture, rows that wobble, chroma noise;
  // "▶ PLAY" and the counter drawn on the over layer
  vhs: {
    // 30 images a second, the tape's own video rate: half the images of the master
    // to encode, and the motion reads as camcorder, not as film
    fps: 30,
    chain: [
      "scale=W/2:H/2:flags=bilinear",
      "eq=saturation=1.3:contrast=0.9:brightness=0.035:gamma=1.05",
      "colorbalance=rs=0.04:bs=0.06:rh=0.02",
      "chromashift=cbh=4:crh=-3:edge=smear",
      // the tape's noise at the TAPE's resolution, before the upscale: blockier, which
      // is what VHS noise looks like, and 6x cheaper to encode than full-frame noise
      // (152 MB for a 5.3 s hook at CRF 14, measured, with it after the upscale)
      "noise=c0s=6:c0f=t:c1s=12:c1f=t:c2s=12:c2f=t",
      "scale=W:H:flags=bilinear",
      "format=yuv420p",
      // the band: 64 px tall, rising from below the frame at 730 px/s; inside it the
      // rows tear sideways and fill with static, outside they barely wobble — a slow
      // wave that moves 12 times a second (a wobble that changed every row every
      // frame made the whole picture new each frame: 93 MB for 5.3 s)
      "geq=lum='lum(X+if(lt(abs(Y-(2208-mod(T*730\\,2600)))\\,32)\\,16*sin(Y*1.7+T*90)+10*(random(1)-0.5)\\,1.2*sin(Y*0.045+floor(T*12)*0.9))\\,Y)"
        + "+if(lt(abs(Y-(2208-mod(T*730\\,2600)))\\,32)\\,40*random(2)\\,0)':cb='cb(X\\,Y)':cr='cr(X\\,Y)'",
    ],
  },
  // a cathode-ray set: the picture bulging to the curve of the glass, black corners,
  // a glow around the light, a colour fringe, a cool white; scanlines, a refresh bar
  // rolling down and the bezel drawn on the over layer
  crt: {
    chain: [
      "eq=saturation=1.18:contrast=1.12:brightness=0.01",
      "colortemperature=temperature=8500:mix=0.6",
      "rgbashift=rh=3:bh=-3",
      "split[crt_a][crt_b];[crt_b]gblur=sigma=9[crt_g];[crt_a][crt_g]blend=all_mode=screen:all_opacity=0.28",
      "lenscorrection=k1=0.10:k2=0.03:i=bilinear",
      "noise=alls=7:allf=t",
      "vignette=angle=PI/4.2",
    ],
  },
};

const HERE = path.dirname(fileURLToPath(import.meta.url));

// the look in force: project.json `look`, or the LOOK env var for an A/B
export function currentLook(P) {
  const env = process.env.LOOK;
  if (env === "none") return null;
  const base = P.look ?? null;
  if (!env && !base) return null;
  const look = { from: 0, ...(base ?? {}), ...(env ? { preset: env } : {}) };
  if (look.to == null) throw new Error("look: `to` missing (the end of the stretch, in output seconds)");
  if (!LOOKS[look.preset]) throw new Error(`look: unknown preset "${look.preset}" (${Object.keys(LOOKS).join(", ")})`);
  return look;
}

// The filter text: [bgraw] → [bg]. The stretch is trimmed a little PAST its end so
// the switch happens on the original's frames (overlay `enable`), never on a gap.
export function lookFilter(look, { W, H, offset = 0 }) {
  const a = Math.max(0, look.from - offset), b = look.to - offset;
  if (b <= 0) return "";
  const L = LOOKS[look.preset];
  const chain = L.chain.map(s => s.replace(/\bW\/2\b/g, String(W / 2)).replace(/\bH\/2\b/g, String(H / 2))
    .replace(/scale=W:H/g, `scale=${W}:${H}`)).join(",");
  const hold = L.fps ? `fps=${L.fps},` : "";
  const back = L.fps ? ",fps=60" : "";
  const win = a > 0 ? `between(t,${a},${b})` : `lt(t,${b})`;
  return `[bgraw]split=2[lk_base][lk_in];
[lk_in]trim=end=${(b + 0.25).toFixed(3)},format=yuv420p,${hold}${chain}${back},format=yuv420p[lk_fx];
[lk_base][lk_fx]overlay=0:0:format=auto:eof_action=pass:enable='${win}'[bg];`;
}

// ---------------------------------------------------------------------------------
// The overlay halves (over layer). Every one steps on its own clock where the medium
// does: film dust on the projector's 12 images a second, the rest at 60.
const rng = seed => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

export function lookBeats(look, { frame = { w: 1080, h: 1920 } } = {}) {
  if (!look) return [];
  const W = frame.w, H = frame.h, K = W / 1080;
  const { from, to } = look;
  const live = t => t >= from && t < to;
  if (look.preset === "film") {
    const FPS = LOOKS.film.fps;
    return [{
      id: "look-film-dust", from, to, layer: "over", mutesCaptions: false, cues: () => [],
      draw(ctx, t) {
        if (!live(t)) return;
        const k = Math.round(t * FPS), R = rng(k * 7919 + 13);
        ctx.save();
        // specks: dark, uneven, a few per image
        const n = 5 + Math.floor(R() * 9);
        for (let i = 0; i < n; i++) {
          const x = R() * W, y = R() * H, r = (1.2 + R() * 3.8) * K;
          ctx.fillStyle = `rgba(20,14,8,${(0.45 + R() * 0.45).toFixed(2)})`;
          ctx.beginPath(); ctx.ellipse(x, y, r * (0.6 + R() * 0.8), r, R() * Math.PI, 0, Math.PI * 2); ctx.fill();
        }
        // a hair now and then
        if (R() < 0.45) {
          const x = R() * W, y = R() * H, len = (40 + R() * 110) * K, ang = R() * Math.PI * 2;
          ctx.strokeStyle = `rgba(18,12,6,${(0.5 + R() * 0.35).toFixed(2)})`; ctx.lineWidth = (1.2 + R()) * K;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + Math.cos(ang) * len * 0.4 + (R() - 0.5) * 30 * K, y + Math.sin(ang) * len * 0.4 + (R() - 0.5) * 30 * K,
            x + Math.cos(ang) * len * 0.7 + (R() - 0.5) * 30 * K, y + Math.sin(ang) * len * 0.7 + (R() - 0.5) * 30 * K,
            x + Math.cos(ang) * len, y + Math.sin(ang) * len);
          ctx.stroke();
        }
        // a scratch down the whole frame, light, wandering a little — it persists a few
        // images on the same x, the way a scratch runs along a reel
        const S = rng(Math.floor(k / 5) * 104729 + 7);
        if (S() < 0.7) {
          const x0 = S() * W, wob = (S() - 0.5) * 10 * K;
          ctx.strokeStyle = `rgba(245,236,214,${(0.22 + R() * 0.25).toFixed(2)})`; ctx.lineWidth = (1.0 + S() * 1.4) * K;
          ctx.beginPath(); ctx.moveTo(x0 + (R() - 0.5) * 3 * K, 0);
          for (let y = 0; y <= H; y += 120 * K) ctx.lineTo(x0 + wob * Math.sin(y / H * 6 + k * 0.3) + (R() - 0.5) * 2 * K, y);
          ctx.stroke();
        }
        ctx.restore();
      },
    }];
  }
  if (look.preset === "vhs") {
    return [{
      id: "look-vhs-osd", from, to, layer: "over", mutesCaptions: false, cues: () => [],
      draw(ctx, t) {
        if (!live(t)) return;
        const x = 0.055 * W, y = 0.052 * H, s = 46 * K;
        const sec = Math.floor(t - from);
        const counter = `0:00:${String(sec).padStart(2, "0")}`;
        ctx.save();
        ctx.font = `bold ${s}px Menlo, "SF Mono", monospace`;
        ctx.textBaseline = "alphabetic";
        // the OSD's own glow: a soft copy under a hard white
        ctx.shadowColor = "rgba(255,255,255,0.55)"; ctx.shadowBlur = 10 * K;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillText("▶ PLAY", x, y);
        ctx.fillText(counter, x + 290 * K, y);
        ctx.restore();
      },
    }];
  }
  if (look.preset === "crt") {
    return [{
      id: "look-crt-glass", from, to, layer: "over", mutesCaptions: false, cues: () => [],
      draw(ctx, t) {
        if (!live(t)) return;
        ctx.save();
        // scanlines: one dark row every 4 px
        ctx.fillStyle = "rgba(0,0,0,0.26)";
        for (let y = 0; y < H; y += 4 * K) ctx.fillRect(0, y, W, 1.6 * K);
        // the refresh bar, rolling down
        const bh = 260 * K, by = ((t - from) * 0.55 % 1) * (H + bh) - bh;
        const g = ctx.createLinearGradient(0, by, 0, by + bh);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.06)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(0, by, W, bh);
        // the bezel: everything outside a rounded screen goes black
        const inset = 14 * K, r = 110 * K;
        ctx.fillStyle = "#050505";
        ctx.beginPath(); ctx.rect(0, 0, W, H);
        ctx.roundRect(inset, inset, W - 2 * inset, H - 2 * inset, r);
        ctx.fill("evenodd");
        ctx.restore();
      },
    }];
  }
  return [];
}

// CLI: the filter text for build.sh
const MAIN = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (MAIN && process.argv.includes("--ffmpeg")) {
  const P = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8"));
  const i = process.argv.indexOf("--offset");
  const offset = i > 0 ? parseFloat(process.argv[i + 1]) : 0;
  const look = currentLook(P);
  process.stdout.write(look ? lookFilter(look, { W: P.width ?? 1080, H: P.height ?? 1920, offset }) : "");
}
