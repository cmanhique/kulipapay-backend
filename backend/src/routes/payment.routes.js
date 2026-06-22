/**
 * PAYMENT ROUTES
 * 
 * 🎯 Rotas para pagamentos (multi-provider)
 */

const { authenticate } = require('../middlewares/auth.middleware');
const {
  deposit,
  withdraw,
  getStatus,
  getTransactions,
  webhook
} = require('../controllers/payment.controller');

async function paymentRoutes(fastify) {
  
  // Depósito (Cash-In)
  fastify.post('/payment/deposit', {
    preHandler: [authenticate]
  }, deposit);
  
  // Saque (Cash-Out)
  fastify.post('/payment/withdraw', {
    preHandler: [authenticate]
  }, withdraw);
  
  // Verificar status
  fastify.get('/payment/status/:transactionId', {
    preHandler: [authenticate]
  }, getStatus);
  
  // Listar transações
  fastify.get('/payment/transactions', {
    preHandler: [authenticate]
  }, getTransactions);
  
  // Webhook (callback do provider - público)
  fastify.post('/payment/webhook/:provider', webhook);
}

module.exports = paymentRoutes;
