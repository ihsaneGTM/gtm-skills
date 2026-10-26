# The media: real stock shots and GIFs

A professional editor diversifies: motion design alone « ça fait trop IA » (Ihsane, 2026-10-13). Every voiceover video
has real stock videos in the frame on the paper and a few GIFs as pinned prints, on the words that call for them. The
reference: `workspace/projects/waterfall-media/` (`PLAN.md`, `README.md`), 11 shots and 4 GIFs in the 3:45 of
`workspace/videos/waterfall-complete-2d.mp4`.

## How many, where

- **8 to 12 stock shots per 4 minutes** of motion (about one every 15 s of the body), **1.5 to 3 s each**, each on the
  first word of its sentence. **3 to 5 GIFs per 4 minutes** (about one every 45 s).
- **Where a picture says more than a card**: a person feeling the pain (« you are not getting the email »), a real place
  (a call floor for « ten outbound agencies »), a concrete thing (« data is not free » → money; « still in their
  database » → server racks; « numbers that ring the right person » → a phone picked up), a pun on the name (a real
  waterfall for « a waterfall enricher »), a crowd for « a big community ».
- **Never where the film's own graphics already carry the meaning**: the hook (filmed), the agenda, the charts, the
  checklists, the chapter pages, the end. Never hide a scene that already says the same thing (the CRM card already said
  « their own CRM »: its shot was dropped; the « Wrong number » button already landed « one button »: its GIF was dropped).
- **Never two full shots in a row**, except a pair meant as a sequence (the crowd → the calls), kept in one frame.
- A GIF on a sentence with a known meme for it (« how is that possible? » → the math lady; « it breaks everything » →
  « this is fine »; « someone else's phone » → « new phone, who dis? »; an honest « yes, it's our tool » → a wink).

Write the plan first, in the run's README or `assets/PLAN.md`: one row per moment (the words, what we see, why, the file
and the seconds used, the source), like `waterfall-media/PLAN.md`. Then find, fetch, look.

## Licences: free commercial only

- **Pexels** (Pexels License): free for commercial use, no attribution required (credit it anyway). Never sell an
  unaltered copy; never show the people in a bad light or as endorsing a product: they illustrate the work in general,
  never « these people use <brand> ».
- **Mixkit**: ONLY its « Mixkit Stock Video Free License ». Many Mixkit clips carry the « Mixkit Restricted License »
  (720p, personal use only): not for a channel that promotes a product. `media.mjs` reads the licence on each page and
  refuses a Restricted one (eight good candidates were refused for it on the reference).
- Pixabay blocks scripts; other sites: check their licence by hand first. Never a YouTube clip here.
- **GIPHY grants no commercial licence**: GIFs from TV shows and brands are for organic use only (the YouTube video), as
  short reaction prints. Say it in the delivery: replace them before any paid ad, drop one if a Content ID claim comes up.

## Find, fetch, frames

```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock search "call center" "woman answering phone"
```
Mixkit's search needs no key; Pexels needs `PEXELS_API_KEY` (its site blocks scripts: without a key, search the web for
« site:pexels.com/video <words> » and give the page to `get`). Look at the sheet (`assets/stock/sheet-<words>.jpg`):
what the picture SHOWS, a calm move, no text or logo in it, people who look like the video's audience.
```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock get https://www.pexels.com/video/<…>-5452540/ --name agencies-team --from 1.0 --to 5.2 --author "Tima Miroshnichenko (pexels.com/@tima-miroshnichenko)"
```
Only those seconds are fetched (the use + about 1 s of handle on each side), 1920 × 1080 at 30 fps, H.264 crf 23, no
sound, in `assets/clips/<name>.mp4` with its `.source.json`; then its frames (`film/media/<name>/f0001.jpg…`, 1600 × 900).
The story's `start` is the second of the clip the shot starts at (1.0 with a 1 s handle). A file the user has: `stock
get <file> --name …`.

GIFs (GIPHY, `GIPHY_API_KEY` in `.env.local`, or a giphy.com link given by hand):
```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif search "this is fine" "everything is broken"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif get QMHoU66sBXqqLqYvGO --name this-is-fine --blur 1700:40:200:60 --caption "your pipeline, 40% bad data"
```
A TV channel's or a brand's mark: cropped off (`--crop W:H:X:Y`) or blurred (`--blur X:Y:W:H`, placed in the picture
once cropped); look at the GIF's size first (`ffprobe`), a GIF is often 480 px wide. The frames: 15 fps,
1080 high. Then `media.mjs <run> sheet` (every clip and GIF on one sheet: they must read as one series) and `media.mjs
<run> credits` (the README's Media section, from the `.source.json` files).

## In the film

- **A stock shot** (`shot(name, n, t0, t1, start)` in the story, `F.framed` of `framed.js`): the paper fades over the
  scene, the frame draws itself (faint guide lines out to the page's edges, a thin ink rectangle at 160, 64, 1600 × 900,
  crosshairs at its corners), the screen opens from its middle line, the shot plays inside it: one grade for all
  (saturation −15 %, a touch warm, blacks lifted: `saturate(.85) sepia(.07) contrast(.9) brightness(1.06)` and a warm
  soft-light veil), the F1 fine screen-door grid (4 px cells at 1080p, 8 device px at 4K: pixel-aligned at the output
  size), a soft vignette, a slow 3.5 % push. The frame is drawn about 0.4 s before the first word (open ON the word) and
  closed right after the sentence; consecutive shots stay in one frame (`shots([...], t0, t1)`), a click between them.
  The scene underneath goes on: what appears during a shot is there when it closes.
- **A GIF** (`gif(s, name, n, t0, t1, { cap })`, `F.gifPrint`): a pinned print on the right (1390, 560, 660 × 420), torn
  edges, tilted −3°, a short caption on a yellow label under it (« same providers?? », « wrong person »), « via GIPHY »
  small; the scene behind steps back and blurs (`focusOn`); 1.4 to 2.5 s; `start` skips into the GIF (« this is fine »
  from 1.5 s, where its words show). Never full screen.
- At 4K: `media.mjs <run> frames --all --4k` writes `film/media4k/<name>/` at 3200 × 1800 (lanczos); `framed.js` reads
  them when the page runs at ×2 (`?hd=1`); a GIF keeps its 1080 frames (a print, not full screen).

## Credits

The run's README keeps every shot and GIF: the moment, the file, the page, the author, the seconds taken, the licence
(`media.mjs <run> credits` writes the table). The final message says the GIFs are organic use only.
