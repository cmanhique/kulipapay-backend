const { prisma } = require('../src/prisma');

async function checkUsers() {
  try {
    const users = await prisma.account.findMany({
      select: {
        email: true,
        kp_id: true,
        account_type: true,
        status: true,
        name: true,
        phone: true
      }
    });
    console.log('📊 Usuários no banco:');
    console.log(JSON.stringify(users, null, 2));
    console.log('\n📊 Total:', users.length);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
