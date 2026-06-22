const { prisma } = require('./src/prisma');


async function addBalance() {
  const result = await prisma.wallet.update({
    where: { kp_id: 'KP-47600871-1' },
    data: { balance: { increment: 1000 } }
  });
  console.log(`✅ Saldo atualizado: ${result.balance}`);
}

addBalance();
