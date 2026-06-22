function clonePlain(value) {
  if (value == null) return value;

  if (value instanceof Date) {
    return value.toISOString();
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

function normalizeText(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeRiskScore(score) {
  if (score == null || score === '') {
    return 0;
  }

  const value = Number(score);
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function normalizeAuditFlags(flags) {
  if (!flags) {
    return [];
  }

  if (Array.isArray(flags)) {
    return flags.map((flag) => {
      if (typeof flag === 'string') {
        return {
          code: flag,
          severity: 'INFO',
          message: null,
        };
      }

      return clonePlain(flag);
    });
  }

  if (typeof flags === 'object') {
    return Object.entries(flags).map(([code, value]) => {
      if (value && typeof value === 'object') {
        return {
          code,
          ...clonePlain(value),
        };
      }

      return {
        code,
        value,
      };
    });
  }

  return [];
}

class TransactionExtensionModel {
  constructor(input = {}) {
    const source = input || {};

    this.transactionId = source.transactionId || null;
    this.enterpriseId = source.enterpriseId || null;
    this.departmentId = source.departmentId || null;
    this.category = normalizeText(source.category, 'UNCLASSIFIED');
    this.intent = normalizeText(source.intent, 'UNKNOWN');
    this.riskScore = normalizeRiskScore(source.riskScore);
    this.auditFlags = normalizeAuditFlags(source.auditFlags);
    this.createdAt = toIso(source.createdAt);
  }

  static from(input = {}) {
    return new TransactionExtensionModel(input);
  }

  static create(input = {}) {
    return new TransactionExtensionModel(input).toJSON();
  }

  toJSON() {
    return {
      transactionId: this.transactionId,
      enterpriseId: this.enterpriseId,
      departmentId: this.departmentId,
      category: this.category,
      intent: this.intent,
      riskScore: this.riskScore,
      auditFlags: clonePlain(this.auditFlags || []),
      createdAt: this.createdAt,
    };
  }
}

module.exports = TransactionExtensionModel;
