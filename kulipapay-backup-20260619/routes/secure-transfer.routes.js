/**
 * SECURE TRANSFER ROUTES
 */

const { authenticate } = require('../middlewares/auth.middleware');
const SecureTransferService = require('../services/secure-transfer.service');
const { 
  confirmTransaction,
  rejectTransaction,
  getPending
} = require('../controllers/confirmation.controller');

async function secureTransferRoutes(fastify) {
  
  // Transferência segura (com confirmação)
  fastify.post('/transfer/secure', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const { to, amount, description } = req.body;
      const from = req.user.kp_id;
      
      const result = await SecureTransferService.sendWithConfirmation({
        from,
        to,
        amount,
        req,
        description
      });
      
      return reply.send({ success: true, data: result });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TRANSFER_FAILED',
          message: error.message
        }
      });
    }
  });
  
  // Confirmar recebimento
  fastify.post('/transfer/confirm', {
    preHandler: [authenticate]
  }, confirmTransaction);
  
  // Rejeitar recebimento
  fastify.post('/transfer/reject', {
    preHandler: [authenticate]
  }, rejectTransaction);
  
  // Listar pendentes
  fastify.get('/transfer/pending', {
    preHandler: [authenticate]
  }, getPending);
}

module.exports = secureTransferRoutes;
