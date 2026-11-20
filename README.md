# Leonida Legend — GTA VI Trophy Guide & Tracker

[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Kyamii21/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Kyamii21/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies** of *Grand Theft Auto VI*
(1 Platinum, 2 Gold, 6 Silver, 46 Bronze), built for the
[make.fun bounty “Build the best GTA 6 trophy guide”](https://make.fun/bounty/gta6-trophy-guide-01).

## What it does

- **Tracker** — checklist for all 55 trophies with progress saved in `localStorage`,
  plus **export / import** of progress as a JSON file and a reset button.
- **Filters** — search text, kind (story, collectibles, activities, crime & money,
  exploration, completion), grade, earned status, hidden vs visible, missable-only.
- **Spoiler shield** — on by default: the 28 hidden trophies keep their names,
  descriptions and guides covered until marked earned, mirroring the PS5 list.
- **Cited guides** — every trophy has an original guide (what to do, where, how,
  and when it can be missed), a step-by-step list, practical tips, and a **Sources**
  line citing at least two public guides (PowerPyx, GTABase, GAMES.GG).
- **Platinum roadmap** — six ordered stages from Chapter 1 to the 100% cleanup,
  each listing its trophies and live progress.
- **Missable watch** — exactly one trophy is flagged as potentially missable
  (*Positive Mental Attitude*, the Chapter 1 balcony meditation), with the save
  discipline that protects a run. *Actions Speak Louder* is explicitly **not**
  missable (a 500-action counter that fills in free roam).
- **Statistics** — overall percentage ring plus per-grade, per-kind and
  hidden/missable progress bars.

## Data honesty

- Trophy names, descriptions and grades are the official PS5 list (kit list dated
  2026-11-18). **28 hidden** trophies (27 Bronze + 1 Gold) were cross-checked on
  2026-11-20 against five public lists (PowerPyx, GTABase, GAMES.GG, Insider Gaming,
  EGamers), which all agree.
- Exophase and PSNProfiles had no GTA VI trophy page when checked on 2026-11-20, so
  citations point to the live per-trophy guides that do exist rather than invented URLs.
- Four cryptic hidden trophies (e.g. *Challenging Tank*, *The Truth Is Out There*)
  still had unconfirmed triggers at writing; their guides say so plainly and cite
  the sources to re-check instead of inventing a method.
- All guide text is written for this entry in our own words; sources are cited,
  never copied. No Rockstar Games logos or artwork are used.

## Run it

The app is static files under `app/` with no build step and no network requests at
runtime. Serve the folder with any static server and open `app/index.html`, e.g.:

```sh
npx serve app        # or: python3 -m http.server --directory app
```

Deep links for screenshots and sharing: `?view=checklist|guide|roadmap|missable`,
`?trophy=<id>`, `?shield=off`, `?earned=2,3,8`.

## Hand-in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
`/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with
`buildDossier` from `vendor/makefun-frontend.ts`:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the guide UI (no libraries).
- `app/data/trophies.json` — the 55 trophies with guides, steps, tips, sources and roadmap.
- `screenshots/` — 4 captures of the running guide (tracker, full guide, roadmap, missable watch).
- `main.ts`, `vendor/makefun-frontend.ts` — hand-in program and dossier library.
- `LICENSE` — MIT.
