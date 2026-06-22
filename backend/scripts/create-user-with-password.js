const { prisma } = require('../src/prisma');
const bcrypt = require('bcrypt');

async function createUser() {
  try {
    const email = 'teste@kulipapay.com';
    const password = 'Teste@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verificar se já existe
    const existing = await prisma.account.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('❌ Usuário já existe!');
      console.log('📧 Email:', existing.email);
      console.log('🔑 Tente a senha: 123456 ou Teste@123');
      await prisma.$disconnect();
      return;
    }

    // Criar novo usuário com TODOS os nomes CORRETOS do banco
    const user = await prisma.account.create({
      data: {
        email: email,
        phone: '+258841234567',
        password_hash: hashedPassword,
        name: 'Usuário Teste',
        kp_id: 'KP-TEST-001',
        account_type: 'INDIVIDUAL',
        status: 'ACTIVE',
        wallet: {
          create: {
            balance: 10000,
            frozen_balance: 0  // ← nome correto com underscore
          }
        }
      },
      include: {
        wallet: true
      }
    });

    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Senha:', password);
    console.log('💰 Saldo:', user.wallet?.balance || 0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
