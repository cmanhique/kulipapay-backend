/**
 * CONFIRMATION CONTROLLER
 * 
 * 🎯 Controlador para confirmar/rejeitar transferências seguras
 */

const SecureTransferService = require('../services/secure-transfer.service');
const { handleError } = require('../utils/errors');

async function confirmTransaction(req, reply) {
  try {
    const { transactionId } = req.body;
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
    
    const result = await SecureTransferService.confirm(transactionId, kp_id);
    return reply.send({ success: true, data: result });
    
  } catch (error) {
    return handleError(error, reply);
  }
}

async function rejectTransaction(req, reply) {
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
    
    const result = await SecureTransferService.reject(transactionId, kp_id, reason);
    return reply.send({ success: true, data: result });
    
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getPending(req, reply) {
  try {
    const kp_id = req.user.kp_id;
    const pending = await SecureTransferService.getPending(kp_id);
    return reply.send({ success: true, data: pending });
    
  } catch (error) {
    return handleError(error, reply);
  }
}

module.exports = {
  confirmTransaction,
  rejectTransaction,
  getPending
};
