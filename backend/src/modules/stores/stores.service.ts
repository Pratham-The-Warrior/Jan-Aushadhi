// ============================================================
// Stores Module — Service Layer
// PMBJK Kendra store discovery: pincode, GPS proximity,
// state/district filtering.
// Pure business logic and domain orchestration; delegates data
// access to StoreRepository.
// ============================================================

import { StoreRepository } from './stores.repository';
import { NotFoundError } from '../../shared/errors';
import type { Store, StoreSearchResult } from '../../shared/types';

export class StoreService {
  constructor(private readonly repository: StoreRepository = new StoreRepository()) {}

  /**
   * Find stores by pincode.
   *
   * @param pincode  Indian postal code (5-10 chars)
   * @returns Store list matching the pincode
   */
  async findByPincode(pincode: string): Promise<StoreSearchResult> {
    const stores = await this.repository.findByPincode(pincode, 50);
    return {
      count: stores.length,
      stores,
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
    const stores = await this.repository.findNearby(lat, lng, radius, 20);
    return {
      count: stores.length,
      radius_km: radius / 1000,
      stores,
    };
  }

  /**
   * Get a single store by its PMBJK code.
   *
   * @param pmbjkCode  Unique PMBJK store identifier
   * @throws NotFoundError if the store doesn't exist
   */
  async getByPmbjkCode(pmbjkCode: string): Promise<Store> {
    const store = await this.repository.findByPmbjkCode(pmbjkCode);
    if (!store) {
      throw new NotFoundError('Store');
    }
    return store;
  }

  /**
   * Get all distinct states with registered PMBJK Kendras.
   */
  async getStates(): Promise<string[]> {
    const statesData = await this.repository.findDistinctStates();
    return statesData.map((s) => s.state);
  }

  /**
   * Find stores filtered by state and district.
   *
   * @param state     Indian state name
   * @param district  District name within the state
   */
  async findByDistrict(state: string, district: string): Promise<StoreSearchResult> {
    const stores = await this.repository.findByDistrict(district, state, 100);
    return {
      count: stores.length,
      stores,
    };
  }
}
