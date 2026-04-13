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
      lat: { type: 'string' as const },
      lng: { type: 'string' as const },
      radius: { type: 'string' as const },
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

/** POST /api/v1/stores/confirm/:requirement_id */
export const confirmRequirementSchema = {
  params: {
    type: 'object' as const,
    required: ['requirement_id'],
    properties: {
      requirement_id: { type: 'string' as const, minLength: 1 },
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
