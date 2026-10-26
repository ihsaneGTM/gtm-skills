---
name: video-memo
description: "Turn a voice memo into shorts you can record: the memo transcribed (any language), the several videos it holds found and cut apart (1 to 3 minutes each), three restructured versions of each in the language of your videos (Straight, Hook first, and a Story, Contrarian or List), each read aloud with ElevenLabs so you hear it instead of reading it, at most three feedbacks per short (an idea to add, a big inconsistency, a link to another of your videos), and the lead magnet checked in every version. The substance stays yours; only the form changes. Writes workspace/memos/<slug>/memo.json for GTM by Pipecorn's Studio, where you pick a version, read it on the teleprompter, then edit it. Trigger on: mémo vocal, vocal, voice memo, j'ai enregistré une idée, transforme mon vocal en vidéos, fais-moi les scripts de ce vocal, plusieurs vidéos dans ce vocal, turn my voice note into shorts."
user-invokable: true
---

# Voice memo → shorts: what you said, ready to record

The user records a voice memo the moment they have an idea (on their phone, in any language). That
memo is the **substance** (le fond), the most important part: they had something to say. This skill
gives it the **form** of shorts they can read on camera in one take:

1. the memo, transcribed and read end to end;
2. the **several videos** it holds, cut apart (`references/split.md`);
3. for each, **three versions**, in the language of their videos (`references/versions.md`);
4. each version **read aloud** (ElevenLabs), because hearing beats reading;
5. **two or three feedbacks** at most per short (`references/feedback.md`), and the **lead magnet**
   checked in every version.

What comes after is the Studio's (GTM by Pipecorn, `/studio`): the user picks a version, records it
reading the teleprompter, then the take goes to the video editor.

`S` below is this skill's `scripts/` folder (`plugins/video/skills/memo/scripts`). Commands run from
the root of the GTM by Pipecorn folder. Read the three references before writing anything, every run.

## What you must never do

- **Never invent substance.** No number, name, result, tool or claim the memo does not say. A version
  may say less than the memo, never more. A missing proof is a feedback, not a made-up figure.
- **Never translate the transcript.** The memo is transcribed in the language spoken (`prepare.mjs`
  detects it); the versions are written in the video language of the profile.
- **Never more than three feedbacks** for a short, and none that is about wording.
- **Never write board.json.** It is the interface's (which version is picked, where each short is).
- **Never read the memo aloud or send it anywhere** but ElevenLabs, and only the versions' text,
  only through `voice.mjs`.

## 1. The memo

From the interface, it exists already: `workspace/memos/<slug>/` with the recording in `source/`
and the preparation done; the first message names the folder.

In Claude Code, make it: a slug from the file name (lowercase, hyphens, 4 random letters at the end,
one `workspace/memos/` does not have), then

```bash
mkdir -p workspace/memos/<slug>/source
cp "<the recording>" workspace/memos/<slug>/source/
node $S/prepare.mjs workspace/memos/<slug>
```

`prepare.mjs` measures the recording, transcribes every word (on an Apple Silicon Mac's GPU: about 45 s for a
10-minute memo) and writes `transcript.txt`, one sentence a line with its time.

## 2. The profile and the pace

```bash
node $S/memo.mjs profile
```

It prints `workspace/studio/profile.json` (made from its template the first time: the video
language, the lead magnet, the voice, the lengths) and the user's pace in words a second, measured
on their own takes. Read also `workspace/ideas/profile.json` when it exists: who they are, their
audience, their voice, what they never say. Fields marked `toConfirm` are guesses: use them, and
say once in your final message which ones to confirm. The video language and the lead magnet are
set in the memo's window of the app before each memo; an empty lead magnet means none (the versions
end on the point, `magnet` left out: `references/versions.md`).

## 3. Read the whole memo, then find the shorts

```bash
node $S/memo.mjs read workspace/memos/<slug>
```

All of it, before deciding anything. Then follow `references/split.md`: the points, the shorts, their
ranges (`from`, in seconds), their quotes, the order of the memo.

## 4. Write: three versions, the feedbacks

```bash
node $S/memo.mjs past workspace/memos/<slug>
```

lists what the user already has (other memos' shorts, scripts, finished videos): the only things a
link may point to. Then, for each short, the three versions (`references/versions.md`) and its
feedbacks (`references/feedback.md`).

Write `workspace/memos/<slug>/memo.json`:

```json
{
  "version": 1,
  "title": "<the memo in a few words, in the user's language>",
  "summary": "<two sentences in the user's language: what the memo says, and which short to shoot first, why>",
  "first": "s2",
  "videoLanguage": "en",
  "shorts": [
    {
      "id": "s1",
      "title": "<the short's title, in the video language, 80 signs at most>",
      "core": "<its point in one sentence, in the video language>",
      "from": [{ "start": 59.2, "end": 71.0 }, { "start": 434.0, "end": 451.5 }],
      "quotes": ["<a few words of the memo, in its language, word for word>"],
      "arguments": [
        { "point": "<a strong argument of the video, one line, in the video language>", "why": "<why the viewer gains from it, one short line>" }
      ],
      "magnet": { "offer": "<what the viewer gets>", "line": "<the sentence of the scripts that offers it>", "keywords": ["<words that must be in every version>"], "fits": "<why this offer fits this video>", "proposed": false },
      "versions": [
        { "n": 1, "name": "Straight", "how": "your order, tightened", "hook": "<first line>", "script": "<everything said, laid out for the teleprompter: the hook alone, a blank line, then its beats (a sentence a line, a blank line between two), the lead magnet last>" },
        { "n": 2, "name": "Hook first", "how": "opens on the claim", "hook": "…", "script": "…" },
        { "n": 3, "name": "Story", "how": "your first try, then now", "hook": "…", "script": "…" }
      ],
      "feedback": [
        { "kind": "add", "title": "Add the price", "text": "<to the user, in their language>" },
        { "kind": "link", "title": "Goes with: …", "text": "…", "to": "memo:<slug>/s3" }
      ]
    }
  ],
  "long": {
    "title": "<the whole memo as one video, in the video language>",
    "hook": "<first line>",
    "script": "<every point of the memo, in its order, tightened, said like to a friend, laid out in beats like the versions; ends with the lead magnet>",
    "arguments": [{ "point": "…", "why": "…" }],
    "magnet": { "offer": "…", "line": "…", "keywords": ["…"], "fits": "…" }
  }
}
```

**What each video really brings, plainly** (Ihsane, 2026-10-07: "c'est quoi, réellement, les
arguments de fond… et quel lead magnet dans ce script-là"). Each short and the long version say:
- `arguments`: its **2 to 4 strong arguments**, the killer points the viewer leaves with, each in one
  line (`point`) with why it is worth hearing (`why`). From the memo, never invented; the same in the
  three versions (the versions change the form, not the arguments).
- `magnet`: **its lead magnet**: what the viewer gets (`offer`), the exact sentence that offers it in
  the scripts (`line`), the words the check looks for (`keywords`), and why it fits this video
  (`fits`). The profile's lead magnet by default. When a more specific offer would fit the video
  better (a template, the skill it shows, a checklist the memo talks about), propose it with
  `"proposed": true` and say in `fits` what the user would have to make; only things the memo or the
  profile say they have, or clearly marked as proposed.

**The cut is a proposal, not a decision.** The shorts are how you would cut the memo; the user may want
another cut (two parts, fewer shorts, one long video). So `memo.json` also holds **`long`**: the whole
memo as one long video, every point kept in the user's order, tightened (no length limit; the check
measures it), written by the same rules (`references/versions.md`, `plugins/video/references/how-you-talk.md`),
ending with the lead magnet. Then the user picks: the shorts, the long video, or another cut they ask
you for.

**When the user answers** (a message from the Studio starts with `[From the Studio]`, or the user
writes in Claude Code after your hand-over): change what they ask in `memo.json` (cut it again into
the shorts they want, merge shorts, rewrite a version, change the long one), keep the format and the
ids of the shorts they keep (a cut they asked for: `"custom": true`, so parts may run longer than a
short, or `shorts` may be empty when they want the long video only), run `memo.mjs check` until it passes, read again aloud only what changed
(`voice.mjs` when ready), then say in a few lines what changed. If what they want is unclear, ask
them in your answer: they reply in the same box.

## 5. Check, fix, check again

```bash
node $S/memo.mjs check workspace/memos/<slug>
```

It measures every version at the user's pace (`seconds`), looks for the lead magnet in each, finds
the quotes in their ranges, refuses more than three feedbacks and links that do not exist. Fix
everything it lists (cut a version that is too long, add the lead magnet where it is missing) and
run it again until it passes. A version far from the others in length is worth a look.

## 6. Read aloud

```bash
node $S/voice.mjs --check
```

When it says `ready` (a key and a voice set) and the profile's `voice.auto` is true, read every
version aloud:

```bash
node $S/voice.mjs workspace/memos/<slug>
```

It prints how many characters it sends (ElevenLabs bills them) and writes `audio/<short>-v<n>.mp3`.
Not ready: say it once at the end (the key goes in Settings › Connectors, the voice id in the
profile), the versions are there to read meanwhile.

## 7. Hand over

**From the interface** (the first message says so): end on a short message to the user, as "you",
in the language of the memo: the cut you propose (how many shorts, which to shoot first), that
there is also the long version, and that they can ask you for another cut right here (for example
"cut it in two" or "just one long video"); anything to confirm in the profile, what could not be done. The Studio shows the shorts, the versions and the
feedbacks itself: do not paste them. It also ends the thread on **Your turn**, what the user does
next and the skill that follows, one click away: do not list the next steps either. When the user
asks you what comes next, say it in two lines (the step they are at, what to do now) and point to
Your turn under your answer.

**In Claude Code**: show each short in a few lines (title, core, length of each version, its
feedbacks), say which one to shoot first, then: "Open the Studio in GTM by Pipecorn (`/studio`) to
hear the versions, pick one and read it on the teleprompter."

## Next

- The user picks a version and records it (the Studio's teleprompter, at their pace).
- The take goes to the video editor (`/video-short-editor`), in the user's style.
