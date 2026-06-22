/**
 * PAYMENT CONTROLLER
 */

const PaymentCore = require('../core/payments/payment.core');
const { handleError } = require('../utils/errors');

async function deposit(req, reply) {
  try {
    const { provider, phone_number, amount, idempotencyKey } = req.body;
    const kp_id = req.user.kp_id;

    const result = await PaymentCore.execute({
      kp_id,
      type: 'DEPOSIT',
      provider: provider.toUpperCase(),
      phone: phone_number,
      amount,
      idempotencyKey
    });

    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function withdraw(req, reply) {
  try {
    const { provider, phone_number, amount, idempotencyKey } = req.body;
    const kp_id = req.user.kp_id;

    const result = await PaymentCore.execute({
      kp_id,
      type: 'WITHDRAWAL',
      provider: provider.toUpperCase(),
      phone: phone_number,
      amount,
      idempotencyKey
    });

    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getStatus(req, reply) {
  try {
    const { transactionId } = req.params;
    const kp_id = req.user.kp_id;

    const result = await PaymentCore.getStatus(transactionId, kp_id);

    return reply.send({ success: true, data: result });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function getTransactions(req, reply) {
  try {
    const kp_id = req.user.kp_id;
    const { limit } = req.query;

    const transactions = await PaymentCore.getTransactions(kp_id, limit ? parseInt(limit) : 50);

    return reply.send({ success: true, data: transactions });
  } catch (error) {
    return handleError(error, reply);
  }
}

async function webhook(req, reply) {
  try {
    const { provider } = req.params;
    const payload = req.body;

    const result = await PaymentCore.handleWebhook(provider, payload);

    return reply.send({ success: true, data: result });
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
}

module.exports = {
  deposit,
  withdraw,
  getStatus,
  getTransactions,
  webhook
};
