// ============================================================
// Admin Module — Fastify Validation Schemas
// JSON Schema definitions for admin endpoint request/response
// validation. Fastify uses AJV under the hood.
// ============================================================

export const getStoresSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      status: { type: 'string' as const, enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'] },
      state: { type: 'string' as const },
      search: { type: 'string' as const },
      page: { type: 'integer' as const, minimum: 1, default: 1 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 200, default: 50 },
    },
  },
};

export const storeByCodeSchema = {
  params: {
    type: 'object' as const,
    required: ['code'] as const,
    properties: {
      code: { type: 'string' as const },
    },
  },
};

export const updateStoreStatusSchema = {
  params: {
    type: 'object' as const,
    required: ['code'] as const,
    properties: {
      code: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['status'] as const,
    properties: {
      status: { type: 'string' as const, enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'] },
    },
  },
};

export const assignSellerSchema = {
  params: {
    type: 'object' as const,
    required: ['code'] as const,
    properties: {
      code: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['name', 'phone', 'password'] as const,
    properties: {
      name: { type: 'string' as const, minLength: 2 },
      phone: { type: 'string' as const, minLength: 8 },
      email: { type: 'string' as const, format: 'email' },
      password: { type: 'string' as const, minLength: 6 },
    },
  },
};

export const getUsersSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      role: { type: 'string' as const, enum: ['CUSTOMER', 'STORE_OWNER', 'SUPER_ADMIN'] },
      search: { type: 'string' as const },
      page: { type: 'integer' as const, minimum: 1, default: 1 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 200, default: 50 },
    },
  },
};

export const userByUidSchema = {
  params: {
    type: 'object' as const,
    required: ['uid'] as const,
    properties: {
      uid: { type: 'string' as const },
    },
  },
};

export const updateUserRoleSchema = {
  params: {
    type: 'object' as const,
    required: ['uid'] as const,
    properties: {
      uid: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['role'] as const,
    properties: {
      role: { type: 'string' as const, enum: ['CUSTOMER', 'STORE_OWNER', 'SUPER_ADMIN'] },
      linked_pmbjk_code: { type: 'string' as const },
    },
  },
};

export const suspendUserSchema = {
  params: {
    type: 'object' as const,
    required: ['uid'] as const,
    properties: {
      uid: { type: 'string' as const },
    },
  },
  body: {
    type: 'object' as const,
    required: ['suspend'] as const,
    properties: {
      suspend: { type: 'boolean' as const },
    },
  },
};

export const getAllOrdersSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      status: { type: 'string' as const },
      pmbjk_code: { type: 'string' as const },
      date_from: { type: 'string' as const },
      date_to: { type: 'string' as const },
      page: { type: 'integer' as const, minimum: 1, default: 1 },
      limit: { type: 'integer' as const, minimum: 1, maximum: 200, default: 50 },
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

export const overrideOrderStatusSchema = {
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
          'PENDING_ACCEPTANCE', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
          'COMPLETED', 'CANCELLED_BY_ADMIN',
        ],
      },
      notes: { type: 'string' as const },
    },
  },
};

export const ordersFeedSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
    },
  },
};
