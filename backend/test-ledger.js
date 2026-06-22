const { prisma } = require('./src/prisma');



async function test() {
  try {
    // Testar conexão
    console.log('🔄 Conectando ao banco...');
    
    // Buscar a conta "User Wallets"
    const userWalletAccount = await prisma.ledgerAccount.findUnique({
      where: { code: '1-1000' }
    });
    
    console.log('✅ Conexão OK!');
    console.log('📊 Conta encontrada:', userWalletAccount?.name);
    console.log('📊 Total de contas no plano:', await prisma.ledgerAccount.count());
    
    // Listar todas as contas
    const allAccounts = await prisma.ledgerAccount.findMany({
      select: { code: true, name: true, type: true }
    });
    
    console.log('\n📋 PLANO DE CONTAS:');
    allAccounts.forEach(acc => {
      console.log(`   ${acc.code} | ${acc.name} | ${acc.type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
