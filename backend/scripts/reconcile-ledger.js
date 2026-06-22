/**
 * RECONCILE LEDGER
 * 
 * 🎯 Verifica integridade do ledger comparando:
 * Wallet.balance vs Soma(TransactionLedger)
 * 
 * Regra: Wallet.balance = SUM(CREDIT) - SUM(DEBIT)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcile() {
  console.log('📊 INICIANDO RECONCILIAÇÃO DO LEDGER...\n');
  
  // 1. Buscar todas as wallets
  const wallets = await prisma.wallet.findMany({
    include: { account: true }
  });
  
  console.log(`🔍 Encontradas ${wallets.length} wallets para verificar\n`);
  
  let totalDivergencias = 0;
  let totalSaldo = 0;
  let totalLedger = 0;
  const divergencias = [];
  
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
    
    totalSaldo += walletBalance;
    totalLedger += ledgerBalance;
    
    // 3. Verificar divergência
    const diff = Math.abs(walletBalance - ledgerBalance);
    
    if (diff > 0.01) {
      totalDivergencias++;
      divergencias.push({
        kp_id: wallet.kp_id,
        walletBalance,
        ledgerBalance,
        diff,
        totalCredits,
        totalDebits,
        email: wallet.account?.email || wallet.kp_id
      });
      
      console.log(`❌ DIVERGÊNCIA: ${wallet.kp_id}`);
      console.log(`   Wallet: ${walletBalance.toFixed(2)} MZN`);
      console.log(`   Ledger: ${ledgerBalance.toFixed(2)} MZN`);
      console.log(`   Diferença: ${diff.toFixed(2)} MZN`);
      console.log(`   Créditos: ${totalCredits.toFixed(2)}`);
      console.log(`   Débitos: ${totalDebits.toFixed(2)}`);
      console.log(`   Conta: ${wallet.account?.email || wallet.kp_id}`);
      console.log('');
    }
  }
  
  // 4. Resumo
  console.log('📊 RESUMO DA RECONCILIAÇÃO');
  console.log('========================================');
  console.log(`✅ Wallets verificadas: ${wallets.length}`);
  console.log(`✅ Divergências encontradas: ${totalDivergencias}`);
  console.log(`💰 Saldo total das Wallets: ${totalSaldo.toFixed(2)} MZN`);
  console.log(`📒 Saldo total do Ledger: ${totalLedger.toFixed(2)} MZN`);
  console.log(`📊 Diferença total: ${(totalSaldo - totalLedger).toFixed(2)} MZN`);
  
  if (totalDivergencias === 0) {
    console.log('\n✅ LEDGER PERFEITAMENTE RECONCILIADO! 🎉');
  } else {
    console.log(`\n⚠️  ${totalDivergencias} divergências encontradas!`);
    console.log('\n📝 Detalhes das divergências:');
    divergencias.forEach(d => {
      console.log(`   - ${d.kp_id}: ${d.diff.toFixed(2)} MZN (Wallet: ${d.walletBalance.toFixed(2)}, Ledger: ${d.ledgerBalance.toFixed(2)})`);
    });
    console.log('\n   Execute a correção manualmente ou use o script de correção.');
  }
  
  await prisma.$disconnect();
}

// Executar
reconcile().catch(console.error);
