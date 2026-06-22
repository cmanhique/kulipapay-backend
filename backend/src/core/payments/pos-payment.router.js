const crypto = require('crypto');
const { prisma } = require('../../prisma');
const PosLedgerService = require('./pos-ledger.service');
const PosAuditService = require('./pos-audit.service');

/**
 * Routes POS payments by method — orchestration only, ledger is final.
 */
class PosPaymentRouter {
  static async route(intent, context = {}) {
    switch (intent.method) {
      case 'WALLET_INTERNAL':
        return this.handleWalletInternal(intent, context);
      case 'EMOLA':
        return this.handleMobileMoney(intent, context, 'EMOLA');
      case 'MPESA':
        return this.handleMobileMoney(intent, context, 'MPESA');
      case 'BANK_TRANSFER':
        return this.handleBankTransfer(intent, context);
      default:
        throw new Error('UNSUPPORTED_METHOD');
    }
  }

  static async handleWalletInternal(intent, context) {
    const customerKpId = context.customer_kp_id || intent.customer_kp_id;
    if (!customerKpId) {
      throw new Error('CUSTOMER_KP_REQUIRED');
    }

    const { transaction } = await PosLedgerService.settlePaymentIntent({
      paymentIntent: intent,
      merchantKpId: intent.merchant_kp_id,
      customerKpId,
      description: intent.description,
    });

    return {
      success: true,
      pending: false,
      method: 'WALLET_INTERNAL',
      transaction_id: transaction.transactionId,
      payment_intent_id: intent.id,
    };
  }

  static async handleMobileMoney(intent, context, provider) {
    const phone = context.phone || intent.customer_phone;
    if (!phone) {
      throw new Error('PHONE_REQUIRED');
    }

    const externalRef = `${provider}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const paymentTx = await prisma.paymentTransaction.create({
      data: {
        kp_id: intent.merchant_kp_id,
        type: 'POS_SALE',
        amount: intent.amount,
        fee: 0,
        status: 'PENDING',
        method: provider,
        transactionId: crypto.randomUUID(),
        provider,
        phone_number: phone,
        provider_reference: externalRef,
        reference: externalRef,
        cashier_id: intent.cashier_id,
        merchant_id: intent.merchant_id,
        session_id: intent.cashier_session_id,
        payment_intent_id: intent.id,
        description: intent.description,
        metadata: {
          payment_intent_id: intent.id,
          payment_reference_code: intent.payment_reference_code,
          awaiting_webhook: true,
        },
      },
    });

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'AWAITING_PAYMENT' },
    });

    // Mock provider request — real integration via existing PaymentCore webhooks
    return {
      success: true,
      pending: true,
      method: provider,
      provider_reference: externalRef,
      payment_transaction_id: paymentTx.id,
      payment_intent_id: intent.id,
      message: `Aguardando confirmação ${provider}. Use webhook para confirmar.`,
    };
  }

  static async handleBankTransfer(intent) {
    const bankRef = intent.payment_reference_code;

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'AWAITING_PAYMENT' },
    });

    return {
      success: true,
      pending: true,
      method: 'BANK_TRANSFER',
      bank_reference: bankRef,
      payment_intent_id: intent.id,
      message: 'Transferência bancária pendente. Use a referência para pagamento.',
    };
  }

  static async handleWebhook(provider, payload = {}) {
    const { provider_reference, status, payment_intent_id } = payload;

    let paymentTx = null;

    if (provider_reference) {
      paymentTx = await prisma.paymentTransaction.findFirst({
        where: { provider_reference },
      });
    }

    const intentId = payment_intent_id || paymentTx?.payment_intent_id;
    if (!intentId) {
      throw new Error('PAYMENT_INTENT_NOT_FOUND');
    }

    const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) {
      throw new Error('PAYMENT_INTENT_NOT_FOUND');
    }

    if (intent.status === 'SUCCESS') {
      return { success: true, already_settled: true };
    }

    const normalizedStatus = String(status || '').toUpperCase();

    if (normalizedStatus !== 'SUCCESS' && normalizedStatus !== 'PAID') {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'FAILED' },
      });

      if (paymentTx) {
        await prisma.paymentTransaction.update({
          where: { id: paymentTx.id },
          data: { status: 'FAILED', settled_at: new Date() },
        });
      }

      await PosAuditService.log({
        merchantId: intent.merchant_id,
        action: 'PAYMENT_WEBHOOK_FAILED',
        actorType: 'SYSTEM',
        actorId: provider,
        paymentIntentId: intent.id,
        cashierId: intent.cashier_id,
        cashierSessionId: intent.cashier_session_id,
        metadata: payload,
      });

      return { success: false, status: 'FAILED' };
    }

    if (paymentTx) {
      await prisma.paymentTransaction.update({
        where: { id: paymentTx.id },
        data: { status: 'SUCCESS', settled_at: new Date() },
      });
    }

    const { transaction } = await PosLedgerService.settlePaymentIntent({
      paymentIntent: intent,
      merchantKpId: intent.merchant_kp_id,
      customerKpId: null,
      description: `${provider} POS payment`,
    });

    await PosAuditService.log({
      merchantId: intent.merchant_id,
      action: 'PAYMENT_WEBHOOK_SUCCESS',
      actorType: 'SYSTEM',
      actorId: provider,
      paymentIntentId: intent.id,
      cashierId: intent.cashier_id,
      cashierSessionId: intent.cashier_session_id,
      metadata: { transaction_id: transaction.transactionId, ...payload },
    });

    return {
      success: true,
      transaction_id: transaction.transactionId,
      payment_intent_id: intent.id,
    };
  }

  static async confirmBankTransfer(referenceCode, confirmedBy) {
    const intent = await prisma.paymentIntent.findUnique({
      where: { payment_reference_code: referenceCode },
    });

    if (!intent || intent.method !== 'BANK_TRANSFER') {
      throw new Error('INVALID_BANK_TRANSFER');
    }

    if (intent.status === 'SUCCESS') {
      return { success: true, already_settled: true };
    }

    const { transaction } = await PosLedgerService.settlePaymentIntent({
      paymentIntent: intent,
      merchantKpId: intent.merchant_kp_id,
      customerKpId: null,
      description: 'Bank transfer POS payment',
    });

    await PosAuditService.log({
      merchantId: intent.merchant_id,
      action: 'BANK_TRANSFER_CONFIRMED',
      actorType: 'MERCHANT',
      actorId: confirmedBy,
      paymentIntentId: intent.id,
      cashierId: intent.cashier_id,
      cashierSessionId: intent.cashier_session_id,
    });

    return {
      success: true,
      transaction_id: transaction.transactionId,
    };
  }
}

module.exports = PosPaymentRouter;
