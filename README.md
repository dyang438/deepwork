# deepwork

Timed deep work sessions on macOS, after Cal Newport's *Deep Work*. One command quits chat and mail apps, turns on Do Not Disturb, pauses music, blocks distracting sites in Chrome and keeps them closed until the timer ends. When it ends, a short shutdown ritual logs what got done.

```
$ deepwork 90
Goal (the one thing this block produces): ship the parser
Support checklist:
  water or coffee? [y/n] y
  phone in another room? [y/n] y
Deep work until 16:30 (90 min). Goal: ship the parser
```

## What it does

- **Start:** asks a few questions (goal, deadline, checklist, all configurable), quits Slack, Shortwave, Messages and Mail, runs your `deepwork-on` Shortcut (Do Not Disturb), optionally pauses music and plays a sound.
- **During:** a watchdog re-quits those apps every 3 seconds. The Chrome extension covers Gmail, Calendar, Shortwave, Superhuman, Amazon, DoorDash and YouTube, and hides the X and LinkedIn feeds while profiles and posts still work. It never closes tabs.
- **End:** reopens the apps, runs `deepwork-off`, and opens a Terminal window for the shutdown ritual (done?, what got done, open loops, tomorrow's block).
- **Stats:** `deepwork stats` shows deep hours today, this week and per goal, plus focus %, app and site switches per hour, longest active stretch and blocked-site attempts.
- **Storage:** sessions go to a local log. Set `database_url` to also keep them in Postgres, so stats cover every machine (and, with `--all`, everyone sharing the database).

## Install

Requires macOS, `python3` and Google Chrome (for site blocking).

```bash
git clone https://github.com/dyang438/deepwork.git ~/deepwork
ln -sf ~/deepwork/deepwork ~/.local/bin/deepwork   # any directory on your PATH
```

1. **Do Not Disturb:** in the Shortcuts app, create two shortcuts named `deepwork-on` (Set Focus: Do Not Disturb, On) and `deepwork-off` (Set Focus: Do Not Disturb, Off). Without them deepwork still runs, just without DND.
2. **Chrome extension:** open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and choose the `chrome-ext` folder. It only acts while a session is running.
3. **Music pause (optional):** `brew install media-control` for any player; Spotify and Music are paused directly either way.
4. **Postgres (optional):** `brew install libpq` for `psql`, then set `database_url` (see Settings).

## Commands

| Command | |
|---|---|
| `deepwork [min]` | start a session (default 90 minutes) |
| `deepwork off` | end now and run the shutdown ritual |
| `deepwork status` | time left |
| `deepwork stats [--all]` | deep hours and focus metrics |
| `deepwork capture "..."` | jot down a stray thought without leaving the session |
| `deepwork sync` | push the local log to godeep.work and/or the database |
| `deepwork login` | connect this terminal to your [godeep.work](https://godeep.work) account |
| `deepwork logout` / `whoami` | disconnect / show the connected account |
| `deepwork agent install` | let **+** on godeep.work start real blocks on this Mac (`uninstall`, `status`) |
| `deepwork questions` | edit your settings in `$EDITOR` (falls back to nvim, vim, vi) |
| `deepwork config` | print your settings |

Flags: `-y` skips the questions, `-g "goal"` sets the goal, `--dry-run` does everything without quitting apps or touching your real log.

## Settings

`deepwork questions` opens `~/.deepwork/config.json`, creating it with the defaults the first time:

```json
{
  "tracking": true,
  "database_url": null,
  "music_pause": false,
  "sounds": {"start": null, "notify": "Glass"},
  "quit_apps": ["Slack", "Shortwave", "Messages", "Mail"],
  "start_questions": {
    "goal": "Goal (the one thing this block produces): ",
    "deadline": "Deadline, keep it tight [{suggested}]: ",
    "checklist": ["water or coffee", {"item": "food", "over_minutes": 90}, "phone in another room", "materials open"],
    "custom": []
  },
  "shutdown_questions": {
    "outcome": "Done? (y/partial/n): ",
    "done": "One line on what got done: ",
    "open_loops": "Open loops, one per line (empty line to finish):",
    "tomorrow": "Tomorrow's main deep block (what and when): ",
    "focus": "How focused were you, 0-100%? (Enter skips): ",
    "custom": []
  }
}
```

- A question set to `false`, or deleted, is skipped. A string changes its wording. `custom` adds your own questions; answers are saved in the log.
- `sounds` take macOS system sound names (`Blow`, `Glass`, `Ping`, ...) or `null` for silence.
- `tracking` samples the front app, the active Chrome site (domain only) and blocked-site attempts every 10 seconds, for the stats. Set it to `false` to record nothing.
- `database_url` takes a Postgres connection string (`postgres://user:pass@host:5432/db`; Supabase, Neon and RDS all work). Every session is still written to the local log first. Shutdown then upserts the log into a `deepwork_sessions` table (created on first use), and `stats` reads from the table. If the database is unreachable, nothing is lost: the next shutdown or `deepwork sync` catches it up.

## godeep.work

[godeep.work](https://godeep.work) is the web dashboard. Run `deepwork login` once: the terminal shows a code, your browser opens, you confirm it while signed in (Google or email), and the CLI stores a token in `~/.deepwork/credentials.json` (readable only by you). After that:

- `deepwork 90` counts down in your terminal, shows the block live on the dashboard, and asks the shutdown questions in the same terminal when it ends (Ctrl-C ends early; `-d` returns right away instead).
- With `deepwork agent install`, a small agent runs at login and checks godeep.work every few seconds. Press **+** on the dashboard, type the goal, Enter: the agent starts a real block on your Mac (apps quit, Do Not Disturb, Chrome blocking), and **END** on the countdown stops it. Web-started blocks log themselves when they end.
- Each finished session is uploaded with its goal, minutes, outcome and self-reported focus; the local log stays the source of truth, and `deepwork sync` re-sends it safely (no duplicates).
- **My competitions** ranks members by deep hours and minute-weighted self-reported focus since the competition started, live. Start one and share its invite link.

The web app lives in `web/` (Next.js on Vercel, with Neon Postgres, Auth and Realtime).

## Privacy

Everything stays on your Mac in `~/.deepwork`: the log, the samples and your captures. The only exception is `database_url`: if you set it, each session record (goal, times, answers and the activity summary, which lists your top apps and sites) is sent to that database. Raw samples never leave the Mac. The same goes for godeep.work: once you run `deepwork login`, only each session's goal, start time, minutes, outcome and focus rating are sent. The extension only talks to deepwork on `127.0.0.1` and never sends paths, page titles or content.

## Contributing

Pull requests welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
