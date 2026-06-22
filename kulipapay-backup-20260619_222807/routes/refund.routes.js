/**
 * REFUND ROUTES
 * 
 * 🎯 Rotas para reversão de transações
 */

const { authenticate } = require('../middlewares/auth.middleware');
const { refundTransaction } = require('../controllers/refund.controller');

async function refundRoutes(fastify) {
  
  /**
   * POST /api/refund
   * Reverter uma transação
   */
  fastify.post('/refund', {
    preHandler: [authenticate]
  }, refundTransaction);
}

module.exports = refundRoutes;
