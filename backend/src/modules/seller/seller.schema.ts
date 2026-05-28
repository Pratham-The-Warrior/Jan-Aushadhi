// ============================================================
// Seller Module — Fastify Validation Schemas
// JSON Schema definitions for seller endpoint request/response
// validation. Fastify uses AJV under the hood.
// ============================================================

export const getOrdersSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      status: { type: 'string' as const },
      page: { type: 'integer' as const, minimum: 1, default: 1 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 25 },
    },
  },
};

export const orderByIdSchema = {
  params: {
    type: 'object' as const,
    required: ['id'] as const,
    properties: {
      id: { type: 'string' as const },
    },
  },
};

export const updateOrderStatusSchema = {
  params: {
    type: 'object' as const,
    required: ['id'] as const,
    properties: {
      id: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['status'] as const,
    properties: {
      status: {
        type: 'string' as const,
        enum: [
          'ACCEPTED',
          'PREPARING',
          'READY_FOR_PICKUP',
          'COMPLETED',
          'CANCELLED_BY_SELLER',
        ],
      },
      notes: { type: 'string' as const },
    },
  },
};

export const rejectOrderSchema = {
  params: {
    type: 'object' as const,
    required: ['id'] as const,
    properties: {
      id: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['reason'] as const,
    properties: {
      reason: { type: 'string' as const, minLength: 5 },
    },
  },
};

export const getInventorySchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      search: { type: 'string' as const },
      page: { type: 'integer' as const, minimum: 1, default: 1 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 50 },
    },
  },
};

export const updateInventoryItemSchema = {
  params: {
    type: 'object' as const,
    required: ['drugCode'] as const,
    properties: {
      drugCode: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['in_stock'] as const,
    properties: {
      in_stock: { type: 'boolean' as const },
    },
  },
};

export const bulkUpdateInventorySchema = {
  body: {
    type: 'object' as const,
    required: ['updates'] as const,
    properties: {
      updates: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          required: ['drug_code', 'in_stock'] as const,
          properties: {
            drug_code: { type: 'string' as const },
            in_stock: { type: 'boolean' as const },
          },
        },
        minItems: 1,
        maxItems: 500,
      },
    },
  },
};

export const updateStoreProfileSchema = {
  body: {
    type: 'object' as const,
    properties: {
      operating_hours: { type: 'object' as const },
      phone: { type: 'string' as const },
      upi_vpa: { type: 'string' as const },
    },
  },
};
