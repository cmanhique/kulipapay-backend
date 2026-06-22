const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createEscrowAccount() {
  try {
    // Verificar se já existe
    const existing = await prisma.account.findUnique({
      where: { kp_id: 'PLATFORM_ESCROW' }
    });

    if (existing) {
      console.log('✅ Conta PLATFORM_ESCROW já existe');
      console.log('   kp_id:', existing.kp_id);
      console.log('   email:', existing.email);
      await prisma.$disconnect();
      return;
    }

    // Criar conta
    const account = await prisma.account.create({
      data: {
        kp_id: 'PLATFORM_ESCROW',
        email: 'escrow@kulipa.com',
        phone: '999999999',
        name: 'Escrow Platform',
        password_hash: await bcrypt.hash('escrow123', 10),
        account_type: 'BUSINESS',
        role: 'PLATFORM',
        status: 'ACTIVE'
      }
    });

    // Criar wallet
    const wallet = await prisma.wallet.create({
      data: {
        kp_id: 'PLATFORM_ESCROW',
        balance: 0
      }
    });

    console.log('✅ Conta PLATFORM_ESCROW criada com sucesso!');
    console.log('   kp_id:', account.kp_id);
    console.log('   email:', account.email);
    console.log('   wallet balance:', wallet.balance);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createEscrowAccount();
