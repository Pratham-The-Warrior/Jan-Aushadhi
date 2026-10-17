// ============================================================
// Search Module — Meilisearch indexer
// Builds the medicines index from PostgreSQL (the source of truth),
// so search results always carry the same ids, names and generic
// matches as the rest of the API. Rebuilds go into a temporary index
// that is swapped in when complete: search never sees a half-built index.
// ============================================================

import { getMeiliClient } from '../../shared/infra/meilisearch';
import { queryDB } from '../../shared/infra/database';
import { APP_CONSTANTS } from '../../shared/constants';
import { normalizeText } from './query';
import { familyKey, loadBrandFamilies } from './brand-families';

export const MEDICINES_INDEX = APP_CONSTANTS.MEILI_MEDICINES_INDEX;

/**
 * Bump when the settings or document shape change; a running server
 * notices the mismatch at startup and rebuilds in the background.
 */
export const INDEX_VERSION = 3;

export const INDEX_SETTINGS = {
  // Normalised copies are searched ("Omez 20mg" → "omez 20 mg") so typed and
  // stored forms line up; the original fields are only displayed.
  searchableAttributes: ['search_name', 'search_comp', 'manufacturer'],
  filterableAttributes: ['salt_hash', 'salt_strength_hash', 'has_generic', 'index_version'],
  sortableAttributes: ['mrp', 'popularity'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness', 'popularity:desc', 'has_generic:desc'],
  // The catalogue lists many brands more than once (other packs and sellers).
  distinctAttribute: 'name_key',
  // Indian brand names are short ("Dolo", "Pan"): allow a typo from 4 letters.
  typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 7 } },
  pagination: { maxTotalHits: 200 },
};

const BATCH = 10_000;

async function countIndexable(): Promise<number> {
  const res = await queryDB('SELECT COUNT(*)::int AS n FROM branded_meds WHERE NOT is_discontinued');
  return res.rows[0]?.n ?? 0;
}

/** True when the live index has this version's settings and roughly the database's row count. */
export async function medicinesIndexIsCurrent(): Promise<boolean> {
  try {
    const index = getMeiliClient().index(MEDICINES_INDEX);
    const [stats, probe, expected] = await Promise.all([
      index.getStats(),
      index.search('', { limit: 1, filter: `index_version = ${INDEX_VERSION}` }),
      countIndexable(),
    ]);
    return probe.hits.length > 0 && stats.numberOfDocuments >= expected * 0.99;
  } catch {
    return false;
  }
}

export async function buildMedicinesIndex(log: (msg: string) => void = console.log): Promise<number> {
  const client = getMeiliClient();
  const tmp = `${MEDICINES_INDEX}_build`;
  const families = await loadBrandFamilies();

  await client.deleteIndex(tmp).waitTask().catch(() => undefined);
  await client.createIndex(tmp, { primaryKey: 'id' }).waitTask();
  await client.index(tmp).updateSettings(INDEX_SETTINGS).waitTask();

  let lastId = 0;
  let total = 0;
  const tasks = [];
  for (;;) {
    const res = await queryDB(
      `SELECT b.id, b.name, b.mrp::float AS mrp, b.manufacturer, b.pack_size_label AS pack_size,
              b.composition1, b.composition2, b.salt_hash, b.salt_strength_hash,
              (m.branded_id IS NOT NULL) AS has_generic
         FROM branded_meds b
         LEFT JOIN medicine_matches m ON m.branded_id = b.id
        WHERE NOT b.is_discontinued AND b.id > $1
        ORDER BY b.id
        LIMIT $2`,
      [lastId, BATCH],
    );
    if (res.rows.length === 0) break;
    lastId = res.rows[res.rows.length - 1].id;

    const docs = res.rows.map((r: any) => ({
      ...r,
      search_name: normalizeText(r.name),
      search_comp: normalizeText(`${r.composition1 ?? ''} ${r.composition2 ?? ''}`),
      name_key: normalizeText(r.name),
      popularity: families.get(familyKey(r.name)) ?? 1,
      index_version: INDEX_VERSION,
    }));
    tasks.push(await client.index(tmp).addDocuments(docs));
    total += docs.length;
  }

  await client.tasks.waitForTasks(tasks, { timeout: 15 * 60_000 });

  // Swap the finished index in. The live index must exist for the swap.
  await client.createIndex(MEDICINES_INDEX, { primaryKey: 'id' }).waitTask().catch(() => undefined);
  // `rename` is only understood by newer Meilisearch servers; a plain swap works everywhere.
  await client.swapIndexes([{ indexes: [MEDICINES_INDEX, tmp] } as any]).waitTask();
  await client.deleteIndex(tmp).waitTask().catch(() => undefined);

  log(`🔍 Meilisearch: indexed ${total} medicines (index v${INDEX_VERSION}).`);
  return total;
}
