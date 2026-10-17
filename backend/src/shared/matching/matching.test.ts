// ============================================================
// Medicine Matching — Gold-standard cases
// Real strings from the branded A–Z dataset and the PMBJP product
// list. Each expectation was checked by hand; add a case here for
// every matching bug found in production before fixing it.
// Run: npm test --workspace=janaushadhi-backend
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalIngredient, parseBranded, parseGeneric, scoreMatch } from './index';

type Case = {
  name: string;
  brand: [string[], string, string]; // compositions, brand name, pack label
  generic: string;
  expect: 'EXACT_MATCH' | 'CLOSE_MATCH' | 'SALT_EQUIVALENT' | null;
};

const CASES: Case[] = [
  // ---- Exact substitutes ----
  { name: 'single salt tablet', brand: [['Telmisartan (40mg)'], 'Telma 40 Tablet', 'strip of 15 tablets'], generic: 'Telmisartan Tablets IP 40mg', expect: 'EXACT_MATCH' },
  { name: 'salt suffix on generic only', brand: [['Metformin (500mg)'], 'Glycomet 500 Tablet', 'strip of 20 tablets'], generic: 'Metformin Hydrochloride Tablets IP 500 mg', expect: 'EXACT_MATCH' },
  { name: 'two-salt combo, clavulanate spelling', brand: [['Amoxycillin  (500mg) ', '  Clavulanic Acid (125mg)'], 'Augmentin 625 Duo Tablet', 'strip of 10 tablets'], generic: 'Amoxycillin 500mg and Potassium Clavulanate 125mg Tablets IP', expect: 'EXACT_MATCH' },
  { name: 'suspension: brand per-dose mg vs generic per 5ml (pack volume ignored)', brand: [['Amoxycillin (200mg)', 'Clavulanic Acid (28.5mg)'], 'Augmentin Duo Oral Suspension', 'bottle of 30 ml Oral Suspension'], generic: 'Amoxycillin 200mg and Potassium Clavulanate 28.5mg Oral Suspension IP per 5ml', expect: 'EXACT_MATCH' },
  { name: 'syrup concentration mg/5ml both sides', brand: [['Hydroxyzine (10mg/5ml)'], 'Atarax Syrup', 'bottle of 100 ml Syrup'], generic: 'Hydroxyzine Hydrochloride Syrup 10mg per 5ml', expect: 'EXACT_MATCH' },
  { name: 'sustained release on both', brand: [['Metformin (500mg)'], 'Glycomet SR 500 Tablet', 'strip of 10 tablet sr'], generic: 'Metformin Hydrochloride Sustained Release Tablets IP 500 mg', expect: 'EXACT_MATCH' },
  { name: 'combo written A + B (x/y Mg)', brand: [['Losartan (50mg)', 'Amlodipine (5mg)'], 'Losar A Tablet', 'strip of 10 tablets'], generic: 'Losartan + Amlodipine Tablet (50/5 Mg)', expect: 'EXACT_MATCH' },
  { name: 'cream % w/w', brand: [['Miconazole (2% w/w)'], 'Daktarin Cream', 'tube of 15 gm Cream'], generic: 'Miconazole Nitrate Cream IP 2% w/w', expect: 'EXACT_MATCH' },
  { name: 'eye drops % w/v', brand: [['Azithromycin (1% w/v)'], 'Azicip Eye Drop', 'bottle of 5 ml Eye Drop'], generic: 'Azithromycin Eye Drops 1% w/v', expect: 'EXACT_MATCH' },
  { name: 'grams to mg', brand: [['Paracetamol (1gm)'], 'Crocin 1000 Tablet', 'strip of 10 tablets'], generic: 'Paracetamol Tablets IP 1000 Mg', expect: 'EXACT_MATCH' },
  { name: 'nicoumalone alias', brand: [['Acenocoumarol (2mg)'], 'Acitrom 2 Tablet', 'strip of 30 tablets'], generic: 'Nicoumalone (Acenocoumarol) 2mg Tablets', expect: 'EXACT_MATCH' },

  // ---- Close matches (same dose, variant) ----
  { name: 'capsule vs tablet', brand: [['Amoxycillin (500mg)'], 'Mox 500 Tablet', 'strip of 10 tablets'], generic: 'Amoxycillin Capsules IP 500mg', expect: 'CLOSE_MATCH' },
  { name: 'diclofenac potassium vs sodium', brand: [['Diclofenac Potassium (50mg)', 'Paracetamol (325mg)'], 'Dolokind Plus', 'strip of 10 tablets'], generic: 'Diclofenac Sodium 50mg and Paracetamol 325mg Tablets IP', expect: 'CLOSE_MATCH' },

  // ---- Same salts, not a substitute ----
  { name: 'different strength', brand: [['Telmisartan (40mg)'], 'Telma 40 Tablet', 'strip of 15 tablets'], generic: 'Telmisartan Tablets IP 80mg', expect: 'SALT_EQUIVALENT' },
  { name: 'strength NA is never exact', brand: [['Sodium Chloride (NA)'], 'Dns Solution', 'bottle of 500 ml Infusion'], generic: 'Sodium Chloride Injection IP 0.9%w/v', expect: 'SALT_EQUIVALENT' },
  { name: 'IR brand vs prolonged-release generic', brand: [['Levodopa (100mg)', 'Carbidopa (10mg)'], 'Syndopa 110 Tablet', 'strip of 10 tablets'], generic: 'Carbidopa 10mg and Levodopa 100mg Prolonged Release Tablets IP', expect: 'SALT_EQUIVALENT' },
  { name: '5% vs 0.9% saline', brand: [['Sodium Chloride (5%)'], 'D 5% Infusion', 'bottle of 500 ml Infusion'], generic: 'Sodium Chloride Injection IP 0.9%w/v', expect: 'SALT_EQUIVALENT' },

  // ---- Must never match ----
  { name: 'potassium chloride is not sodium chloride', brand: [['Potassium Chloride (500mg/5ml)'], 'K-Cl Syrup', 'bottle of 200 ml Syrup'], generic: 'Sodium Chloride Injection IP 0.9%w/v', expect: null },
  { name: 'combo is not its single salt', brand: [['Paracetamol (500mg)', 'Caffeine (30mg)'], 'Crocin Pain Relief', 'strip of 15 tablets'], generic: 'Paracetamol Tablets IP 500 mg', expect: null },
  { name: 'tablet never matches injection', brand: [['Ondansetron (4mg)'], 'Emeset 4 Tablet', 'strip of 10 tablets'], generic: 'Ondansetron Injection IP 2mg per ml', expect: null },
  { name: 'eye drops never match oral', brand: [['Azithromycin (100mg/5ml)'], 'Azee Oral Suspension', 'bottle of 15 ml Oral Suspension'], generic: 'Azithromycin Eye Drops 1% w/v', expect: null },
  { name: 'paracetamol/acetaminophen alternative names', brand: [['Paracetamol/Acetaminophen  (325mg)', 'Tramadol (37.5mg)'], 'Ultram 325 mg/37.5 mg Tablet', 'strip of 10 tablets'], generic: 'Paracetamol 325mg and Tramadol 37.5mg Tablets', expect: 'EXACT_MATCH' },
  { name: 'I.P with dots and soft gelatin descriptors', brand: [['Nintedanib (100mg)'], 'Nintena 100mg Soft Gelatin Capsule', 'strip of 10 soft gelatin capsules'], generic: 'Nintedanib Soft Gelatin Capsules 100mg', expect: 'EXACT_MATCH' },
  { name: 'PPI: unstated coating vs gastro-resistant generic is exact', brand: [['Pantoprazole (40mg)'], 'Pan 40 Tablet', 'strip of 15 tablets'], generic: 'Pantoprazole Gastro Resistant Tablets IP 40 mg', expect: 'EXACT_MATCH' },
  { name: 'mouth-dissolving vs plain tablet is close, not exact', brand: [['Ondansetron (4mg)'], 'Emeset 4 Tablet MD', 'strip of 10 tablet md'], generic: 'Ondansetron Tablets IP 4 mg', expect: 'CLOSE_MATCH' },
  { name: 'conventional amphotericin is not liposomal', brand: [['Amphotericin B (50mg)'], 'Ampholyn 50mg Injection', 'vial of 1 Injection'], generic: 'Liposomal Amphotericin B Injection 50 mg per Vial', expect: null },
  { name: 'liposomal brand matches liposomal generic', brand: [['Amphotericin B (50mg)'], 'Phosomal 50mg Liposomal Injection', 'vial of 1 Injection'], generic: 'Liposomal Amphotericin B Injection 50 mg per Vial', expect: 'EXACT_MATCH' },
  { name: 'truncated composition (3 strengths in name, 2 listed) never matches', brand: [['Aceclofenac (100mg)', 'Paracetamol (325mg)'], 'Aceclofast -SP 100mg/325mg/10mg Tablet', 'strip of 10 tablets'], generic: 'Aceclofenac 100mg and Paracetamol 325mg Tablets', expect: null },
  { name: 'syrup never matches oral drops', brand: [['Phenylephrine (5mg)', 'Chlorpheniramine Maleate (2mg)'], 'Adicof Syrup', 'bottle of 100 ml Syrup'], generic: 'Phenylephrine Hydrochloride 5mg and Chlorpheniramine Maleate 2mg Drops', expect: null },
  { name: 'brand name "Peg-NT" is not pegylated', brand: [['Pregabalin (75mg)', 'Nortriptyline (10mg)'], 'Peg-NT Tablet', 'strip of 15 tablets'], generic: 'Pregabalin 75mg and Nortriptyline 10mg Tablets', expect: 'EXACT_MATCH' },
  { name: 'N-acetylcysteine alias', brand: [['Taurine (500mg)', 'Acetylcysteine (150mg)'], 'Kdfit Tablet', 'strip of 10 tablets'], generic: 'N-Acetylcysteine 150Mg And Taurine 500Mg Tablets', expect: 'EXACT_MATCH' },
  { name: 'MR in brand name means muscle relaxant, not modified release', brand: [['Aceclofenac (100mg)', 'Paracetamol (325mg)'], 'Zerodol MR Tablet', 'strip of 10 tablets'], generic: 'Aceclofenac 100mg and Paracetamol 325mg Tablets', expect: 'EXACT_MATCH' },
];

for (const c of CASES) {
  test(`match: ${c.name}`, () => {
    const b = parseBranded(...c.brand);
    const g = parseGeneric(c.generic);
    const r = scoreMatch(b, g);
    assert.equal(r?.tier ?? null, c.expect, `brand=${JSON.stringify(b)}\ngeneric=${JSON.stringify(g)}\nresult=${JSON.stringify(r)}`);
  });
}

test('canonical: ions that are the drug are kept', () => {
  assert.equal(canonicalIngredient('Potassium Chloride').key, 'potassium chloride');
  assert.equal(canonicalIngredient('Sodium Chloride').key, 'sodium chloride');
  assert.notEqual(canonicalIngredient('Potassium Chloride').key, canonicalIngredient('Sodium Chloride').key);
});

test('canonical: salt suffixes are separated from the active moiety', () => {
  assert.deepEqual(canonicalIngredient('Diclofenac Sodium'), { key: 'diclofenac', saltForm: 'sodium' });
  assert.deepEqual(canonicalIngredient('Atorvastatin Calcium'), { key: 'atorvastatin', saltForm: 'calcium' });
  assert.equal(canonicalIngredient('Potassium Clavulanate').key, 'clavulanate');
  assert.equal(canonicalIngredient('Clavulanic Acid').key, 'clavulanate');
  assert.equal(canonicalIngredient('Sodium Valproate').key, 'valproate');
});

test('generic parsing: multi-ingredient with trailing strengthless ingredient', () => {
  const g = parseGeneric('Cefixime 200 mg, Cloxacillin 500 mg (ER) and Lactic Acid Bacillus Tablets');
  assert.deepEqual(g.ingredients.map((i) => i.key), ['cefixime', 'cloxacillin', 'lactobacillus sporogenes']);
  assert.equal(g.ingredients.find((i) => i.key === 'lactobacillus sporogenes')!.strength, null);
});

test('generic parsing: parenthetical salt source refines the ingredient', () => {
  const g = parseGeneric('Calcium (Calcium Carbonate) 1250mg, Vitamin D3 2000 IU Tablets');
  assert.deepEqual(g.ingredients.map((i) => i.key), ['calcium carbonate', 'cholecalciferol']);
});
