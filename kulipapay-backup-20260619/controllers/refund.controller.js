/**
 * REFUND CONTROLLER
 * 
 * 🎯 Controller para reverter transações
 */

const TransactionEngine = require('../core/engines/transaction.engine');
const { handleError } = require('../utils/errors');

async function refundTransaction(req, reply) {
  try {
    const { transactionId, reason } = req.body;
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
    
    // Verificar se o utilizador tem permissão para fazer refund
    // (apenas o remetente original ou admin)
    // TODO: Adicionar verificação de permissão via Policy Engine
    
    const result = await TransactionEngine.reverseTransaction({
      transactionId,
      reason: reason || 'Refund requested by user'
    });
    
    return reply.send({
      success: true,
      data: result
    });
    
  } catch (error) {
    return handleError(error, reply);
  }
}

module.exports = {
  refundTransaction
};
