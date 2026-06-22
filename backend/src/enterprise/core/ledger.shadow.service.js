const { randomUUID } = require('crypto');

const shadowLedgerStore = [];

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function toIso(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function extractIdentifier(payload = {}) {
  return (
    payload.transactionId ||
    payload.reference ||
    payload.paymentTransactionId ||
    payload.walletId ||
    payload.recordId ||
    payload.id ||
    null
  );
}

function extractAmount(payload = {}) {
  const rawAmount =
    payload.amount ??
    payload.balanceAfter ??
    payload.balance_before ??
    payload.balance_after ??
    payload.metadata?.amount ??
    null;

  if (rawAmount == null || rawAmount === '') {
    return null;
  }

  const parsed = Number(rawAmount);
  return Number.isFinite(parsed) ? parsed : null;
}

function recordLedgerMutation(input = {}) {
  const payload = clonePlain(input.payload || input.result || input.args || {});
  const record = {
    id: input.id || randomUUID(),
    kind: input.kind || 'LEDGER_SHADOW',
    model: input.model || null,
    action: input.action || null,
    entityId: input.entityId || extractIdentifier(payload),
    transactionId: input.transactionId || payload.transactionId || null,
    paymentTransactionId: input.paymentTransactionId || payload.paymentTransactionId || null,
    walletId: input.walletId || payload.kp_id || payload.walletId || null,
    enterpriseId: input.enterpriseId || payload.enterpriseId || null,
    departmentId: input.departmentId || payload.departmentId || null,
    status: input.status || payload.status || null,
    amount: input.amount ?? extractAmount(payload),
    balanceBefore:
      input.balanceBefore ?? payload.balance_before ?? payload.balanceBefore ?? null,
    balanceAfter:
      input.balanceAfter ?? payload.balance_after ?? payload.balanceAfter ?? null,
    metadata: clonePlain(input.metadata || payload.metadata || {}),
    payload,
    createdAt: toIso(input.createdAt),
  };

  shadowLedgerStore.push(record);
  return clonePlain(record);
}

function exportShadowLedger(filter = {}) {
  return shadowLedgerStore
    .filter((record) => {
      if (filter.model && record.model !== filter.model) return false;
      if (filter.action && record.action !== filter.action) return false;
      if (filter.enterpriseId && record.enterpriseId !== filter.enterpriseId) return false;
      if (filter.departmentId && record.departmentId !== filter.departmentId) return false;
      if (filter.transactionId && record.transactionId !== filter.transactionId) return false;
      if (filter.paymentTransactionId && record.paymentTransactionId !== filter.paymentTransactionId) {
        return false;
      }
      if (filter.walletId && record.walletId !== filter.walletId) return false;
      return true;
    })
    .map((record) => clonePlain(record));
}

function getShadowLedgerStats() {
  const total = shadowLedgerStore.length;
  const byModel = shadowLedgerStore.reduce((acc, record) => {
    const key = record.model || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    byModel,
  };
}

function clearShadowLedger() {
  shadowLedgerStore.length = 0;
}

module.exports = {
  shadowLedgerStore,
  recordLedgerMutation,
  exportShadowLedger,
  getShadowLedgerStats,
  clearShadowLedger,
};
