/**
 * TRANSACTION DOMAIN CONTROLLER
 */

const TransactionDomainService = require('../services/transaction.domain.service');
const { handleError } = require('../utils/errors');

async function createTransaction(req, reply) {
  try {
    const { to, amount, description, mode = 'SECURE' } = req.body;
    const from = req.user.kp_id;
    
    const result = await TransactionDomainService.create({
      from,
      to,
      amount,
      idempotencyKey: req.headers['idempotency-key'],
      description,
      mode
    });
    
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function confirmTransaction(req, reply) {
  try {
    const { transactionId } = req.body;
    const kp_id = req.user.kp_id;
    
    const result = await TransactionDomainService.confirm(transactionId, kp_id);
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function rejectTransaction(req, reply) {
  try {
    const { transactionId, reason } = req.body;
    const kp_id = req.user.kp_id;
    
    const result = await TransactionDomainService.reject(transactionId, kp_id, reason);
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getPending(req, reply) {
  try {
    const kp_id = req.user.kp_id;
    const pending = await TransactionDomainService.getPending(kp_id);
    return reply.send({ success: true, data: pending });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getTransaction(req, reply) {
  try {
    const { transactionId } = req.params;
    const kp_id = req.user.kp_id;
    
    const transaction = await TransactionDomainService.getTransaction(transactionId, kp_id);
    return reply.send({ success: true, data: transaction });
  } catch (error) {
    return handleError(error, reply);
  }
}

module.exports = {
  createTransaction,
  confirmTransaction,
  rejectTransaction,
  getPending,
  getTransaction
};

async function getTransaction(req, reply) {
  try {
    const { transactionId } = req.params;
    const kp_id = req.user.kp_id;
    
    const transaction = await TransactionDomainService.getTransaction(transactionId, kp_id);
    return reply.send({ success: true, data: transaction });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getExpirationInfo(req, reply) {
  try {
    const { transactionId } = req.params;
    const kp_id = req.user.kp_id;
    
    const transaction = await TransactionDomainService.getTransaction(transactionId, kp_id);
    
    const now = new Date();
    const expiresAt = new Date(transaction.expired_at);
    const timeLeft = expiresAt - now;
    
    const minutesLeft = Math.floor(timeLeft / 60000);
    const hoursLeft = Math.floor(minutesLeft / 60);
    const remainingMinutes = minutesLeft % 60;
    
    return reply.send({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        expiresAt: transaction.expired_at,
        timeLeft: {
          hours: hoursLeft,
          minutes: remainingMinutes,
          totalMinutes: minutesLeft,
          isExpired: timeLeft <= 0
        }
      }
    });
  } catch (error) {
    return handleError(error, reply);
  }
}
