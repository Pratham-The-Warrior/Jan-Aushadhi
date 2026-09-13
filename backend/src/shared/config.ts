// ============================================================
// Centralized Configuration & Fail-Fast Pre-Flight Validator
// Single source of truth for all environment variables.
// Validates production configuration and prevents runtime crashes.
// ============================================================

import fs from 'node:fs';
import * as dotenv from 'dotenv';
dotenv.config();

/** Application environment */
export type Environment = 'development' | 'production' | 'test';

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
  /** Whether to reject invalid SSL certs on DB connection */
  readonly dbSslRejectUnauthorized: boolean;

  /** Redis connection URL */
  readonly redisUrl: string;
  /** Default Redis cache TTL (seconds) */
  readonly redisTtl: number;

  /** Meilisearch host URL */
  readonly meiliHost: string;
  /** Meilisearch API key / master key */
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
  readonly corsOrigin: string | string[];
}

/**
 * Resolve and normalize Firebase Service Account credentials.
 * Supports:
 * 1. Raw JSON string (`{"type": "service_account", ...}`)
 * 2. Path to JSON file (`/app/serviceAccountKey.json`)
 * 3. Base64 encoded JSON string
 */
function resolveFirebaseCredentials(): string | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;

  // Case 1: Direct JSON string
  if (raw.startsWith('{') && raw.endsWith('}')) {
    return raw;
  }

  // Case 2: File path
  try {
    if (fs.existsSync(raw)) {
      return fs.readFileSync(raw, 'utf-8').trim();
    }
  } catch {
    // Fallthrough to base64 check
  }

  // Case 3: Base64 encoded JSON
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      return decoded;
    }
  } catch {
    // Not base64
  }

  return raw;
}

/**
 * Construct database URL from environment with intelligent fallback.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  if (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
    const user = encodeURIComponent(process.env.POSTGRES_USER);
    const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD);
    const host = process.env.POSTGRES_HOST || 'postgres';
    const port = process.env.POSTGRES_PORT || '5432';
    const db = process.env.POSTGRES_DB || 'janaushadhi';
    return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  }

  return 'postgresql://postgres:postgres@localhost:5432/janaushadhi';
}

/**
 * Construct Redis URL from environment with intelligent fallback.
 */
function resolveRedisUrl(): string {
  if (process.env.REDIS_URL && process.env.REDIS_URL.trim()) {
    return process.env.REDIS_URL.trim();
  }

  if (process.env.REDIS_PASSWORD) {
    const pass = encodeURIComponent(process.env.REDIS_PASSWORD);
    const host = process.env.REDIS_HOST || 'redis';
    const port = process.env.REDIS_PORT || '6379';
    return `redis://default:${pass}@${host}:${port}`;
  }

  return 'redis://localhost:6379';
}

function parseEnv(): AppConfig {
  const env = (process.env.NODE_ENV || 'development') as Environment;

  return Object.freeze({
    env,
    port: parseInt(process.env.PORT || '5000', 10),
    host: process.env.HOST || '0.0.0.0',

    // Database
    databaseUrl: resolveDatabaseUrl(),
    dbPoolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    dbIdleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    dbConnectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    dbSslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',

    // Redis
    redisUrl: resolveRedisUrl(),
    redisTtl: parseInt(process.env.REDIS_TTL || '3600', 10),

    // Meilisearch: support all standard aliases
    meiliHost: 
      process.env.MEILI_HOST || 
      process.env.MEILISEARCH_HOST || 
      process.env.MEILISEARCH_URL || 
      'http://localhost:7700',
    meiliApiKey: 
      process.env.MEILI_MASTER_KEY || 
      process.env.MEILISEARCH_KEY || 
      process.env.MEILISEARCH_API_KEY || 
      'masterKey',

    // Firebase
    firebaseServiceAccount: resolveFirebaseCredentials(),

    // Twilio
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',

    // Rate Limiting
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',

    // CORS
    corsOrigin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : '*',
  });
}

/** Immutable application configuration — parsed once at startup */
export const config: AppConfig = parseEnv();

/**
 * Mask sensitive credentials for diagnostic logging.
 */
function maskUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return rawUrl.replace(/:([^@/]+)@/, ':***@');
  }
}

/**
 * Strict fail-fast validator for container startup.
 * Throws actionable diagnostics if required production secrets are missing or broken.
 */
export function validateStartupConfig(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.env === 'production') {
    // 1. Check Database URL
    if (config.databaseUrl.includes('CHANGE_ME')) {
      errors.push('DATABASE_URL or POSTGRES_PASSWORD contains CHANGE_ME placeholder.');
    }
    if (config.databaseUrl.includes('localhost') && process.env.ALLOW_LOCALHOST_DB !== 'true') {
      warnings.push('DATABASE_URL points to localhost inside Docker. Verify database hostname is "postgres" or a cloud DB.');
    }

    // 2. Check Redis URL
    if (config.redisUrl.includes('CHANGE_ME')) {
      errors.push('REDIS_URL or REDIS_PASSWORD contains CHANGE_ME placeholder.');
    }

    // 3. Check Meilisearch Master Key Requirements
    if (config.meiliApiKey.includes('CHANGE_ME')) {
      errors.push('MEILI_MASTER_KEY contains CHANGE_ME placeholder.');
    }
    if (config.meiliApiKey === 'masterKey') {
      warnings.push('MEILI_MASTER_KEY is using default "masterKey". Meilisearch in production requires a key >= 16 bytes.');
    } else if (Buffer.byteLength(config.meiliApiKey, 'utf-8') < 16) {
      errors.push(`MEILI_MASTER_KEY is only ${config.meiliApiKey.length} characters. Meilisearch requires at least 16 bytes in production.`);
    }

    // 4. Check Firebase
    if (!config.firebaseServiceAccount) {
      warnings.push('FIREBASE_SERVICE_ACCOUNT_KEY is not configured. User authentication will be disabled.');
    }

    // 5. Check CORS
    if (config.corsOrigin === '*') {
      warnings.push('CORS_ORIGIN is wildcard "*". In production, restrict to your exact domain names.');
    }
  }

  // Print diagnostic startup banner
  console.log('============================================================');
  console.log('🚀 JAN AUSHADHI API — PRE-FLIGHT CONFIGURATION CHECK');
  console.log('============================================================');
  console.log(`• Environment:    ${config.env}`);
  console.log(`• Host & Port:    ${config.host}:${config.port}`);
  console.log(`• Database:       ${maskUrl(config.databaseUrl)} (SSL: ${config.dbSslRejectUnauthorized ? 'secure' : 'relaxed'})`);
  console.log(`• Redis Cache:    ${maskUrl(config.redisUrl)}`);
  console.log(`• Meilisearch:    ${config.meiliHost} (Key: ${config.meiliApiKey ? 'configured (' + config.meiliApiKey.length + ' chars)' : 'none'})`);
  console.log(`• Firebase Auth:  ${config.firebaseServiceAccount ? 'Configured' : 'Inactive (Mock)'}`);
  console.log(`• Twilio Bridge:  ${config.twilioAccountSid ? 'Active (' + config.twilioAccountSid.slice(0, 6) + '...)' : 'Mock mode'}`);
  console.log(`• CORS Origins:   ${Array.isArray(config.corsOrigin) ? config.corsOrigin.join(', ') : config.corsOrigin}`);
  console.log('============================================================');

  if (warnings.length > 0) {
    console.warn('\n⚠️  STARTUP WARNINGS:');
    for (const w of warnings) {
      console.warn(`   • ${w}`);
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ FATAL CONFIGURATION ERRORS:');
    for (const err of errors) {
      console.error(`   • ${err}`);
    }
    console.error('\nAborting container boot. Please fix your environment variables before starting.\n');
    throw new Error(`Startup config validation failed: ${errors.join('; ')}`);
  }

  console.log('✅ Configuration validation passed.\n');
}
