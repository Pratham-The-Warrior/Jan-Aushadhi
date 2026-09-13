// ============================================================
// Stores Module — Repository Layer
// PostGIS spatial distance calculations and Kendra store queries.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import type { Store } from '../../shared/types';

export class StoreRepository {
  /**
   * Query stores by Indian pincode.
   */
  async findByPincode(pincode: string, limit: number = 50): Promise<Store[]> {
    const res = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district
       FROM stores
       WHERE pincode = $1 AND status = 'ACTIVE'
       ORDER BY name ASC
       LIMIT $2`,
      [pincode, limit],
    );
    return res.rows as Store[];
  }

  /**
   * Find nearby active stores using PostGIS geography ST_DWithin and ST_Distance.
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number = 10000,
    limit: number = 20,
  ): Promise<(Store & { distance_km: number })[]> {
    const res = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district,
              ROUND((ST_Distance(location, ST_MakePoint($1, $2)::geography) / 1000)::numeric, 1) AS distance_km
       FROM stores
       WHERE status = 'ACTIVE'
         AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance_km ASC
       LIMIT $4`,
      [lng, lat, radiusMeters, limit],
    );

    return res.rows.map((row: any) => ({
      ...row,
      distance_km: parseFloat(row.distance_km),
    }));
  }

  /**
   * Query single store by unique PMBJK code.
   */
  async findByPmbjkCode(pmbjkCode: string): Promise<Store | null> {
    const res = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district, status, operating_hours
       FROM stores
       WHERE pmbjk_code = $1`,
      [pmbjkCode],
    );
    return (res.rows[0] as Store) || null;
  }

  /**
   * Get list of unique states with active stores.
   */
  async findDistinctStates(): Promise<{ state: string; store_count: number }[]> {
    const res = await queryDB(
      `SELECT state, COUNT(*) as store_count
       FROM stores
       WHERE state IS NOT NULL AND state != '' AND status = 'ACTIVE'
       GROUP BY state
       ORDER BY state ASC`,
    );
    return res.rows.map((r: any) => ({
      state: r.state,
      store_count: parseInt(r.store_count, 10),
    }));
  }

  /**
   * Query active stores by district and state.
   */
  async findByDistrict(district: string, state?: string, limit: number = 100): Promise<Store[]> {
    let query = `
      SELECT pmbjk_code, name, phone, address, pincode, state, district
      FROM stores
      WHERE LOWER(district) = LOWER($1) AND status = 'ACTIVE'
    `;
    const params: any[] = [district];

    if (state) {
      params.push(state);
      query += ` AND LOWER(state) = LOWER($${params.length})`;
    }

    params.push(limit);
    query += ` ORDER BY name ASC LIMIT $${params.length}`;

    const res = await queryDB(query, params);
    return res.rows as Store[];
  }

  /**
   * Confirm requirement transition: PENDING_ACCEPTANCE -> ACCEPTED.
   */
  async confirmRequirement(requirementId: string, storeCode?: string): Promise<any | null> {
    let query = `UPDATE requirements SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND status = 'PENDING_ACCEPTANCE'`;
    const params: unknown[] = [requirementId];

    if (storeCode) {
      query += ` AND pmbjk_code = $2`;
      params.push(storeCode);
    }

    query += ' RETURNING *';
    const result = await queryDB(query, params);
    if (result.rows.length === 0) return null;

    // Log in order_status_log
    await queryDB(
      `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, 'PENDING_ACCEPTANCE', 'ACCEPTED', $2, 'STORE_OWNER', 'Order confirmed by Kendra')`,
      [requirementId, storeCode || 'STORE'],
    ).catch(() => {});

    return result.rows[0];
  }
}
