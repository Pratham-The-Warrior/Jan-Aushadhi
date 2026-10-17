// ============================================================
// Search Module — Brand family sizes
// How many products share a brand's first word ("Telma", "Telma H",
// "Telma-AM" … → telma: 31). Well-known brands have many line
// extensions, so this is a usable popularity signal until we have
// real search and order data. Pharmacy own-label ranges named after the
// salt ("StayHappi Telmisartan 40mg", "DavaIndia Paracetamol…") are large
// for a different reason and get no boost.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import { normalizeText } from './query';

let families: Map<string, number> | null = null;
let loading: Promise<Map<string, number>> | null = null;

/** The brand family a product name belongs to: its leading run of letters. */
export function familyKey(name: string): string {
  return normalizeText(name).match(/^\p{L}+/u)?.[0] ?? '';
}

export async function loadBrandFamilies(): Promise<Map<string, number>> {
  if (families) return families;
  loading ??= queryDB(
    `SELECT lower(substring(name from '^[A-Za-z]+')) AS family,
            CASE
              WHEN AVG((position(lower(split_part(trim(composition1), ' ', 1)) IN lower(name)) > 0)::int) > 0.5 THEN 1
              ELSE COUNT(*)::int
            END AS n
       FROM branded_meds
      WHERE NOT is_discontinued
      GROUP BY 1`,
  )
    .then((res) => {
      families = new Map(res.rows.filter((r: any) => r.family).map((r: any) => [r.family, r.n]));
      return families;
    })
    .catch(() => {
      loading = null; // retry on the next search
      return new Map<string, number>();
    });
  return loading;
}

export function familySize(map: Map<string, number>, name: string): number {
  return map.get(familyKey(name)) ?? 1;
}
