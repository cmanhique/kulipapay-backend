const crypto = require('crypto');
const { prisma } = require('../../prisma');
const PosAuditService = require('./pos-audit.service');
const PosPaymentRouter = require('./pos-payment.router');

const INTENT_TTL_MINUTES = 15;

class PaymentIntentService {
  static generateReferenceCode() {
    return `KP-POS-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
  }

  static buildQrPayload(intent, baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000') {
    const payload = {
      type: 'KULIPAPAY_POS',
      payment_intent_id: intent.id,
      merchant_id: intent.merchant_kp_id,
      payment_reference_code: intent.payment_reference_code,
      amount: Number(intent.amount),
      expires_at: intent.expires_at.toISOString(),
      pay_url: `${baseUrl}/api/public/pay/${intent.payment_reference_code}`,
    };
    return JSON.stringify(payload);
  }

  static async assertActiveSession(cashierId, sessionId) {
    const session = await prisma.cashierSession.findFirst({
      where: {
        id: sessionId,
        cashier_id: cashierId,
        status: 'ACTIVE',
      },
    });

    if (!session) {
      throw new Error('SESSION_NOT_ACTIVE');
    }

    return session;
  }

  static async assertActiveCashier(cashierId) {
    const cashier = await prisma.cashier.findUnique({ where: { id: cashierId } });

    if (!cashier || cashier.status !== 'ACTIVE') {
      throw new Error('CASHIER_INACTIVE');
    }

    return cashier;
  }

  static async expireIfNeeded(intent) {
    if (intent.status === 'SUCCESS' || intent.status === 'FAILED') {
      return intent;
    }

    if (new Date(intent.expires_at) < new Date()) {
      const updated = await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'EXPIRED' },
      });

      await PosAuditService.log({
        merchantId: intent.merchant_id,
        action: 'PAYMENT_INTENT_EXPIRED',
        actorType: 'SYSTEM',
        actorId: 'system',
        paymentIntentId: intent.id,
        cashierId: intent.cashier_id,
        cashierSessionId: intent.cashier_session_id,
      });

      return updated;
    }

    return intent;
  }

  /**
   * Phase 1: Create PaymentIntent + QR
   */
  static async createPaymentIntent({
    cashierId,
    sessionId,
    merchantAccountId,
    merchantKpId,
    amount,
    description = null,
    actorId,
  }) {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    await this.assertActiveCashier(cashierId);
    await this.assertActiveSession(cashierId, sessionId);

    const referenceCode = this.generateReferenceCode();
    const expiresAt = new Date(Date.now() + INTENT_TTL_MINUTES * 60 * 1000);

    const intent = await prisma.paymentIntent.create({
      data: {
        merchant_id: merchantAccountId,
        merchant_kp_id: merchantKpId,
        cashier_id: cashierId,
        cashier_session_id: sessionId,
        amount: parsedAmount,
        status: 'AWAITING_METHOD',
        payment_reference_code: referenceCode,
        expires_at: expiresAt,
        description,
        qr_code: null,
      },
    });

    const qrCode = this.buildQrPayload(intent);

    const updated = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { qr_code: qrCode, status: 'AWAITING_METHOD' },
    });

    await PosAuditService.log({
      merchantId: merchantAccountId,
      action: 'PAYMENT_INTENT_CREATED',
      actorType: 'CASHIER',
      actorId: actorId || cashierId,
      paymentIntentId: updated.id,
      cashierId,
      cashierSessionId: sessionId,
      metadata: { amount: parsedAmount, referenceCode },
    });

    return updated;
  }

  static async getByReference(referenceCode) {
    const intent = await prisma.paymentIntent.findUnique({
      where: { payment_reference_code: referenceCode },
      include: {
        cashier: { select: { id: true, name: true } },
      },
    });

    if (!intent) {
      throw new Error('PAYMENT_INTENT_NOT_FOUND');
    }

    return this.expireIfNeeded(intent);
  }

  static async getById(id) {
    const intent = await prisma.paymentIntent.findUnique({ where: { id } });
    if (!intent) throw new Error('PAYMENT_INTENT_NOT_FOUND');
    return this.expireIfNeeded(intent);
  }

  /**
   * Phase 2: Customer selects payment method
   */
  static async selectMethod(referenceCode, method, customerContext = {}) {
    const allowed = ['WALLET_INTERNAL', 'EMOLA', 'MPESA', 'BANK_TRANSFER'];
    if (!allowed.includes(method)) {
      throw new Error('INVALID_METHOD');
    }

    let intent = await this.getByReference(referenceCode);

    if (['SUCCESS', 'FAILED', 'EXPIRED'].includes(intent.status)) {
      throw new Error(`INTENT_${intent.status}`);
    }

    intent = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        method,
        status: 'AWAITING_PAYMENT',
        customer_kp_id: customerContext.kp_id || null,
        customer_phone: customerContext.phone || null,
      },
    });

    await PosAuditService.log({
      merchantId: intent.merchant_id,
      action: 'PAYMENT_METHOD_SELECTED',
      actorType: 'CUSTOMER',
      actorId: customerContext.kp_id || customerContext.phone || 'anonymous',
      paymentIntentId: intent.id,
      cashierId: intent.cashier_id,
      cashierSessionId: intent.cashier_session_id,
      metadata: { method },
    });

    return intent;
  }

  /**
   * Phase 3-5: Route and execute payment
   */
  static async executePayment(referenceCode, executionContext = {}) {
    let intent = await this.getByReference(referenceCode);

    if (!intent.method) {
      throw new Error('METHOD_NOT_SELECTED');
    }

    if (['SUCCESS', 'FAILED', 'EXPIRED'].includes(intent.status)) {
      throw new Error(`INTENT_${intent.status}`);
    }

    intent = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'PROCESSING' },
    });

    await PosAuditService.log({
      merchantId: intent.merchant_id,
      action: 'PAYMENT_EXECUTION_STARTED',
      actorType: 'CUSTOMER',
      actorId: executionContext.customer_kp_id || executionContext.phone || 'anonymous',
      paymentIntentId: intent.id,
      cashierId: intent.cashier_id,
      cashierSessionId: intent.cashier_session_id,
      metadata: { method: intent.method },
    });

    try {
      const result = await PosPaymentRouter.route(intent, executionContext);

      await PosAuditService.log({
        merchantId: intent.merchant_id,
        action: result.pending ? 'PAYMENT_AWAITING_CONFIRMATION' : 'PAYMENT_SUCCESS',
        actorType: 'SYSTEM',
        actorId: 'pos-router',
        paymentIntentId: intent.id,
        cashierId: intent.cashier_id,
        cashierSessionId: intent.cashier_session_id,
        metadata: result,
      });

      return result;
    } catch (error) {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'FAILED' },
      });

      await PosAuditService.log({
        merchantId: intent.merchant_id,
        action: 'PAYMENT_FAILED',
        actorType: 'SYSTEM',
        actorId: 'pos-router',
        paymentIntentId: intent.id,
        cashierId: intent.cashier_id,
        cashierSessionId: intent.cashier_session_id,
        metadata: { error: error.message },
      });

      throw error;
    }
  }

  static async handleProviderWebhook(provider, payload) {
    return PosPaymentRouter.handleWebhook(provider, payload);
  }

  static async listSessionIntents(sessionId) {
    return prisma.paymentIntent.findMany({
      where: { cashier_session_id: sessionId },
      orderBy: { created_at: 'desc' },
    });
  }
}

module.exports = PaymentIntentService;
