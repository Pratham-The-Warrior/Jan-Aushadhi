// ============================================================
// Meilisearch Client Adapter
// Wraps the Meilisearch SDK with health checks.
// Extracted from index.ts to be injectable.
// ============================================================

import http from 'node:http';
import https from 'node:https';
import { Meilisearch } from 'meilisearch';
import { config } from '../config';
import { ExternalServiceError } from '../errors';

/** Singleton Meilisearch client */
const meiliClient = new Meilisearch({
  host: config.meiliHost,
  apiKey: config.meiliApiKey,
});

/**
 * Get the Meilisearch client instance.
 */
export function getMeiliClient(): Meilisearch {
  return meiliClient;
}

/**
 * Verify Meilisearch connectivity and authentication at startup.
 * Authenticated call ensures no silent 401 failures during production searches.
 */
export async function checkMeiliHealth(): Promise<boolean> {
  try {
    const health = await meiliClient.health();
    // Validate authentication by querying index metadata (unauthenticated health check alone is insufficient)
    await meiliClient.getIndexes({ limit: 1 });
    console.log(`✅ Meilisearch: ${health.status} (authenticated)`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️  Meilisearch unavailable or authentication failed (${err?.message || err}) — search will use PostgreSQL fallback`);
    return false;
  }
}


// ---- Fast search path ----
// Node's built-in fetch, which the SDK uses, added ~45 ms to every search
// against Meilisearch's ~5 ms in our measurements. A plain keep-alive
// node:http request does not. Used only for the per-keystroke search calls;
// everything else goes through the SDK.

const keepAlive = { keepAlive: true, maxSockets: 32 };
const httpAgent = new http.Agent(keepAlive);
const httpsAgent = new https.Agent(keepAlive);

export function searchIndex<T>(indexName: string, body: Record<string, unknown>, timeoutMs = 2000): Promise<{ hits: T[] }> {
  const url = new URL(`/indexes/${encodeURIComponent(indexName)}/search`, config.meiliHost);
  const payload = JSON.stringify(body);
  const secure = url.protocol === 'https:';
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request(
      url,
      {
        method: 'POST',
        agent: secure ? httpsAgent : httpAgent,
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(config.meiliApiKey ? { Authorization: `Bearer ${config.meiliApiKey}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if ((res.statusCode ?? 500) >= 400) {
            reject(new ExternalServiceError('Meilisearch', `${res.statusCode}: ${text.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new ExternalServiceError('Meilisearch', 'Invalid JSON response'));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new ExternalServiceError('Meilisearch', 'Search timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}
