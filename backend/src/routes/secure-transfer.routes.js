/**
 * SECURE TRANSFER ROUTES
 */

const { authenticate } = require('../middlewares/auth.middleware');
const SecureTransferService = require('../services/secure-transfer.service');
const TransactionEngine = require('../core/engines/transaction.engine');
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
  
  // Confirmar recebimento (destinatário)
  fastify.post('/transfer/confirm', {
    preHandler: [authenticate]
  }, confirmTransaction);
  
  // Rejeitar recebimento (destinatário)
  fastify.post('/transfer/reject', {
    preHandler: [authenticate]
  }, rejectTransaction);
  
  // 🔐 NOVO: Finalizar transferência (remetente com PIN/OTP)
  fastify.post('/transfer/finalize', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const { transactionId, pin } = req.body;
      const kp_id = req.user.kp_id;
      
      if (!transactionId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'TRANSACTION_ID_REQUIRED',
            message: 'transactionId is required'
          }
        });
      }
      
      const result = await TransactionEngine.senderFinalize(
        transactionId,
        kp_id,
        pin
      );
      
      return reply.send({ success: true, data: result });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FINALIZE_FAILED',
          message: error.message
        }
      });
    }
  });
  
  // Listar pendentes
  fastify.get('/transfer/pending', {
    preHandler: [authenticate]
  }, getPending);
}

module.exports = secureTransferRoutes;
