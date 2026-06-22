const { prisma } = require('../src/prisma');
const bcrypt = require('bcrypt');

async function createMerchant() {
  try {
    const email = 'loja@kulipa.com';
    const password = 'Merchant@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verificar se já existe
    const existing = await prisma.account.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('❌ Comerciante já existe!');
      console.log('📧 Email:', existing.email);
      console.log('🆔 KP_ID:', existing.kp_id);
      await prisma.$disconnect();
      return;
    }

    // Criar comerciante com nomes CORRETOS do schema
    const merchant = await prisma.account.create({
      data: {
        email: email,
        phone: '+258843456789',
        password_hash: hashedPassword,  // ← password_hash (com underscore)
        name: 'Loja Kulipa',
        kp_id: 'MER-KULIPA-001',        // ← kp_id (com underscore)
        account_type: 'MERCHANT',       // ← account_type (com underscore)
        status: 'ACTIVE',
        wallet: {
          create: {
            balance: 100000,
            frozen_balance: 0           // ← frozen_balance (com underscore)
          }
        }
      },
      include: {
        wallet: true
      }
    });

    console.log('✅ Comerciante criado com sucesso!');
    console.log('📧 Email:', merchant.email);
    console.log('🔑 Senha:', password);
    console.log('🆔 KP_ID:', merchant.kp_id);
    console.log('💰 Saldo:', merchant.wallet?.balance || 0);
    console.log('👤 Tipo:', merchant.account_type);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createMerchant();
