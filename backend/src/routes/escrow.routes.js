/**
 * ESCROW ROUTES
 */

const { authenticate } = require('../middlewares/auth.middleware');
const {
  createEscrow,
  confirmPayment,
  releaseFunds,
  dispute,
  refund,
  getEscrows,
  getPending,
  getHeld
} = require('../controllers/escrow.controller');

async function escrowRoutes(fastify) {
  
  // Criar escrow
  fastify.post('/escrow', {
    preHandler: [authenticate]
  }, createEscrow);
  
  // Confirmar pagamento para escrow
  fastify.post('/escrow/confirm', {
    preHandler: [authenticate]
  }, confirmPayment);
  
  // Libertar fundos (vendedor)
  fastify.post('/escrow/release', {
    preHandler: [authenticate]
  }, releaseFunds);
  
  // Disputar
  fastify.post('/escrow/dispute', {
    preHandler: [authenticate]
  }, dispute);
  
  // Reembolsar (admin)
  fastify.post('/escrow/refund', {
    preHandler: [authenticate]
  }, refund);
  
  // Listar escrows
  fastify.get('/escrow', {
    preHandler: [authenticate]
  }, getEscrows);
  
  // Pendentes
  fastify.get('/escrow/pending', {
    preHandler: [authenticate]
  }, getPending);
  
  // Em custódia
  fastify.get('/escrow/held', {
    preHandler: [authenticate]
  }, getHeld);
}

module.exports = escrowRoutes;
