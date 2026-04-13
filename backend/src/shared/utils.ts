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
