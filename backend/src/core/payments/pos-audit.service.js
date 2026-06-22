const { prisma } = require('../../prisma');

/**
 * Immutable POS audit trail — append-only events.
 */
class PosAuditService {
  static async log({
    merchantId,
    action,
    actorType,
    actorId,
    paymentIntentId = null,
    cashierId = null,
    cashierSessionId = null,
    metadata = {},
  }) {
    try {
      return await prisma.posAuditEvent.create({
        data: {
          merchant_id: merchantId,
          action,
          actor_type: actorType,
          actor_id: actorId,
          payment_intent_id: paymentIntentId,
          cashier_id: cashierId,
          cashier_session_id: cashierSessionId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('[PosAudit]', action, error.message);
      return null;
    }
  }

  static async getByPaymentIntent(paymentIntentId, limit = 100) {
    return prisma.posAuditEvent.findMany({
      where: { payment_intent_id: paymentIntentId },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }

  static async getBySession(cashierSessionId, limit = 200) {
    return prisma.posAuditEvent.findMany({
      where: { cashier_session_id: cashierSessionId },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }
}

module.exports = PosAuditService;
