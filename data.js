/* ============================================================================
 * GO Fest 2026 Scavenger Hunt — event data
 * ============================================================================
 * This file is the ONLY place event data lives. When Niantic publishes the
 * official per-habitat wild spawn lists for GO Fest 2026: Global, update the
 * SPECIES array below (add/remove entries) and bump CACHE_VERSION in sw.js so
 * installed devices pick up the change.
 *
 * The current pool is a best-effort seed based on the officially announced
 * habitat themes (Niantic had not published exact spawn lists at build time):
 *   Sat Jul 11 — Stormfire Peaks (Ice/Electric/Fire), Astral Tides
 *                (Psychic/Ghost/Water), Dragonflight Summit (Flying/Rock/Dragon)
 *   Sun Jul 12 — Earthforged Domain (Ground/Steel/Normal), Verdant Anomaly
 *                (Poison/Bug/Grass), Twilight Battlefield (Dark/Fairy/Fighting)
 *
 * Tasks always target a species LINE: babies, evolutions, and regional forms
 * all count. The `line` string is shown to trainers so that rule is explicit.
 *
 * tier drives the catch-count range for "Catch N ..." tasks:
 *   common → 15–20, uncommon → 7–10, rare → 3–5
 * ==========================================================================*/

const HABITATS = {
  stormfire: {
    name: "Stormfire Peaks",
    day: "Sat, Jul 11 · 10am–1pm",
    types: "Ice · Electric · Fire",
    emoji: "🌋",
    color: "#e8590c",
  },
  astral: {
    name: "Astral Tides",
    day: "Sat, Jul 11 · 1pm–4pm",
    types: "Psychic · Ghost · Water",
    emoji: "🌊",
    color: "#7048e8",
  },
  dragonflight: {
    name: "Dragonflight Summit",
    day: "Sat, Jul 11 · 4pm–7pm",
    types: "Flying · Rock · Dragon",
    emoji: "🐉",
    color: "#0c8599",
  },
  earthforged: {
    name: "Earthforged Domain",
    day: "Sun, Jul 12 · 10am–1pm",
    types: "Ground · Steel · Normal",
    emoji: "⛏️",
    color: "#a87900",
  },
  verdant: {
    name: "Verdant Anomaly",
    day: "Sun, Jul 12 · 1pm–4pm",
    types: "Poison · Bug · Grass",
    emoji: "🌿",
    color: "#2f9e44",
  },
  twilight: {
    name: "Twilight Battlefield",
    day: "Sun, Jul 12 · 4pm–7pm",
    types: "Dark · Fairy · Fighting",
    emoji: "🌙",
    color: "#c2255c",
  },
};

const SPECIES = [
  // ---- Stormfire Peaks (Ice · Electric · Fire) ----------------------------
  { name: "Swinub",     habitat: "stormfire", tier: "common",   line: "Swinub, Piloswine & Mamoswine" },
  { name: "Cubchoo",    habitat: "stormfire", tier: "common",   line: "Cubchoo & Beartic" },
  { name: "Snorunt",    habitat: "stormfire", tier: "common",   line: "Snorunt, Glalie & Froslass" },
  { name: "Bergmite",   habitat: "stormfire", tier: "uncommon", line: "Bergmite & Avalugg (incl. Hisuian)" },
  { name: "Pikachu",    habitat: "stormfire", tier: "common",   line: "Pichu, Pikachu & Raichu (incl. Alolan)" },
  { name: "Electrike",  habitat: "stormfire", tier: "common",   line: "Electrike & Manectric" },
  { name: "Joltik",     habitat: "stormfire", tier: "common",   line: "Joltik & Galvantula" },
  { name: "Helioptile", habitat: "stormfire", tier: "uncommon", line: "Helioptile & Heliolisk" },
  { name: "Growlithe",  habitat: "stormfire", tier: "common",   line: "Growlithe & Arcanine (incl. Hisuian)" },
  { name: "Vulpix",     habitat: "stormfire", tier: "common",   line: "Vulpix & Ninetales (incl. Alolan)" },
  { name: "Darumaka",   habitat: "stormfire", tier: "uncommon", line: "Darumaka & Darmanitan (incl. Galarian)" },
  { name: "Litwick",    habitat: "stormfire", tier: "rare",     line: "Litwick, Lampent & Chandelure" },

  // ---- Astral Tides (Psychic · Ghost · Water) -----------------------------
  { name: "Abra",       habitat: "astral", tier: "common",   line: "Abra, Kadabra & Alakazam" },
  { name: "Ralts",      habitat: "astral", tier: "common",   line: "Ralts, Kirlia, Gardevoir & Gallade" },
  { name: "Gothita",    habitat: "astral", tier: "uncommon", line: "Gothita, Gothorita & Gothitelle" },
  { name: "Solosis",    habitat: "astral", tier: "uncommon", line: "Solosis, Duosion & Reuniclus" },
  { name: "Espurr",     habitat: "astral", tier: "rare",     line: "Espurr & Meowstic" },
  { name: "Gastly",     habitat: "astral", tier: "common",   line: "Gastly, Haunter & Gengar" },
  { name: "Drifloon",   habitat: "astral", tier: "common",   line: "Drifloon & Drifblim" },
  { name: "Duskull",    habitat: "astral", tier: "common",   line: "Duskull, Dusclops & Dusknoir" },
  { name: "Phantump",   habitat: "astral", tier: "rare",     line: "Phantump & Trevenant" },
  { name: "Magikarp",   habitat: "astral", tier: "common",   line: "Magikarp & Gyarados" },
  { name: "Psyduck",    habitat: "astral", tier: "common",   line: "Psyduck & Golduck" },
  { name: "Horsea",     habitat: "astral", tier: "common",   line: "Horsea, Seadra & Kingdra" },
  { name: "Carvanha",   habitat: "astral", tier: "uncommon", line: "Carvanha & Sharpedo" },
  { name: "Wooper",     habitat: "astral", tier: "common",   line: "Wooper (incl. Paldean), Quagsire & Clodsire" },

  // ---- Dragonflight Summit (Flying · Rock · Dragon) -----------------------
  { name: "Swablu",     habitat: "dragonflight", tier: "common",   line: "Swablu & Altaria" },
  { name: "Fletchling", habitat: "dragonflight", tier: "common",   line: "Fletchling, Fletchinder & Talonflame" },
  { name: "Rufflet",    habitat: "dragonflight", tier: "uncommon", line: "Rufflet & Braviary (incl. Hisuian)" },
  { name: "Noibat",     habitat: "dragonflight", tier: "rare",     line: "Noibat & Noivern" },
  { name: "Geodude",    habitat: "dragonflight", tier: "common",   line: "Geodude (incl. Alolan), Graveler & Golem" },
  { name: "Roggenrola", habitat: "dragonflight", tier: "common",   line: "Roggenrola, Boldore & Gigalith" },
  { name: "Rhyhorn",    habitat: "dragonflight", tier: "common",   line: "Rhyhorn, Rhydon & Rhyperior" },
  { name: "Larvitar",   habitat: "dragonflight", tier: "rare",     line: "Larvitar, Pupitar & Tyranitar" },
  { name: "Dratini",    habitat: "dragonflight", tier: "uncommon", line: "Dratini, Dragonair & Dragonite" },
  { name: "Bagon",      habitat: "dragonflight", tier: "uncommon", line: "Bagon, Shelgon & Salamence" },
  { name: "Gible",      habitat: "dragonflight", tier: "rare",     line: "Gible, Gabite & Garchomp" },
  { name: "Axew",       habitat: "dragonflight", tier: "rare",     line: "Axew, Fraxure & Haxorus" },
  { name: "Deino",      habitat: "dragonflight", tier: "rare",     line: "Deino, Zweilous & Hydreigon" },
  { name: "Goomy",      habitat: "dragonflight", tier: "rare",     line: "Goomy, Sliggoo (incl. Hisuian) & Goodra" },

  // ---- Earthforged Domain (Ground · Steel · Normal) -----------------------
  { name: "Sandshrew",  habitat: "earthforged", tier: "common",   line: "Sandshrew & Sandslash (incl. Alolan)" },
  { name: "Trapinch",   habitat: "earthforged", tier: "common",   line: "Trapinch, Vibrava & Flygon" },
  { name: "Drilbur",    habitat: "earthforged", tier: "uncommon", line: "Drilbur & Excadrill" },
  { name: "Cubone",     habitat: "earthforged", tier: "common",   line: "Cubone & Marowak (incl. Alolan)" },
  { name: "Phanpy",     habitat: "earthforged", tier: "common",   line: "Phanpy & Donphan" },
  { name: "Hippopotas", habitat: "earthforged", tier: "uncommon", line: "Hippopotas & Hippowdon" },
  { name: "Aron",       habitat: "earthforged", tier: "common",   line: "Aron, Lairon & Aggron" },
  { name: "Ferroseed",  habitat: "earthforged", tier: "uncommon", line: "Ferroseed & Ferrothorn" },
  { name: "Klink",      habitat: "earthforged", tier: "rare",     line: "Klink, Klang & Klinklang" },
  { name: "Beldum",     habitat: "earthforged", tier: "rare",     line: "Beldum, Metang & Metagross" },
  { name: "Eevee",      habitat: "earthforged", tier: "common",   line: "Eevee & all of its evolutions" },
  { name: "Bunnelby",   habitat: "earthforged", tier: "common",   line: "Bunnelby & Diggersby" },
  { name: "Skwovet",    habitat: "earthforged", tier: "common",   line: "Skwovet & Greedent" },
  { name: "Audino",     habitat: "earthforged", tier: "rare",     line: "Audino" },

  // ---- Verdant Anomaly (Poison · Bug · Grass) -----------------------------
  { name: "Grimer",     habitat: "verdant", tier: "common",   line: "Grimer (incl. Alolan) & Muk" },
  { name: "Gulpin",     habitat: "verdant", tier: "common",   line: "Gulpin & Swalot" },
  { name: "Croagunk",   habitat: "verdant", tier: "uncommon", line: "Croagunk & Toxicroak" },
  { name: "Trubbish",   habitat: "verdant", tier: "uncommon", line: "Trubbish & Garbodor" },
  { name: "Skorupi",    habitat: "verdant", tier: "common",   line: "Skorupi & Drapion" },
  { name: "Scyther",    habitat: "verdant", tier: "uncommon", line: "Scyther, Scizor & Kleavor" },
  { name: "Karrablast", habitat: "verdant", tier: "uncommon", line: "Karrablast & Escavalier" },
  { name: "Shelmet",    habitat: "verdant", tier: "uncommon", line: "Shelmet & Accelgor" },
  { name: "Grubbin",    habitat: "verdant", tier: "common",   line: "Grubbin, Charjabug & Vikavolt" },
  { name: "Bulbasaur",  habitat: "verdant", tier: "common",   line: "Bulbasaur, Ivysaur & Venusaur" },
  { name: "Oddish",     habitat: "verdant", tier: "common",   line: "Oddish, Gloom, Vileplume & Bellossom" },
  { name: "Seedot",     habitat: "verdant", tier: "common",   line: "Seedot, Nuzleaf & Shiftry" },
  { name: "Cottonee",   habitat: "verdant", tier: "common",   line: "Cottonee & Whimsicott" },
  { name: "Fomantis",   habitat: "verdant", tier: "uncommon", line: "Fomantis & Lurantis" },
  { name: "Foongus",    habitat: "verdant", tier: "uncommon", line: "Foongus & Amoonguss" },

  // ---- Twilight Battlefield (Dark · Fairy · Fighting) ---------------------
  { name: "Murkrow",    habitat: "twilight", tier: "common",   line: "Murkrow & Honchkrow" },
  { name: "Poochyena",  habitat: "twilight", tier: "common",   line: "Poochyena & Mightyena" },
  { name: "Purrloin",   habitat: "twilight", tier: "common",   line: "Purrloin & Liepard" },
  { name: "Sandile",    habitat: "twilight", tier: "uncommon", line: "Sandile, Krokorok & Krookodile" },
  { name: "Scraggy",    habitat: "twilight", tier: "uncommon", line: "Scraggy & Scrafty" },
  { name: "Zorua",      habitat: "twilight", tier: "rare",     line: "Zorua & Zoroark (incl. Hisuian)" },
  { name: "Clefairy",   habitat: "twilight", tier: "common",   line: "Cleffa, Clefairy & Clefable" },
  { name: "Snubbull",   habitat: "twilight", tier: "common",   line: "Snubbull & Granbull" },
  { name: "Spritzee",   habitat: "twilight", tier: "uncommon", line: "Spritzee & Aromatisse" },
  { name: "Swirlix",    habitat: "twilight", tier: "uncommon", line: "Swirlix & Slurpuff" },
  { name: "Flabébé",    habitat: "twilight", tier: "uncommon", line: "Flabébé, Floette & Florges" },
  { name: "Machop",     habitat: "twilight", tier: "common",   line: "Machop, Machoke & Machamp" },
  { name: "Makuhita",   habitat: "twilight", tier: "common",   line: "Makuhita & Hariyama" },
  { name: "Timburr",    habitat: "twilight", tier: "uncommon", line: "Timburr, Gurdurr & Conkeldurr" },
  { name: "Mienfoo",    habitat: "twilight", tier: "rare",     line: "Mienfoo & Mienshao" },
  { name: "Riolu",      habitat: "twilight", tier: "rare",     line: "Riolu & Lucario" },
];

// Catch-count ranges per rarity tier, inclusive.
const TIER_COUNTS = {
  common:   { min: 15, max: 20 },
  uncommon: { min: 7,  max: 10 },
  rare:     { min: 3,  max: 5 },
};

// Odds that a fresh set of three tasks includes one of these special tasks.
// (At most one shiny task and at most one Mewtwo task per set.)
const SHINY_TASK_CHANCE = 0.35;
const MEWTWO_TASK_CHANCE = 0.12;

// The one non-wild-spawn exception, per hunt rules.
const MEWTWO_TASK = {
  type: "mewtwo",
  text: "Catch a Mewtwo",
  note: "The exception to the wild-spawn rule! Any Mewtwo counts, including one caught after a Mega Mewtwo X or Y Super Mega Raid.",
};
