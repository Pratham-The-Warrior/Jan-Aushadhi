// ============================================================
// Search API — Medicine search and autocomplete endpoints
// Maps to backend Search module
// ============================================================

import { apiGet } from './api-client';

const SAMPLE_MEDICINES = [
  {
    id: 101,
    branded: {
      id: 101,
      name: 'Crocin 650 Advance Tablet',
      manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
      mrp: 35.50,
      pack_size: '15 tablets',
      composition1: 'Paracetamol (650mg)',
      composition2: null,
      form: 'Tablet',
    },
    generic: {
      drug_code: 'D001',
      name: 'Paracetamol Tablets IP 650mg',
      mrp: 5.25,
      unit_size: '10 x 10 Tablets',
      group_name: 'Analgesics & Antipyretics',
      match_tier: 'EXACT_MATCH',
    },
    savings: {
      absolute: 30.25,
      percentage: 85,
    },
  },
  {
    id: 102,
    branded: {
      id: 102,
      name: 'Telma 40 Tablet',
      manufacturer: 'Glenmark Pharmaceuticals Ltd',
      mrp: 145.00,
      pack_size: '30 tablets',
      composition1: 'Telmisartan (40mg)',
      composition2: null,
      form: 'Tablet',
    },
    generic: {
      drug_code: 'D045',
      name: 'Telmisartan Tablets IP 40mg',
      mrp: 16.50,
      unit_size: '10 x 10 Tablets',
      group_name: 'Cardiovascular Drugs',
      match_tier: 'EXACT_MATCH',
    },
    savings: {
      absolute: 128.50,
      percentage: 89,
    },
  },
  {
    id: 103,
    branded: {
      id: 103,
      name: 'Metfree-G 2 Forte Tablet',
      manufacturer: 'Alkem Laboratories Ltd',
      mrp: 178.00,
      pack_size: '10 tablets',
      composition1: 'Glimepiride (2mg) + Metformin (1000mg)',
      composition2: null,
      form: 'Tablet',
    },
    generic: {
      drug_code: 'D112',
      name: 'Glimepiride & Metformin Tablets',
      mrp: 24.00,
      unit_size: '10 x 10 Tablets',
      group_name: 'Anti-Diabetic Drugs',
      match_tier: 'SALT_EQUIVALENT',
    },
    savings: {
      absolute: 154.00,
      percentage: 87,
    },
  },
  {
    id: 104,
    branded: {
      id: 104,
      name: 'Ultracet Semi Pain Relief Tablet',
      manufacturer: 'Janssen Pharmaceuticals',
      mrp: 185.00,
      pack_size: '15 tablets',
      composition1: 'Tramadol Hydrochloride (18.75mg) + Paracetamol (162.5mg)',
      composition2: null,
      form: 'Tablet',
    },
    generic: null,
    savings: {
      absolute: 0,
      percentage: 0,
    },
  },
  {
    id: 105,
    branded: {
      id: 105,
      name: 'SkinShine Triple Combination Cream',
      manufacturer: 'Cadila Healthcare Ltd',
      mrp: 240.00,
      pack_size: '15g tube',
      composition1: 'Hydroquinone (2% w/w) + Tretinoin (0.025% w/w) + Mometasone Furoate (0.1% w/w)',
      composition2: null,
      form: 'Topical',
    },
    generic: null,
    savings: {
      absolute: 0,
      percentage: 0,
    },
  },
];

/**
 * Full-text medicine search with generic matching.
 * @param {string} query - Search query
 * @returns {Promise<Array>} Discovery results with savings
 */
export async function searchMedicines(query) {
  try {
    return await apiGet(`/api/v1/search?query=${encodeURIComponent(query)}`);
  } catch (err) {
    console.warn('Backend search API unreachable, using resilient sample medicine data:', err.message);
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    return SAMPLE_MEDICINES.filter(
      (m) =>
        m.branded.name.toLowerCase().includes(q) ||
        (m.branded.composition1 && m.branded.composition1.toLowerCase().includes(q)) ||
        (m.generic && m.generic.name.toLowerCase().includes(q)),
    );
  }
}

/**
 * Lightweight autocomplete suggestions.
 * @param {string} query - Partial search query (min 2 chars)
 * @returns {Promise<Array>} Suggestion list
 */
export async function suggestMedicines(query) {
  try {
    return await apiGet(`/api/v1/suggest?q=${encodeURIComponent(query)}`);
  } catch {
    const q = (query || '').toLowerCase().trim();
    return SAMPLE_MEDICINES.filter((m) => m.branded.name.toLowerCase().includes(q)).map((m) => ({
      id: m.id,
      name: m.branded.name,
      manufacturer: m.branded.manufacturer,
      mrp: m.branded.mrp,
      has_generic: Boolean(m.generic),
    }));
  }
}
