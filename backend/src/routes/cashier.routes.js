const { authenticate } = require('../middlewares/auth.middleware');
const {
  authenticateCashier,
  authenticateMerchantOrCashier,
} = require('../middlewares/cashier-auth.middleware');
const cashierService = require('../services/cashier.service');
const PaymentIntentService = require('../core/payments/payment-intent.service');
const PosPaymentRouter = require('../core/payments/pos-payment.router');
const PosAuditService = require('../core/payments/pos-audit.service');
const { handleError, ValidationError } = require('../utils/errors');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

async function cashierRoutes(fastify) {
  // ========================================
  // MERCHANT: CASHIER MANAGEMENT
  // ========================================

  fastify.post('/create', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { name, email, phone } = req.body;
      if (!name || name.trim().length < 2) {
        throw new ValidationError('NAME_REQUIRED', 'Nome inválido');
      }

      const cashier = await cashierService.createCashier(
        req.user.kpId,
        { name, email, phone },
        req.user.kpId
      );

      return reply.send({ success: true, data: cashier });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/list', { preHandler: authenticate }, async (req, reply) => {
    try {
      const cashiers = await cashierService.getCashiers(req.user.kpId);
      return reply.send({ success: true, data: cashiers });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/accept-invite', async (req, reply) => {
    try {
      const { inviteCode, name, phone } = req.body;
      const cashier = await cashierService.acceptInvite(inviteCode, { name, phone });
      return reply.send({ success: true, data: cashier });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // CASHIER AUTH + SESSION
  // ========================================

  fastify.post('/auth/login', async (req, reply) => {
    try {
      const { inviteCode, deviceId, ipAddress } = req.body;

      if (!inviteCode) {
        throw new ValidationError('INVITE_REQUIRED', 'Código obrigatório');
      }

      const cashier = await prisma.cashier.findUnique({
        where: { invite_code: inviteCode },
      });

      if (!cashier) {
        throw new ValidationError('INVALID_INVITE', 'Convite inválido');
      }

      if (!['ACTIVE', 'PENDING'].includes(cashier.status)) {
        throw new ValidationError('CASHIER_BLOCKED', 'Caixa indisponível');
      }

      if (cashier.status === 'PENDING') {
        await prisma.cashier.update({
          where: { id: cashier.id },
          data: { status: 'ACTIVE' },
        });
        cashier.status = 'ACTIVE';
      }

      const session = await cashierService.openSession(cashier.id, {
        deviceId,
        ipAddress,
      });

      const token = jwt.sign(
        {
          cashierId: cashier.id,
          merchantId: cashier.merchant_id,
          sessionId: session.id,
          role: 'CASHIER',
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return reply.send({
        success: true,
        token,
        sessionId: session.id,
        data: {
          id: cashier.id,
          name: cashier.name,
          merchant_id: cashier.merchant_id,
          status: cashier.status,
          session: {
            id: session.id,
            status: session.status,
            opened_at: session.opened_at,
          },
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/session/open', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const session = await cashierService.openSession(req.user.cashierId, {
        deviceId: req.body.deviceId,
        ipAddress: req.body.ipAddress || req.ip,
      });

      return reply.send({ success: true, data: session });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.post('/session/close', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const session = await cashierService.closeSession(
        req.user.cashierId,
        req.user.sessionId,
        req.user.cashierId
      );

      return reply.send({ success: true, data: session, message: 'Sessão encerrada' });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/session/current', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const summary = await cashierService.getSessionSummary(req.user.sessionId);
      return reply.send({ success: true, data: summary });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // POS: PAYMENT INTENT (CASHIER)
  // ========================================

  fastify.post('/payment-intent', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const amount = Number(req.body.amount);
      if (!amount || amount <= 0) {
        throw new ValidationError('INVALID_AMOUNT', 'Valor inválido');
      }

      const merchant = await cashierService.resolveMerchant(req.user.merchantId);

      const intent = await PaymentIntentService.createPaymentIntent({
        cashierId: req.user.cashierId,
        sessionId: req.user.sessionId,
        merchantAccountId: merchant.accountId,
        merchantKpId: merchant.kpId,
        amount,
        description: req.body.description || null,
        actorId: req.user.cashierId,
      });

      return reply.send({
        success: true,
        data: {
          id: intent.id,
          amount: Number(intent.amount),
          status: intent.status,
          payment_reference_code: intent.payment_reference_code,
          qr_code: intent.qr_code,
          expires_at: intent.expires_at,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/payment-intent/:id', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const intent = await PaymentIntentService.getById(req.params.id);

      if (intent.cashier_id !== req.user.cashierId) {
        throw new ValidationError('FORBIDDEN', 'Sem permissão');
      }

      const audit = await PosAuditService.getByPaymentIntent(intent.id);

      return reply.send({ success: true, data: intent, audit });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/session/intents', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const intents = await PaymentIntentService.listSessionIntents(req.user.sessionId);
      return reply.send({ success: true, data: intents });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Legacy payment route — redirects to PaymentIntent flow
  fastify.post('/payment', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const amount = Number(req.body.amount);
      if (!amount || amount <= 0) {
        throw new ValidationError('INVALID_AMOUNT', 'Valor inválido');
      }

      const merchant = await cashierService.resolveMerchant(req.user.merchantId);

      const intent = await PaymentIntentService.createPaymentIntent({
        cashierId: req.user.cashierId,
        sessionId: req.user.sessionId,
        merchantAccountId: merchant.accountId,
        merchantKpId: merchant.kpId,
        amount,
        description: req.body.description || 'Venda POS',
        actorId: req.user.cashierId,
      });

      if (req.body.method) {
        await PaymentIntentService.selectMethod(
          intent.payment_reference_code,
          req.body.method,
          { kp_id: req.body.customerKpId, phone: req.body.phone }
        );
      }

      return reply.send({
        success: true,
        data: intent,
        message: 'Use /api/public/pay/:reference para concluir pagamento',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // MERCHANT: CASHIER STATUS
  // ========================================

  fastify.patch('/:cashierId/activate', { preHandler: authenticate }, async (req, reply) => {
    try {
      const updated = await cashierService.setStatus(
        req.params.cashierId,
        req.user.kpId,
        'ACTIVE',
        req.user.kpId
      );
      return reply.send({ success: true, data: updated });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.patch('/:cashierId/suspend', { preHandler: authenticate }, async (req, reply) => {
    try {
      const updated = await cashierService.setStatus(
        req.params.cashierId,
        req.user.kpId,
        'SUSPENDED',
        req.user.kpId
      );
      return reply.send({ success: true, data: updated });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.patch('/:cashierId/block', { preHandler: authenticate }, async (req, reply) => {
    try {
      const updated = await cashierService.setStatus(
        req.params.cashierId,
        req.user.kpId,
        'SUSPENDED',
        req.user.kpId
      );
      return reply.send({ success: true, data: updated, message: 'Caixa suspenso' });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.patch('/:cashierId/terminate', { preHandler: authenticate }, async (req, reply) => {
    try {
      const updated = await cashierService.setStatus(
        req.params.cashierId,
        req.user.kpId,
        'TERMINATED',
        req.user.kpId
      );
      return reply.send({ success: true, data: updated, message: 'Caixa terminado (soft delete)' });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.delete('/:cashierId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const updated = await cashierService.setStatus(
        req.params.cashierId,
        req.user.kpId,
        'TERMINATED',
        req.user.kpId
      );
      return reply.send({
        success: true,
        data: updated,
        message: 'Caixa terminado — dados preservados para auditoria',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // QR INVITE (MERCHANT)
  // ========================================

  fastify.get('/qr/:cashierId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const cashier = await cashierService.getCashierForMerchant(
        req.params.cashierId,
        req.user.kpId
      );

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      return reply.send({
        success: true,
        data: {
          invite_code: cashier.invite_code,
          qr_data: {
            type: 'CASHIER_INVITE',
            invite_code: cashier.invite_code,
            merchant_kp_id: req.user.kpId,
            cashier_name: cashier.name,
          },
          status: cashier.status,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // INVOICES / REPORTS
  // ========================================

  fastify.get('/invoices', { preHandler: authenticateMerchantOrCashier }, async (req, reply) => {
    try {
      const where = {};

      if (req.user.role === 'CASHIER') {
        where.cashier_id = req.user.cashierId;
      } else {
        const merchant = await cashierService.resolveMerchant(req.user.kpId);
        where.merchant_id = merchant.accountId;
      }

      const payments = await prisma.paymentTransaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 100,
        include: {
          cashier: { select: { id: true, name: true } },
        },
      });

      const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalFees = payments.reduce((sum, p) => sum + Number(p.fee), 0);

      return reply.send({
        success: true,
        data: payments,
        summary: {
          total: payments.length,
          totalAmount,
          totalFees,
          totalNet: totalAmount - totalFees,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/invoices/:paymentId', { preHandler: authenticateMerchantOrCashier }, async (req, reply) => {
    try {
      const where = { id: req.params.paymentId };

      if (req.user.role === 'CASHIER') {
        where.cashier_id = req.user.cashierId;
      } else {
        const merchant = await cashierService.resolveMerchant(req.user.kpId);
        where.merchant_id = merchant.accountId;
      }

      const payment = await prisma.paymentTransaction.findFirst({
        where,
        include: { cashier: { select: { id: true, name: true, email: true } } },
      });

      if (!payment) {
        throw new ValidationError('NOT_FOUND', 'Fatura não encontrada');
      }

      return reply.send({ success: true, data: payment });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/dashboard', { preHandler: authenticateCashier }, async (req, reply) => {
    try {
      const cashier = await prisma.cashier.findUnique({
        where: { id: req.user.cashierId },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [payments, intents, session] = await Promise.all([
        prisma.paymentTransaction.findMany({
          where: {
            cashier_id: req.user.cashierId,
            created_at: { gte: today },
          },
          orderBy: { created_at: 'desc' },
          take: 50,
        }),
        PaymentIntentService.listSessionIntents(req.user.sessionId),
        cashierService.getSessionSummary(req.user.sessionId),
      ]);

      const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      return reply.send({
        success: true,
        data: {
          cashier: {
            id: cashier.id,
            name: cashier.name,
            status: cashier.status,
          },
          session,
          today: {
            total,
            count: payments.length,
            payments,
          },
          payment_intents: intents,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // WEBHOOKS (MOCK) — EMOLA / MPESA
  // ========================================

  fastify.post('/webhook/:provider', async (req, reply) => {
    try {
      const provider = req.params.provider.toUpperCase();
      const result = await PaymentIntentService.handleProviderWebhook(provider, req.body);
      return reply.send({ success: true, data: result });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Merchant confirms bank transfer
  fastify.post('/bank-transfer/confirm', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { referenceCode } = req.body;
      if (!referenceCode) {
        throw new ValidationError('REFERENCE_REQUIRED', 'Referência obrigatória');
      }

      const result = await PosPaymentRouter.confirmBankTransfer(
        referenceCode,
        req.user.kpId
      );

      return reply.send({ success: true, data: result });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = cashierRoutes;
