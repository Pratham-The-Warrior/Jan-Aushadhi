// ============================================================
// Search Module — Query understanding & ranking
// Engine-agnostic: the same normalisation is applied to the query and
// to indexed names, and the same ranking orders candidates whether they
// came from Meilisearch or the PostgreSQL fallback.
// ============================================================

/** Dosage-form words: useful to narrow results, but never required to match. */
const FORM_WORDS = new Set([
  'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'suspension', 'injection', 'drops', 'drop',
  'cream', 'gel', 'ointment', 'solution', 'sachet', 'spray', 'inhaler', 'lotion', 'powder',
  'liquid', 'strip', 'kit', 'oral', 'eye', 'ear', 'nasal', 'chewable', 'soap', 'shampoo',
]);

/** Prescription shorthand → the word used in product names. */
const ABBREVIATIONS: Record<string, string> = {
  tab: 'tablet', tabs: 'tablet', cap: 'capsule', caps: 'capsule', syp: 'syrup', syr: 'syrup',
  susp: 'suspension', inj: 'injection', oint: 'ointment', vit: 'vitamin',
};

/** Units are dropped: "Atorva 10mg" and "Atorva 10" mean the same thing. */
const UNITS = new Set(['mg', 'mcg', 'ml', 'g', 'gm', 'gms', 'iu', 'kg', 'w', 'v']);

/**
 * International / US drug names → the Indian (BAN) names used in the catalogue.
 * Only terms that appear in queries but never in the data are listed.
 */
const SYNONYMS: Record<string, string> = {
  amoxicillin: 'amoxycillin',
  acetaminophen: 'paracetamol',
  albuterol: 'salbutamol',
  levothyroxine: 'thyroxine',
  cholecalciferol: 'vitamin d3',
  frusemide: 'furosemide',
  clavulanate: 'clavulanic',
  cephalexin: 'cefalexin',
  lignocaine: 'lidocaine',
  glyburide: 'glibenclamide',
  aluminum: 'aluminium',
};

/**
 * Lower-case, strip punctuation and split glued words and numbers the way
 * people type them: "Dolo650" → "dolo 650", "Telma-40" → "telma 40",
 * "10mg" → "10 mg". Short letter runs stay attached ("D3", "B12").
 */
export function normalizeText(raw: string): string {
  return (raw || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s]/gu, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/(\p{L}{2,})(\d)/gu, '$1 $2')
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ParsedQuery {
  /** Words that should match (brand, salt, strength). */
  terms: string[];
  /** Dosage-form words the user typed ("tablet", "syrup"). */
  forms: string[];
  /** Query to send to a search engine: terms first, then forms. */
  text: string;
}

export function parseQuery(raw: string): ParsedQuery {
  const terms: string[] = [];
  const forms: string[] = [];
  for (let word of normalizeText(raw).split(' ')) {
    if (!word) continue;
    word = ABBREVIATIONS[word] ?? word;
    for (const w of (SYNONYMS[word] ?? word).split(' ')) {
      if (UNITS.has(w)) continue;
      const bucket = FORM_WORDS.has(w) ? forms : terms;
      if (!bucket.includes(w)) bucket.push(w);
    }
  }
  return { terms, forms, text: [...terms, ...forms].join(' ') };
}

const isNumber = (w: string) => /^\d+(\.\d+)?$/.test(w);

/** Damerau–Levenshtein distance with an early exit once it exceeds `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/**
 * How well one query word matches one indexed word, 0..1.
 * Strengths must match exactly: "650" never matches "625" or "6500".
 */
function wordScore(q: string, w: string, isLastWord: boolean): number {
  if (q === w) return 1;
  if (isNumber(q) || isNumber(w)) return isLastWord && w.startsWith(q) ? 0.85 : 0;
  if (w.startsWith(q)) {
    if (isLastWord) return 0.95; // still typing: "telm" → "telma"
    if (q.length >= 3) return 0.75;
  }
  const allowed = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
  if (allowed === 0) return 0;
  const d = editDistance(q, w, allowed);
  if (d <= allowed) return d === 1 ? 0.7 : 0.5;
  // A typo in a word that is still being typed: "glycomi" → "glycomet"
  if (isLastWord && q.length >= 4 && w.length > q.length && editDistance(q, w.slice(0, q.length), 1) <= 1) return 0.6;
  return 0;
}

function bestScore(q: string, words: string[], isLastWord: boolean): number {
  let best = 0;
  for (const w of words) {
    const s = wordScore(q, w, isLastWord);
    if (s > best) best = s;
    if (best === 1) break;
  }
  return best;
}

export interface Rankable {
  name: string;
  composition1?: string | null;
  composition2?: string | null;
  /** Lower = earlier in the engine's own ranking. */
  engineRank: number;
  /** Size of the brand family ("Telma", "Telma H", "Telma AM"…): a popularity proxy. */
  familySize?: number;
  hasGeneric?: boolean;
}

const ORAL_FORMS = new Set(['tablet', 'tablets', 'capsule', 'capsules']);
const RELEASE_WORDS = new Set(['sr', 'er', 'xr', 'pr', 'cr', 'od', 'dt', 'md', 'mr', 'ds', 'xl', 'la']);

/**
 * Relevance of one product to the query. Rewards matching the brand name
 * over only the salt, the brand being the first word, and fewer unrelated
 * extra words ("Telma 40" before "Telma-AM H 40" for "telma 40").
 */
export function relevance(query: ParsedQuery, item: Rankable): number {
  const { terms, forms } = query;
  if (terms.length === 0) return 0;
  const nameWords = normalizeText(item.name).split(' ');
  const compWords = normalizeText(`${item.composition1 ?? ''} ${item.composition2 ?? ''}`).split(' ').filter(Boolean);

  let total = 0;
  const used = new Set<number>();
  terms.forEach((t, i) => {
    const last = i === terms.length - 1 && forms.length === 0;
    let best = 0;
    let bestIdx = -1;
    nameWords.forEach((w, idx) => {
      const s = wordScore(t, w, last);
      if (s > best) { best = s; bestIdx = idx; }
    });
    // A strength in the salt ("Atorvastatin (10mg)") counts almost as much as one in
    // the name; a salt name counts less than the brand.
    const comp = (/^\d/.test(t) ? 0.95 : 0.6) * bestScore(t, compWords, last);
    if (comp > best) { best = comp; bestIdx = -1; }
    if (bestIdx >= 0) used.add(bestIdx);
    total += best;
  });
  let score = total / terms.length;

  // The brand is what people type first: "atorva 10" → Atorva …
  const lead = wordScore(terms[0], nameWords[0], terms.length === 1 && forms.length === 0);
  if (lead >= 0.5) score += 0.25 * lead;

  if (forms.length > 0) {
    for (const f of forms) if (nameWords.includes(f)) score += 0.05;
  } else if (nameWords.some((w) => ORAL_FORMS.has(w))) {
    // No form typed: most searches are for tablets and capsules, not drops or creams
    score += 0.02;
  }

  // Penalise unrelated extra words in the name; strengths and release types count less
  let extra = 0;
  nameWords.forEach((w, idx) => {
    if (used.has(idx) || FORM_WORDS.has(w) || UNITS.has(w)) return;
    extra += RELEASE_WORDS.has(w) || isNumber(w) ? 0.01 : 0.03;
  });
  score -= Math.min(extra, 0.15);

  if (item.familySize && item.familySize > 1) score += 0.02 * Math.min(Math.log2(item.familySize), 6);
  if (item.hasGeneric) score += 0.01;
  return Math.round(score * 1000) / 1000;
}

/** Order candidates by relevance; ties keep the engine's order. */
export function rank<T extends Rankable>(query: ParsedQuery, items: T[]): (T & { score: number })[] {
  return items
    .map((item) => ({ ...item, score: relevance(query, item) }))
    .sort((a, b) => b.score - a.score || a.engineRank - b.engineRank);
}
