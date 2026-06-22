/**
 * RECONCILIAR WALLETS COM LEDGER
 * 
 * 🎯 Recalcula todas as wallets a partir do ledger
 * ⚠️  Isto faz com que o ledger seja a fonte de verdade
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcile() {
  console.log('🔧 RECONCILIANDO WALLETS COM O LEDGER...\n');

  // Buscar todas as wallets
  const wallets = await prisma.wallet.findMany();
  
  let updated = 0;
  let totalDiff = 0;

  for (const wallet of wallets) {
    // Calcular saldo do ledger para esta wallet
    const debits = await prisma.transactionLedger.aggregate({
      where: {
        kp_id: wallet.kp_id,
        type: 'DEBIT',
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });

    const credits = await prisma.transactionLedger.aggregate({
      where: {
        kp_id: wallet.kp_id,
        type: 'CREDIT',
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });

    const totalDebits = Number(debits._sum.amount || 0);
    const totalCredits = Number(credits._sum.amount || 0);
    const ledgerBalance = totalCredits - totalDebits;
    const currentBalance = Number(wallet.balance);
    const diff = ledgerBalance - currentBalance;

    if (Math.abs(diff) > 0.01) {
      console.log(`  ${wallet.kp_id}: ${currentBalance} → ${ledgerBalance} (diferença: ${diff})`);
      
      await prisma.wallet.update({
        where: { kp_id: wallet.kp_id },
        data: {
          balance: ledgerBalance,
          version: { increment: 1 }
        }
      });
      
      updated++;
      totalDiff += diff;
    }
  }

  console.log(`\n✅ ${updated} wallets reconciliadas`);
  console.log(`📊 Diferença total corrigida: ${totalDiff}`);
  
  await prisma.$disconnect();
}

reconcile().catch(console.error);
