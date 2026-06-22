const { prisma } = require('./prisma');

async function addBalance() {
  const kpId = 'KP-01436656-1';
  const amount = 1000;
  
  const wallet = await prisma.wallet.update({
    where: { kp_id: kpId },
    data: { balance: { increment: amount } }
  });
  
  console.log(`✅ Adicionado ${amount} para ${kpId}`);
  console.log(`💰 Novo saldo: ${wallet.balance}`);
  
  await prisma.$disconnect();
}

addBalance();