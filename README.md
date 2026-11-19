# Leonida Trophy Tracker — GTA 6 Trophy Guide

[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Kyamii21/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Kyamii21/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI: 1 platinum, 2 gold, 6 silver and 46 bronze, 28 of them hidden on PlayStation until earned.

## What it does

- **Checklist** — every trophy with its official name, description and grade, an earned checkbox, an overall progress bar and per-grade counts. Progress is saved in the browser (localStorage) and can be exported to a JSON file and imported back.
- **Filters** — by kind (story, missable, collectibles, activities, side content, economy), by grade, and by free-text search.
- **Spoiler shield** — a toggle that hides the names and descriptions of story trophies until they are earned.
- **Guides with sources** — each trophy has a guide written for this tracker from the official description and the PSN progress target, citing the official list on Exophase and PSNProfiles. Where the official description does not pin down a place or step, the guide says so instead of inventing one.
- **Roadmap** — six stages to the platinum: story playthrough, missables and chapter cleanup, collectibles, activities and challenges, side content, and the final grind. Only one trophy is flagged missable (Actions Speak Louder), because its official description is about choices made inside story content; every other trophy is obtainable in free roam or by completing its named mission or strand.

## Running it

Static files, no build step, no network requests at runtime. Serve `app/` with any static file server (for example `node serve.ts` in this repository) and open `app/index.html`, or open the file directly in a desktop browser.

The trophy data lives in `app/data/trophies.json`: the official list with each trophy's guide, kind, PSN count target where one exists, hidden flag, missable flag and roadmap stage.

## Entry plumbing

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library, as the competition requires. Run it with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
