/**
 * ESCROW CONTROLLER
 */

const EscrowService = require('../services/escrow.service');
const { handleError } = require('../utils/errors');

async function createEscrow(req, reply) {
  try {
    const { seller, amount, condition, description } = req.body;
    const buyer = req.user.kp_id;
    
    const result = await EscrowService.create({
      buyer,
      seller,
      amount,
      condition,
      description
    });
    
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function confirmPayment(req, reply) {
  try {
    const { transactionId } = req.body;
    const kp_id = req.user.kp_id;
    
    const result = await EscrowService.confirmPayment(transactionId, kp_id);
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function releaseFunds(req, reply) {
  try {
    const { transactionId } = req.body;
    const kp_id = req.user.kp_id;
    
    const result = await EscrowService.release(transactionId, kp_id);
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function dispute(req, reply) {
  try {
    const { transactionId, reason } = req.body;
    const kp_id = req.user.kp_id;
    
    const result = await EscrowService.dispute(transactionId, kp_id, reason);
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function refund(req, reply) {
  try {
    const { transactionId } = req.body;
    const kp_id = req.user.kp_id;
    
    // Verificar se o utilizador é admin
    // TODO: Adicionar verificação de admin
    
    const result = await EscrowService.refund(transactionId, kp_id);
    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getEscrows(req, reply) {
  try {
    const kp_id = req.user.kp_id;
    const escrows = await EscrowService.getUserEscrows(kp_id);
    return reply.send({ success: true, data: escrows });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getPending(req, reply) {
  try {
    const kp_id = req.user.kp_id;
    const pending = await EscrowService.getPendingEscrows(kp_id);
    return reply.send({ success: true, data: pending });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getHeld(req, reply) {
  try {
    const kp_id = req.user.kp_id;
    const held = await EscrowService.getHeldEscrows(kp_id);
    return reply.send({ success: true, data: held });
  } catch (error) {
    return handleError(error, reply);
  }
}

module.exports = {
  createEscrow,
  confirmPayment,
  releaseFunds,
  dispute,
  refund,
  getEscrows,
  getPending,
  getHeld
};
