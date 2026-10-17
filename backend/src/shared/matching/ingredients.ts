// ============================================================
// Medicine Matching — Ingredient Name Canonicalisation
// Maps the many spellings of one active ingredient (Indian/British
// vs. US names, salt suffixes, hydrates, hyphenation) to one key,
// while keeping the salt form so "diclofenac sodium" and
// "diclofenac potassium" can still be told apart.
// ============================================================

/** Whole-name aliases, applied after cleanup. Left side → canonical. */
const NAME_ALIASES: Record<string, string> = {
  acetaminophen: 'paracetamol',
  amoxicillin: 'amoxycillin',
  'clavulanic acid': 'clavulanate',
  clavulanate: 'clavulanate',
  furosemide: 'frusemide',
  albuterol: 'salbutamol',
  lidocaine: 'lignocaine',
  epinephrine: 'adrenaline',
  norepinephrine: 'noradrenaline',
  glyburide: 'glibenclamide',
  cefalexin: 'cephalexin',
  rifampin: 'rifampicin',
  levothyroxine: 'thyroxine',
  'l thyroxine': 'thyroxine',
  'acetylsalicylic acid': 'aspirin',
  levamlodipine: 's amlodipine',
  's amlodipine': 's amlodipine',
  beclometasone: 'beclomethasone',
  ciclosporin: 'cyclosporine',
  cyclosporin: 'cyclosporine',
  'valproic acid': 'valproate',
  'sodium valproate': 'valproate',
  'vitamin d3': 'cholecalciferol',
  'vitamin d 3': 'cholecalciferol',
  'vit d3': 'cholecalciferol',
  mecobalamin: 'methylcobalamin',
  'vitamin b12': 'methylcobalamin',
  'vitamin c': 'ascorbic acid',
  'vitamin b6': 'pyridoxine',
  'lactic acid bacillus': 'lactobacillus sporogenes',
  'lactic acid bacillus spores': 'lactobacillus sporogenes',
  'bacillus clausii spores': 'bacillus clausii',
  nicoumalone: 'acenocoumarol',
  'nicoumalone acenocoumarol': 'acenocoumarol',
  'methyl salicylate': 'methylsalicylate',
  'linceed oil': 'linseed oil',
  thiocholchicoside: 'thiocolchicoside',
  'povidone iodine': 'povidone iodine',
  esomeprazole: 'esomeprazole',
  'insulin human': 'human insulin',
  'n acetylcysteine': 'acetylcysteine',
  'n acetyl cysteine': 'acetylcysteine',
  'l arginine': 'arginine',
  'l methylfolate': 'methylfolate',
  'l methyl folate': 'methylfolate',
};

/** Token-level spelling fixes (British/US, common typos in source data). */
const TOKEN_ALIASES: Record<string, string> = {
  sulfate: 'sulphate',
  aluminum: 'aluminium',
  dithylamine: 'diethylamine',
  hcl: 'hydrochloride',
  hydrochloride: 'hydrochloride',
};

/** Counter-ions and esters that name the salt form, not the active moiety. */
const SALT_WORDS = new Set([
  'hydrochloride', 'hydrobromide', 'sodium', 'potassium', 'calcium', 'magnesium',
  'sulphate', 'phosphate', 'maleate', 'mesylate', 'mesilate', 'besylate', 'besilate',
  'tartrate', 'bitartrate', 'citrate', 'succinate', 'fumarate', 'acetate', 'diethylamine',
  'bromide', 'nitrate', 'lactate', 'gluconate', 'dipropionate', 'propionate', 'valerate',
  'furoate', 'axetil', 'proxetil', 'pivoxil', 'disodium', 'trisodium', 'dihydrochloride',
  'oxalate', 'hyclate', 'stearate', 'palmitate', 'tromethamine', 'olamine', 'medoxomil',
  'cilexetil', 'arginine', 'erbumine', 'xinafoate', 'monohydrochloride', 'chloride',
]);

/** Words that are an active ingredient on their own (minerals, electrolytes). */
const ION_BASES = new Set([
  'sodium', 'potassium', 'calcium', 'magnesium', 'ferrous', 'ferric', 'zinc', 'iron',
  'aluminium', 'lithium', 'silver', 'copper', 'manganese', 'chromium', 'selenium',
]);

/** Inorganic anions: "calcium carbonate" is a mineral salt, not "carbonate" in calcium form. */
const ANIONS = new Set([
  'carbonate', 'bicarbonate', 'oxide', 'hydroxide', 'trisilicate', 'orotate', 'aspartate',
  'malate', 'iodide', 'fluoride', 'glycerophosphate', 'ascorbate', 'bisglycinate', 'fumarate',
  'chloride', 'citrate', 'gluconate', 'lactate', 'phosphate', 'sulphate', 'acetate', 'picolinate',
]);

const isInorganicRest = (rest: string[]) => rest.every((t) => ION_BASES.has(t) || SALT_WORDS.has(t) || ANIONS.has(t));

/** Descriptors that never change which molecule it is. */
const NOISE_WORDS = new Set([
  'ip', 'bp', 'usp', 'ph', 'eur', 'trihydrate', 'dihydrate', 'monohydrate', 'hemihydrate',
  'sesquihydrate', 'anhydrous', 'micronized', 'micronised', 'hydrous', 'base', 'equivalent',
  'eq', 'to', 'as', 'of', 'the', 'pure', 'purified', 'mixture', 'blend',
]);

export interface CanonicalIngredient {
  /** Canonical active-moiety key, e.g. "diclofenac", "potassium chloride" */
  key: string;
  /** Salt form if stated, e.g. "sodium"; null when not stated */
  saltForm: string | null;
}

function cleanup(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/ /g, ' ')
    .replace(/[αβ]-?/g, '')
    .replace(/\b(\w)-(\w)/g, '$1 $2')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => TOKEN_ALIASES[t] || t)
    .filter((t) => !NOISE_WORDS.has(t));
}

/**
 * Canonicalise one ingredient name.
 * "Metformin Hydrochloride" → { key: "metformin", saltForm: "hydrochloride" }
 * "Potassium Chloride"      → { key: "potassium chloride", saltForm: null }
 * "Sodium Valproate"        → { key: "valproate", saltForm: null }
 */
export function canonicalIngredient(raw: string): CanonicalIngredient {
  // "Paracetamol/Acetaminophen", "Nicoumalone/Acenocoumarol": alternative names for one drug.
  // Prefer an alternative we have an alias for, else the first one.
  if (raw.includes('/') && !/\d\s*\//.test(raw)) {
    const alts = raw.split('/').map((a) => a.trim()).filter((a) => cleanup(a).length > 0);
    if (alts.length === 0) return { key: '', saltForm: null };
    const known = alts.find((a) => NAME_ALIASES[cleanup(a).join(' ')]);
    return canonicalIngredient(known || alts[0]);
  }
  let tokens = cleanup(raw);
  const whole = tokens.join(' ');
  if (NAME_ALIASES[whole]) return { key: NAME_ALIASES[whole], saltForm: null };

  const salts: string[] = [];
  // Strip trailing salt words ("metformin hydrochloride"), keeping ions that are the drug.
  while (tokens.length > 1 && SALT_WORDS.has(tokens[tokens.length - 1])) {
    const rest = tokens.slice(0, -1);
    if (isInorganicRest(rest)) break;
    salts.unshift(tokens[tokens.length - 1]);
    tokens = rest;
  }
  // Strip leading salt words ("potassium clavulanate", "sodium valproate").
  while (tokens.length > 1 && SALT_WORDS.has(tokens[0])) {
    const rest = tokens.slice(1);
    if (isInorganicRest(rest)) break;
    salts.push(tokens[0]);
    tokens = rest;
  }

  const base = tokens.join(' ');
  const key = NAME_ALIASES[base] || base;
  return { key, saltForm: salts.length ? salts.join(' ') : null };
}
