const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function backup() {
  const wallets = await prisma.wallet.findMany();
  const data = JSON.stringify(wallets, null, 2);
  const filename = `wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, data);
  console.log(`✅ Backup criado: ${filename}`);
  console.log(`📊 ${wallets.length} wallets guardadas`);
  await prisma.$disconnect();
}

backup().catch(console.error);
