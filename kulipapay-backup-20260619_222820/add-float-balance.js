const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFloatBalance() {
  const float = await prisma.wallet.findUnique({
    where: { kp_id: 'KP-FLOAT-ACCOUNT' }
  });
  
  if (float && float.balance === 0) {
    await prisma.wallet.update({
      where: { kp_id: 'KP-FLOAT-ACCOUNT' },
      data: { balance: 1000000 }
    });
    console.log('✅ Float account funded with 1,000,000 MZN');
  } else if (float) {
    console.log(`✅ Float account already has ${float.balance} MZN`);
  } else {
    console.log('❌ Float account not found');
  }
}

addFloatBalance();
