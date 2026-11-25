# Turn your Warcraft Logs into a recap video

Your guild has years of raids in Warcraft Logs. This guide shows how a coding agent turns them into a recap video: your nemesis bosses, your closest wipes, who drank the most potions, who died the most, and that one fight everybody still talks about.

You don't write the code yourself. You ask questions, look at a preview in your browser and tell the agent what to change.

This is the companion guide to the video *How to turn your Warcraft Logs into a recap video* on the YouTube channel Hydrax Skarrag (link follows when the video is out). Everything in the video was made with Claude Code and the model Opus 5.5.

## What you need

- A coding agent, for example Claude Code or Codex. The desktop app is fine, no terminal needed.
- A free Warcraft Logs account.
- Google Chrome and ffmpeg on your computer, for the final render. Your agent can check and install them for you.
- Some patience. It won't be perfect on the first try. Plan a few rounds of "make this bigger", "slower here", "wrong name".

## The guide in seven steps

### 1. Start your coding agent

Make an empty folder, for example `recap`, and open your agent there. Copy `AGENTS.md` from this repository into the folder. It tells the agent how the project works, so you have to explain less. Claude Code reads `CLAUDE.md`, so rename it or ask your agent to do it.

### 2. Get your API key

Go to [warcraftlogs.com/api/clients](https://www.warcraftlogs.com/api/clients) and create a client.

- Name: anything descriptive, for example `Recap Video`.
- Redirect URL: `http://localhost:8765/callback` (only needed for old logs, see step 3).
- Leave "Public Client" unchecked.

You get a client ID and a client secret. The secret is shown only once. Put both into a file called `.env` in your folder, like in `.env.example`. Never paste them into a chat, a screenshot or a video.

### 3. Fetch your logs

Ask your agent:

> Fetch every report of my guild <Guild Name> on <Server> (<Region>) from Warcraft Logs. Save the raw data locally, so we never have to download it twice.

Good to know:

- **Logs older than about two years are archived.** To read them through the API you need a Warcraft Logs subscription, and the agent has to log in as you (the redirect URL from step 2). Ask your agent to walk you through it.
- Classic, Fresh and Retail logs live on different Warcraft Logs sites. Tell the agent which game version your guild plays.
- The API has rate limits. A big guild history can take a while. Let it run.

### 4. Ask your logs

Now just ask, in plain words. For example:

> Which bosses cost us the most wipes?

The agent writes a small script, reads your saved logs and answers with numbers. More than 50 questions to start with are in [prompts.md](prompts.md).

Two tips that save you trouble:

- **Count per 100 pulls**, not only in total. Otherwise whoever showed up most always wins.
- **Keep a list of alts per player** (`alts.md`, one line per player with all their characters). Then every stat adds up per person, even after a class change.

### 5. Turn results into scenes

> Turn these results into scenes for a guild video. Show me a preview first.

The agent builds one HTML page per scene and a preview you can play and scrub in your browser. Look at it and say what you want different. Expect a few rounds. Style, jokes and pacing are your call.

A minimal scene to start from is in [templates/scene.html](templates/scene.html).

### 6. Add sounds

> Add sounds: boss voices, heals, deaths, and royalty-free music.

Where to find sounds and music, and what to check before you use them: [sounds.md](sounds.md).

### 7. Render the video

> Looks good. Render the final video.

Chrome takes a picture of every frame, ffmpeg adds music and sounds and builds one MP4. A 12-minute video is about 22,000 frames, so this takes a while. The render script is in [templates/render.mjs](templates/render.mjs).

## Live examples

Four videos of our guild Tide, all built this way (in German):

- [Look back: Classic to WotLK](https://www.youtube.com/watch?v=0lbWVssAEhY)
- [Look back: Mists of Pandaria](https://www.youtube.com/watch?v=LlQIrf53wDA)
- [Bonus: one fight, rebuilt](https://www.youtube.com/watch?v=ZqnwXyv1z_A)
- [Bonus: no healer in sight](https://www.youtube.com/watch?v=8CS-ddeG-8M)

## Before you publish

- **Ask your guild.** Show character names only, never real names, and ask before you show someone's worst moment.
- **Check every number** against the data once more. Agents are good, but a wrong number in a guild video lives forever.
- **Check licenses** for every sound and song (see [sounds.md](sounds.md)).

## Files in this repository

| File | What it's for |
|---|---|
| `AGENTS.md` | Context for your agent: how the project works and the rules |
| `prompts.md` | Questions for your logs, sorted by topic |
| `sounds.md` | Where to find sounds and music, and what to check |
| `.env.example` | Where your API key goes |
| `templates/scene.html` | A minimal scene with preview controls |
| `templates/render.mjs` | Renders a scene page to MP4 with Chrome and ffmpeg |

## License

Public domain ([The Unlicense](LICENSE)). Copy it, change it, use it for your guild, no credit needed.

World of Warcraft is a registered trademark of Blizzard Entertainment, Inc. Warcraft Logs is not affiliated with this guide. This project is not affiliated with or endorsed by Blizzard or Warcraft Logs.
