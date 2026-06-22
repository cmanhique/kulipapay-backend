const crypto = require('crypto');
const { prisma } = require('../../prisma');
const LedgerEngine = require('../ledger.engine');

/**
 * Final immutable ledger record for POS sales.
 * Money always flows to merchant wallet — cashier never holds funds.
 */
class PosLedgerService {
  static async settlePaymentIntent({
    paymentIntent,
    merchantKpId,
    customerKpId = null,
    description = null,
  }) {
    const amount = Number(paymentIntent.amount);
    if (!amount || amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const session = await prisma.cashierSession.findUnique({
      where: { id: paymentIntent.cashier_session_id },
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new Error('SESSION_NOT_ACTIVE');
    }

    const transactionId = `POS-${crypto.randomUUID()}`;
    let ledgerResult = null;

    if (paymentIntent.method === 'WALLET_INTERNAL') {
      if (!customerKpId) {
        throw new Error('CUSTOMER_KP_REQUIRED');
      }

      ledgerResult = await LedgerEngine.transfer({
        fromKp: customerKpId,
        toKp: merchantKpId,
        amount,
        reference: transactionId,
        description: description || paymentIntent.description || 'POS payment',
        mode: 'INSTANT',
      });
    } else {
      ledgerResult = await LedgerEngine.deposit({
        kp_id: merchantKpId,
        amount,
        description: description || `POS ${paymentIntent.method} ${transactionId}`,
      });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const record = await tx.transaction.create({
        data: {
          transactionId,
          from_kp: customerKpId || 'EXTERNAL',
          to_kp: merchantKpId,
          amount,
          fee: 0,
          status: 'SETTLED',
          mode: 'INSTANT',
          description: description || paymentIntent.description || 'POS sale',
          confirmed_at: new Date(),
          confirmed_by: paymentIntent.cashier_id,
          cashier_id: paymentIntent.cashier_id,
          session_id: paymentIntent.cashier_session_id,
          payment_intent_id: paymentIntent.id,
          metadata: {
            method: paymentIntent.method,
            payment_reference_code: paymentIntent.payment_reference_code,
            ledger: ledgerResult?.transactionId || transactionId,
          },
        },
      });

      await tx.cashierSession.update({
        where: { id: session.id },
        data: {
          total_received: { increment: amount },
          transaction_count: { increment: 1 },
        },
      });

      await tx.cashier.update({
        where: { id: paymentIntent.cashier_id },
        data: {
          total_received: { increment: amount },
          transaction_count: { increment: 1 },
        },
      });

      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: 'SUCCESS',
          customer_kp_id: customerKpId,
        },
      });

      return record;
    });

    return { transaction, ledgerResult };
  }
}

module.exports = PosLedgerService;
