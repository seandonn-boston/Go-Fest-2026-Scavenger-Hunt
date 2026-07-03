# GO Fest 2026 Scavenger Hunt 🔴⚪

An **unofficial**, community-run scavenger hunt companion PWA for **Pokémon GO Fest 2026: Global** (July 11–12, 2026).

Trainers open the app, enter their trainer name, and get a fresh set of tasks **each event day**. They complete the tasks in the real world, then show the app **and** their Pokémon GO app to a **Community Ambassador** in person to claim their reward. Nothing is entered, submitted, or synced — ever.

## The hunt, per day

Every trainer gets the same four task slots each day:

| # | Task | Rerollable? |
| --- | --- | --- |
| 1 | **Catch _N_ [species]** — _N_ is random 5–26, re-rolled with the task | ✅ once per day |
| 2 | **Obtain 1 shiny [species]** — catching *or trading* both count | ✅ once per day |
| 3 | **Catch 1 Mewtwo** | ❌ fixed |
| 4 | **High five your Community Ambassador** | ❌ fixed (and mandatory 🖐️) |

- **Two hunts per weekend.** Saturday and Sunday each get their own tasks, their own progress, their own Mewtwo (2 expected for the weekend), and their own rerolls.
- **10am–4pm only.** Each day counts just its first two habitat blocks; the final 4pm–7pm block is cut so a giveaway can happen before the day ends. Species that would only spawn in that last block don't appear.
- **The Catch count is random.** Each Catch task rolls a target between **5 and 26**, and rerolling the task rolls a new number too.
- **Species lines count.** A "Catch 20 Pikachu" task is satisfied by any mix of Pichu, Pikachu, or Raichu (any form, including Alolan). Every card spells out its family so there's no arguing at the verification table.
- **Two rerolls per day, four per weekend** — one for the Catch task, one for the Shiny task, each behind a confirmation warning. Mewtwo and the high five can't be rerolled.
- **No repeats, ever.** The Catch species never matches the Shiny species, and no species is dealt twice in one weekend: every draw and every reroll excludes everything previously rolled — including species rerolled away (the trainer already said they don't want them). Reroll everything both days and you're guaranteed 8 distinct species.
- **Everything is local.** Name, tasks, rerolls, and completion checkmarks live in `localStorage`. Verification is human: show an Ambassador.

## The species pool

Only Pokémon **found in the wild** can appear during the event, so the pool is **every wild-available Pokémon in Pokémon GO** except:

- **Legendary, Mythical, and Ultra Beast Pokémon** (Mewtwo is the deliberate exception, as its own fixed task — satisfiable via the event's Mega Mewtwo X/Y Super Mega Raids).
- **Species never found in the wild** — obtainable only from eggs, raids, evolution, or research (e.g. Smeargle, Tandemaus, Larvesta, the Toxel and Riolu lines, Gimmighoul, Rotom). A family stays in only if at least one of its members is a wild encounter, so egg-only babies like Pichu don't remove the wild Pikachu line.
- **Ditto, Zorua, and Zoroark** — banned outright (shape-shifters make terrible scavenger-hunt targets).
- **Regional exclusives not catchable in Boston, MA** — Klefki, Kangaskhan, Mr. Mime, Heracross, Corsola, Torkoal, Tropius, Relicanth, Pachirisu, Chatot, Carnivine, Sigilyph, Maractus, Hawlucha, Comfey, Bouffalant (NYC metro only — close, but no), Stonjourner, and the "wrong halves" of regional pairs (Volbeat→we keep Illumise, Zangoose→Seviper, Solrock→Lunatone, Pansage/Pansear→Panpour, Durant→Heatmor). Species where Boston just gets a specific *form* (Shellos, Basculin, Oricorio, Flabébé, Tatsugiri, Squawkabilly) stay in.

The pool is split into a **Saturday list and a Sunday list by type**. Only each day's first two habitat blocks (10am–4pm) count — the 4–7pm block is cut — so each day features **six** types. A species qualifies for a day if **either** of its types is featured. Ralts (Psychic/Fairy) still qualifies for Saturday via Psychic; a pure Fighting or Dragon species that would only appear in the cut block is left out entirely. The weekend no-repeat rule keeps a trainer from hunting the same species twice.

| Day | Featured types (10am–4pm) | Habitat blocks (counted) | Cut (4–7pm) |
| --- | --- | --- | --- |
| Sat Jul 11 | Ice, Electric, Fire, Psychic, Ghost, Water | Stormfire Peaks (10–1) · Astral Tides (1–4) | ~~Dragonflight Summit — Flying, Rock, Dragon~~ |
| Sun Jul 12 | Ground, Steel, Normal, Poison, Bug, Grass | Earthforged Domain (10–1) · Verdant Anomaly (1–4) | ~~Twilight Battlefield — Dark, Fairy, Fighting~~ |

The Catch task only draws common/uncommon families (26 Deino would be cruel); the Shiny task can roll anything, pseudo-legendaries included.

### Regenerating the pool

The `SPECIES` array in `data.js` (371 wild-available evolutionary families, each carrying the full typing used for day placement) is generated — **don't edit it by hand**:

```bash
node tools/generate-data.mjs            # fetches PvPoke's GO gamemaster
node tools/generate-data.mjs local.json # …or use a local copy
```

Tune the config at the top of `tools/generate-data.mjs` (Boston exclusion list, rarity overrides, type→habitat mapping), rerun, and bump `CACHE_VERSION` in `sw.js` so installed devices pick up the change. Already-dealt task sets on trainers' devices are unaffected.

## Tech

Plain HTML/CSS/JS — no framework, no build step, no runtime dependencies, no network calls. It's an installable PWA (manifest + service worker) that **precaches the entire app**, so it keeps working on GO Fest's overloaded cell networks once it has been opened once.

| File | Purpose |
| --- | --- |
| `index.html` / `styles.css` / `app.js` | The whole app |
| `data.js` | **All event data**: habitats, days, task config, species pool |
| `sw.js` | Offline precache (bump `CACHE_VERSION` when assets change) |
| `manifest.webmanifest` + `icons/` | PWA install metadata |
| `tools/generate-data.mjs` | Regenerates the species pool (see above) |
| `tools/generate-icons.mjs` | Regenerates the icons (`node tools/generate-icons.mjs`) |

## Running it

It's static files — serve the folder over HTTPS (or localhost) so the service worker can register:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

For the event, host it anywhere static (GitHub Pages works out of the box — no build step).

## For Community Ambassadors

- Verification is visual: the trainer shows their task cards (with green "Completed!" checks) alongside proof in Pokémon GO. Progress for each day lives under its own tab.
- Both days are viewable at any time (a trainer could peek at Sunday's tasks on Saturday); each day's tasks are dealt the first time that day's tab is opened.
- The **Start over** option (⋯ menu) wipes both days and re-deals — it warns trainers that Ambassadors may not accept a re-dealt hunt, but there is no technical anti-cheat. This is a for-fun community event; trust your judgment.

---

*Not affiliated with, endorsed by, or connected to Niantic, Nintendo, or The Pokémon Company. Pokémon names are trademarks of their respective owners; used here nominatively for a fan event.*
