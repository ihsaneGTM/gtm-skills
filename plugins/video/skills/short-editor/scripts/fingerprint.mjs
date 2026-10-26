// THE FINGERPRINT OF A PIECE OF A LAYER, without painting it (render.mjs --fingerprint).
//
// build.sh keeps the segments of the picture between two renders; it has to know, before drawing
// anything, which segments' layers would come out different. Drawing them to find out was most of
// a render after a small change (17 s of 26 on a 50 s short, 48 of 66 on 79 s at 60 fps). So
// render.mjs can run a piece "dry": every call that can change a canvas is recorded, with its
// arguments, in the order it is made (canvases, images, paths, gradients and patterns named in
// the order they appear, an image by the md5 of its bytes, a font file by the md5 of its file),
// and the calls that paint pixels are not executed once the frames start. The md5 of that record
// is the piece's fingerprint: the same record, the same pixels, frame for frame.
//
// It stays on the side of drawing again: anything it cannot follow makes the piece VOLATILE (drawn
// for real at every render): a frame that reads pixels back (getImageData, data(), toBuffer…),
// calls Math.random, Date.now or performance.now, or hands a canvas call an object it does not
// know. Before the frames (a plan's load, its caches built at import), everything runs for real:
// what the frames read from those canvases is the real thing.
//
// Imported FIRST by render.mjs, before anything else touches @napi-rs/canvas.
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";

export const FP = { on: process.argv.includes("--fingerprint"), inFrame: false, volatile: null };
const log = [];
const hash = crypto.createHash("md5");
// FP_DUMP=<file>: the record written out too, to see what a fingerprint is made of
const dump = FP.on && process.env.FP_DUMP ? fs.openSync(process.env.FP_DUMP, "w") : null;
const rec = s => { log.push(s); if (dump !== null) fs.writeSync(dump, s + "\n"); if (log.length >= 4096) { hash.update(log.join("\n")); log.length = 0; } };
export function fingerprint() {
  if (FP.volatile) return `volatile ${FP.volatile}`;
  hash.update(log.join("\n")); log.length = 0;
  return hash.digest("hex");
}
const volatile = why => { if (FP.inFrame && !FP.volatile) FP.volatile = why; };

if (FP.on) {
  const require = createRequire(import.meta.url);
  const M = require("@napi-rs/canvas");
  const ids = new WeakMap(), count = {};
  const idOf = (o, kind) => {
    let id = ids.get(o);
    if (!id) { count[kind] = (count[kind] ?? 0) + 1; id = `${kind}${count[kind]}`; ids.set(o, id); }
    return id;
  };
  const md5 = b => crypto.createHash("md5").update(b).digest("hex");
  const isCanvas = o => o instanceof M.CanvasElement || (typeof M.Canvas === "function" && o instanceof M.Canvas);
  function ser(v) {
    if (v === null) return "null";
    switch (typeof v) {
      case "number": return Object.is(v, -0) ? "-0" : String(v);
      case "string": return JSON.stringify(v);
      case "boolean": case "undefined": return String(v);
      case "object": break;
      default: FP.volatile ??= `an argument of type ${typeof v}`; return "?";
    }
    if (Array.isArray(v)) return `[${v.map(ser).join(",")}]`;
    if (isCanvas(v)) return `c:${idOf(v, "c")}:${v.width}x${v.height}`;
    if (v instanceof M.Image) return `i:${idOf(v, "i")}`;
    if (v instanceof M.Path2D) return `p:${idOf(v, "p")}`;
    if (v instanceof M.ImageData) return `d:${v.width}x${v.height}:${md5(v.data)}`;
    if (ArrayBuffer.isView(v)) return `b:${md5(v)}`;
    if (v instanceof M.DOMMatrix) return `m:${[v.a, v.b, v.c, v.d, v.e, v.f].map(ser).join(",")}`;
    const tag = ids.get(v);
    if (tag) return tag;                                       // a gradient, a pattern, a context
    if (Object.getPrototypeOf(v) === Object.prototype) return `{${Object.keys(v).sort().map(k => `${k}:${ser(v[k])}`).join(",")}}`;
    FP.volatile ??= `an argument it does not know (${v?.constructor?.name})`;
    return "?";
  }
  const args = a => a.map(ser).join(",");

  // the 2D context: every method recorded; in a frame, the painting ones are not run
  const X = Object.getPrototypeOf(M.createCanvas(1, 1).getContext("2d"));
  const PAINT = new Set(["fill", "stroke", "fillRect", "strokeRect", "clearRect", "fillText", "strokeText", "drawImage", "drawCanvas", "putImageData"]);
  const READ = new Set(["getImageData"]);
  const QUIET = new Set(["measureText", "getTransform", "getLineDash", "getContextAttributes", "isPointInPath", "isPointInStroke", "constructor"]);
  for (const name of Object.getOwnPropertyNames(X)) {
    const d = Object.getOwnPropertyDescriptor(X, name);
    if (typeof d.value === "function" && name !== "constructor") {
      const orig = d.value;
      X[name] = function (...a) {
        if (READ.has(name)) volatile(`it reads pixels back (${name})`);
        if (!QUIET.has(name)) rec(`${idOf(this, "x")}.${name}(${args(a)})`);
        if (FP.inFrame && PAINT.has(name)) return undefined;
        const r = orig.apply(this, a);
        if (r && typeof r === "object" && /^create/.test(name)) rec(`=${idOf(r, name === "createPattern" ? "t" : name === "createImageData" ? "d" : "g")}`);
        return r;
      };
    } else if (d.set) {
      const set = d.set;
      Object.defineProperty(X, name, { ...d, set(v) { rec(`${idOf(this, "x")}.${name}=${ser(v)}`); set.call(this, v); } });
    }
  }
  // a context belongs to its canvas: which one, at which size, with which attributes
  const E = M.CanvasElement.prototype;
  const getContext = E.getContext;
  E.getContext = function (...a) { const x = getContext.apply(this, a); rec(`${idOf(x, "x")}=ctx(${ser(this)},${args(a)})`); return x; };
  for (const name of ["width", "height"]) {
    const d = Object.getOwnPropertyDescriptor(E, name);
    if (d?.set) Object.defineProperty(E, name, { ...d, set(v) { rec(`${idOf(this, "c")}.${name}=${ser(v)}`); d.set.call(this, v); } });
  }
  for (const name of ["data", "encode", "encodeSync", "encodeStream", "toBuffer", "toDataURL", "toDataURLAsync", "toBlob", "convertToBlob", "savePng"]) {
    const orig = E[name]; if (typeof orig !== "function") continue;
    E[name] = function (...a) { volatile(`it reads pixels back (${name})`); return orig.apply(this, a); };
  }
  // gradients and patterns: their stops and transforms
  const G = Object.getPrototypeOf(X.createLinearGradient.call(M.createCanvas(1, 1).getContext("2d"), 0, 0, 1, 1));
  const addColorStop = G.addColorStop;
  G.addColorStop = function (...a) { rec(`${idOf(this, "g")}.addColorStop(${args(a)})`); return addColorStop.apply(this, a); };
  const T = Object.getPrototypeOf(X.createPattern.call(M.createCanvas(1, 1).getContext("2d"), M.createCanvas(1, 1), "repeat"));
  if (T.setTransform) { const st = T.setTransform; T.setTransform = function (...a) { rec(`${idOf(this, "t")}.setTransform(${args(a)})`); return st.apply(this, a); }; }
  // paths: built from what they are given and every call on them
  const PP = M.Path2D.prototype;
  for (const name of Object.getOwnPropertyNames(PP)) {
    const d = Object.getOwnPropertyDescriptor(PP, name);
    if (typeof d.value !== "function" || name === "constructor") continue;
    const orig = d.value;
    PP[name] = function (...a) {
      const r = orig.apply(this, a);
      rec(`${idOf(this, "p")}.${name}(${args(a)})${r instanceof M.Path2D ? `=${idOf(r, "p")}` : ""}`);
      return r;
    };
  }
  const Path2D = M.Path2D;
  class RecordedPath2D extends Path2D {
    constructor(...a) { super(...a); rec(`${idOf(this, "p")}=new Path2D(${args(a)})`); }
  }
  M.Path2D = RecordedPath2D;
  // a canvas made by createCanvas: its size from the start
  const createCanvas = M.createCanvas;
  M.createCanvas = (...a) => { const c = createCanvas(...a); rec(`${idOf(c, "c")}=createCanvas(${args(a)})`); return c; };
  // an image: the md5 of what it is made from
  const I = M.Image.prototype, src = Object.getOwnPropertyDescriptor(I, "src");
  Object.defineProperty(I, "src", { ...src, set(v) {
    const what = Buffer.isBuffer(v) || v instanceof Uint8Array ? md5(v) : typeof v === "string" ? (fs.existsSync(v) ? md5(fs.readFileSync(v)) : md5(v)) : ser(v);
    rec(`${idOf(this, "i")}.src=${what}`); src.set.call(this, v);
  } });
  // fonts: a family is the file it was registered from
  const F = M.GlobalFonts;
  for (const name of ["register", "registerFromPath", "loadFontsFromDir", "setAlias", "remove", "removeAll", "removeBatch", "loadSystemFonts"]) {
    const orig = F[name]; if (typeof orig !== "function") continue;
    F[name] = function (...a) {
      const desc = a.map(x => typeof x === "string" && fs.existsSync(x) && fs.statSync(x).isFile() ? `${JSON.stringify(x)}:${md5(fs.readFileSync(x))}`
        : typeof x === "string" && fs.existsSync(x) ? `${JSON.stringify(x)}:${fs.readdirSync(x).sort().map(f => { try { return `${f}:${fs.statSync(`${x}/${f}`).size}`; } catch { return f; } }).join("|")}`
        : ser(x));
      rec(`fonts.${name}(${desc.join(",")})`);
      return orig.apply(this, a);
    };
  }
  // what changes from one run to the next, inside a frame
  const random = Math.random, now = Date.now, pnow = performance.now.bind(performance);
  Math.random = () => { volatile("Math.random"); return random(); };
  Date.now = () => { volatile("Date.now"); return now(); };
  performance.now = () => { volatile("performance.now"); return pnow(); };
}
