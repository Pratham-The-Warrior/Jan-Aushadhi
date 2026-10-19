// ============================================================
// Search query understanding & ranking
// Run: npm test --workspace=janaushadhi-backend
// The end-to-end benchmark is `npm run search:eval`.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editDistance, normalizeText, parseQuery, rank, relevance } from './query';

test('normalizeText splits glued brand + strength and strips punctuation', () => {
  assert.equal(normalizeText('Dolo650'), 'dolo 650');
  assert.equal(normalizeText('Telma-40'), 'telma 40');
  assert.equal(normalizeText('Omez 20mg Capsule'), 'omez 20 mg capsule');
  assert.equal(normalizeText('Taxim-O 200'), 'taxim o 200');
  assert.equal(normalizeText('Amlong 2.5 Tablet'), 'amlong 2.5 tablet');
  assert.equal(normalizeText('Tab. Dolo'), 'tab dolo');
  // Short letter runs stay attached: vitamins
  assert.equal(normalizeText('Vitamin D3'), 'vitamin d3');
  assert.equal(normalizeText('B12'), 'b12');
});

test('parseQuery drops units, moves dosage forms to the end and expands synonyms', () => {
  assert.deepEqual(parseQuery('Tab Dolo 650mg'), { terms: ['dolo', '650'], forms: ['tablet'], text: 'dolo 650 tablet' });
  assert.equal(parseQuery('thyronorm 50 mcg').text, 'thyronorm 50');
  assert.equal(parseQuery('amoxicillin').text, 'amoxycillin');
  assert.equal(parseQuery('cholecalciferol').text, 'vitamin d3');
  assert.equal(parseQuery('syp ascoril ls').text, 'ascoril ls syrup');
  assert.deepEqual(parseQuery('  ').terms, []);
});

test('editDistance counts swaps as one edit and stops early', () => {
  assert.equal(editDistance('dolo', 'dollo'), 1);
  assert.equal(editDistance('telma', 'tlema'), 1);
  assert.equal(editDistance('glycomit', 'glycomet'), 1);
  assert.equal(editDistance('paracetamol', 'ibuprofen', 2), 3);
});

const item = (name: string, composition1 = '', extra: Partial<{ familySize: number; hasGeneric: boolean }> = {}, engineRank = 0) => ({
  name, composition1, engineRank, ...extra,
});

test('the brand typed first outranks products that only share the salt', () => {
  const q = parseQuery('atorva 10');
  assert.ok(relevance(q, item('Atorva Tablet', 'Atorvastatin (10mg)')) > relevance(q, item('Lipvas 10 Tablet', 'Atorvastatin (10mg)')));
});

test('fewer extra words wins: "telma 40" → Telma 40 before Telma-AM H 40', () => {
  const q = parseQuery('telma 40');
  const [first] = rank(q, [
    item('Telma-AM H 40 Tablet', 'Telmisartan (40mg)', {}, 0),
    item('Telma H Tablet', 'Telmisartan (40mg)', {}, 1),
    item('Telma 40 Tablet', 'Telmisartan (40mg)', {}, 2),
  ]);
  assert.equal(first.name, 'Telma 40 Tablet');
});

test('a typo in the brand still beats a different brand with a shared prefix', () => {
  const q = parseQuery('dollo 650');
  const [first] = rank(q, [
    item('Dollos S Tablet', 'Paracetamol (650mg)', {}, 0),
    item('Dolo 650 Tablet', 'Paracetamol (650mg)', {}, 1),
  ]);
  assert.equal(first.name, 'Dolo 650 Tablet');
});

test('strengths never match approximately', () => {
  const q = parseQuery('dolo 625');
  assert.ok(relevance(q, item('Dolo 650 Tablet', 'Paracetamol (650mg)')) < relevance(q, item('Dolo 625 Tablet', 'Paracetamol (625mg)')));
});

test('the word being typed matches as a prefix', () => {
  const q = parseQuery('augmentin 6');
  const [first] = rank(q, [
    item('Augmentin Duo Oral Suspension', 'Amoxycillin (200mg)', {}, 0),
    item('Augmentin 625 Duo Tablet', 'Amoxycillin (500mg)', {}, 1),
  ]);
  assert.equal(first.name, 'Augmentin 625 Duo Tablet');
});

test('salt searches score on the composition', () => {
  const q = parseQuery('telmisartan 40');
  assert.ok(relevance(q, item('Telma 40 Tablet', 'Telmisartan (40mg)')) > relevance(q, item('Telma 20 Tablet', 'Telmisartan (20mg)')));
});
