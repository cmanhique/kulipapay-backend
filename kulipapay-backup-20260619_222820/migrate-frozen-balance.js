const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔧 Migrando wallets para frozen_balance...');
  
  const wallets = await prisma.wallet.findMany();
  
  for (const wallet of wallets) {
    await prisma.wallet.update({
      where: { kp_id: wallet.kp_id },
      data: {
        frozen_balance: 0,
        available_balance: wallet.balance
      }
    });
  }
  
  console.log(`✅ ${wallets.length} wallets migradas!`);
  await prisma.$disconnect();
}

migrate().catch(console.error);
