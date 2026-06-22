require('dotenv').config();

const { prisma } = require('./prisma');

console.log('🔥 INDEX.JS INICIADO!');

// =========================
// START SERVER
// =========================

const EXPIRE_JOB_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
let expireJobTimer = null;

function startBackgroundJobs() {
  const { expireTransactions } = require('./jobs/expire-transactions');

  expireTransactions().catch((error) => {
    console.error('❌ EXPIRE_JOB_INITIAL_RUN_FAILED', error.message);
  });

  expireJobTimer = setInterval(() => {
    expireTransactions().catch((error) => {
      console.error('❌ EXPIRE_JOB_FAILED', error.message);
    });
  }, EXPIRE_JOB_INTERVAL_MS);

  console.log('⏰ Job de expiração de transacções agendado (cada 1h)');
}

const start = async () => {
  try {
    console.log('📌 A CRIAR FASTIFY...');
    const fastify = require('fastify')({
      logger: false,
      trustProxy: true
    });

    console.log('📌 A CARREGAR APP.JS...');
    await require('./app')(fastify);
    console.log('✅ ROTAS REGISTADAS COM SUCESSO!');

    const PORT = Number(process.env.PORT) || 3000;
    const HOST = '0.0.0.0';

    console.log('📌 A TESTAR DB CONNECTION...');
    await prisma.$connect();

    console.log('📌 A INICIAR SERVIDOR...');
    await fastify.listen({
      port: PORT,
      host: HOST
    });

    startBackgroundJobs();

    console.log('=================================');
    console.log('🚀 KulipaPay API STARTED');
    console.log('=================================');
    console.log(`🌍 Server: http://localhost:${PORT}`);
    console.log(`❤️ Health: http://localhost:${PORT}/health`);
    console.log('=================================');
    console.log('📌 Routes:');
    console.log('   - /api/auth/login');
    console.log('   - /api/merchant/dashboard');
    console.log('   - /api/wallet/balance');
    console.log('   - /api/cashier/list');
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ SERVER_START_FAILED', {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
    process.exit(1);
  }
};

// =========================
// GRACEFUL SHUTDOWN
// =========================

async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  try {
    if (expireJobTimer) {
      clearInterval(expireJobTimer);
    }
    await prisma.$disconnect();
    console.log('✅ Shutdown completed safely');
    process.exit(0);
  } catch (error) {
    console.error('❌ SHUTDOWN_ERROR', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('🔥 UNCAUGHT_EXCEPTION', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 UNHANDLED_REJECTION', reason);
  process.exit(1);
});

start();