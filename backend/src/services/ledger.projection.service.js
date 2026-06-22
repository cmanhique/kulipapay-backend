/**
 * LEDGER PROJECTION SERVICE
 * 
 * 🎯 Calcula saldos a partir do ledger (fonte de verdade)
 * 
 * ⚠️  NUNCA escreve no ledger - apenas lê e calcula
 */

const { prisma } = require('../prisma');

class LedgerProjectionService {
  
  /**
   * Calcular saldo de uma wallet a partir do ledger
   */
  static async getLedgerBalance(kp_id) {
    const debits = await prisma.transactionLedger.aggregate({
      where: {
        kp_id: kp_id,
        type: 'DEBIT',
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });

    const credits = await prisma.transactionLedger.aggregate({
      where: {
        kp_id: kp_id,
        type: 'CREDIT',
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });

    const totalDebits = Number(debits._sum.amount || 0);
    const totalCredits = Number(credits._sum.amount || 0);
    
    return totalCredits - totalDebits;
  }

  /**
   * Calcular saldo total do sistema a partir do ledger
   */
  static async getTotalLedgerBalance() {
    const debits = await prisma.transactionLedger.aggregate({
      where: { type: 'DEBIT', status: 'CONFIRMED' },
      _sum: { amount: true }
    });

    const credits = await prisma.transactionLedger.aggregate({
      where: { type: 'CREDIT', status: 'CONFIRMED' },
      _sum: { amount: true }
    });

    const totalDebits = Number(debits._sum.amount || 0);
    const totalCredits = Number(credits._sum.amount || 0);
    
    return totalCredits - totalDebits;
  }

  /**
   * Calcular o balanço geral (débitos = créditos)
   */
  static async getGeneralLedgerBalance() {
    const debits = await prisma.transactionLedger.aggregate({
      where: { type: 'DEBIT', status: 'CONFIRMED' },
      _sum: { amount: true }
    });

    const credits = await prisma.transactionLedger.aggregate({
      where: { type: 'CREDIT', status: 'CONFIRMED' },
      _sum: { amount: true }
    });

    return {
      totalDebits: Number(debits._sum.amount || 0),
      totalCredits: Number(credits._sum.amount || 0),
      difference: Number(debits._sum.amount || 0) - Number(credits._sum.amount || 0),
      isBalanced: Math.abs(Number(debits._sum.amount || 0) - Number(credits._sum.amount || 0)) < 0.01
    };
  }

  /**
   * Obter todos os saldos das wallets (apenas leitura)
   */
  static async getAllWalletBalances() {
    const wallets = await prisma.wallet.findMany();
    const result = [];

    for (const wallet of wallets) {
      const ledgerBalance = await this.getLedgerBalance(wallet.kp_id);
      const currentBalance = Number(wallet.balance);
      
      result.push({
        kp_id: wallet.kp_id,
        walletBalance: currentBalance,
        ledgerBalance: ledgerBalance,
        isConsistent: Math.abs(currentBalance - ledgerBalance) < 0.01,
        difference: currentBalance - ledgerBalance
      });
    }

    return result;
  }
}

module.exports = LedgerProjectionService;
