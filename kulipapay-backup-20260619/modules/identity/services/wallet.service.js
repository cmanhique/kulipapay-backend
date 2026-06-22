/**
 * WALLET SERVICE
 * 
 * Responsável por:
 * - Buscar saldo
 * - Gerenciar transações
 * - Histórico
 */

const { prisma } = require('../../../prisma');

class WalletService {
  
  static async get(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return {
        balance: 0,
        version: 0
      };
    }

    return {
      balance: parseFloat(wallet.balance),
      version: wallet.version
    };
  }

  static async getBalance(kp_id) {
    const wallet = await this.get(kp_id);
    return wallet.balance;
  }

  static async getMetrics(kp_id) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.transactionLedger.count({
      where: { kp_id, created_at: { gte: today } }
    });

    const totalCount = await prisma.transactionLedger.count({
      where: { kp_id }
    });

    return {
      today: { transactions: todayCount },
      total: { transactions: totalCount }
    };
  }
}

module.exports = WalletService;
