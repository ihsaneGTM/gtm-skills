# Skills by Pipecorn: instructions for Claude

This folder holds go-to-market skills. Each lives in `plugins/<plugin>/skills/<skill>/` with a `SKILL.md`
(the instructions to follow), a `prereqs.json` (what it needs) and usually `scripts/`. The slash commands in
`.claude/commands/` point at them; `catalog.json` lists them.

When a skill is invoked: read its `SKILL.md` fully, check its required prerequisites first (fail fast, and
walk the user through the fix; never install anything that needs a password yourself), then follow it.

- The user's work goes in `workspace/`. Keys go in `.env.local`; never print a key back.
- Never change `plugins/` or `.claude/commands/`: `git pull` updates them. To change a skill for good, make
  the user's own version in `.claude/skills/my-<skill>/` (a `SKILL.md` that reads ours, then applies their rules).
- Some skills mention the Skills by Pipecorn app (its editor, its pages): without the app, run the same steps here.
- Reply in the user's language. Never invent a number, a name or a result.
