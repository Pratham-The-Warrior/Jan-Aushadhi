// ============================================================
// Medicine Matching — Product Parsing
// Turns free-text medicine descriptions into structured products:
//   ingredients (canonical key + strength), dosage form, release type.
// Two sources:
//   • branded:  composition fields like "Amoxycillin (500mg)", plus
//               the brand name and pack label for form/release hints
//   • generic:  PMBJP names like "Paracetamol 650mg and Caffeine 50mg
//               Tablets IP", "Atorvastatin Tablets IP 10mg",
//               "Losartan + Amlodipine Tablet (50/2.5 Mg)"
// ============================================================

import { canonicalIngredient } from './ingredients';

// ---- Strength ----

export type StrengthKind = 'mass' | 'conc' | 'pct_ww' | 'pct_wv' | 'pct_vv' | 'iu' | 'iu_conc' | 'cfu';

export interface Strength {
  kind: StrengthKind;
  /** Normalised value: mg for mass, mg/ml for conc, % for pct, IU, IU/ml, organisms */
  value: number;
  /** For "X mg per 5 ml": the X in mg, so per-dose labels can be compared */
  perDoseMg?: number;
}

const MASS_TO_MG: Record<string, number> = { mg: 1, mcg: 0.001, 'µg': 0.001, ug: 0.001, g: 1000, gm: 1000, gram: 1000, grams: 1000 };

// number, unit, optional "/ or per <n> ml|g"
const STRENGTH_RE = new RegExp(
  String.raw`(\d+(?:\.\d+)?)\s*` +
  String.raw`(million\s+spores?|billion\s+spores?|million\s+cells|lakh\s+iu|million\s+iu|mcg|µg|ug|mg|gm|grams?|g|i\.?u\.?|units?|%\s*w\s*/\s*w|%\s*w\s*/\s*v|%\s*v\s*/\s*v|%)` +
  String.raw`(?![a-z])` +
  String.raw`(?:\s*(?:/|per)\s*(\d+(?:\.\d+)?)?\s*(ml|gm|g)\b)?`,
  'gi',
);

/** Parse one strength token match into a normalised Strength. */
function toStrength(num: string, unitRaw: string, perNum: string | undefined, perUnit: string | undefined, liquid: boolean): Strength | null {
  const value = parseFloat(num);
  if (!Number.isFinite(value)) return null;
  const unit = unitRaw.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  const per = perUnit ? parseFloat(perNum || '1') || 1 : null;

  if (unit in MASS_TO_MG) {
    const mg = value * MASS_TO_MG[unit];
    if (per && perUnit && /ml/.test(perUnit)) return { kind: 'conc', value: round(mg / per), perDoseMg: round(mg) };
    if (per && perUnit) return { kind: 'pct_ww', value: round((mg / (per * 1000)) * 100) }; // mg per g → % w/w
    return { kind: 'mass', value: round(mg) };
  }
  if (unit === '%w/w') return { kind: 'pct_ww', value };
  if (unit === '%w/v') return { kind: 'pct_wv', value };
  if (unit === '%v/v') return { kind: 'pct_vv', value };
  if (unit === '%') return { kind: liquid ? 'pct_wv' : 'pct_ww', value };
  if (unit === 'iu' || unit === 'unit' || unit === 'units') {
    if (per && perUnit && /ml/.test(perUnit)) return { kind: 'iu_conc', value: round(value / per) };
    return { kind: 'iu', value };
  }
  if (unit === 'lakhiu') return { kind: 'iu', value: value * 1e5 };
  if (unit === 'millioniu') return { kind: 'iu', value: value * 1e6 };
  if (/spore|cell/.test(unit)) return { kind: 'cfu', value: value * (unit.startsWith('billion') ? 1e9 : 1e6) };
  return null;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** % w/v and mg/ml describe the same thing (1% w/v = 10 mg/ml). */
function comparable(s: Strength): { kind: string; value: number } {
  if (s.kind === 'pct_wv') return { kind: 'conc', value: s.value * 10 };
  return { kind: s.kind, value: s.value };
}

/**
 * Two strengths are equal if they normalise to the same quantity (±1%),
 * or one is a per-dose mass and the other is "that mass per N ml"
 * (Indian liquid labels often state "250mg" meaning per 5 ml).
 */
export function strengthsEqual(a: Strength, b: Strength): boolean {
  const ca = comparable(a);
  const cb = comparable(b);
  if (ca.kind === cb.kind) return Math.abs(ca.value - cb.value) <= Math.max(ca.value, cb.value) * 0.01;
  if (a.kind === 'mass' && b.perDoseMg != null) return Math.abs(a.value - b.perDoseMg) <= a.value * 0.01;
  if (b.kind === 'mass' && a.perDoseMg != null) return Math.abs(b.value - a.perDoseMg) <= b.value * 0.01;
  return false;
}

/** Log-distance between two strengths of the same kind, for ranking near misses. */
export function strengthDistance(a: Strength | null, b: Strength | null): number {
  if (!a || !b) return 5;
  const ca = comparable(a);
  const cb = comparable(b);
  if (ca.kind !== cb.kind || ca.value <= 0 || cb.value <= 0) return 5;
  return Math.abs(Math.log(ca.value / cb.value));
}

// ---- Form & release ----

export type Form =
  | 'tablet' | 'capsule'
  | 'syrup' | 'suspension' | 'oral_solution' | 'oral_drops'
  | 'injection'
  | 'cream' | 'ointment' | 'gel' | 'lotion' | 'topical_spray' | 'topical_solution'
  | 'eye_drops' | 'eye_ointment' | 'ear_drops' | 'nasal'
  | 'inhaler' | 'respule' | 'rotacap'
  | 'powder' | 'suppository' | 'patch' | 'shampoo' | 'soap' | 'mouthwash' | 'lozenge' | 'other';

/** Forms within a family share route and are "close" substitutes; across families never match. */
export const FORM_FAMILY: Record<Form, string> = {
  tablet: 'oral_solid', capsule: 'oral_solid', lozenge: 'oral_solid',
  syrup: 'oral_liquid', suspension: 'oral_liquid', oral_solution: 'oral_liquid',
  // Drops are dosed per ml or per drop, syrups per 5 ml: equal mg figures mean different doses.
  oral_drops: 'oral_drops',
  injection: 'injection',
  cream: 'topical', ointment: 'topical', gel: 'topical', lotion: 'topical', topical_spray: 'topical', topical_solution: 'topical',
  eye_drops: 'eye', eye_ointment: 'eye', ear_drops: 'ear', nasal: 'nasal',
  inhaler: 'inhalation', respule: 'inhalation', rotacap: 'inhalation',
  powder: 'oral_powder', suppository: 'rectal', patch: 'transdermal',
  shampoo: 'scalp', soap: 'skin_wash', mouthwash: 'oral_rinse', other: 'other',
};

/**
 * Release behaviour. ER (sustained/extended/prolonged/controlled/modified) is never
 * interchangeable with immediate release. DR, DT and MD are variants of an oral
 * solid at the same dose.
 */
export type Release = 'IR' | 'ER' | 'DR' | 'DT' | 'MD';

const FORM_RULES: [RegExp, Form][] = [
  [/\b(eye|ophthalmic|opthalmic)\b.*\b(ointment)\b|\beye\s*ointment\b/, 'eye_ointment'],
  [/\b(eye|ophthalmic|opthalmic)\b|\beye\/ear\b/, 'eye_drops'],
  [/\b(ear|otic)\b/, 'ear_drops'],
  [/\bnasal\b/, 'nasal'],
  [/\b(respules?|nebuli[sz]\w*)\b/, 'respule'],
  [/\b(rotacaps?|inhalation\s+capsules?)\b/, 'rotacap'],
  [/\b(inhaler|mdi|aerosol|transhaler|autohaler)\b/, 'inhaler'],
  [/\b(inj|injection|infusion|vial|ampoule|amp|prefilled|pfs|iv)\b/, 'injection'],
  [/\b(transdermal|patch)\b/, 'patch'],
  [/\b(suppositor\w*)\b/, 'suppository'],
  [/\bmouth\s*wash\b|\bmouthwash\b|\bgargle\b/, 'mouthwash'],
  [/\bshampoo\b/, 'shampoo'],
  [/\bsoap\b/, 'soap'],
  [/\b(lozenges?|chewing\s+gum)\b/, 'lozenge'],
  [/\bcream\b/, 'cream'],
  [/\b(ointment|oint)\b/, 'ointment'],
  [/\bgel\b/, 'gel'],
  [/\blotion\b/, 'lotion'],
  [/\bspray\b/, 'topical_spray'],
  [/\b(dry\s+syrup|suspension|susp)\b/, 'suspension'],
  [/\b(syrup|syp|syr|elixir|linctus)\b/, 'syrup'],
  [/\b(oral\s+solution|oral\s+liquid|solution|liquid)\b/, 'oral_solution'],
  [/\bdrops?\b/, 'oral_drops'],
  [/\b(capsules?|caps?|softgels?)\b/, 'capsule'],
  [/\b(tablets?|tabs?)\b/, 'tablet'],
  [/\b(sachets?|powder|granules)\b/, 'powder'],
];

const RELEASE_RULES: [RegExp, Release][] = [
  // Note: "MR" is deliberately absent — in Indian brand names it usually means "muscle relaxant".
  [/\b(sustained|extended|prolonged|controlled|modified)[\s-]*release\b|\b(sr|er|xr|cr|pr|xl|cd|la|od)\b|\bretard\b/, 'ER'],
  [/\b(gastro[\s-]*resistant|enteric[\s-]*coated|delayed[\s-]*release|ec|dr)\b/, 'DR'],
  [/\b(mouth\s*dissolving|orally\s*disintegrating|md|odt|melt)\b/, 'MD'],
  [/\b(dispersible|dt)\b/, 'DT'],
];

export function detectForm(text: string): Form {
  const t = text.toLowerCase();
  // Topical solutions: "solution" with a topical hint
  if (/\bsolution\b/.test(t) && /\b(topical|external|skin|scalp|antiseptic|iodine)\b/.test(t)) return 'topical_solution';
  for (const [re, form] of FORM_RULES) if (re.test(t)) return form;
  return 'other';
}

export function detectRelease(text: string): Release {
  const t = text.toLowerCase();
  for (const [re, rel] of RELEASE_RULES) if (re.test(t)) return rel;
  return 'IR';
}

// ---- Product ----

export interface ParsedIngredient {
  key: string;
  saltForm: string | null;
  strength: Strength | null;
  raw: string;
}

export interface ParsedProduct {
  ingredients: ParsedIngredient[];
  form: Form;
  release: Release;
  /**
   * Formulation technology that changes dosing (liposomal, pegylated, lipid complex).
   * Products with different variants are never interchangeable.
   */
  variant: string | null;
  /**
   * True when the source data is known to be missing ingredients — e.g. the brand
   * name says "100mg/325mg/10mg" but only two compositions are listed. Such a
   * product cannot be matched safely.
   */
  incomplete: boolean;
  /** Sorted unique ingredient keys joined with "+": the candidate lookup key */
  setKey: string;
}

function detectVariant(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bpegylated\b|\bpeg[\s-]?(interferon|filgrastim|asparaginase|aspargase)\b/.test(t)) return 'pegylated';
  if (/\blipid\s+complex\b/.test(t)) return 'lipid complex';
  if (/\bliposom/.test(t)) return 'liposomal';
  return null;
}

function finish(ingredients: ParsedIngredient[], form: Form, release: Release, sourceText: string, incomplete = false): ParsedProduct {
  const byKey = new Map<string, ParsedIngredient>();
  for (const ing of ingredients) {
    ing.key = ing.key.replace(/\b(liposomal|pegylated|lipid complex)\b/g, '').replace(/\s+/g, ' ').trim();
    if (ing.key && !byKey.has(ing.key)) byKey.set(ing.key, ing);
  }
  const list = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  return {
    ingredients: list,
    form,
    release,
    variant: detectVariant(sourceText),
    incomplete,
    setKey: list.map((i) => i.key).join('+'),
  };
}

/** Number of strengths written in a brand name like "Aceclofast-SP 100mg/325mg/10mg Tablet". */
function strengthsInName(name: string): number {
  const m = (name || '').match(/\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|iu)?(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|iu)?)+/i);
  return m ? m[0].split('/').length : 0;
}

const LIQUID_FORMS = new Set<Form>(['syrup', 'suspension', 'oral_solution', 'oral_drops', 'injection', 'eye_drops', 'ear_drops', 'nasal', 'topical_solution', 'mouthwash', 'respule']);

/**
 * Parse a branded medicine from the A–Z dataset.
 * @param compositions  e.g. ["Amoxycillin  (500mg)", "Clavulanic Acid (125mg)"]
 * @param name          brand name, used only for form/release hints
 * @param packLabel     e.g. "strip of 10 tablet sr"
 */
export function parseBranded(compositions: (string | null | undefined)[], name: string, packLabel: string): ParsedProduct {
  const hint = `${name || ''} ${packLabel || ''}`;
  const form = detectForm(hint);
  const release = detectRelease(hint);
  const liquid = LIQUID_FORMS.has(form);

  const ingredients: ParsedIngredient[] = [];
  for (const comp of compositions) {
    if (!comp || !comp.trim()) continue;
    const m = comp.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    const rawName = (m ? m[1] : comp).trim();
    const rawStrength = m ? m[2].trim() : '';
    const canon = canonicalIngredient(rawName);
    let strength: Strength | null = null;
    if (rawStrength && !/^na$/i.test(rawStrength)) {
      STRENGTH_RE.lastIndex = 0;
      const s = STRENGTH_RE.exec(rawStrength.toLowerCase());
      if (s) strength = toStrength(s[1], s[2], s[3], s[4], liquid);
    }
    ingredients.push({ ...canon, strength, raw: comp.trim() });
  }
  const incomplete = strengthsInName(name) > ingredients.length;
  return finish(ingredients, form, release, `${hint} ${compositions.join(' ')}`, incomplete);
}

// Words that describe the product, not an ingredient, in PMBJP names.
const DESCRIPTOR_RE = new RegExp(
  String.raw`\b(` +
  [
    'tablets?', 'tabs?', 'capsules?', 'caps?', 'softgels?', 'soft', 'hard', 'gelatin', 'film', 'coated', 'uncoated', 'chewable', 'effervescent',
    'oral', 'suspension', 'dry', 'syrup', 'solution', 'liquid', 'drops?', 'injection', 'infusion', 'intravenous',
    'for', 'reconstitution', 'with', 'water', 'wfi', 'vial', 'ampoule', 'prefilled', 'syringe', 'cream', 'ointment',
    'gel', 'lotion', 'spray', 'topical', 'eye', 'ear', 'nasal', 'ophthalmic', 'opthalmic', 'inhaler', 'inhalation',
    'respules?', 'rotacaps?', 'powder', 'sachets?', 'granules', 'suppositor\\w*', 'transdermal', 'patch', 'shampoo',
    'soap', 'mouthwash', 'mouth', 'wash', 'lozenges?', 'paediatric', 'pediatric', 'adult', 'ip', 'bp', 'usp',
    'sustained', 'extended', 'prolonged', 'controlled', 'modified', 'release', 'gastro', 'resistant', 'enteric',
    'delayed', 'dispersible', 'dissolving', 'orally', 'disintegrating', 'sr', 'er', 'xr', 'cr', 'pr', 'dt', 'md',
    'sugar', 'free', 'flavou?red?', 'in', 'flavour', 'base', 'per', 'each', 'contains', 'nail', 'lacquer', 'plain',
    'solvent', 'and', 'kit', 'external', 'use', 'only',
  ].join('|') +
  String.raw`)\b`,
  'gi',
);

function cleanIngredientText(text: string): string {
  return text
    .replace(/\b(i\.\s?p|b\.\s?p|u\.\s?s\.\s?p)\.?(?=\s|$)/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|gm|g|mg)\b/g, ' ') // stray volumes: "per 5ml", "in 10 ml"
    .replace(/\bml\b/g, ' ')
    .replace(DESCRIPTOR_RE, ' ')
    .replace(/[,+&;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a PMBJP generic product name.
 */
export function parseGeneric(name: string): ParsedProduct {
  let text = (name || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const form = detectForm(text);
  const release = detectRelease(text);
  const liquid = LIQUID_FORMS.has(form);
  let lower = text.toLowerCase();

  // Format "A + B Tablet (50/2.5 Mg)"
  const slash = lower.match(/^(.*?)\(\s*([\d.]+(?:\s*\/\s*[\d.]+)+)\s*(mg|mcg|g|gm|iu)\s*\)\s*$/i);
  if (slash) {
    const names = slash[1].split(/\+|\band\b|,/).map((n) => cleanIngredientText(n)).filter(Boolean);
    const values = slash[2].split('/').map((v) => v.trim());
    if (names.length === values.length) {
      return finish(
        names.map((n, i) => ({ ...canonicalIngredient(n), strength: toStrength(values[i], slash[3], undefined, undefined, liquid), raw: n })),
        form,
        release,
        text,
      );
    }
  }

  // Parentheticals: keep strengths, use "Calcium (Calcium Carbonate)" refinements, drop the rest.
  lower = lower.replace(/(\b[a-z][a-z -]*?)\s*\(([^)]*)\)/g, (_m, outer: string, inner: string) => {
    const innerT = inner.trim();
    if (/^\s*[\d.]+\s*[a-zµ%]/.test(innerT)) return `${outer} ${innerT}`; // "Calcium aspartate (500mg)"
    if (innerT.startsWith(outer.trim().split(' ').pop() || '\u0000')) return innerT; // "Calcium (Calcium Carbonate)"
    return outer; // "(Sustained release)", "(Vitamin B12)", "(ER)"
  });
  lower = lower.replace(/\(([^)]*)\)/g, ' ');

  // Walk strength tokens; the text before each token names that ingredient.
  const ingredients: ParsedIngredient[] = [];
  STRENGTH_RE.lastIndex = 0;
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = STRENGTH_RE.exec(lower))) {
    const segment = cleanIngredientText(lower.slice(cursor, m.index));
    cursor = m.index + m[0].length;
    const strength = toStrength(m[1], m[2], m[3], m[4], liquid);
    if (segment) {
      ingredients.push({ ...canonicalIngredient(segment), strength, raw: segment });
    } else if (ingredients.length && !ingredients[ingredients.length - 1].strength) {
      // "Atorvastatin Tablets IP 10mg": strength follows the descriptor words
      ingredients[ingredients.length - 1].strength = strength;
    }
  }

  // "... 28.5mg Oral Suspension IP per 5ml": every stated mass is per that volume.
  const perVolume = lower.slice(cursor).match(/\bper\s*(\d+(?:\.\d+)?)?\s*ml\b/);
  if (perVolume && liquid) {
    const vol = parseFloat(perVolume[1] || '1') || 1;
    for (const ing of ingredients) {
      if (ing.strength?.kind === 'mass') {
        ing.strength = { kind: 'conc', value: round(ing.strength.value / vol), perDoseMg: ing.strength.value };
      }
    }
  }

  // Names after the last strength have none of their own
  // ("... and Lactic Acid Bacillus Tablets", "Calcium and Vitamin D3 Capsules").
  for (const part of lower.slice(cursor).split(/,|\+|&|\band\b/)) {
    const n = cleanIngredientText(part);
    if (n) ingredients.push({ ...canonicalIngredient(n), strength: null, raw: n });
  }
  return finish(ingredients, form, release, text);
}
