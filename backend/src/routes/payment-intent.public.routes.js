const PaymentIntentService = require('../core/payments/payment-intent.service');
const PosAuditService = require('../core/payments/pos-audit.service');
const { handleError, ValidationError } = require('../utils/errors');

/**
 * Public payment page API — customer scans QR and pays.
 */
async function paymentIntentPublicRoutes(fastify) {
  fastify.get('/pay/:referenceCode', async (req, reply) => {
    try {
      const intent = await PaymentIntentService.getByReference(req.params.referenceCode);

      return reply.send({
        success: true,
        data: {
          id: intent.id,
          amount: Number(intent.amount),
          status: intent.status,
          method: intent.method,
          payment_reference_code: intent.payment_reference_code,
          expires_at: intent.expires_at,
          merchant_kp_id: intent.merchant_kp_id,
          description: intent.description,
          cashier: intent.cashier,
          supported_methods: ['WALLET_INTERNAL', 'EMOLA', 'MPESA', 'BANK_TRANSFER'],
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/pay/:referenceCode/method', async (req, reply) => {
    try {
      const { method, customer_kp_id, phone } = req.body;

      if (!method) {
        throw new ValidationError('METHOD_REQUIRED', 'Método obrigatório');
      }

      const intent = await PaymentIntentService.selectMethod(
        req.params.referenceCode,
        method,
        { kp_id: customer_kp_id, phone }
      );

      return reply.send({ success: true, data: intent });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/pay/:referenceCode/execute', async (req, reply) => {
    try {
      const { customer_kp_id, phone } = req.body;

      const result = await PaymentIntentService.executePayment(
        req.params.referenceCode,
        { customer_kp_id, phone }
      );

      return reply.send({ success: true, data: result });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/pay/:referenceCode/audit', async (req, reply) => {
    try {
      const intent = await PaymentIntentService.getByReference(req.params.referenceCode);
      const audit = await PosAuditService.getByPaymentIntent(intent.id);
      return reply.send({ success: true, data: audit });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = paymentIntentPublicRoutes;
