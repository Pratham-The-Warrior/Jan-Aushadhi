// ============================================================
// Stores Module — Service Layer
// PMBJK Kendra store discovery: pincode, GPS proximity,
// state/district filtering, and requirement confirmation.
// Pure business logic, no HTTP concerns.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import { NotFoundError } from '../../shared/errors';
import { APP_CONSTANTS } from '../../shared/constants';
import type { Store, StoreSearchResult } from '../../shared/types';

export class StoreService {

  /**
   * Find stores by pincode.
   *
   * @param pincode  Indian postal code (5-10 chars)
   * @returns Store list matching the pincode
   */
  async findByPincode(pincode: string): Promise<StoreSearchResult> {
    const result = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district
       FROM stores
       WHERE pincode = $1 AND status = 'ACTIVE'
       ORDER BY name ASC
       LIMIT 50`,
      [pincode],
    );

    return {
      count: result.rows.length,
      stores: result.rows as Store[],
    };
  }

  /**
   * Find nearby stores using PostGIS ST_DWithin + ST_Distance.
   *
   * @param lat     Latitude
   * @param lng     Longitude
   * @param radius  Search radius in meters (default 10km)
   * @returns Stores sorted by distance with distance_km field
   */
  async findNearby(lat: number, lng: number, radius: number = 10000): Promise<{
    count: number;
    radius_km: number;
    stores: (Store & { distance_km: number })[];
  }> {
    // POSTGIS COORDINATE gotcha:
    // ST_MakePoint($1, $2) takes parameters in (longitude, latitude) order! 
    // This is the opposite of the standard (latitude, longitude) representation used by Leaflet 
    // and Google Maps. Getting this wrong is a classic silent bug that queries coordinates in the 
    // wrong hemisphere (or ocean). Here we strictly bind [lng, lat] to $1 and $2.
    //
    // Also, we cast the point to ::geography. This forces PostGIS to compute the ST_Distance 
    // and ST_DWithin in meters along the curved surface of the Earth (great-circle distance), 
    // instead of standard cartesian degrees which would vary wildly depending on the distance from the equator.
    const result = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district,
              ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
       FROM stores
       WHERE status = 'ACTIVE' AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance ASC
       LIMIT ${APP_CONSTANTS.STORES_QUERY_LIMIT}`,
      [lng, lat, radius],
    );

    return {
      count: result.rows.length,
      radius_km: radius / 1000,
      stores: result.rows.map((s: any) => ({
        ...s,
        // The raw distance returned by ::geography is in meters. We divide by 1000 to get kilometers,
        // and round to a single decimal place (e.g. 2.4 km) for client rendering.
        distance_km: Math.round((parseFloat(s.distance) / 1000) * 10) / 10,
      })),
    };
  }

  /**
   * Get a single store by its PMBJK code.
   *
   * @param pmbjkCode  Unique PMBJK store identifier
   * @throws NotFoundError if the store doesn't exist
   */
  async getByPmbjkCode(pmbjkCode: string): Promise<Store> {
    const result = await queryDB(
      'SELECT * FROM stores WHERE pmbjk_code = $1',
      [pmbjkCode],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Store');
    }

    return result.rows[0] as Store;
  }

  /**
   * Get all distinct states with registered PMBJK Kendras.
   */
  async getStates(): Promise<string[]> {
    const result = await queryDB(
      'SELECT DISTINCT state FROM stores WHERE state IS NOT NULL ORDER BY state ASC',
    );
    return result.rows.map((r: any) => r.state);
  }

  /**
   * Find stores filtered by state and district.
   *
   * @param state     Indian state name
   * @param district  District name within the state
   */
  async findByDistrict(state: string, district: string): Promise<StoreSearchResult> {
    const result = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district
       FROM stores
       WHERE state = $1 AND district = $2
       ORDER BY name ASC`,
      [state, district],
    );

    return {
      count: result.rows.length,
      stores: result.rows as Store[],
    };
  }

  /**
   * Store confirms a requirement ticket.
   * Transitions status from PENDING_ACCEPTANCE → ACCEPTED.
   * Scoped to the seller's linked PMBJK store or admin.
   *
   * @param requirementId  Unique ticket ID
   * @param storeCode      Store PMBJK code to enforce ownership
   */
  async confirmRequirement(requirementId: string, storeCode?: string): Promise<Record<string, unknown>> {
    let query = `UPDATE requirements SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND status = 'PENDING_ACCEPTANCE'`;
    const params: unknown[] = [requirementId];

    if (storeCode) {
      query += ` AND pmbjk_code = $2`;
      params.push(storeCode);
    }

    query += ' RETURNING *';

    const result = await queryDB(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('Requirement (not found, already accepted, or store unauthorized)');
    }

    // Log in order_status_log
    await queryDB(
      `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, 'PENDING_ACCEPTANCE', 'ACCEPTED', $2, 'STORE_OWNER', 'Order confirmed by Kendra')`,
      [requirementId, storeCode || 'STORE'],
    ).catch(() => {});

    return result.rows[0];
  }
}
