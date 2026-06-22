const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createFixedUsers() {
  console.log('\n👥 Criando utilizadores fixos...\n');

  // Utilizador 1 (Remetente)
  const user1 = {
    kp_id: 'FIXED-USER-001',
    email: 'remetente@kulipapay.com',
    phone: '+258999999001',
    name: 'João Remetente',
    password: '123456',
    account_type: 'INDIVIDUAL',
    status: 'ACTIVE',
    country: 'MZ'
  };

  // Utilizador 2 (Destinatário)
  const user2 = {
    kp_id: 'FIXED-USER-002',
    email: 'destinatario@kulipapay.com',
    phone: '+258999999002',
    name: 'Maria Destinatária',
    password: '123456',
    account_type: 'INDIVIDUAL',
    status: 'ACTIVE',
    country: 'MZ'
  };

  // Apagar utilizadores antigos se existirem
  console.log('🗑️ A apagar utilizadores antigos...');
  
  await prisma.session.deleteMany({
    where: {
      OR: [
        { kp_id: user1.kp_id },
        { kp_id: user2.kp_id }
      ]
    }
  }).catch(() => {});
  
  await prisma.wallet.deleteMany({
    where: {
      OR: [
        { kp_id: user1.kp_id },
        { kp_id: user2.kp_id }
      ]
    }
  }).catch(() => {});
  
  await prisma.account.deleteMany({
    where: {
      OR: [
        { kp_id: user1.kp_id },
        { email: user1.email },
        { phone: user1.phone },
        { email: user2.email },
        { phone: user2.phone }
      ]
    }
  }).catch(() => {});

  // Criar Utilizador 1
  console.log('📱 Criando remetente...');
  const hashedPassword1 = await bcrypt.hash(user1.password, 12);
  const account1 = await prisma.account.create({
    data: {
      kp_id: user1.kp_id,
      email: user1.email,
      phone: user1.phone,
      name: user1.name,
      password_hash: hashedPassword1,
      account_type: user1.account_type,
      status: user1.status,
      country: user1.country
    }
  });
  
  await prisma.wallet.create({
    data: { kp_id: user1.kp_id, balance: 10000 }
  });

  // Criar Utilizador 2
  console.log('📱 Criando destinatário...');
  const hashedPassword2 = await bcrypt.hash(user2.password, 12);
  const account2 = await prisma.account.create({
    data: {
      kp_id: user2.kp_id,
      email: user2.email,
      phone: user2.phone,
      name: user2.name,
      password_hash: hashedPassword2,
      account_type: user2.account_type,
      status: user2.status,
      country: user2.country
    }
  });
  
  await prisma.wallet.create({
    data: { kp_id: user2.kp_id, balance: 0 }
  });

  console.log('\n✅ UTILIZADORES FIXOS CRIADOS!');
  console.log('================================');
  console.log('');
  console.log('📱 REMETENTE (tem saldo):');
  console.log(`   KP ID: ${user1.kp_id}`);
  console.log(`   Email: ${user1.email}`);
  console.log(`   Telefone: ${user1.phone}`);
  console.log(`   Senha: ${user1.password}`);
  console.log(`   Saldo: 10.000 MZN`);
  console.log('');
  console.log('📱 DESTINATÁRIO (sem saldo):');
  console.log(`   KP ID: ${user2.kp_id}`);
  console.log(`   Email: ${user2.email}`);
  console.log(`   Telefone: ${user2.phone}`);
  console.log(`   Senha: ${user2.password}`);
  console.log(`   Saldo: 0 MZN`);
  console.log('');
  console.log('================================');
  console.log('');
  console.log('💡 Para transferir:');
  console.log(`   Enviar de ${user1.kp_id} para ${user2.kp_id}`);
  console.log('');
}

createFixedUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
