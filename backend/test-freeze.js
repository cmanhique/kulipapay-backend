const { prisma } = require('./src/prisma');
const FrozenBalanceService = require('./src/services/frozen-balance.service');

async function test() {
  try {
    console.log('=== TESTE FREEZE ===');
    
    // Ver saldo antes
    const before = await prisma.wallet.findUnique({
      where: { kp_id: 'MER-00001' }
    });
    console.log('ANTES:', before);
    
    // Executar freeze
    const result = await FrozenBalanceService.freeze(
      'MER-00001',
      10,
      'TESTE',
      { test: true }
    );
    console.log('RESULTADO:', result);
    
    // Ver saldo depois
    const after = await prisma.wallet.findUnique({
      where: { kp_id: 'MER-00001' }
    });
    console.log('DEPOIS:', after);
    
  } catch (error) {
    console.error('ERRO:', error);
  }
}

test();
