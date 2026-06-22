/**
 * EXPIRED TRANSACTIONS JOB
 * 
 * 🎯 Executa a cada hora para expirar transações pendentes
 */

const TransactionDomainService = require('../services/transaction.domain.service');

async function expireTransactions() {
  console.log(`⏰ [${new Date().toISOString()}] Verificando transações expiradas...`);
  
  try {
    const count = await TransactionDomainService.checkExpired();
    console.log(`✅ ${count} transações expiradas`);
  } catch (error) {
    console.error('❌ Erro ao expirar transações:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  expireTransactions();
}

module.exports = { expireTransactions };
