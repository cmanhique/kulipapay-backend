const walletService = require('../services/wallet.service');
const transactionService = require('../services/transaction.service');

class WalletController {
  
  async getBalance(request, reply) {
    const { kpId } = request.user;
    
    try {
      const balance = await transactionService.getBalance(kpId);
      
      return reply.send({
        kpId,
        balance,
        currency: 'MZN'
      });
    } catch (error) {
      return reply.status(404).send({ error: error.message || 'WALLET_NOT_FOUND' });
    }
  }
  
  async getTransactions(request, reply) {
    const { kpId } = request.user;
    const { limit = 50, offset = 0 } = request.query;
    
    const transactions = await walletService.getTransactions(kpId, limit, offset);
    
    return reply.send({
      transactions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        returned: transactions.length
      }
    });
  }
  
  async getLedger(request, reply) {
    const { kpId } = request.user;
    const { limit = 100 } = request.query;
    
    const entries = await walletService.getLedgerEntries(kpId, limit);
    
    return reply.send({
      ledgerEntries: entries,
      total: entries.length
    });
  }
  
  async getWalletInfo(request, reply) {
    const { kpId } = request.user;
    
    const info = await walletService.getWalletInfo(kpId);
    
    return reply.send(info);
  }
}

module.exports = new WalletController();
