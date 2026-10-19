// ============================================================
// Stores Module — JSON Schemas
// Fastify-native request/response validation.
// ============================================================

/** GET /api/v1/stores/by-pincode */
export const storesByPincodeSchema = {
  querystring: {
    type: 'object' as const,
    required: ['pincode'],
    properties: {
      pincode: { type: 'string' as const, minLength: 5, maxLength: 10 },
    },
  },
};

/** GET /api/v1/stores/nearby */
export const nearbyStoresSchema = {
  querystring: {
    type: 'object' as const,
    required: ['lat', 'lng'],
    properties: {
      lat: { type: 'number' as const, minimum: -90, maximum: 90 },
      lng: { type: 'number' as const, minimum: -180, maximum: 180 },
      // Metres; clamped to 500 m – 50 km in the handler
      radius: { type: 'number' as const },
    },
  },
};

/** GET /api/v1/stores/:pmbjk_code */
export const storeByCodeSchema = {
  params: {
    type: 'object' as const,
    required: ['pmbjk_code'],
    properties: {
      pmbjk_code: { type: 'string' as const, minLength: 1 },
    },
  },
};

/** GET /api/v1/stores/by-district */
export const storesByDistrictSchema = {
  querystring: {
    type: 'object' as const,
    required: ['state', 'district'],
    properties: {
      state: { type: 'string' as const, minLength: 1 },
      district: { type: 'string' as const, minLength: 1 },
    },
  },
};
