# GTM Skills

**Go-to-market skills for Claude Code.** By [Pipecorn](https://pipecorn.com). Version 0.2.2.

Each skill is a whole job, written down and tested: the method, the steps, the tools and the checks. You give
Claude Code your file and answer its few questions; it does the job start to finish, on your Mac.

Prefer an app, with a visual editor and everything installed for you? Download GTM Skills for macOS:
https://gtm-skills.pipecorn.com

## The skills

| Command | What it does |
|---|---|
| `/video-whiteboard-editor` | **Whiteboard editor**. One raw vertical take in, one finished short out, in the look of Long video to shorts: your face from the first frame, your words in Dynamic text, the pictures sliding out from behind you, white pages that draw the idea, one music, -14 LUFS. |
| `/video-short-editor` | **Short editor**. One raw vertical take in, one finished short out: your words as big headlines passing behind you, paper plates, the SFX pack, -14 LUFS. |
| `/video-cold-call-editor` | **Cold call editor**. One recorded call in, one finished short out: its best line as a glitched hook, the call ringing on paper, then the conversation typed out as it is said. |
| `/video-scrapbook-editor` | **Scrapbook editor**. One raw take in, one finished short out: every pause cut, your words low and word by word, memes dropped on your face as polaroids, titles handwritten on little notebook scraps with real shadows, the key word in a beautiful serif in your colour, stickers, a red marker drawing as you speak, a music bed and a sound for each thing that lands. |
| `/video-explainer-editor` | **Explainer editor**. One take of you talking in, one explained short out: you in a frame at the bottom, what you explain drawn above you as you say it, with the motion and the light of an After Effects edit and a sound on everything that moves. |
| `/video-memo` | **Voice memo to short scripts**. One voice memo in, the short scripts it holds out: three versions of each in the language of your videos, read aloud, two or three feedbacks, the lead magnet in every one. |
| `/video-youtube-editor` | **YouTube video editor**. A complete edit of your horizontal YouTube videos, long ones too, in three versions: Facecam + Motion design (you filmed it all, your real voice), Motion design + AI voice (nothing to film), or Facecam + Motion design + AI voice (you film the intro and a few shots, an AI voice says the rest). Real pages, stock shots and GIFs; one music; checked before you see it; the 4K when you say so. |
| `/video-long-to-shorts` | **Long video to shorts**. Your long video in, several vertical shorts out: its best moments found and put in a new order, the strongest line first as the hook, your real voice, in about 30 s, 1 min and 1 min 30, each ending on a card to the long video if you like. |

## Install

You need a Mac with Apple silicon, [Claude Code](https://claude.com/claude-code) (the desktop app or the CLI)
on a Claude subscription, [Homebrew](https://brew.sh), then:

```bash
brew install ffmpeg node git
git clone https://github.com/ihsaneGTM/gtm-skills.git ~/"GTM Skills"
```

Open the `GTM Skills` folder in Claude Code and type a command, for example
`/video-short-editor ~/Downloads/take.mp4`. The first run sets up the rest by itself (the rendering engine,
the speech-to-text model, the music and the sound effects), once.

To update: `git pull` in the folder.

## Your files and keys

- Your work goes in `workspace/`: git ignores it.
- Keys some skills can use (ElevenLabs, GIPHY…) go in `.env.local` (copy `.env.local.example`). None is
  needed for most video skills.
- To make a skill your own, ask Claude Code: "make my own version of /video-short-editor, with …". It writes
  it in `.claude/skills/`, and leaves ours as it is.

## Licence

[PolyForm Shield 1.0.0](LICENSE.md): use the skills for any purpose, your business and your clients' work
included; you may not sell them or build a product that competes with GTM Skills.
Third-party components keep their own licences.
