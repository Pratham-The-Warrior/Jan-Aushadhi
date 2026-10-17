// ============================================================
// Medicine Matching — Scoring
// Compares a parsed branded product with candidate PMBJP generics
// that contain exactly the same set of active ingredients, and
// explains the result so patients and pharmacists can trust it.
// ============================================================

import { FORM_FAMILY, strengthDistance, strengthsEqual, type ParsedProduct } from './parse';

/**
 * EXACT_MATCH     same ingredients, strengths, dosage form and release — a true substitute
 * CLOSE_MATCH     same ingredients and strengths; form/salt variant on the same route
 *                 (tablet↔capsule, cream↔gel, dispersible, diclofenac sodium↔potassium)
 * SALT_EQUIVALENT same ingredients and route, but a different or unknown strength,
 *                 or extended- vs immediate-release — NOT a substitute without a doctor
 */
export type MatchTier = 'EXACT_MATCH' | 'CLOSE_MATCH' | 'SALT_EQUIVALENT';

export interface MatchResult {
  tier: MatchTier;
  /** 0–100, higher is a better candidate; used to pick the best of several generics */
  score: number;
  /** Human-readable reasons, e.g. "Different strength: Telmisartan 40mg vs 80mg" */
  notes: string[];
}

const TIER_BASE: Record<MatchTier, number> = { EXACT_MATCH: 90, CLOSE_MATCH: 70, SALT_EQUIVALENT: 30 };

function fmt(s: { kind: string; value: number } | null): string {
  if (!s) return 'unknown';
  const units: Record<string, string> = {
    mass: 'mg', conc: 'mg/ml', pct_ww: '% w/w', pct_wv: '% w/v', pct_vv: '% v/v', iu: ' IU', iu_conc: ' IU/ml', cfu: ' organisms',
  };
  return `${s.value}${units[s.kind] || ''}`;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Score one generic against one branded product.
 * Returns null when they must never be shown as related (different ingredient
 * set, or a different route such as tablet vs injection).
 */
export function scoreMatch(branded: ParsedProduct, generic: ParsedProduct): MatchResult | null {
  if (!branded.setKey || branded.setKey !== generic.setKey) return null;
  // Missing ingredients in the source data: we cannot know what the brand really contains.
  if (branded.incomplete || generic.incomplete) return null;
  // Liposomal / pegylated formulations are dosed differently from conventional ones.
  if (branded.variant !== generic.variant) return null;

  const notes: string[] = [];
  let strengthOk = true;
  let strengthUnknown = false;
  let closeOnly = false;
  let distance = 0;

  // 1. Route / dosage form
  const bFamily = FORM_FAMILY[branded.form];
  const gFamily = FORM_FAMILY[generic.form];
  if (branded.form !== 'other' && generic.form !== 'other') {
    if (bFamily !== gFamily) return null;
    if (branded.form !== generic.form) {
      closeOnly = true;
      notes.push(`Different dosage form: ${branded.form.replace('_', ' ')} vs ${generic.form.replace('_', ' ')}`);
    }
  } else if (branded.form !== generic.form) {
    // One side's form is unknown — cannot confirm it is the same product
    strengthUnknown = true;
    notes.push('Dosage form could not be confirmed');
  }

  // 2. Release behaviour
  const bER = branded.release === 'ER';
  const gER = generic.release === 'ER';
  if (bER !== gER) {
    strengthOk = false;
    notes.push(`Release differs: ${bER ? 'extended-release' : 'immediate-release'} brand vs ${gER ? 'extended-release' : 'immediate-release'} generic`);
  } else if (
    branded.release !== generic.release &&
    // Gastro-resistant coating is intrinsic to drugs like pantoprazole and low-dose
    // aspirin; brand labels rarely state it, so "unstated" vs "DR" is not a difference.
    !(new Set([branded.release, generic.release]).has('DR') && new Set([branded.release, generic.release]).has('IR'))
  ) {
    closeOnly = true;
    notes.push(`Release variant: ${branded.release} vs ${generic.release}`);
  }

  // 3. Strength and salt form, ingredient by ingredient
  const genericByKey = new Map(generic.ingredients.map((i) => [i.key, i]));
  for (const b of branded.ingredients) {
    const g = genericByKey.get(b.key)!;
    if (!b.strength || !g.strength) {
      strengthUnknown = true;
      notes.push(`Strength not stated for ${titleCase(b.key)}`);
    } else if (!strengthsEqual(b.strength, g.strength)) {
      strengthOk = false;
      notes.push(`Different strength: ${titleCase(b.key)} ${fmt(b.strength)} vs ${fmt(g.strength)}`);
    }
    distance += strengthDistance(b.strength, g.strength);
    if (b.saltForm && g.saltForm && b.saltForm !== g.saltForm) {
      closeOnly = true;
      notes.push(`Different salt: ${titleCase(b.key)} ${b.saltForm} vs ${g.saltForm}`);
    }
  }

  let tier: MatchTier;
  if (!strengthOk || strengthUnknown) tier = 'SALT_EQUIVALENT';
  else if (closeOnly) tier = 'CLOSE_MATCH';
  else tier = 'EXACT_MATCH';

  const score = Math.max(0, Math.round(TIER_BASE[tier] - Math.min(distance, 5) * 4 - (closeOnly ? 2 : 0)));
  return { tier, score, notes };
}

/**
 * Pick the best generic for a branded product among candidates with the same
 * ingredient set. Ties go to the earlier candidate (callers pass a stable order).
 */
export function bestMatch<T extends { product: ParsedProduct }>(
  branded: ParsedProduct,
  candidates: T[],
): { candidate: T; result: MatchResult } | null {
  let best: { candidate: T; result: MatchResult } | null = null;
  for (const candidate of candidates) {
    const result = scoreMatch(branded, candidate.product);
    if (result && (!best || result.score > best.result.score)) best = { candidate, result };
  }
  return best;
}
