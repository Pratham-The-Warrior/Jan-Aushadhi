// ============================================================
// Pack-size maths for monthly cost estimates
// Mirrors backend/src/shared/utils.ts parsePackQuantity so the
// UI and the API agree on what "one pack" contains.
// ============================================================

const WORD_COUNTS = { one: 1, single: 1, pair: 2, two: 2, three: 3, four: 4, five: 5 };

/**
 * "strip of 15 tablets" → { qty: 15, unit: 'count' }, "10's" → 10 count,
 * "bottle of 100 ml Syrup" → { qty: 100, unit: 'ml' }. null if unclear.
 */
export function parsePackQuantity(label) {
  if (!label) return null;
  const s = String(label).toLowerCase().replace(/,/g, '').trim();

  const ml = s.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (ml) return { qty: parseFloat(ml[1]), unit: 'ml' };
  const g = s.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/);
  if (g) return { qty: parseFloat(g[1]), unit: 'g' };
  const multi = s.match(/(\d+)\s*x\s*(\d+)/);
  if (multi) return { qty: Number(multi[1]) * Number(multi[2]), unit: 'count' };
  const count = s.match(/(\d+)\s*['’]s\b/) || s.match(/\bof\s+(\d+)\b/) || s.match(/^(\d+)\s*(?:tab|cap|sachet|vial|amp|unit|pc|piece|strip|patch)/);
  if (count) return { qty: Number(count[1]), unit: 'count' };
  const word = s.match(/^(one|single|pair|two|three|four|five)\b/);
  if (word) return { qty: WORD_COUNTS[word[1]], unit: 'count' };
  return null;
}

/** Price of one tablet/capsule, or null when the pack isn't counted in units. */
export function pricePerUnit(price, packLabel) {
  const pack = parsePackQuantity(packLabel);
  if (!pack || pack.unit !== 'count' || pack.qty <= 0 || !(price > 0)) return null;
  return price / pack.qty;
}

/**
 * Monthly (30-day) cost of brand vs generic at `perDay` units a day.
 * Returns null when either pack can't be expressed per tablet/capsule.
 */
export function monthlyCosts({ brandPrice, brandPack, genericPrice, genericPack, perDay = 1 }) {
  const b = pricePerUnit(brandPrice, brandPack);
  const g = pricePerUnit(genericPrice, genericPack);
  if (b == null || g == null) return null;
  const units = perDay * 30;
  const brand = b * units;
  const generic = g * units;
  return { brand, generic, saving: Math.max(0, brand - generic), units };
}

/**
 * What the brand costs for the same quantity as one generic pack — the basis
 * the server uses to record an order's saving. Falls back to the brand's pack
 * price when the packs can't be compared unit for unit.
 */
export function brandPriceForGenericPack(brandPrice, brandPack, genericPrice, genericPack) {
  if (!(brandPrice > 0)) return undefined;
  const b = parsePackQuantity(brandPack);
  const g = parsePackQuantity(genericPack);
  const price = b && g && b.unit === g.unit && b.qty > 0 ? (brandPrice / b.qty) * g.qty : brandPrice;
  return Math.max(genericPrice || 0, Math.round(price * 100) / 100);
}

/** Cart line for a search/product result: the generic, plus the brand it replaces. */
export function cartItemFor(branded, generic) {
  const comparable = generic.match_tier && generic.match_tier !== 'SALT_EQUIVALENT';
  return {
    drug_code: generic.drug_code,
    name: generic.name,
    mrp: generic.mrp,
    unit_size: generic.unit_size,
    group_name: generic.group_name,
    branded_name: branded.name,
    // Only like-for-like matches count towards "you save"
    branded_id: comparable ? branded.id : undefined,
    branded_mrp: comparable ? brandPriceForGenericPack(branded.mrp, branded.pack_size, generic.mrp, generic.unit_size) : undefined,
  };
}
