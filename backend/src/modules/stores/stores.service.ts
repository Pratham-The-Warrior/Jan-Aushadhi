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
       WHERE pincode = $1
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
    const result = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district,
              ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
       FROM stores
       WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance ASC
       LIMIT ${APP_CONSTANTS.STORES_QUERY_LIMIT}`,
      [lng, lat, radius],
    );

    return {
      count: result.rows.length,
      radius_km: radius / 1000,
      stores: result.rows.map((s: any) => ({
        ...s,
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
   * Store confirms a requirement ticket (Module 7 feedback loop).
   * Transitions status from PENDING → CONFIRMED.
   *
   * @param requirementId  Unique ticket ID
   * @throws NotFoundError if the requirement doesn't exist or isn't PENDING
   */
  async confirmRequirement(requirementId: string): Promise<Record<string, unknown>> {
    const result = await queryDB(
      `UPDATE requirements SET status = 'CONFIRMED', updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [requirementId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Requirement (not found or ineligible for confirmation)');
    }

    return result.rows[0];
  }
}
