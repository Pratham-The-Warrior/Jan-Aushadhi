// ============================================================
// JAN AUSHADHI — Server Entrypoint
// Boots the application and manages graceful shutdown.
// All configuration and wiring lives in app.ts.
// ============================================================

import { config } from './shared/config';
import { buildApp } from './app';
import { closeDatabasePool } from './shared/infra/database';
import { closeRedis } from './shared/infra/redis';

async function start(): Promise<void> {
  const server = await buildApp();

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`\n🚀 Jan Aushadhi API running at http://localhost:${config.port}`);
    console.log(`   Architecture: Modular Monolith`);
    console.log(`   Environment:  ${config.env}\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  // ---- Graceful Shutdown ----
  const shutdown = async (signal: string) => {
    console.log(`\n⏳ ${signal} received — shutting down gracefully...`);

    try {
      // 1. Stop accepting new connections
      await server.close();
      console.log('   ✓ HTTP server closed');

      // 2. Close infrastructure connections
      await closeRedis();
      await closeDatabasePool();

      console.log('   ✓ All connections closed');
      console.log('👋 Goodbye.\n');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
}

start();
