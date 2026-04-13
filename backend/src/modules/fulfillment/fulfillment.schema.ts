// ============================================================
// Fulfillment Module — JSON Schemas
// Fastify-native request/response validation for checkout,
// requirements, dashboard, and user profile endpoints.
// ============================================================

/** POST /api/v1/requirements/create */
export const createRequirementSchema = {
  body: {
    type: 'object' as const,
    required: ['pmbjk_code', 'drug_codes', 'legal_attestation'],
    properties: {
      pmbjk_code: { type: 'string' as const, minLength: 1 },
      drug_codes: {
        type: 'array' as const,
        minItems: 1,
        items: {
          type: 'object' as const,
          required: ['code', 'quantity'],
          properties: {
            code: { type: 'string' as const },
            quantity: { type: 'integer' as const, minimum: 1 },
            name: { type: 'string' as const },
            mrp: { type: 'number' as const },
            branded_mrp: { type: 'number' as const },
          },
        },
      },
      legal_attestation: { type: 'boolean' as const },
      delivery_address: { type: 'string' as const },
      payment_mode: { type: 'string' as const },
    },
  },
};

/** GET /api/v1/requirements/:id */
export const requirementByIdSchema = {
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: {
      id: { type: 'string' as const, minLength: 1 },
    },
  },
};

/** GET /api/v1/requirements/:id/whatsapp-link */
export const whatsappLinkSchema = {
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: {
      id: { type: 'string' as const, minLength: 1 },
    },
  },
};

/** PUT /api/v1/user/basket */
export const updateBasketSchema = {
  body: {
    type: 'object' as const,
    required: ['medical_basket'],
    properties: {
      medical_basket: { type: 'array' as const },
    },
  },
};
