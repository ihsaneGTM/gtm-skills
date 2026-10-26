> **For the voiceover video** (style « Document »): the same engine as the article video, copied into
> `template/document/film/`. What applies here: time on the words, screens, items, the camera, depth cuts (`B.depth`), the
> V chapter page (`B.chapter … style: 'V'`), `B.big`, `F.callout`, `F.img`, ink, sounds. What does not: the article
> formula's blocks (`B.decision`, `B.titles`, `B.notYet`, `B.method`, `B.brand`, `B.summary`, `B.end`), stamps (refused
> here), P3 pages, the host. This format's own cards and junctions are in the template's `story.js` (`look.md` lists them).

# The engine: what is written in `film/story.js`

The film is a 1920 × 1080 HTML page, deterministic: `F.seek(t)` draws the frame of instant t. `render.mjs` films it
frame by frame in headless Chrome. Everything is in screen pixels, origin top left. A screen's elements are placed
**by their centre**.

Files (copied from the template, never changed in a video): `engine.js` (F.*), `fx.js` (the P3 and V pages, torn
photos, GIFs, ink, tear), `blocs.js` (B.*), `theme.css`; and written for the video by `new.mjs`: `brand.css` (the
brand's colours, measured, and faces: `--v` the accent, `--ink` its dark, `--on-v` what is written on the accent,
`--v-on-white` the accent as a line or a word on white, `--logo-on-v` the logo on the accent), `brand.js`
(`window.LANG`, `window.BRAND` { name, logo, site, phone, lightAccent }, `window.FONTS`). `lightAccent` (an accent
under 3:1 on white) switches on theme.css § a light accent: nothing to write in a story for it.
`window.T` (blocs.js) holds the words of the blocks in the video's language (`T.point`, `T.remember`, `T.method`,
`T.watchOut`, `T.moreThan`, `T.book`…); `window.T_EXTRA` (in story.js, before anything) overrides any of them.

## Time: on the words

```js
const A = (q, n = 1, after = 0) => F.at(q, n, after);   // the start of the n-th word q (the WHOLE word), after `after`
const Z = (q, n = 1, after = 0) => F.end(q, n, after);  // the end of that word
t.sign = A('sign'); t.tab2 = A('tab', 2); t.more = A('more', 1, t.brand); t.no = A('no', 1, t.here2);
```
- The whole word, compared without accents, case or punctuation: `A('say')` is « say », never « says »; `A('send')`
  finds « send. ». `'word$'`, the old way of asking for the exact word, still works. Apostrophes and hyphens stay:
  `A("l'annonce")`, `A("it's", 1, t.then)`, `A('re-check')`.
- A word the voice never says whole is looked for at the start of a word (`A('catch')` takes « catch-all »), with a
  warning the render prints (`[film] ⚠ the voice never says « catch » whole…`): write the whole word.
- `F.GEN.t0` / `F.GEN.t1`: the titles' start and end. `F.END`: the end of the voice + 0.3 s. `F.DUR`: the whole film
  (end + 3.8 s of end card).
- `F.T = t` (at the end of the instants) lets the preview's console read them, and the engine checks each one.
- An error `word not in the voice: x #n` stops the film: fix the spelling or the n
  (`node plugins/video/motion/voice.mjs anchors <run>/vo` lists every word with its time).
- An error `instant not set: <what> is undefined, story.js line N` stops the film too: an instant used before it is
  set, misspelt, or never set because a `//` commented out the rest of its line (one instant per statement). Every
  instant an element, a screen, a camera move, a sound or a block takes must be a number; it was silent before (an
  element that never shows).

## The screens

```js
const s3 = F.screen('summary', t0, t1, { accent: false, push: 0.035, dof: 0.6 });
s3.camTo(t, x, y, zoom = 1, duration = 0.9);   // the camera glides to (x, y) while zooming; chainable
s3.focusOn(t, [it1, it2]);                     // these come forward, the rest recedes and blurs; 'all' to come back
s3.on((T) => { … });                           // code run on every frame while the screen shows
```
- The screen lives from t0 to t1; screens follow each other (one's t1 is the next one's t0). With a chapter page,
  screen B starts at `<announcement> - 0.3`.
- `push`: a slight continuous zoom (0 for the hook). `dof`: the background's blur. `accent: true`: the brand's colour
  (`violet: true`, its old name, still works).
- `s.cam`: the layer that moves with the camera; elements go in it (`F.el(…, s.cam)`).
- `F.on(fn)`: like `s.on`, for the whole film (the host, global effects).

## The elements

```js
const e = F.el('div', 'callout lift', s.cam, html);             // an HTML element (a class of the look)
const it = F.item(s, e, x, y, { t0, t1, in: 'pop', out: 'fade', r: -2, s: 1, z: 0, float: 0.5, focusable: true, lift: true, sfx, gain });
```

| Option | Role |
| --- | --- |
| `in` | entry: `'pop'`, `'drop'`, `'fly'`, `'deep'`, `'rise'`, `'swing'`, `'slam'`, `'slide-l'`, `'slide-r'`, `'fade'`, `'none'` |
| `out` | exit after t1: `'fade'`, `'fly'`, `'deep'`, `'drop'`, `'pop'`, `'slide-l'`, `'slide-r'` |
| `din` / `dout` | the entry's or the exit's length |
| `r`, `s`, `z` | rotation (°), scale, depth |
| `rx`, `ry` | 3D tilt |
| `float` | idle float (0 = still) |
| `focusable` | `false`: ignored by focusOn |
| `lift` | a shadow that grows as it comes forward |
| `sfx`, `gain` | a sound on its entry (leave the components' own) |

After creation: `it.t1 = …` to make it leave; `it.zi = 2000` to bring it in front; `it.xf` / `it.yf` / `it.sf` =
`(T) => value` to animate x, y or the scale; `it.rf = (T) => [rx, ry]` to animate the tilt.

## Real documents

```js
const d = F.view(s, 'report', 540, 470, { w: 860, t0, in: 'none', frame: 'sheet', region, r, rx, ry, z, focusable });
```
- `name`: the document `assets/docs/<name>.png`, prepared by `scripts/docs.mjs`.
- `frame`: `'sheet'` (a capture laid down), `'card'` (an enlargement, accent edge), `'phone'` (a phone's screen,
  scrollable, `vh` its height).
- `region: { x, y, w, h }`: the zone of the document to show, in its pixels. `w`: its width on screen.
- `d.box('text', n)`: the box of the n-th line the OCR read that holds « text » whole (no accents, spaces or
  punctuation compared; its words begin and end there): `d.box('none')` takes the cell « none », never
  « nonexistent-corp.xyz ». A text no line holds whole is taken inside a line, with a warning the render prints.
- `d.pt(u, v, T)`: a point of the document → camera coordinates (for a label's line).
- `d.scrollTo(t, v, duration)`: scroll a phone. `d.it`: the element (for `t1`, `zi`, `focusOn`).

```js
F.ink(d, 'box', region, t0, { m: 4, cls: 'red' });            // a box framed on the document
const c = B.card(s, 'report', region, 1400, 250, t0);         // its enlargement (it swings in), w 760 by default
F.link(s, d, region, c, t0);                                  // a dotted line from the document to the card (it follows)
F.ink(c, 'circle', c.box('PEUGEOT 406'), t0, { m: 10 });      // a circle on the word
F.ink(c, 'under', c.box('First registration'), t0);           // an underline
F.ink(d, 'hl', d.box('20/07/2023'), t0, { cls: 'r' });        // a highlight: cls v (accent), y (yellow), r (red), ok (green)
F.ink(d, 'check', d.box('NO', 2), t0, { cls: 'ok' });         // a tick right of the word
F.ink(d, 'arrow', bF, t0, { pts: [x0, y0, x1, y1], bend: 70, cls: 'ok' });   // an arrow (document coordinates)
F.veil(d, { x, y, w, h }, t0);                                // a white veil over a zone (to bring the rest forward)
```
Ink colours: the accent's line colour by default (`--v-on-white`: the accent, or the brand's dark on a light accent);
`cls: 'red'` for a danger; `'ok'` for what is good. A path shows only from its instant (no dot before it).

## Dressing

```js
F.callout(s, `${ic(I.euro)}Lien = a loan still running`, x, y, { cls: 'red', t0, t1, anchor: (T) => d.pt(u, v, T) });
// F.stamp(…): REFUSED here (look.md § 6, « No stamps »: they read as AI slop). The engine keeps it for the article video; never call it in this format. A conclusion is an editorial line (`ed`).
F.chips(s, [['2002', t0], ['<span>2<sup>nd</sup> owner</span>', t1]], x, y);     // chips centred on x
B.big(s, 'Not <em>yet.</em>', x, y, { t0, in: 'slam' });                       // a giant text, <em> in the accent
B.sticker(s, 'peugeot-406', 270, 838, t0, { w: 420, r: -6 });                     // a sticker (film/img/stickers/<key>.png)
```
- **Label classes** (`cls`): `''` white · `'v'` accent · `'red'`, `'ok'` · `'dark'` ink with a lime icon · `'lime'`.
- **Icons**: `B.I.check`, `cross`, `cal`, `clock`, `doc`, `pin`, `receipt`, `star`, `euro`, `dollar`, `warn`, `down`, `up`,
  `bookmark`, `arrow`, `wrench`, `car`, `search`, `shield`, `info`, `ban`, `eye`, `eyeOff`, `gauge`, `road`, `phone`,
  `mail`, `link`, `user`, `users`, `chart`, `bolt`, `target`, `globe`, `lock`. `B.ic(x)` puts one in a label's round chip.

## Media

```js
F.media({ name: 'gold', n: 48, fps: 30, fit: 'cover', t0, t1, credit: 'YouTube · @channel', noOut: true, push: 0.05,
          label: '<div class="callout ok" style="position:relative"><i>0&nbsp;€</i>Free</div>', labelAt: t });
F.gifPrint(s, 'shocked', 61, 1380, 560, 780, 578, { t0, t1, r: 4, seed: 21, cap: `${ic(I.euro)}The debt is yours`, cls: 'red' });
const e = F.photoEl(s.cam, 'photos/doc-report.jpg', 700, 430, { seed: 40, pin: true, cls: 'doc' | 'bw' });   // a torn print
```
- `F.media`: full screen, over everything. Its pictures are `film/media/<name>/f0001.jpg…` (`scripts/media.mjs`).
  `noOut`: chain without a fade into the next media. `label`: a label that grows in the middle.
- `F.gifPrint`: the GIF in a pinned, tilted print, with its caption and « via GIPHY ». The screen recedes and blurs
  meanwhile.

## Chapter pages and transitions

```js
const ch1 = B.chapter(sA, sB, { t0: t.first - 0.5, t2: t.title1E + 0.05, num: 1, over: T.point, title: '…', photos: B.ph(…) });
const ch6 = B.chapter(s7, s8, { t0: t.but - 0.5, t2: t.outE + 0.02, over: T.watchOut, title: '…', style: 'V' });
// ch.reveal: when the content of sB may show (sB's elements have t0 >= ch.reveal, in: 'none')
B.depth(sA, sB, sB.t0);        // between two screens of one part: receding in depth
B.ink(sA, sB, T, cx, cy);      // towards an accent screen: an ink blot from (cx, cy)
B.tear(sA, sB, T);             // leaving an accent screen: the page goes up, its edge torn
```
- **Timing a chapter page**: `t0` = 0.5 s before the first word of the announcement (« First », « Then », « But »,
  « So »); `t2` = the end of the title's last word said (+ 0.02 to 0.15 s); screen sB starts at `announcement - 0.3`;
  screen sA ends at the same instant. A page lasts about 2.2 s (P3) or 1.95 s (V); `prep.mjs` left 0.6 s of
  silence just before.

## The blocks of the formula

```js
B.decision(s0, { tAsk, tAction, kind: 'sign' | 'send' | 'buy', title, line, to, subject, total, button, question });
// kind: the series' verb, written in the skeleton by new.mjs; the question is the language's own (« So, do we send it? »)
// + s0.camTo(tAsk - 0.15, 960, 540, 1, 0.7)
B.titles(s0, sg, s1, { docs: B.ph('doc-a', 'doc-b', 'doc-c', 'doc-d'), series: 'Before you sign', subject: 'The PureTech engine' });   // never a number
B.notYet(s1, t.not, tEnd);
B.method(s9, ch7.reveal, [[html, tStart, tCheck], …], { stamp: { html, t, line }, blur: [[t0, t1]], tOverview });   // article formula only; its `stamp` option is REFUSED in this format (look.md § 6)
B.brand(s10, { tName, tCount, tBefore, tNumber, tAfter, number: 400, numberText, before: T.moreThan, after: 'checkpoints',
  card: { title, subtitle, badge, grade: 'A' | null, items: ['Engine', 'Brakes', …] }, tCard, items: [one instant per item], chip: { html, t } });
// (the camera comes closer as the items are said, up to 1.12, as close as the 60 px margins allow: no camTo to add)
B.summary(s11, { left: { src, label, t }, right: { src | null, t, tLabel, label },
  cta: { t, title, rows: [{ icon: 'phone', text: B.BRAND.phone, t }, { icon: 'cal', text: B.BRAND.site, small: T.book, t }], place } });
// a brand with no phone: the site alone, a normal call — rows: [{ icon: 'cal', text: B.BRAND.site, small: 'Book a demo', t }]
// a row's look follows its kind ('tel' for icon 'phone', else 'web'; or kind: 'tel' | 'web'), never its order
B.end(s11, se, { series: 'Before you sign', contact: true });   // se = F.screen('end', t.END, F.DUR + 1, { dof: 1.6 })
const H = B.host(); H.show({ t0, t1, pose, x, y, h, from, r });   // LAST in STORY, only with the user's cut-outs
B.dust();
```
- **The titles' screen**: `F.screen('titles', t.G0, t.G1, { accent: true, dof: 0, push: 0.05 })`.
- **The brand's screen, at the end**: `F.screen('brand', t.x - 0.1, t.summary - 0.25, { accent: true, dof: 0, push: 0.03 })`;
  in with `B.ink(s9, s10, s10.t0 + 0.1)`, out with `B.tear(s10, s11, s11.t0)`.
- **The brand's screen, in the middle** (before the most important point): it starts on « And » of « And before the
  most important point », the suspense sentence shows on it, then the P3 page of the last point leaves from it:
  ```js
  t.and = A('and$', 1, t.endStep3); t.brand = A('<brand>'); t.items = …;
  t.itemsE = Z('<last item>', 1, t.brand); t.the4 = A('the', 1, t.itemsE);   // « The most important point »
  const s5 = F.screen('brand', t.and - 0.1, t.the4 - 0.3, { accent: true, dof: 0, push: 0.03 });
  B.ink(s4, s5, s5.t0 + 0.1);
  const sus = el('div', 'c-sub', s5.cam, 'Before the most <em>important</em> point…');   // <em>: lime, or a white marker on a light accent
  sus.style.fontSize = '104px'; sus.style.letterSpacing = '-.045em';
  item(s5, sus, 960, 540, { t0: t.and + 0.05, t1: t.brand - 0.35, in: 'pop', out: 'fade', float: 0.2, focusable: false, lift: false, sfx: 'm:premium-pop-1', gain: -15 }).zi = 3000;
  B.brand(s5, { tName: t.brand, … });
  const s6 = F.screen('point4', t.the4 - 0.3, t.so2 - 0.3);
  const ch4 = B.chapter(s5, s6, { t0: t.the4 - 0.5, t2: Z('<title word>', 1, t.the4) + 0.05, num: 4, over: T.point, title: '…' });
  ```
  The whole example: `example-story.js`.
- **The method's rules**: `tStart` = the rule's first word (-0.05 to -0.25 s); `tCheck` = its end (+0.05 to +0.3 s);
  the 1st starts at `ch7.reveal - 0.05`.

## Sounds and effects

```js
F.sfx(t, 'm:premium-pop-1', -15, { align: 'peak' });   // a sound of the shelf (sound-and-voice.md)
F.rgb(t, 0.3, 6);      // a slight RGB split (impact)
F.shake(t, 0.3, 5);    // a small shake (an impact; stamps are refused here)
F.leak(t, 1.4, 0.5, 'w' | 'v');   // a warm or accent light leak
```
The components already lay their sounds (documents, labels, media, chapter pages, blocks; stamps too, but they are refused in this format). Add one only for a
strong moment that has none; the sound pass (`F.soundPass`) removes what overlaps.

## Preview and stills

```bash
node plugins/video/skills/voiceover-video/scripts/render.mjs <run> --part <n> --stills 6.6,12,36.8    # → <run>/stills/part-<n>-<t>.jpg: LOOK at them
```
To find instants: `prep.mjs` prints when each part starts; `voice.mjs anchors <run>/vo` lists each word (take time;
film time = take time + its part's offset, `window.SEGS` in `film/words.js`); `F.trans.map(x => [x.style || x.kind, x.t0, x.t3 || x.t1])`
in the page's console lists the transitions. The film opens in any browser from a local server of the run folder
(`film/index.html?t=30`: a scrubber at the bottom).

## The voiceover video's additions (template/document/film)

- **The pages.** One page per motion part, `film/part-<n>.html` (prep.mjs), loading `words-<n>.js` (the part's take:
  `WORDS`, `SEGS`, and `PART = { n, total, in, out }`: the real frames it joins) and `story-<n>.js`; one per filmed clip,
  `film/<clip>.html` (intro.mjs: `intro`, `cutback-<n>`), loading `<clip>-words.js` (`INTRO = { n, dur, clip }`) and
  `<clip>-story.js`, drawn on a transparent page.
- **`F.framed({ t0, t1, shots: [{ name, n, t0, t1, start, fps }] })`** (`framed.js`): stock shots in the frame on the
  paper (the in-animation ends at t0, the out-animation starts at t1); `?hd=1` (the 4K render) reads `media4k/`. In a
  story: `shot(name, n, t0, t1, start)` and `shots([[name, n, a, b, start], …], t0, t1)`.
- **`F.gifPrint(s, name, n, x, y, w, h, { t0, t1, fps, cap, cls, r, start })`** (`fx.js`): a GIF as a pinned print, the
  screen stepping back behind it; `start` skips seconds into the GIF. In a story: `gif(s, name, n, t0, t1, { cap })`.
- **`B.method`** (`blocs.js`): straight at every moment; from one rule to the next the list slides down with a vertical
  motion blur (round 11).
- **The V page** (`fx.js`, CH.V) carries a light whoosh on its sweep (`m:deep-light-whoosh`, round 10).
- **The skeleton's helpers** (`template/document/film/story.js`, the reference's own, generalised): `reveal`, `marker`,
  `ed`, `callout`, `chipx`, `inkIn`, `rectD`, `svgIn`, `sheet`, `page1` (with the browser frame for the full-viewport
  captures of `VP`), `tile`, `genTile`, `badge`, `logoCard`, `pv` (generic providers), `counter`, `path`, `offAt` (an
  exit that really leaves the screen), `lockCard`, `profileCard`, `chart` (one metric, its app-icon tile), `endCard`,
  `shot`, `shots`, `gif`, `junctionIn` (the print that leaves), `junctionOut`; the post off on the real frames.

## F.motionPage (film/motionpage.js): a motion scene in a part
`F.motionPage(s, name, { t0 })` draws the frames of `media/mp-<name>/` (rendered with alpha by `scripts/motionscene.mjs`)
over the screen's paper, outside its camera (no push), frame `floor((T − t0) × 30) + 1`, and adds the scene's sounds
(`meta.json › cues`, marked key). The screen holding it: `F.screen(name, t0, t1, { push: 0 })`. See `motion-scenes.md`.
