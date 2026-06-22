const { PrismaClient } = require('@prisma/client');

// =========================
// GLOBAL SINGLETON SAFETY
// =========================

const globalForPrisma = globalThis;

// =========================
// PRISMA INSTANCE
// =========================

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: getLogsConfig()
  });

// =========================
// AVOID MULTIPLE CONNECTIONS IN DEV
// =========================

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// =========================
// LOG CONFIG
// =========================

function getLogsConfig() {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    return ['error'];
  }

  if (env === 'test') {
    return [];
  }

  return ['warn', 'error', 'info'];
}

// =========================
// SAFE DISCONNECT ON EXIT
// =========================

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

// =========================
// EXPORT
// =========================

module.exports = { prisma };