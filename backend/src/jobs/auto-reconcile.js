/**
 * AUTO-RECONCILIATION JOB
 * 
 * 🎯 Executa periodicamente para garantir consistência financeira
 * 
 * ⚠️  NUNCA altera o ledger - apenas atualiza wallets a partir do ledger
 */

const { prisma } = require('../prisma');
const WebSocketService = require('../core/websocket/websocket.service');

async function autoReconcile() {
  console.log(`🔧 [${new Date().toISOString()}] INICIANDO AUTO-RECONCILIAÇÃO...`);

  const wallets = await prisma.wallet.findMany();
  let updated = 0;
  let totalDiff = 0;
  const changes = [];

  for (const wallet of wallets) {
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
      await prisma.wallet.update({
        where: { kp_id: wallet.kp_id },
        data: {
          balance: ledgerBalance,
          version: { increment: 1 }
        }
      });

      changes.push({
        kp_id: wallet.kp_id,
        previous: currentBalance,
        new: ledgerBalance,
        diff: diff
      });

      updated++;
      totalDiff += diff;
    }
  }

  if (changes.length > 0) {
    console.log(`✅ ${updated} wallets reconciliadas`);
    console.log(`📊 Diferença total: ${totalDiff}`);
    
    WebSocketService.broadcastToAll({
      type: 'LEDGER_RECONCILED',
      data: {
        timestamp: new Date().toISOString(),
        changes: changes,
        totalDiff: totalDiff
      }
    });

    await prisma.auditLog.create({
      data: {
        kp_id: 'SYSTEM',
        action: 'AUTO_RECONCILE',
        module: 'ledger',
        details: {
          changes: changes,
          totalDiff: totalDiff,
          timestamp: new Date().toISOString()
        }
      }
    });
  } else {
    console.log('✅ Todas as wallets já estão reconciliadas');
  }
}

if (require.main === module) {
  autoReconcile().catch(console.error);
}

module.exports = { autoReconcile };