const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const account = await prisma.account.findUnique({
      where: { kp_id: 'PLATFORM_ESCROW' },
      include: { wallet: true }
    });
    
    console.log('📊 PLATFORM_ESCROW:', account ? '✅ EXISTE' : '❌ NÃO EXISTE');
    
    if (account) {
      console.log('   kp_id:', account.kp_id);
      console.log('   email:', account.email);
      console.log('   wallet balance:', account.wallet?.balance || 0);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await prisma.$disconnect();
  }
}

check();
