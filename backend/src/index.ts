// ============================================================
// JAN AUSHADHI — Main Fastify Server
// Wires all 7 Modules together into one high-concurrency API
// ============================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { MeiliSearch } from 'meilisearch';
import * as dotenv from 'dotenv';

// Plugins
import { checkDB } from './plugins/db';
import { initRedis } from './plugins/redis';

// Routes (Modules 3-6)
import discoveryRoutes from './routes/discovery';
import storeRoutes from './routes/stores';
import requirementRoutes from './routes/requirements';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const server = Fastify({
  logger: {
    level: 'info',
  },
});

// Meilisearch client (Module 2)
const meiliClient = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || 'masterKey',
});

async function start() {
  // ---- Global Middleware ----
  await server.register(cors, { origin: '*' });
  await server.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // ---- Initialize infrastructure ----
  console.log('\n=== JAN AUSHADHI API SERVER ===\n');

  // Database (PostgreSQL + PostGIS)
  await checkDB();

  // Redis Cache
  await initRedis();

  // Meilisearch health check
  try {
    const health = await meiliClient.health();
    console.log(`✅ Meilisearch: ${health.status}`);
  } catch {
    console.warn('⚠️  Meilisearch not available — search will return errors');
  }

  // ---- Health Check ----
  server.get('/api/v1/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    stack: 'Fastify + TypeScript',
    services: {
      database: 'PostgreSQL + PostGIS',
      search: 'Meilisearch',
      cache: 'Redis',
      notifications: 'Twilio WhatsApp',
      auth: 'Firebase Admin',
    },
  }));

  // ---- Register Route Modules ----
  
  // Module 3: Medicine Discovery & Comparison
  discoveryRoutes(server, meiliClient);

  // Module 4: Hyper-Local Proximity Service
  storeRoutes(server);

  // Module 5: Requirement & Cart Management
  requirementRoutes(server);

  // Module 6: User Wellness & Dashboard
  dashboardRoutes(server);

  // ---- Route listing ----
  console.log('\n📋 Registered API Routes:');
  console.log('   GET  /api/v1/health');
  console.log('   GET  /api/v1/search?query=...');
  console.log('   GET  /api/v1/discovery/:branded_id');
  console.log('   GET  /api/v1/stores/nearby?lat=...&lng=...');
  console.log('   GET  /api/v1/stores/:pmbjk_code');
  console.log('   POST /api/v1/stores/confirm/:requirement_id');
  console.log('   POST /api/v1/requirements/create');
  console.log('   GET  /api/v1/requirements');
  console.log('   GET  /api/v1/requirements/:id');
  console.log('   GET  /api/v1/user/dashboard');
  console.log('   GET  /api/v1/user/profile');
  console.log('   PUT  /api/v1/user/basket');

  // ---- Start Listening ----
  const port = parseInt(process.env.PORT || '5000', 10);

  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`\n🚀 Jan Aushadhi API running at http://localhost:${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
