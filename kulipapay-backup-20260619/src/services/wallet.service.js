const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WalletService {
  
  async getWalletInfo(kpId) {
    const wallet = await prisma.wallet.findUnique({
      where: { kpId: kpId }
    });
    
    if (!wallet) {
      throw new Error('WALLET_NOT_FOUND');
    }
    
    return {
      kpId: wallet.kpId,
      balance: wallet.balance,
      currency: wallet.currency,
      version: wallet.version,
      lastSync: wallet.last_sync_at
    };
  }
  
  async getTransactions(kpId, limit = 50, offset = 0) {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { from_kp: kpId },
          { to_kp: kpId }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 100),
      skip: offset
    });
    
    return transactions.map(tx => ({
      ...tx,
      type: tx.from_kp === kpId ? 'SENT' : 'RECEIVED',
      counterparty: tx.from_kp === kpId ? tx.to_kp : tx.from_kp,
      direction: tx.from_kp === kpId ? 'OUT' : 'IN',
      amount: tx.amount,
      date: tx.created_at,
      status: tx.status
    }));
  }
  
  async getLedgerEntries(kpId, limit = 100) {
    return prisma.ledgerEntry.findMany({
      where: { kpId: kpId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        transaction: {
          select: {
            tx_id: true,
            type: true,
            idempotency_key: true
          }
        }
      }
    });
  }
}

module.exports = new WalletService();
