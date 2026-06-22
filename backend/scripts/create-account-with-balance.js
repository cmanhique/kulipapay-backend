const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAccountWithBalance() {
  const email = 'saldo@teste.com';
  const phone = '+258999999999';
  const password = '123456';
  const initialBalance = 10000;
  
  // Verificar se já existe
  const existing = await prisma.account.findFirst({
    where: { OR: [{ email }, { phone }] }
  });
  
  if (existing) {
    console.log('❌ Conta já existe!');
    console.log(`KP ID: ${existing.kp_id}`);
    return;
  }
  
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const kpId = `MZ-${random}-1`;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const account = await prisma.account.create({
    data: {
      kp_id: kpId,
      email: email,
      phone: phone,
      password_hash: hashedPassword,
      account_type: 'INDIVIDUAL',
      status: 'ACTIVE'
    }
  });
  
  await prisma.wallet.create({
    data: { kp_id: kpId, balance: initialBalance }
  });
  
  console.log('\n✅ CONTA CRIADA COM SALDO!');
  console.log('=========================');
  console.log(`📧 Email: ${email}`);
  console.log(`📱 Telefone: ${phone}`);
  console.log(`🔑 Senha: ${password}`);
  console.log(`🆔 KP ID: ${kpId}`);
  console.log(`💰 Saldo: ${initialBalance} MZN`);
  console.log('=========================\n');
}

createAccountWithBalance()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
