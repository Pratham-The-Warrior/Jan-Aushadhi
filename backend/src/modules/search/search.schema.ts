// ============================================================
// Search Module — JSON Schemas
// Fastify-native request/response validation.
// ============================================================

/** GET /api/v1/search */
export const searchSchema = {
  querystring: {
    type: 'object' as const,
    required: ['query'],
    properties: {
      query: { type: 'string' as const, minLength: 1 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 50, default: 30 },
    },
  },
};

/** GET /api/v1/suggest */
export const suggestSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      q: { type: 'string' as const, minLength: 2 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 10, default: 6 },
    },
  },
};
