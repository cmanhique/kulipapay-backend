/**
 * TRANSACTION CONTROLLER
 * 
 * 🎯 Controller para transações
 */

const { transfer } = require('../services/transaction.service');
const { handleError } = require('../utils/errors');

async function sendMoney(req, reply) {
  try {
    const { to, amount, description } = req.body;
    const from = req.user.kp_id;

    const result = await transfer({
      from,
      to,
      amount,
      req,
      description
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
  sendMoney
};
