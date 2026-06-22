/**
 * TRANSACTION DOMAIN ROUTES
 */

const { authenticate } = require('../middlewares/auth.middleware');
const {
  createTransaction,
  confirmTransaction,
  rejectTransaction,
  getPending
} = require('../controllers/transaction.domain.controller');

async function transactionDomainRoutes(fastify) {
  
  // Criar transação (com modo SECURE ou INSTANT)
  fastify.post('/transaction', {
    preHandler: [authenticate]
  }, createTransaction);
  
  // Confirmar transação
  fastify.post('/transaction/confirm', {
    preHandler: [authenticate]
  }, confirmTransaction);
  
  // Rejeitar transação
  fastify.post('/transaction/reject', {
    preHandler: [authenticate]
  }, rejectTransaction);
  
  // Listar pendentes
  fastify.get('/transaction/pending', {
    preHandler: [authenticate]
  }, getPending);
}

module.exports = transactionDomainRoutes;
