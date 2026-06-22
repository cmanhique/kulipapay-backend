const { authenticate } = require('../middlewares/auth.middleware');
const refundService = require('../services/refund.service');
const { handleError } = require('../utils/errors');
const { resolveAccount } = require('../utils/account-resolver');

async function refundRoutes(fastify) {

  async function resolveMerchantContext(req) {
    const account = await resolveAccount(req.user.kpId || req.user.kp_id);
    return {
      merchantAccountId: account?.merchantProfile ? account.id : null,
      merchantKpId: req.user.kpId || req.user.kp_id,
    };
  }

  fastify.post('/refunds', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { transactionId, amount, reason } = req.body;

      const actor = {
        id: req.user.kpId,
        type: req.user.role || 'MERCHANT',
      };

      const refund = await refundService.createRefund({
        transactionId,
        amount,
        reason,
        actor,
      });

      return reply.send({
        success: true,
        data: refund,
        message: 'Refund criado com sucesso. Aguardando aprovação.',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/refunds/:id/approve', { preHandler: authenticate }, async (req, reply) => {
    try {
      const actor = { id: req.user.kpId, type: req.user.role || 'MERCHANT' };
      const refund = await refundService.approveRefund(req.params.id, actor);

      return reply.send({
        success: true,
        data: refund,
        message: 'Refund aprovado com sucesso.',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/refunds/:id/reject', { preHandler: authenticate }, async (req, reply) => {
    try {
      const actor = { id: req.user.kpId, type: req.user.role || 'MERCHANT' };
      const refund = await refundService.rejectRefund(req.params.id, req.body.reason, actor);

      return reply.send({
        success: true,
        data: refund,
        message: 'Refund rejeitado.',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/refunds/:id/execute', { preHandler: authenticate }, async (req, reply) => {
    try {
      const actor = { id: req.user.kpId, type: req.user.role || 'ADMIN' };
      const result = await refundService.executeRefund(req.params.id, actor);

      return reply.send({
        success: true,
        ...result,
        message: 'Refund executado com sucesso.',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Stats BEFORE /refunds/:id to avoid route shadowing
  fastify.get('/refunds/stats', { preHandler: authenticate }, async (req, reply) => {
    try {
      const ctx = await resolveMerchantContext(req);
      if (!ctx.merchantAccountId) {
        return reply.status(403).send({
          success: false,
          error: { message: 'Apenas comerciantes podem ver estatísticas de refund' },
        });
      }

      const data = await refundService.getStats(ctx.merchantAccountId);

      return reply.send({ success: true, data });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/refunds', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { status, limit, offset } = req.query;
      const ctx = await resolveMerchantContext(req);

      const result = await refundService.listRefunds({
        merchantAccountId: ctx.merchantAccountId,
        merchantKpId: ctx.merchantKpId,
        status,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });

      return reply.send({ success: true, ...result });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/transactions/:transactionId/refunds', { preHandler: authenticate }, async (req, reply) => {
    try {
      const refunds = await refundService.getRefundsByTransaction(req.params.transactionId);

      return reply.send({
        success: true,
        data: refunds,
        count: refunds.length,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/refunds/:id', { preHandler: authenticate }, async (req, reply) => {
    try {
      const refund = await refundService.getRefund(req.params.id);

      return reply.send({ success: true, data: refund });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = refundRoutes;
