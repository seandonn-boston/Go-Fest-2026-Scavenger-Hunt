/* ============================================================================
 * Regenerates the SPECIES array in data.js from PvPoke's Pokémon GO gamemaster.
 *
 *   node tools/generate-data.mjs [path/to/gamemaster.json]
 *
 * Without an argument it downloads the latest gamemaster from PvPoke's GitHub.
 * The pool it builds encodes the hunt rules:
 *   - every species RELEASED in Pokémon GO is eligible…
 *   - …except Legendary, Mythical, and Ultra Beast Pokémon (Mewtwo remains a
 *     special task in data.js, not part of this pool),
 *   - …except regional exclusives that cannot be caught in Boston, MA,
 *   - …except a small hand-banned list (Ditto, Zorua, Zoroark), and
 *   - …except species that are never found in the wild — obtainable only from
 *     eggs, raids, evolution, or research (e.g. Smeargle, Tandemaus). Only
 *     wild-encounterable species spawn during the event. See NOT_WILD below.
 *   - species are grouped into evolutionary families (a task for one member is
 *     satisfied by any member). Each entry carries the label species' full
 *     typing — data.js/app.js use BOTH types to decide which event day(s) a
 *     species can be rolled on (dual-typed species can qualify for both).
 *
 * After running, bump CACHE_VERSION in sw.js so installed devices update.
 * ==========================================================================*/

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GAMEMASTER_URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";
const DATA_JS = join(dirname(fileURLToPath(import.meta.url)), "..", "data.js");

// ---- hunt configuration ----------------------------------------------------

// All 18 GO types — used to validate the gamemaster's typings.
const KNOWN_TYPES = new Set([
  "ice", "electric", "fire", "psychic", "ghost", "water",
  "flying", "rock", "dragon", "ground", "steel", "normal",
  "poison", "bug", "grass", "dark", "fairy", "fighting",
]);

// Banned from the hunt outright, independent of any other rule.
const HARD_EXCLUDE = new Set(["ditto", "zorua", "zoroark"]);

// Families with NO member that is ever found in the wild — obtainable only
// from eggs, raids, evolution, or special research. Only wild-encounterable
// species can appear during the event, so these are dropped entirely. Match
// is by plain species id against ANY family member, so listing either the
// base or an evolution removes the whole line. (Baby-only forms don't belong
// here — their evolved forms are wild, so the family stays.)
const NOT_WILD = new Set([
  "smeargle",                 // photobomb encounters only
  "tandemaus", "maushold",    // egg-exclusive
  "larvesta", "volcarona",    // egg-exclusive
  "toxel", "toxtricity",      // egg-exclusive
  "riolu", "lucario",         // eggs / research only
  "gimmighoul", "gholdengo",  // PokéStop / research mechanic, not a wild spawn
  "rotom",                    // special research only
  "togepi", "togetic", "togekiss", // eggs / evolution only
  "falinks",                  // raids / research only
  "duraludon",                // raids / research only
  "cursola",                  // Galarian Corsola line — raids / eggs, not wild
  "sirfetchd",                // Galarian Farfetch'd line — research / raids, not wild
  "mr_rime",                  // Galarian Mr. Mime line — eggs / research, not wild
]);

// Regional exclusives that CANNOT be caught in Boston, MA — excluded from the
// pool (the user rule: only Pokémon actually obtainable at the event count).
// Species tagged "regional" in the gamemaster but NOT listed here are kept
// because Boston gets them (e.g. Tauros, Illumise, Panpour, Heatmor, Lunatone,
// Seviper, and form-regionals like Shellos/Basculin/Tatsugiri/Oricorio where
// Boston simply gets a specific form).
const NOT_IN_BOSTON = new Set([
  "farfetchd",   // East Asia (Galarian is egg/raid, not wild)
  "kangaskhan",  // Australia
  "mr_mime",     // Europe
  "heracross",   // Latin America + far-southern US
  "corsola",     // tropics
  "volbeat",     // Europe / Asia / Australia (Boston gets Illumise)
  "torkoal",     // South Asia
  "zangoose",    // Europe / Asia / Australia (Boston gets Seviper)
  "solrock",     // Europe / Asia / Australia since the 2018 swap (Boston gets Lunatone)
  "tropius",     // Africa / Mediterranean
  "relicanth",   // New Zealand + nearby islands
  "pachirisu",   // Canada / Alaska / Russia
  "chatot",      // Southern hemisphere
  "carnivine",   // southeastern US only
  "pansage",     // Asia-Pacific   (Boston gets Panpour)
  "pansear",     // Europe / M-East / Africa / India
  "maractus",    // Latin America
  "sigilyph",    // Egypt / Greece
  "bouffalant",  // NYC metro only — close, but not Boston!
  "durant",      // Eastern hemisphere (Boston gets Heatmor)
  "hawlucha",    // Mexico
  "klefki",      // France
  "comfey",      // Hawaii
  "stonjourner", // UK / Europe
]);

// Baby Pokémon: tasks are labeled with their evolved, wild-common form
// (nobody says "catch 20 Pichu"), but the whole family still counts.
const BABIES = new Set([
  "pichu", "cleffa", "igglybuff", "togepi", "tyrogue", "smoochum", "elekid",
  "magby", "azurill", "wynaut", "budew", "chingling", "bonsly", "mime_jr",
  "happiny", "munchlax", "riolu", "mantyke", "toxel",
]);

// Families that stay rare spawns even in an everything-spawns event: the
// pseudo-legendary lines plus classic rare spawns. Keys are family label
// speciesIds (the baby-skipped form the task is named after).
const RARE_FAMILIES = new Set([
  "dratini", "larvitar", "bagon", "beldum", "gible", "deino", "axew",
  "goomy", "jangmo_o", "dreepy", "frigibax",
  "unown", "chansey", "togetic", "noibat",
]);

// Not rare, but noticeably harder to amass than commons (fossils and such).
const UNCOMMON_EXTRA = new Set([
  "omanyte", "kabuto", "aerodactyl", "lileep", "anorith", "cranidos",
  "shieldon", "tirtouga", "archen", "amaura", "tyrunt", "snorlax", "eiscue",
]);

// Catchable in GO but flagged released:false in PvPoke's sim-focused data.
const FORCE_INCLUDE = new Set(["eiscue"]);

// ---- load gamemaster --------------------------------------------------------
async function loadGamemaster() {
  const localPath = process.argv[2];
  if (localPath) return JSON.parse(readFileSync(localPath, "utf8"));
  const res = await fetch(GAMEMASTER_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

const gm = await loadGamemaster();

// ---- pick one canonical entry per dex number --------------------------------
// The gamemaster lists megas, shadows, and regional/cosmetic forms as separate
// entries. Prefer the plain speciesId; otherwise the shortest form id.
const EXCLUDE_TAGS = new Set(["legendary", "mythical", "ultrabeast", "mega", "shadow", "duplicate"]);

const byDex = new Map();
for (const p of gm.pokemon) {
  if (p.released !== true && !FORCE_INCLUDE.has(p.speciesId)) continue;
  // match "zorua_hisuian" etc. as well as the plain id
  if (HARD_EXCLUDE.has(p.speciesId) || HARD_EXCLUDE.has(p.speciesId.split("_")[0])) continue;
  const tags = p.tags || [];
  if (tags.some((t) => EXCLUDE_TAGS.has(t))) continue;
  if (p.speciesId.endsWith("_shadow") || p.speciesId.endsWith("_mega")) continue;
  const cur = byDex.get(p.dex);
  if (!cur || (cur.speciesId.includes("_") && !p.speciesId.includes("_")) ||
      (cur.speciesId.includes("_") === p.speciesId.includes("_") && p.speciesId.length < cur.speciesId.length)) {
    byDex.set(p.dex, p);
  }
}

// Track which dex numbers also ship variant forms (Alolan etc.) so the task
// note can say "any form counts".
const FORM_TAGS = new Set(["alolan", "galarian", "hisuian", "paldean"]);
const hasVariants = new Set();
for (const p of gm.pokemon) {
  if (p.released === true && (p.tags || []).some((t) => FORM_TAGS.has(t))) hasVariants.add(p.dex);
}

// Boston filter (match by plain id prefix so "tatsugiri_curly" matches "tatsugiri").
const plainId = (id) => id.split("_")[0];
for (const [dex, p] of byDex) {
  if (NOT_IN_BOSTON.has(p.speciesId) || NOT_IN_BOSTON.has(plainId(p.speciesId))) byDex.delete(dex);
}

// ---- group into evolutionary families ---------------------------------------
const families = new Map(); // family id → [entries]
for (const p of [...byDex.values()].sort((a, b) => a.dex - b.dex)) {
  const famId = p.family?.id || `FAMILY_${p.speciesId.toUpperCase()}`;
  if (!families.has(famId)) families.set(famId, []);
  families.get(famId).push(p);
}

const displayName = (p) => p.speciesName.replace(/\s*\(.*\)$/, "");

const species = [];
for (const members of families.values()) {
  // Drop families that are never found in the wild (no wild-encounterable member).
  if (members.some((m) => NOT_WILD.has(m.speciesId) || NOT_WILD.has(plainId(m.speciesId)))) continue;

  // Label: first non-baby member by dex (falls back to the first member).
  const label = members.find((m) => !BABIES.has(m.speciesId)) || members[0];

  const types = label.types.filter((t) => t !== "none");
  const badType = types.find((t) => !KNOWN_TYPES.has(t));
  if (badType || types.length === 0) {
    console.warn(`SKIP ${label.speciesId}: unexpected typing ${JSON.stringify(label.types)}`);
    continue;
  }

  let tier = "common";
  if (RARE_FAMILIES.has(label.speciesId)) tier = "rare";
  else if (members.length === 1 || UNCOMMON_EXTRA.has(label.speciesId)) tier = "uncommon";

  const names = members.map(displayName);
  let line = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  if (members.some((m) => hasVariants.has(m.dex))) line += " — any form";

  species.push({ name: displayName(label), types, tier, line, dex: label.dex });
}

species.sort((a, b) => a.dex - b.dex);

// ---- write into data.js between the GENERATED markers -----------------------
const entries = species
  .map(({ name, types, tier, line }) =>
    `  { name: ${JSON.stringify(name)}, types: ${JSON.stringify(types)}, tier: ${JSON.stringify(tier)}, line: ${JSON.stringify(line)} },`)
  .join("\n");

const dataJs = readFileSync(DATA_JS, "utf8");
const BEGIN = "// BEGIN GENERATED SPECIES (tools/generate-data.mjs) — do not edit by hand";
const END = "// END GENERATED SPECIES";
const start = dataJs.indexOf(BEGIN);
const end = dataJs.indexOf(END);
if (start === -1 || end === -1) throw new Error("GENERATED SPECIES markers not found in data.js");
writeFileSync(
  DATA_JS,
  dataJs.slice(0, start + BEGIN.length) + "\n" + entries + "\n" + dataJs.slice(end)
);

// ---- report ------------------------------------------------------------------
// Day membership mirrors DAYS[*].types in data.js — keep these in sync.
const SATURDAY = new Set(["ice", "electric", "fire", "psychic", "ghost", "water", "flying", "rock", "dragon"]);
const SUNDAY = new Set(["ground", "steel", "normal", "poison", "bug", "grass", "dark", "fairy", "fighting"]);
let sat = 0, sun = 0, both = 0;
const perTier = {};
for (const s of species) {
  const onSat = s.types.some((t) => SATURDAY.has(t));
  const onSun = s.types.some((t) => SUNDAY.has(t));
  if (onSat) sat++;
  if (onSun) sun++;
  if (onSat && onSun) both++;
  perTier[s.tier] = (perTier[s.tier] || 0) + 1;
}
console.log(`wrote ${species.length} families into data.js`);
console.log(`day pools — Saturday: ${sat}, Sunday: ${sun}, on both days: ${both}`);
console.log("per tier:", perTier);
