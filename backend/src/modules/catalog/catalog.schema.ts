// ============================================================
// Catalog Module — JSON Schemas
// Fastify-native request/response validation.
// ============================================================

/** GET /api/v1/discovery/:branded_id */
export const discoveryDetailSchema = {
  params: {
    type: 'object' as const,
    required: ['branded_id'],
    properties: {
      branded_id: { type: 'string' as const },
    },
  },
};

/** GET /api/v1/catalog/by-salt/:salt_hash */
export const catalogBySaltSchema = {
  params: {
    type: 'object' as const,
    required: ['salt_hash'],
    properties: {
      salt_hash: { type: 'string' as const, minLength: 1 },
    },
  },
};
