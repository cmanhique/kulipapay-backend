/**
 * LEDGER ADMIN ROUTES
 * 
 * 🎯 Endpoints para monitorização do ledger
 */

const { authenticate } = require('../../middlewares/auth.middleware');
const LedgerProjectionService = require('../../services/ledger.projection.service');
const { autoReconcile } = require('../../jobs/auto-reconcile');

async function adminLedgerRoutes(fastify) {
  
  // Verificar consistência do ledger
  fastify.get('/admin/ledger/status', { preHandler: authenticate }, async (req, reply) => {
    try {
      const general = await LedgerProjectionService.getGeneralLedgerBalance();
      const wallets = await LedgerProjectionService.getAllWalletBalances();
      const total = await LedgerProjectionService.getTotalLedgerBalance();
      
      const walletTotal = wallets.reduce((sum, w) => sum + w.walletBalance, 0);
      const inconsistent = wallets.filter(w => !w.isConsistent);

      return {
        success: true,
        data: {
          general: general,
          totalLedgerBalance: total,
          totalWalletBalance: walletTotal,
          isReconciled: Math.abs(total - walletTotal) < 0.01,
          wallets: wallets,
          inconsistentCount: inconsistent.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Executar reconciliação manual
  fastify.post('/admin/ledger/reconcile', { preHandler: authenticate }, async (req, reply) => {
    try {
      await autoReconcile();
      return {
        success: true,
        message: 'Reconciliação executada com sucesso',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = adminLedgerRoutes;
