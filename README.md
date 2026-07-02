# GO Fest 2026 Scavenger Hunt 🔴⚪

An **unofficial**, community-run scavenger hunt companion PWA for **Pokémon GO Fest 2026: Global** (July 11–12, 2026).

Trainers open the app, enter their trainer name, and get a fresh set of tasks **each event day**. They complete the tasks in the real world, then show the app **and** their Pokémon GO app to a **Community Ambassador** in person to claim their reward. Nothing is entered, submitted, or synced — ever.

## The hunt, per day

Every trainer gets the same four task slots each day:

| # | Task | Rerollable? |
| --- | --- | --- |
| 1 | **Catch 26 [species]** | ✅ once per day |
| 2 | **Obtain 1 shiny [species]** — catching *or trading* both count | ✅ once per day |
| 3 | **Catch 1 Mewtwo** | ❌ fixed |
| 4 | **High five your Community Ambassador** | ❌ fixed (and mandatory 🖐️) |

- **Two hunts per weekend.** Saturday and Sunday each get their own tasks and their own progress. Day 1 species come from Saturday's habitats (Stormfire Peaks, Astral Tides, Dragonflight Summit); Day 2 from Sunday's (Earthforged Domain, Verdant Anomaly, Twilight Battlefield).
- **Species lines count.** A "Catch 26 Pikachu" task is satisfied by any mix of Pichu, Pikachu, or Raichu (any form, including Alolan). Every card spells out its family so there's no arguing at the verification table.
- **Two rerolls per day, four per weekend** — one for the Catch task, one for the Shiny task, each behind a confirmation warning.
- **No repeats.** A trainer is never dealt the same species twice in one weekend — day 2 draws and all rerolls exclude everything previously rolled (even species rerolled away).
- **Everything is local.** Name, tasks, rerolls, and completion checkmarks live in `localStorage`. Verification is human: show an Ambassador.

## The species pool

**Every Pokémon released in Pokémon GO is fair game** except:

- **Legendary, Mythical, and Ultra Beast Pokémon** (Mewtwo is the deliberate exception, as its own fixed task — satisfiable via the event's Mega Mewtwo X/Y Super Mega Raids).
- **Regional exclusives not catchable in Boston, MA** — Klefki, Kangaskhan, Mr. Mime, Heracross, Corsola, Torkoal, Tropius, Relicanth, Pachirisu, Chatot, Carnivine, Sigilyph, Maractus, Hawlucha, Comfey, Bouffalant (NYC metro only — close, but no), Stonjourner, and the "wrong halves" of regional pairs (Volbeat→we keep Illumise, Zangoose→Seviper, Solrock→Lunatone, Pansage/Pansear→Panpour, Durant→Heatmor). Species where Boston just gets a specific *form* (Shellos, Basculin, Oricorio, Flabébé, Tatsugiri, Squawkabilly) stay in.

A species' **primary type dictates its habitat time block**, which is what assigns it to a day:

| Day | Habitat | Time | Types |
| --- | --- | --- | --- |
| Sat Jul 11 | Stormfire Peaks | 10am–1pm | Ice · Electric · Fire |
| Sat Jul 11 | Astral Tides | 1pm–4pm | Psychic · Ghost · Water |
| Sat Jul 11 | Dragonflight Summit | 4pm–7pm | Flying · Rock · Dragon |
| Sun Jul 12 | Earthforged Domain | 10am–1pm | Ground · Steel · Normal |
| Sun Jul 12 | Verdant Anomaly | 1pm–4pm | Poison · Bug · Grass |
| Sun Jul 12 | Twilight Battlefield | 4pm–7pm | Dark · Fairy · Fighting |

The "Catch 26" task only draws common/uncommon families (26 Deino would be cruel); the Shiny task can roll anything, pseudo-legendaries included.

### Regenerating the pool

The `SPECIES` array in `data.js` (386 evolutionary families) is generated — **don't edit it by hand**:

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
