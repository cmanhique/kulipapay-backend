const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createFloatAccount() {
  const floatKpId = 'SYSTEM_FLOAT';
  
  const existing = await prisma.account.findUnique({
    where: { kp_id: floatKpId }
  });
  
  if (!existing) {
    const hashedPassword = await bcrypt.hash('float-secure', 12);
    
    await prisma.account.create({
      data: {
        kp_id: floatKpId,
        phone: '+258000000000',
        password_hash: hashedPassword,
        account_type: 'BUSINESS',
        status: 'ACTIVE',
        country: 'SYSTEM'
      }
    });
    
    await prisma.wallet.create({
      data: {
        kp_id: floatKpId,
        balance: 10000000
      }
    });
    
    console.log('✅ Float account created with 10,000,000 MZN');
  } else {
    console.log('✅ Float account already exists');
  }
}

createFloatAccount()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
