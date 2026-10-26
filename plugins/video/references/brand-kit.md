# Bringing your own brand

When the speaker names their product, the short should show **that product**, in their colours,
with their logo and type, not an artist's impression. This file covers what to ask the user for and
where each piece goes. Everything lives in the project's work directory; the skill's `scripts/`
folder stays untouched.

## Your brand, set once (`workspace/brand/`)

The user may have set their brand once for every skill, in the app (Settings › Your brand) or when
they made a style theirs: `workspace/brand/brand.json` holds its `name`, its `colors` (`accent`,
`dark`, `light`, hex), its `logo` (a file beside it, `workspace/brand/logo.png` or `.jpg`/`.webp`),
its `fonts` (`headline`, `text`: `.otf`/`.ttf` files in `workspace/brand/fonts/`) and its `notes`.
A run from the video editor repeats it in its brief ("My brand, set once").

When it is there, it answers the table below: do not ask for what it holds.
- **Logo**: copy it into the project (`<work-dir>/assets/logo.png`, or its own extension) and use it
  wherever this file puts the user's logo.
- **Colours**: they are the brand colours of this file. Where a style has a slot for the brand's
  colour, its SKILL.md says which (the scrapbook: project.json `accent`), the accent fills it; in your
  own beats, use the three as below. Check the accent on the take as the style says; a pale one keeps
  the style's default for captions.
- **Fonts**: copy the files into `<work-dir>/assets/fonts/` and register them as § Fonts says, for
  the roles a style lets the user's type take. A style's own typefaces stay where they make the style.
- **The name**: written exactly as it is, in captions too (the scrapbook's `captionKeep`).
- **The notes**: standing instructions for every edit, like the user's own notes, after the style's
  rules.

It never overrides what makes the style (its settled language, its fixed slots, the safe zones, the
loudness, verify.mjs): where a style leaves no room for a brand colour or face, say so rather than
forcing it in. What it lacks (screens, numbers) is still asked for, as below. Never write into
`workspace/brand/` during an edit: the user, or the step that makes a style theirs, does.

## What to ask for, once, before building the beats

| Item | Format | Goes in |
|---|---|---|
| Logo | PNG with transparency, or a square on the brand colour, at least 512 px | `<work-dir>/assets/logo.png` |
| Brand colours | hex values from their brand guide: one accent, one dark, one light | `plan.mjs` (see below) |
| Fonts | the `.otf` / `.ttf` files they are licensed to use | `<work-dir>/assets/fonts/` |
| Product screenshots or a short screen recording | PNG or MP4, captured at a real resolution | `<work-dir>/assets/` |
| Every number that will appear on screen | the real figure and where it comes from | the beat's options in `plan.mjs` |

Ask for all of it in one message. If something is missing, build without it rather than inventing
a substitute.

## Logo

Load it in `plan.mjs` and draw it from a custom beat or through `personaDisc()`:

```js
import { loadBeatImage, beatImage, personaDisc } from "<skill>/scripts/beats.mjs";

export async function load() {
  await loadBeatImage("logo", "assets/logo.png");
}
// inside a draw(ctx, t): personaDisc(ctx, beatImage("logo"), 540, 300, 90, k);
// or: ctx.drawImage(beatImage("logo"), x, y, w, h);
```

`lockup()` draws its own vector mark in a yellow disc. To name the partner's product with their
logo, write a small custom beat that draws `beatImage("logo")` where the lockup draws its mark,
keeping the same motion (spring in over 0.6 to 0.7 s, name 0.45 s later, underline 0.75 s later).

When several logos appear together (tools, channels), make them one set: the same square size and
the same corner radius (0.2237 of the side is a common app-icon value), each mark centred at the
same optical inset. Three marks with three different corners read as three screenshots, not as a
set. Only show the logo of something the speaker actually names; a generic thing (email, a phone
number) gets a generic icon, not a vendor's logo.

## Colours

The built-in palette is the `C` object in `scripts/scene.mjs`: `canvas #141517`, `paper #202228`,
`ink #F4F5F7`, `muted #9AA1B1`, `green #0EA968`, `red #E5484D`, `orange #F08C00`, and the accent
`yellow #FFD90D`. The yellow is also written directly in `subs.mjs` (the caption hot word) and in
several catalog figures.

- **In your own beats**, use the partner's hex values directly in `plan.mjs`. Take them from the
  brand guide; never eyeball a near match from a screenshot.
- **Keep green and red for meaning** (worked / did not), whatever the brand palette says.
- **Changing the caption accent** means editing the yellow in `subs.mjs`, which changes it for
  every project on this machine. Say so to the user before doing it, then render one PNG
  (`render.mjs --png <t>`) over a bright and a dark moment to check the accent still reads against
  the footage and against the white caption text.
- A brand accent that is pale (pastel, light grey) will not carry a caption hot word on a bright
  wall. Keep a dark outline under it or keep the default accent for captions only.

## Fonts

The catalog figures and the `clean` caption style use Inter, falling back to Helvetica Neue and
Arial. To use a brand face:

1. Put the font file in `<work-dir>/assets/fonts/`. `scene.mjs` searches that folder first, then
   `~/Library/Fonts`, `/Library/Fonts` and the system folders. Keeping it in the project means
   nothing licensed is installed system-wide or committed anywhere.
2. **Register it from the file under an alias**, because skia resolves a family by the name inside
   the file, and a style-linked name like "Brand Black" silently falls back to the system sans
   (and can drop accented characters):

   ```js
   import { GlobalFonts } from "<skill>/scripts/scene.mjs";
   GlobalFonts.registerFromPath("assets/fonts/Brand-Bold.otf", "BrandBold");
   // then: ctx.font = '400 72px "BrandBold"';
   ```

   One alias is one face, so the weight in the CSS string no longer matters. If you use `F()`, the
   weight must still be a multiple of 100 (skia reads anything else as a size).
3. `scene.mjs` also registers named slots from `project.json` or the environment, which is the
   quickest way to try alternatives on the same frame without editing code:

   | Slot | Alias | project.json | Environment override |
   |---|---|---|---|
   | display sans | `SatoshiBlack` | fixed file `Satoshi-Black.otf` | none |
   | serif accent | `SerifAccent` | `serif` | `SERIF_FACE` |
   | lighter serif | `SerifAccentLight` | `serifLight` | `SERIF_FACE_LIGHT` |
   | hand face | `HandRegular` / `HandBold` | `hand` / `handBold` | `HAND_FACE` / `HAND_FACE_BOLD` |

   The `yt-outline` and `hero` caption styles use the display sans slot when its file is present.
4. **A `.ttc` collection registers as its first face only**, usually the upright regular. The bold
   or italic inside it is unreachable until you extract that face to its own file (fontTools can do
   it). Check the rendered PNG, not the registration's return value.
5. **Width is the real cost of a new face.** A wider face can push a line past its space; render a
   PNG of every beat that carries text after a font change and shorten or re-break lines rather
   than shrinking the hierarchy.

## Product screens

A real screenshot or recording of the partner's product beats any drawing of it.

- **Crop to the part that carries the point** (the table, the chart), not the whole browser
  window. Scaled into the graphics band, a full window is unreadable.
- **Extract frames at the width they will be drawn at**, no wider. A recording is held decoded in
  memory: 138 frames at 1216 px cost about 450 MB. Load it with `loadClip(dir, { fps, t0 })` in
  `load()` and draw `CLIP.at(t)` in the beat.
- **Real screens show real people's names and emails.** Point it out and offer to blur or crop them;
  do not decide silently.
- Do not paste a screenshot onto a drawn device frame. A bare screen reads as a recording; a
  drawn laptop reads as clip art.

## Numbers

Every figure on screen is a claim the viewer can hold the partner to. Use only numbers the user
supplied, from their own data, and name the source in your plan message. If the number is missing,
cut the beat or make the figure qualitative. Never ship a plausible placeholder and mention it in
passing: the viewer never reads your message.
