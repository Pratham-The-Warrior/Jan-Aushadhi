// ============================================================
// Store display helpers shared by the store locator components
// ============================================================

/** Human-readable note for how precise a store's map position is. */
const PRECISION_NOTES = {
  geocoded: null,
  pincode: 'Location approximate (PIN code centre)',
  area: 'Location approximate (postal area)',
  district: 'Location approximate (district)',
  none: 'Location not mapped — use the address',
};

export function locationNote(store) {
  return PRECISION_NOTES[store?.location_precision] ?? null;
}

/** True when the store can be drawn on the map. */
export function hasCoords(store) {
  return Number.isFinite(Number(store?.latitude)) && Number.isFinite(Number(store?.longitude))
    && store.latitude !== null && store.longitude !== null;
}

/** "1.2 km" for geocoded stores, "~1.2 km" when the position is approximate. */
export function formatDistance(store) {
  if (store?.distance_km == null) return null;
  const approx = store.location_precision && store.location_precision !== 'geocoded';
  return `${approx ? '~' : ''}${store.distance_km} km`;
}

/** Google Maps directions link: exact coordinates when known, else the address text. */
export function directionsUrl(store) {
  if (store?.location_precision === 'geocoded' && hasCoords(store)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
  }
  const q = [store?.address, store?.district, store?.state, store?.pincode].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Jan Aushadhi Kendra ${q}`)}`;
}
