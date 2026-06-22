const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const { auditLogger } = require('./audit.logger');
const {
  AuditEventType,
  AuditSeverity,
  AuditFlag,
  AuditOrigin,
} = require('./audit.types');

const auditTrail = [];
const MAX_AUDIT_TRAIL = Number(process.env.ENTERPRISE_AUDIT_TRAIL_LIMIT || 5000);
const auditBus = new EventEmitter();
auditBus.setMaxListeners(0);

function clonePlain(value) {
  if (value == null) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

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

function normalizeEventType(value, fallback = AuditEventType.SYSTEM_EVENT) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || fallback;
}

function normalizeSeverity(value, fallback = AuditSeverity.INFO) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || fallback;
}

function normalizeFlags(flags = []) {
  if (!flags) {
    return [];
  }

  if (Array.isArray(flags)) {
    return flags
      .map((flag) => {
        if (typeof flag === 'string') {
          return flag.trim();
        }

        if (flag && typeof flag === 'object') {
          return String(flag.code || flag.type || flag.name || '').trim();
        }

        return '';
      })
      .filter(Boolean);
  }

  if (typeof flags === 'object') {
    return Object.keys(flags).map((flag) => String(flag).trim()).filter(Boolean);
  }

  return [];
}

function normalizeFlagList(flags = []) {
  return normalizeFlags(Array.isArray(flags) ? flags : [flags]);
}

function buildAuditRecord(input = {}) {
  const source = input || {};
  const eventType = normalizeEventType(source.type || source.eventType);
  const severity = normalizeSeverity(source.severity);
  const payload = clonePlain(source.payload || source.details || {});
  const flags = normalizeFlags(source.auditFlags || source.flags || payload.flags);
  const riskScore = Number.isFinite(Number(source.riskScore))
    ? Number(source.riskScore)
    : Number.isFinite(Number(payload.riskScore))
      ? Number(payload.riskScore)
      : null;

  return {
    id: source.id || randomUUID(),
    type: eventType,
    severity,
    origin: source.origin || AuditOrigin.ENTERPRISE_OVERLAY,
    enterpriseId: source.enterpriseId || payload.enterpriseId || null,
    departmentId: source.departmentId || payload.departmentId || null,
    transactionId: source.transactionId || payload.transactionId || null,
    userId: source.userId || payload.userId || null,
    message: typeof source.message === 'string' ? source.message : `${eventType} event recorded`,
    payload,
    riskScore: riskScore == null ? null : Math.max(0, Math.min(100, riskScore)),
    flags,
    createdAt: toIso(source.createdAt),
  };
}

function emitAuditRecord(record) {
  auditTrail.push(record);

  if (auditTrail.length > MAX_AUDIT_TRAIL) {
    auditTrail.splice(0, auditTrail.length - MAX_AUDIT_TRAIL);
  }

  auditBus.emit('audit:event', clonePlain(record));
  auditBus.emit(`audit:${String(record.type || 'SYSTEM_EVENT').toLowerCase()}`, clonePlain(record));

  const logMethod =
    record.severity === AuditSeverity.CRITICAL
      ? 'error'
      : record.severity === AuditSeverity.HIGH
        ? 'warn'
        : 'info';

  auditLogger[logMethod](`audit.${record.type}`, {
    enterpriseId: record.enterpriseId,
    departmentId: record.departmentId,
    transactionId: record.transactionId,
    userId: record.userId,
    flags: record.flags,
    riskScore: record.riskScore,
    payload: record.payload,
  });

  return clonePlain(record);
}

class AuditEngine {
  static logEvent(input = {}) {
    const record = buildAuditRecord(input);
    return emitAuditRecord(record);
  }

  static traceTransaction(transaction = {}, context = {}) {
    return this.logEvent({
      type: AuditEventType.TRANSACTION_CREATED,
      severity: context.severity || AuditSeverity.INFO,
      origin: context.origin || AuditOrigin.AUDIT_ENGINE,
      enterpriseId: context.enterpriseId || transaction.enterpriseId || null,
      departmentId: context.departmentId || transaction.departmentId || null,
      transactionId: transaction.transactionId || transaction.id || context.transactionId || null,
      userId: context.userId || transaction.userId || null,
      message: context.message || 'Transaction traced by enterprise audit overlay',
      payload: {
        transaction: clonePlain(transaction),
        context: clonePlain(context),
      },
      flags: normalizeFlagList(context.flags || transaction.auditFlags || transaction.flags),
      riskScore: context.riskScore ?? transaction.riskScore ?? null,
    });
  }

  static flagSuspiciousActivity(input = {}, context = {}) {
    return this.logEvent({
      type: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: input.severity || context.severity || AuditSeverity.CRITICAL,
      origin: input.origin || context.origin || AuditOrigin.AUDIT_ENGINE,
      enterpriseId: input.enterpriseId || context.enterpriseId || null,
      departmentId: input.departmentId || context.departmentId || null,
      transactionId: input.transactionId || context.transactionId || null,
      userId: input.userId || context.userId || null,
      message: input.message || 'Suspicious activity detected',
      payload: {
        ...clonePlain(input),
        context: clonePlain(context),
      },
      flags: [AuditFlag.SUSPICIOUS_ACTIVITY, ...normalizeFlagList(input.flags || context.flags)],
      riskScore: input.riskScore ?? context.riskScore ?? null,
    });
  }

  static exportAuditTrail(filter = {}) {
    const snapshot = auditTrail.filter((entry) => {
      if (filter.enterpriseId && entry.enterpriseId !== filter.enterpriseId) return false;
      if (filter.departmentId && entry.departmentId !== filter.departmentId) return false;
      if (filter.transactionId && entry.transactionId !== filter.transactionId) return false;
      if (filter.userId && entry.userId !== filter.userId) return false;
      if (filter.type && entry.type !== filter.type) return false;
      if (filter.severity && entry.severity !== filter.severity) return false;
      return true;
    });

    return snapshot.map((entry) => clonePlain(entry));
  }

  static on(eventName, listener) {
    auditBus.on(eventName, listener);
    return () => auditBus.off(eventName, listener);
  }

  static off(eventName, listener) {
    auditBus.off(eventName, listener);
  }
}

module.exports = AuditEngine;
module.exports.AuditEngine = AuditEngine;
module.exports.auditEngine = AuditEngine;
module.exports.auditBus = auditBus;
module.exports.auditTrail = auditTrail;
module.exports.logEvent = AuditEngine.logEvent.bind(AuditEngine);
module.exports.traceTransaction = AuditEngine.traceTransaction.bind(AuditEngine);
module.exports.flagSuspiciousActivity = AuditEngine.flagSuspiciousActivity.bind(AuditEngine);
module.exports.exportAuditTrail = AuditEngine.exportAuditTrail.bind(AuditEngine);
