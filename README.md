# GO Fest 2026 Scavenger Hunt 🔴⚪

An **unofficial**, community-run scavenger hunt companion PWA for **Pokémon GO Fest 2026: Global** (July 11–12, 2026).

Trainers open the app, enter their trainer name, and are dealt **three random catch tasks** built from the event's wild habitat spawns. They complete the tasks in the real world, then show the app **and** their Pokémon GO app to a **Community Ambassador** in person to claim their reward. Nothing is entered, submitted, or synced — ever.

## How the hunt works

- **3 random tasks** per trainer, e.g. *“Catch 20 Pikachu”*, *“Catch a ✨ shiny Gastly”*, or (rarely) *“Catch a Mewtwo.”*
- **Species lines count.** A “Catch 20 Pikachu” task is satisfied by any mix of Pichu, Pikachu, or Raichu (including Alolan Raichu). Every task card spells out its family so there's no arguing at the verification table.
- **One reroll, total.** A trainer may swap out exactly one task for the whole hunt, with a confirmation warning before it's spent.
- **Wild spawns only** — the task pool is drawn from the event's six announced habitats. The single exception is **Mewtwo** (a rare task, satisfiable via the event's Mega Mewtwo X/Y Super Mega Raids).
- **Everything is local.** Trainer name, tasks, reroll state, and completion checkmarks live in `localStorage`. Close the app, come back later — same tasks. Verification is human: show an Ambassador.

## Tech

Plain HTML/CSS/JS — no framework, no build step, no dependencies, no network calls. It's an installable PWA (manifest + service worker) that **precaches the entire app**, so it keeps working on GO Fest's overloaded cell networks once it has been opened once.

| File | Purpose |
| --- | --- |
| `index.html` / `styles.css` / `app.js` | The whole app |
| `data.js` | **All event data**: habitats, species pool, task tuning |
| `sw.js` | Offline precache (bump `CACHE_VERSION` when assets change) |
| `manifest.webmanifest` + `icons/` | PWA install metadata |
| `tools/generate-icons.mjs` | Regenerates the icons (`node tools/generate-icons.mjs`) |

## ⚠️ Updating the spawn pool

Niantic had **not yet published the official per-habitat spawn lists** when this was built — the current pool in `data.js` is a best-effort seed matching the announced habitat themes:

| Day | Habitat | Types |
| --- | --- | --- |
| Sat Jul 11 | Stormfire Peaks | Ice · Electric · Fire |
| Sat Jul 11 | Astral Tides | Psychic · Ghost · Water |
| Sat Jul 11 | Dragonflight Summit | Flying · Rock · Dragon |
| Sun Jul 12 | Earthforged Domain | Ground · Steel · Normal |
| Sun Jul 12 | Verdant Anomaly | Poison · Bug · Grass |
| Sun Jul 12 | Twilight Battlefield | Dark · Fairy · Fighting |

When the official lists drop:

1. Edit the `SPECIES` array in `data.js` (name, habitat key, rarity `tier`, and the `line` string listing every family member that counts).
2. Bump `CACHE_VERSION` in `sw.js` so installed devices fetch the new data.

Already-dealt task sets on trainers' devices are unaffected (they're stored locally); only new deals use the updated pool.

## Running it

It's static files — serve the folder over HTTPS (or localhost) so the service worker can register:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

For the event, host it anywhere static (GitHub Pages works out of the box — no build step).

## For Community Ambassadors

- Verification is visual: the trainer shows their task cards (with green “Completed!” checks) alongside proof in Pokémon GO.
- The **Start over** option (⋯ menu) wipes the device's hunt and re-deals — it warns trainers that Ambassadors may not accept a re-dealt hunt, but there is no technical anti-cheat. This is a for-fun community event; trust your judgment.

---

*Not affiliated with, endorsed by, or connected to Niantic, Nintendo, or The Pokémon Company. Pokémon names are trademarks of their respective owners; used here nominatively for a fan event.*
