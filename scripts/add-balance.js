const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBalance() {
  // Usar o KP ID da tua conta (substitui pelo teu)
  const kpId = 'MZ-76918155-1';
  const amount = 5000;
  
  const wallet = await prisma.wallet.update({
    where: { kp_id: kpId },
    data: { balance: { increment: amount } }
  });
  
  console.log(`✅ Adicionado ${amount} MZN à conta ${kpId}`);
  console.log(`💰 Novo saldo: ${wallet.balance} MZN`);
}

addBalance()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
