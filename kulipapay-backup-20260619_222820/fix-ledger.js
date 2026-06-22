/**
 * FIX LEDGER
 * 
 * 🎯 Corrige divergências entre Wallet.balance e Ledger
 * 
 * ⚠️ ATENÇÃO: Este script atualiza wallets com base no ledger
 * Use com cuidado e sempre faça backup antes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLedger() {
  console.log('🔧 INICIANDO CORREÇÃO DO LEDGER...\n');
  
  // 1. Buscar todas as wallets
  const wallets = await prisma.wallet.findMany();
  
  let corrigidos = 0;
  
  for (const wallet of wallets) {
    // 2. Calcular saldo do ledger
    const result = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits
      FROM transaction_ledger
      WHERE kp_id = ${wallet.kp_id}
      AND status = 'CONFIRMED'
    `;
    
    const totalCredits = Number(result[0]?.total_credits || 0);
    const totalDebits = Number(result[0]?.total_debits || 0);
    const ledgerBalance = totalCredits - totalDebits;
    const walletBalance = Number(wallet.balance);
    
    const diff = Math.abs(walletBalance - ledgerBalance);
    
    if (diff > 0.01) {
      console.log(`🔧 Corrigindo ${wallet.kp_id}: ${walletBalance.toFixed(2)} → ${ledgerBalance.toFixed(2)} MZN`);
      
      await prisma.wallet.update({
        where: { kp_id: wallet.kp_id },
        data: { 
          balance: ledgerBalance,
          version: { increment: 1 }
        }
      });
      
      corrigidos++;
    }
  }
  
  console.log(`\n✅ ${corrigidos} wallets corrigidas!`);
  
  await prisma.$disconnect();
}

// Executar com confirmação
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  Tem certeza que deseja corrigir as divergências? (s/N): ', async (answer) => {
  if (answer.toLowerCase() === 's') {
    await fixLedger();
  } else {
    console.log('❌ Operação cancelada.');
  }
  rl.close();
});
