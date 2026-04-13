// ============================================================
// Custom Error Hierarchy
// Typed application errors with HTTP status code mapping.
// Global Fastify error handler catches these and returns
// structured JSON responses.
// ============================================================

/**
 * Base application error.
 * All domain errors extend this class, carrying a status code
 * and an optional machine-readable error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Restore prototype chain (TypeScript + ES5 target issue)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — Client sent a malformed or invalid request */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/** 401 — Missing or invalid authentication credentials */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/** 403 — Authenticated but insufficient permissions */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/** 404 — Requested resource does not exist */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/** 409 — Request conflicts with current resource state */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/** 429 — Too many requests */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/** 502/503 — External dependency (DB, Meilisearch, Redis, Twilio) is unavailable */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message?: string) {
    super(
      message || `External service unavailable: ${service}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
    );
    this.service = service;
  }
}

/**
 * Structured error response shape returned by the global error handler.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

/**
 * Maps any thrown value to a structured error response.
 * AppError subclasses are treated as operational (expected) errors.
 * Unknown errors are masked in production.
 */
export function toErrorResponse(err: unknown, isProd: boolean): { statusCode: number; body: ErrorResponse } {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          statusCode: err.statusCode,
        },
      },
    };
  }

  // Unexpected / programmer errors — mask in production
  const message = isProd ? 'An unexpected error occurred' : (err as Error)?.message || 'Unknown error';

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message,
        statusCode: 500,
      },
    },
  };
}
