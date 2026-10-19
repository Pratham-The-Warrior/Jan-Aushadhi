// ============================================================
// Fulfillment Module — JSON Schemas
// Fastify-native request/response validation for checkout,
// requirements, dashboard, and user profile endpoints.
// ============================================================

/** POST /api/v1/requirements/create */
export const createRequirementSchema = {
  body: {
    type: 'object' as const,
    required: ['drug_codes', 'legal_attestation'],
    properties: {
      pmbjk_code: { type: 'string' as const },
      drug_codes: {
        type: 'array' as const,
        minItems: 1,
        maxItems: 50,
        items: {
          type: 'object' as const,
          required: ['code', 'quantity'],
          properties: {
            code: { type: 'string' as const, minLength: 1, maxLength: 32 },
            quantity: { type: 'integer' as const, minimum: 1, maximum: 100 },
            branded_id: { type: 'integer' as const, minimum: 1 },
            // Accepted for older clients but ignored: prices come from the catalogue
            name: { type: 'string' as const, maxLength: 300 },
            mrp: { type: 'number' as const },
            branded_mrp: { type: 'number' as const },
          },
        },
      },
      legal_attestation: { type: 'boolean' as const },
      delivery_address: { type: 'string' as const, maxLength: 500 },
      payment_mode: { type: 'string' as const, enum: ['COD', 'UPI', 'CASH'] },
      prescription_url: { type: 'string' as const, maxLength: 1000, pattern: '^https://' },
      fulfillment_type: { type: 'string' as const, enum: ['PICKUP', 'DELIVERY'] },
      delivery_coords: {
        type: 'object' as const,
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' as const, minimum: -90, maximum: 90 },
          lng: { type: 'number' as const, minimum: -180, maximum: 180 }
        }
      }
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

/** PATCH /api/v1/requirements/:id/cancel */
export const cancelRequirementSchema = {
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: {
      id: { type: 'string' as const, minLength: 1 },
    },
  },
  body: {
    type: 'object' as const,
    properties: {
      reason: { type: 'string' as const },
    },
  },
};
