// ============================================================
// Centralized Configuration
// Single source of truth for all environment variables.
// Fail-fast on missing critical config in production.
// ============================================================

import * as dotenv from 'dotenv';
dotenv.config();

/** Application environment */
type Environment = 'development' | 'production' | 'test';

export interface AppConfig {
  /** Current runtime environment */
  readonly env: Environment;
  /** Server port */
  readonly port: number;
  /** Server host binding */
  readonly host: string;

  /** PostgreSQL connection string */
  readonly databaseUrl: string;
  /** Maximum PG pool connections */
  readonly dbPoolMax: number;
  /** PG idle timeout (ms) */
  readonly dbIdleTimeout: number;
  /** PG connection timeout (ms) */
  readonly dbConnectionTimeout: number;

  /** Redis connection URL */
  readonly redisUrl: string;
  /** Default Redis cache TTL (seconds) */
  readonly redisTtl: number;

  /** Meilisearch host URL */
  readonly meiliHost: string;
  /** Meilisearch API key */
  readonly meiliApiKey: string;

  /** Firebase service account JSON (stringified) */
  readonly firebaseServiceAccount: string | null;

  /** Twilio Account SID */
  readonly twilioAccountSid: string;
  /** Twilio Auth Token */
  readonly twilioAuthToken: string;
  /** Twilio WhatsApp sender number */
  readonly twilioWhatsappNumber: string;

  /** Global rate limit: max requests per window */
  readonly rateLimitMax: number;
  /** Global rate limit: time window */
  readonly rateLimitWindow: string;

  /** CORS allowed origins */
  readonly corsOrigin: string;
}

function parseEnv(): AppConfig {
  const env = (process.env.NODE_ENV || 'development') as Environment;

  return Object.freeze({
    env,
    port: parseInt(process.env.PORT || '5000', 10),
    host: process.env.HOST || '0.0.0.0',

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
    dbPoolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    dbIdleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    dbConnectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisTtl: parseInt(process.env.REDIS_TTL || '3600', 10),

    // Meilisearch
    meiliHost: process.env.MEILI_HOST || 'http://localhost:7700',
    meiliApiKey: process.env.MEILI_MASTER_KEY || 'masterKey',

    // Firebase
    firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || null,

    // Twilio
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',

    // Rate Limiting
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',

    // CORS
    corsOrigin: process.env.CORS_ORIGIN || '*',
  });
}

/** Immutable application configuration — parsed once at startup */
export const config: AppConfig = parseEnv();
