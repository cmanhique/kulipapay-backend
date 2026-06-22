const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tx = await prisma.transaction.findUnique({
    where: { transactionId: '5dbe1469-5b3a-4ce4-ab45-9865dbd1845e' }
  });
  console.log('Transação:', JSON.stringify(tx, null, 2));
  await prisma.$disconnect();
}

check();
