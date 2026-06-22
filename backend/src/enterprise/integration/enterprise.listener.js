const { AuditEventType, AuditSeverity, AuditOrigin } = require('../audit/audit.types');
const AuditEngine = require('../audit/audit.engine');
const PolicyEngine = require('../policy/policy.engine');
const ShadowLedgerService = require('../core/ledger.shadow.service');

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function extractEventPayload(event = {}) {
  return clonePlain(event.payload || {});
}

function extractRelevantModelData(event = {}) {
  const payload = extractEventPayload(event);
  return {
    model: payload.model || null,
    action: payload.action || null,
    args: clonePlain(payload.args || {}),
    result: clonePlain(payload.result || null),
    durationMs: payload.durationMs ?? null,
  };
}

function getAuditSeverity(action = '') {
  const normalized = String(action || '').toLowerCase();

  if (normalized.includes('delete') || normalized.includes('reverse')) {
    return AuditSeverity.HIGH;
  }

  if (normalized.includes('update')) {
    return AuditSeverity.MEDIUM;
  }

  return AuditSeverity.INFO;
}

function buildCommonIdentifiers(data = {}) {
  const source = data.result || data.args?.data || data.args?.where || {};

  return {
    transactionId:
      source.transactionId ||
      source.transaction_id ||
      source.metadata?.transactionId ||
      source.metadata?.transaction_id ||
      data.args?.where?.transactionId ||
      data.args?.where?.id ||
      null,
    paymentTransactionId:
      source.paymentTransactionId ||
      source.payment_transaction_id ||
      null,
    walletId: source.kp_id || source.walletId || data.args?.where?.kp_id || null,
    enterpriseId: source.enterpriseId || source.enterprise_id || null,
    departmentId: source.departmentId || source.department_id || null,
    status: source.status || null,
    amount: source.amount ?? null,
  };
}

function logAuditEvent({ type, severity, origin, message, payload }) {
  return AuditEngine.logEvent({
    type,
    severity,
    origin,
    message,
    payload,
  });
}

function handleTransactionMutation(event, config) {
  const data = extractRelevantModelData(event);
  const ids = buildCommonIdentifiers(data);
  const payload = {
    ...data,
    identifiers: ids,
    source: 'prisma.middleware',
    channel: event.channel,
    eventId: event.id,
    observedAt: event.createdAt,
  };

  if (config.auditEnabled) {
    logAuditEvent({
      type: AuditEventType.TRANSACTION_CREATED,
      severity: getAuditSeverity(data.action),
      origin: AuditOrigin.ENTERPRISE_OVERLAY,
      message: `Transaction mutation observed: ${data.model}.${data.action}`,
      payload,
    });
  }

  if (config.policyEnabled && data.action === 'create') {
    const decision = PolicyEngine.evaluateTransaction({
      transaction: data.result || data.args?.data || {},
      enterprise: ids.enterpriseId ? { id: ids.enterpriseId } : null,
      department: ids.departmentId ? { id: ids.departmentId } : null,
    });

    if (config.auditEnabled) {
      logAuditEvent({
        type: AuditEventType.POLICY_EVALUATED,
        severity: decision.blocked ? AuditSeverity.HIGH : AuditSeverity.INFO,
        origin: AuditOrigin.POLICY_ENGINE,
        message: `Enterprise policy evaluated for transaction ${ids.transactionId || 'unknown'}`,
        payload: {
          ...payload,
          decision,
        },
      });
    }
  }
}

function handlePaymentMutation(event, config) {
  const data = extractRelevantModelData(event);
  const ids = buildCommonIdentifiers(data);
  const payload = {
    ...data,
    identifiers: ids,
    source: 'prisma.middleware',
    channel: event.channel,
    eventId: event.id,
    observedAt: event.createdAt,
  };

  if (config.auditEnabled) {
    logAuditEvent({
      type: AuditEventType.PAYMENT_PROCESSED,
      severity: getAuditSeverity(data.action),
      origin: AuditOrigin.ENTERPRISE_OVERLAY,
      message: `Payment mutation observed: ${data.model}.${data.action}`,
      payload,
    });
  }
}

function handleLedgerMutation(event, config) {
  const data = extractRelevantModelData(event);
  const ids = buildCommonIdentifiers(data);
  const payload = {
    ...data,
    identifiers: ids,
    source: 'prisma.middleware',
    channel: event.channel,
    eventId: event.id,
    observedAt: event.createdAt,
  };

  ShadowLedgerService.recordLedgerMutation({
    model: data.model,
    action: data.action,
    transactionId: ids.transactionId,
    paymentTransactionId: ids.paymentTransactionId,
    walletId: ids.walletId,
    enterpriseId: ids.enterpriseId,
    departmentId: ids.departmentId,
    status: ids.status,
    amount: ids.amount,
    payload,
    metadata: {
      origin: AuditOrigin.ENTERPRISE_OVERLAY,
      source: 'prisma.middleware',
      channel: event.channel,
      eventId: event.id,
      observedAt: event.createdAt,
    },
    createdAt: event.createdAt,
  });

  if (config.auditEnabled) {
    logAuditEvent({
      type: AuditEventType.LEDGER_UPDATED,
      severity: getAuditSeverity(data.action),
      origin: AuditOrigin.ENTERPRISE_OVERLAY,
      message: `Ledger mutation observed: ${data.model}.${data.action}`,
      payload,
    });
  }
}

function handlePrismaMutation(event, config) {
  const data = extractRelevantModelData(event);

  if (!data.model) {
    return;
  }

  if (data.model === 'Transaction') {
    handleTransactionMutation(event, config);
    return;
  }

  if (data.model === 'TransactionLedger') {
    handleLedgerMutation(event, config);
    return;
  }

  if (data.model === 'PaymentTransaction') {
    handlePaymentMutation(event, config);
    return;
  }

  if (data.model === 'Wallet') {
    handleLedgerMutation(event, config);
  }
}

function attachEnterpriseListener(bus, config) {
  const handler = (event) => {
    setImmediate(() => {
      try {
        handlePrismaMutation(event, config);
      } catch (error) {
        console.warn('[enterprise.listener] event handling failed:', error.message);
      }
    });
  };

  bus.on('prisma.mutation', handler);

  return () => {
    bus.off('prisma.mutation', handler);
  };
}

module.exports = {
  attachEnterpriseListener,
  handlePrismaMutation,
};
