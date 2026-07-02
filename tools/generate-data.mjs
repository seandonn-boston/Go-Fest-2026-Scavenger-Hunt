/* ============================================================================
 * Regenerates the SPECIES array in data.js from PvPoke's Pokémon GO gamemaster.
 *
 *   node tools/generate-data.mjs [path/to/gamemaster.json]
 *
 * Without an argument it downloads the latest gamemaster from PvPoke's GitHub.
 * The pool it builds encodes the hunt rules:
 *   - every species RELEASED in Pokémon GO is eligible…
 *   - …except Legendary, Mythical, and Ultra Beast Pokémon (Mewtwo remains a
 *     special task in data.js, not part of this pool), and
 *   - …except regional exclusives that cannot be caught in Boston, MA.
 *   - species are grouped into evolutionary families (a task for one member is
 *     satisfied by any member), and each family is assigned to the GO Fest
 *     habitat time block matching its primary type.
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

// GO Fest 2026 habitat blocks: primary type → habitat key (all 18 types).
const TYPE_HABITAT = {
  ice: "stormfire", electric: "stormfire", fire: "stormfire",
  psychic: "astral", ghost: "astral", water: "astral",
  flying: "dragonflight", rock: "dragonflight", dragon: "dragonflight",
  ground: "earthforged", steel: "earthforged", normal: "earthforged",
  poison: "verdant", bug: "verdant", grass: "verdant",
  dark: "twilight", fairy: "twilight", fighting: "twilight",
};

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
  "unown", "ditto", "lucario", "larvesta", "rotom", "gimmighoul",
  "chansey", "togetic", "noibat",
]);

// Not rare, but noticeably harder to amass than commons (fossils and such).
const UNCOMMON_EXTRA = new Set([
  "omanyte", "kabuto", "aerodactyl", "lileep", "anorith", "cranidos",
  "shieldon", "tirtouga", "archen", "amaura", "tyrunt", "snorlax", "eiscue",
]);

// Catchable in GO but flagged released:false in PvPoke's sim-focused data.
const FORCE_INCLUDE = new Set(["ditto", "eiscue"]);

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
  // Label: first non-baby member by dex (falls back to the first member).
  const label = members.find((m) => !BABIES.has(m.speciesId)) || members[0];

  const primaryType = label.types[0];
  const habitat = TYPE_HABITAT[primaryType];
  if (!habitat) {
    console.warn(`SKIP ${label.speciesId}: unmapped type "${primaryType}"`);
    continue;
  }

  let tier = "common";
  if (RARE_FAMILIES.has(label.speciesId)) tier = "rare";
  else if (members.length === 1 || UNCOMMON_EXTRA.has(label.speciesId)) tier = "uncommon";

  const names = members.map(displayName);
  let line = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  if (members.some((m) => hasVariants.has(m.dex))) line += " — any form";

  species.push({ name: displayName(label), habitat, tier, line, dex: label.dex });
}

species.sort((a, b) => a.dex - b.dex);

// ---- write into data.js between the GENERATED markers -----------------------
const entries = species
  .map(({ name, habitat, tier, line }) =>
    `  { name: ${JSON.stringify(name)}, habitat: ${JSON.stringify(habitat)}, tier: ${JSON.stringify(tier)}, line: ${JSON.stringify(line)} },`)
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
const perHabitat = {};
const perTier = {};
for (const s of species) {
  perHabitat[s.habitat] = (perHabitat[s.habitat] || 0) + 1;
  perTier[s.tier] = (perTier[s.tier] || 0) + 1;
}
console.log(`wrote ${species.length} families into data.js`);
console.log("per habitat:", perHabitat);
console.log("per tier:", perTier);
