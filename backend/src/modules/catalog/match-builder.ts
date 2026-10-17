// ============================================================
// Catalog Module — Match Builder
// Runs the structured matcher over the whole catalogue and stores
// the best PMBJP generic for every branded medicine in
// medicine_matches. Pharmacist-reviewed rows are never overwritten.
// ============================================================

import { getPool, queryDB } from '../../shared/infra/database';
import { bestMatch, parseBranded, parseGeneric, type ParsedProduct } from '../../shared/matching';

/** Bump when matching rules change so stale rows are easy to find. */
export const MATCHER_VERSION = '2.0.0';

const BATCH_SIZE = 1000;

interface GenericCandidate {
  id: number;
  product: ParsedProduct;
}

export interface MatchBuildSummary {
  branded: number;
  matched: number;
  byTier: Record<string, number>;
  ms: number;
}

export async function buildMedicineMatches(log: (msg: string) => void = console.log): Promise<MatchBuildSummary> {
  const started = Date.now();

  const generics = await queryDB(
    `SELECT id, generic_name FROM generic_meds
     WHERE group_name IS DISTINCT FROM 'Surgical & Medical Consumables'
     ORDER BY id`,
  );
  const bySet = new Map<string, GenericCandidate[]>();
  for (const row of generics.rows) {
    const product = parseGeneric(row.generic_name);
    if (!product.setKey) continue;
    const list = bySet.get(product.setKey) || [];
    list.push({ id: row.id, product });
    bySet.set(product.setKey, list);
  }
  log(`🧪 Parsed ${generics.rows.length} generics into ${bySet.size} ingredient sets`);

  const branded = await queryDB(
    `SELECT id, name, pack_size_label, composition1, composition2 FROM branded_meds`,
  );

  const rows: unknown[][] = [];
  const byTier: Record<string, number> = {};
  for (const b of branded.rows) {
    const product = parseBranded([b.composition1, b.composition2], b.name, b.pack_size_label);
    const best = bestMatch(product, bySet.get(product.setKey) || []);
    if (!best) continue;
    byTier[best.result.tier] = (byTier[best.result.tier] || 0) + 1;
    rows.push([b.id, best.candidate.id, best.result.tier, best.result.score, JSON.stringify(best.result.notes)]);
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // Serialise concurrent builds (e.g. ETL and server autoseed starting together).
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('medicine_matches_build'))`);
    // Drop automatic rows that no longer match (e.g. after a rules change); keep reviewed ones.
    await client.query(`DELETE FROM medicine_matches WHERE review_status = 'auto'`);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders = batch.map((r, idx) => {
        values.push(...r, MATCHER_VERSION);
        const o = idx * 6;
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}::jsonb, $${o + 6})`;
      });
      await client.query(
        `INSERT INTO medicine_matches (branded_id, generic_id, tier, score, notes, matcher_version)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (branded_id) DO NOTHING`,
        values,
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const summary = { branded: branded.rows.length, matched: rows.length, byTier, ms: Date.now() - started };
  log(`✅ Matched ${summary.matched}/${summary.branded} branded medicines in ${summary.ms}ms ${JSON.stringify(byTier)}`);
  return summary;
}

/** True when matches exist and were produced by the current matcher version. */
export async function matchesAreCurrent(): Promise<boolean> {
  const res = await queryDB(
    `SELECT COUNT(*) FILTER (WHERE matcher_version = $1) AS current, COUNT(*) AS total
     FROM medicine_matches WHERE review_status = 'auto'`,
    [MATCHER_VERSION],
  );
  const { current, total } = res.rows[0];
  return Number(total) > 0 && Number(current) === Number(total);
}
