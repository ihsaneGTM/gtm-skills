/* The kit of a MOTION PAGE of /video-long-to-shorts (motionpage.mjs): one white page's content as an After Effects-like scene, in
   a page of its own, drawn over the WHOLE vertical frame (1080×1920, transparent: the short's sheet carries the paper).
   No inner frame, no crop: an element leaves the frame only on purpose.

   A page html loads, in this order: vendor/gsap/*.min.js (the ones it uses), kit.js, words.js (window.WORDS, the page's
   words on ITS clock: t = 0 when the sheet starts rising, it is up at 0.45 s), then its own script, which calls
   PAGE({ dur, build(tl), cues, camera }) once:
     build(tl)   lays the scene (DOM, SVG or canvas) and fills tl, a PAUSED gsap timeline, on the words: tl.to(x, {…}, A("hiring"))
     draw(t)     optional, called after tl is set at t: for canvas drawing or anything computed (particles: seeded, from t only)
     cues        [{ t, name, gain }] the page's sounds, names of the packs (m:<motionix>, p:<paper>, t:<top5>), on its clock
     camera      optional, for a page that shows the face: [[t, zoom, ramp, anchorX, ease]] on its clock
     handoff     optional (a page set up with --handoff): from this time on its clock the sheet stops drawing its paper
                 and this page draws it: an <img src="paper.png"> over the whole frame, which it may cut, tear, knock out…
   Everything is a function of t: no CSS animation, no transition, no Math.random (K.rand(seed)), no Date.

   THE FRAME (the short's rules):
     - y 0.10–0.235 (192–450 px) is the subtitles' (ink, Impact capitals, centred): keep it empty, or only a soft ground
     - the safe area: x 0.095–0.905 (103–977 px), y 0.235–0.775 (450–1488 px); below 0.79 (1517 px) the app's buttons
     - something may BLEED past the frame's edges on purpose (a giant number, a sweep, a camera move): that reads as design.
       What must never happen: a hard horizontal cut through an element in the middle of the frame. */
(() => {
  const css = document.createElement("style");
  css.textContent = `
@font-face{font-family:"Title";src:url(fonts/BricolageGrotesque.ttf) format("truetype");font-weight:100 900}
@font-face{font-family:"Text";src:url(fonts/Onest.ttf) format("truetype");font-weight:100 900}
@font-face{font-family:"Serif";src:url(fonts/InstrumentSerif-Italic.ttf) format("truetype")}
@font-face{font-family:"Mono";src:url(fonts/GeistMono.ttf) format("truetype");font-weight:100 900}
:root{--y:#FFD90D;--ink:#1A1A1A;--ink2:#6B6878;--line:#E9E7EF;--paper:#FFFFFF;--red:#FF4D4D;--ok:#2BB673;
  --shadow:0 2px 3px rgba(26,26,26,.06),0 22px 44px -18px rgba(26,26,26,.28);--title:"Title";--text:"Text";--serif:"Serif";--mono:"Mono"}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:transparent}
#stage{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden}
#stage *{box-sizing:border-box}
body.still{background:url(paper.png) 0 0/1080px 1920px}
body.still.guides #stage::after{content:"";position:absolute;left:0;right:0;top:192px;height:258px;background:rgba(255,77,77,.07);outline:2px dashed rgba(255,77,77,.4)}
`;
  document.head.appendChild(css);
  const W = () => window.WORDS || [];
  const k = s => String(s).toLowerCase().replace(/[^a-z0-9'’%-]/g, "");
  const hit = (q, n = 1, after = 0) => {
    const h = W().filter(w => w.s >= after && k(w.w) === k(q))[n - 1];
    if (!h) throw new Error(`kit: « ${q} » #${n} is not in this page's words`);
    return h;
  };
  let seed0 = 1;
  window.K = {
    A: (q, n, after) => hit(q, n, after).s,   // a word's onset, on the page clock
    Z: (q, n, after) => hit(q, n, after).e,   // its end
    clamp: (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)),
    lerp: (a, b, x) => a + (b - a) * x,
    rand: (s = seed0++) => { let x = (s * 16807 + 11) % 2147483647; return () => ((x = (x * 16807) % 2147483647) / 2147483647); },
    el(tag, attrs = {}, parent = document.getElementById("stage")) {
      const svg = /^(svg|path|g|circle|rect|line|polyline|polygon|text|defs|linearGradient|radialGradient|stop|mask|clipPath|use|ellipse|filter|fe[A-Z]\w*|tspan|pattern|image)$/.test(tag);
      const e = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
      for (const [a, v] of Object.entries(attrs)) {
        if (a === "html") e.innerHTML = v; else if (a === "text") e.textContent = v;
        else if (a === "style" && typeof v === "object") Object.assign(e.style, v);
        else e.setAttribute(a, v);
      }
      if (parent) parent.appendChild(e);
      return e;
    },
    img: name => `img/${name}`,             // the page's pictures: img/people/<name>.jpg, img/logos/…, img/face/…
  };
  window.PAGE = (spec) => {
    const tl = gsap.timeline({ paused: true });
    spec.build(tl);
    window.__page = {
      dur: spec.dur, cues: spec.cues || [], camera: spec.camera || null, handoff: spec.handoff ?? null,
      seek(t) { tl.seek(t, false); if (spec.draw) spec.draw(t); },
    };
  };
  window.addEventListener("load", async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    const q = new URLSearchParams(location.search);
    if (q.has("still")) document.body.classList.add("still");
    if (q.has("guides")) document.body.classList.add("guides");
    if (q.has("bg")) document.body.style.background = `url(${q.get("bg")}) 0 0/1080px 1920px`;   // a page that shows the face: look at it over a frame of the face
    if (q.has("t") && window.__page) window.__page.seek(+q.get("t"));
    window.__ready = !!window.__page;
  });
})();
