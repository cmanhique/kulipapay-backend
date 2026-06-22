const crypto = require('crypto');
const { prisma } = require('../prisma');
const { ValidationError } = require('../utils/errors');
const { resolveMerchantByKpId } = require('../utils/account-resolver');
const accountValidation = require('./account-validation.service');
const LedgerEngine = require('../core/ledger.engine');

class RefundService {
  _allowedTransitions = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSING', 'REJECTED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    REJECTED: [],
    COMPLETED: [],
    FAILED: [],
  };

  _canTransition(from, to) {
    return this._allowedTransitions[from]?.includes(to) || false;
  }

  _refundableStatuses = ['SETTLED', 'CONFIRMED'];

  async createRefund({ transactionId, amount, reason, actor }) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ id: transactionId }, { transactionId: transactionId }],
      },
      include: { payment_intent: true },
    });

    if (!transaction) {
      throw new ValidationError('TRANSACTION_NOT_FOUND', 'Transação não encontrada');
    }

    if (!this._refundableStatuses.includes(transaction.status)) {
      throw new ValidationError(
        'TRANSACTION_NOT_REFUNDABLE',
        `Transação com status ${transaction.status} não pode ser reembolsada`
      );
    }

    if (Number(transaction.amount) <= 0) {
      throw new ValidationError('CANNOT_REFUND_REFUND', 'Não é possível refund de refund');
    }

    const merchant = await resolveMerchantByKpId(transaction.to_kp);
    if (!merchant) {
      throw new ValidationError('MERCHANT_NOT_FOUND', 'Merchant não encontrado');
    }

    accountValidation.validateMerchantProfile(merchant.merchantProfile);

    const refundAmount = Number(amount);
    const transactionAmount = Number(transaction.amount);

    if (!refundAmount || refundAmount <= 0) {
      throw new ValidationError('INVALID_AMOUNT', 'Valor inválido');
    }

    if (refundAmount > transactionAmount) {
      throw new ValidationError('REFUND_EXCEEDS_AMOUNT', 'Refund excede valor da transação');
    }

    const activeRefunds = await prisma.refundRequest.findMany({
      where: {
        transaction_id: transaction.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED'] },
      },
    });

    const alreadyRefunded = activeRefunds
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const pendingAmount = activeRefunds
      .filter((r) => r.status !== 'COMPLETED')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    if (alreadyRefunded + pendingAmount + refundAmount > transactionAmount) {
      throw new ValidationError(
        'REFUND_CUMULATIVE_EXCEEDS',
        'Total de refunds excede valor da transação'
      );
    }

    const customerKpId =
      transaction.from_kp !== 'EXTERNAL'
        ? transaction.from_kp
        : transaction.payment_intent?.customer_kp_id;

    if (!customerKpId || customerKpId === 'EXTERNAL') {
      throw new ValidationError(
        'CUSTOMER_NOT_IDENTIFIED',
        'Cliente não identificado — refund automático indisponível para pagamentos externos sem cliente'
      );
    }

    const refundData = {
      amount: refundAmount,
      reason: reason || null,
      status: 'PENDING',
      merchant_id: merchant.accountId,
      merchant_kp_id: merchant.kpId,
      customer_kp_id: customerKpId,
      transaction_id: transaction.id,
      requested_by: actor.id,
      requested_by_type: actor.type || 'MERCHANT',
    };

    if (transaction.payment_intent_id) {
      refundData.payment_intent_id = transaction.payment_intent_id;
    }

    const refund = await prisma.refundRequest.create({ data: refundData });

    await this._createAuditEvent(refund.id, 'CREATED', actor, {
      amount: refundAmount,
      transactionId: transaction.id,
    });

    return refund;
  }

  async approveRefund(refundId, actor) {
    const refund = await prisma.refundRequest.findUnique({ where: { id: refundId } });

    if (!refund) {
      throw new ValidationError('REFUND_NOT_FOUND', 'Refund não encontrado');
    }

    if (!this._canTransition(refund.status, 'APPROVED')) {
      throw new ValidationError('INVALID_STATE', 'Transição inválida');
    }

    const updated = await prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'APPROVED',
        approved_by: actor.id,
        approved_at: new Date(),
      },
    });

    await this._createAuditEvent(refundId, 'APPROVED', actor);
    return updated;
  }

  async rejectRefund(refundId, reason, actor) {
    const refund = await prisma.refundRequest.findUnique({ where: { id: refundId } });

    if (!refund) {
      throw new ValidationError('REFUND_NOT_FOUND', 'Refund não encontrado');
    }

    if (!this._canTransition(refund.status, 'REJECTED')) {
      throw new ValidationError('INVALID_STATE', 'Transição inválida');
    }

    const updated = await prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'REJECTED',
        reason: reason || refund.reason,
      },
    });

    await this._createAuditEvent(refundId, 'REJECTED', actor, { reason });
    return updated;
  }

  async executeRefund(refundId, actor) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: { original_transaction: true },
    });

    if (!refund) {
      throw new ValidationError('REFUND_NOT_FOUND', 'Refund não encontrado');
    }

    if (refund.status !== 'APPROVED') {
      throw new ValidationError(
        'INVALID_STATE',
        'Refund deve estar APPROVED antes de executar'
      );
    }

    if (!this._canTransition(refund.status, 'PROCESSING')) {
      throw new ValidationError('INVALID_STATE', 'Estado inválido');
    }

    await prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'PROCESSING',
        processed_by: actor.id,
      },
    });

    await this._createAuditEvent(refundId, 'PROCESSING', actor);

    const reversalRef = `REFUND-${crypto.randomUUID()}`;
    const refundAmount = Number(refund.amount);

    try {
      const ledgerResult = await LedgerEngine.transfer({
        fromKp: refund.merchant_kp_id,
        toKp: refund.customer_kp_id,
        amount: refundAmount,
        reference: reversalRef,
        description: `Refund ${refund.id}`,
        mode: 'INSTANT',
      });

      const reversalTx = await prisma.transaction.create({
        data: {
          transactionId: reversalRef,
          from_kp: refund.merchant_kp_id,
          to_kp: refund.customer_kp_id,
          amount: -refundAmount,
          fee: 0,
          status: 'REVERSED',
          mode: 'INSTANT',
          description: 'Refund reversal',
          payment_intent_id: refund.payment_intent_id || undefined,
          metadata: {
            refund_id: refund.id,
            original_transaction_id: refund.transaction_id,
            type: 'REFUND',
            ledger: ledgerResult?.transactionId || reversalRef,
          },
        },
      });

      const allRefunds = await prisma.refundRequest.findMany({
        where: {
          transaction_id: refund.transaction_id,
          status: 'COMPLETED',
        },
      });

      const totalRefunded =
        allRefunds.reduce((sum, r) => sum + Number(r.amount), 0) + refundAmount;

      const originalAmount = Number(refund.original_transaction.amount);

      if (totalRefunded >= originalAmount) {
        await prisma.transaction.update({
          where: { id: refund.transaction_id },
          data: { status: 'REVERSED' },
        });
      }

      const updated = await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'COMPLETED',
          reversal_transaction_id: reversalTx.id,
          processed_at: new Date(),
        },
      });

      await this._createAuditEvent(refundId, 'COMPLETED', actor);

      return {
        success: true,
        refund: updated,
        reversal_transaction: reversalTx,
      };
    } catch (err) {
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: { status: 'FAILED' },
      });

      await this._createAuditEvent(refundId, 'FAILED', actor, { error: err.message });
      throw err;
    }
  }

  async listRefunds({ merchantAccountId, merchantKpId, status, limit = 50, offset = 0 }) {
    const where = {};
    if (merchantAccountId) where.merchant_id = merchantAccountId;
    else if (merchantKpId) where.merchant_kp_id = merchantKpId;
    if (status) where.status = status;

    const [refunds, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.refundRequest.count({ where }),
    ]);

    return { refunds, total, limit, offset };
  }

  async getRefund(refundId) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: { audit_events: { orderBy: { created_at: 'desc' } } },
    });

    if (!refund) {
      throw new ValidationError('REFUND_NOT_FOUND', 'Refund não encontrado');
    }

    return refund;
  }

  async getRefundsByTransaction(transactionId) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ id: transactionId }, { transactionId: transactionId }],
      },
    });

    if (!transaction) {
      throw new ValidationError('TRANSACTION_NOT_FOUND', 'Transação não encontrada');
    }

    return prisma.refundRequest.findMany({
      where: { transaction_id: transaction.id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStats(merchantAccountId) {
    const where = { merchant_id: merchantAccountId };

    const [total, pending, approved, completed, rejected] = await Promise.all([
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.count({ where: { ...where, status: 'PENDING' } }),
      prisma.refundRequest.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.refundRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.refundRequest.count({ where: { ...where, status: 'REJECTED' } }),
    ]);

    const totalAmount = await prisma.refundRequest.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { amount: true },
    });

    return {
      total,
      pending,
      approved,
      completed,
      rejected,
      total_refunded: Number(totalAmount._sum.amount || 0),
    };
  }

  async _createAuditEvent(refundId, action, actor, metadata = {}) {
    return prisma.refundAuditEvent.create({
      data: {
        refund_request_id: refundId,
        action,
        actor_id: actor.id,
        actor_type: actor.type || 'SYSTEM',
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
}

module.exports = new RefundService();
