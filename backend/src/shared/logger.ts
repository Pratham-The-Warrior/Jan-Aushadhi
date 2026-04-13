// ============================================================
// Logger Configuration
// Provides Pino logger options for Fastify.
// Pretty-prints in development, structured JSON in production.
// ============================================================

import { config } from './config';

/**
 * Returns Pino logger configuration appropriate for the
 * current environment. Used by both the Fastify instance
 * and standalone logging needs.
 */
export function getLoggerConfig(): Record<string, unknown> | boolean {
  if (config.env === 'test') {
    return false; // Silence logs during tests
  }

  if (config.env === 'development') {
    return {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  // Production: structured JSON
  return {
    level: 'info',
    serializers: {
      req: (req: { method: string; url: string; headers: Record<string, string> }) => ({
        method: req.method,
        url: req.url,
        correlationId: req.headers['x-request-id'],
      }),
      res: (res: { statusCode: number }) => ({
        statusCode: res.statusCode,
      }),
    },
  };
}
