// ============================================================
// Shared Utility Functions
// Domain-specific helpers used across multiple modules.
// ============================================================

/**
 * Extract the dosage form from a medicine name string.
 * Uses pattern matching against common pharmaceutical terms.
 *
 * @param name  Medicine name (case-insensitive)
 * @returns Normalized dosage form label
 */
export function extractForm(name: string): string {
  const n = name.toLowerCase();
  if (/\binj(ection)?\b|\bvial\b|\bwfi\b|\binfusion\b/.test(n)) return 'Injection';
  if (/\bsyr(up)?\b/.test(n)) return 'Syrup';
  if (/\bsuspension\b/.test(n)) return 'Suspension';
  if (/\bdrop(s)?\b/.test(n)) return 'Drops';
  if (/\bcream\b|\boint(ment)?\b|\bgel\b|\blotion\b/.test(n)) return 'Topical';
  if (/\bpowder\b/.test(n)) return 'Powder';
  if (/\bcap(sule)?s?\b/.test(n)) return 'Capsule';
  if (/\btab(let)?s?\b/.test(n)) return 'Tablet';
  return 'Other';
}

/** Quantity contained in one pack, normalised to a comparable unit. */
export interface PackQuantity {
  qty: number;
  unit: 'count' | 'ml' | 'g';
}

const WORD_COUNTS: Record<string, number> = { one: 1, single: 1, pair: 2, two: 2, three: 3, four: 4, five: 5 };

/**
 * Parse a pack-size label into a comparable quantity.
 * Handles branded labels ("strip of 10 tablets", "bottle of 100 ml Syrup",
 * "tube of 15 gm Cream") and PMBJP unit sizes ("10's", "10 x 10 Tablets", "30g").
 *
 * @returns null when the label cannot be parsed reliably
 */
export function parsePackQuantity(label: string | null | undefined): PackQuantity | null {
  if (!label) return null;
  const s = label.toLowerCase().replace(/,/g, '').trim();

  const ml = s.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (ml) return { qty: parseFloat(ml[1]), unit: 'ml' };

  const g = s.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/);
  if (g) return { qty: parseFloat(g[1]), unit: 'g' };

  const multi = s.match(/(\d+)\s*x\s*(\d+)/);
  if (multi) return { qty: parseInt(multi[1], 10) * parseInt(multi[2], 10), unit: 'count' };

  const count = s.match(/(\d+)\s*['’]s\b/) || s.match(/\bof\s+(\d+)\b/) || s.match(/^(\d+)\s*(?:tab|cap|sachet|vial|amp|unit|pc|piece|strip|patch)/);
  if (count) return { qty: parseInt(count[1], 10), unit: 'count' };

  const word = s.match(/^(one|single|pair|two|three|four|five)\b/);
  if (word) return { qty: WORD_COUNTS[word[1]], unit: 'count' };

  if (/^(vial|ampoule|amp|bottle|tube)\b/.test(s) && !/\d/.test(s)) return { qty: 1, unit: 'count' };

  return null;
}
