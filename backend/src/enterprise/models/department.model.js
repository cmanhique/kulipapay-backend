const { randomUUID } = require('crypto');

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

function normalizeBudget(budget) {
  if (budget == null) {
    return {
      limit: null,
      currency: 'MZN',
      period: 'MONTHLY',
      spent: 0,
    };
  }

  if (typeof budget === 'number' || typeof budget === 'string') {
    const limit = Number(budget);

    return {
      limit: Number.isFinite(limit) ? limit : null,
      currency: 'MZN',
      period: 'MONTHLY',
      spent: 0,
    };
  }

  if (typeof budget === 'object') {
    const limitValue = budget.limit ?? budget.amount ?? budget.value ?? null;
    const limit = limitValue == null ? null : Number(limitValue);
    const spent = budget.spent == null ? 0 : Number(budget.spent);

    return {
      limit: Number.isFinite(limit) ? limit : null,
      currency: typeof budget.currency === 'string' ? budget.currency : 'MZN',
      period: typeof budget.period === 'string' ? budget.period : typeof budget.interval === 'string' ? budget.interval : 'MONTHLY',
      spent: Number.isFinite(spent) ? spent : 0,
    };
  }

  return {
    limit: null,
    currency: 'MZN',
    period: 'MONTHLY',
    spent: 0,
  };
}

function normalizeRules(rules) {
  if (rules == null) {
    return {
      allowedCategories: [],
      blockedCategories: [],
      reviewCategories: [],
      approvalThreshold: null,
      riskThreshold: null,
      suspiciousFlags: [],
    };
  }

  if (Array.isArray(rules)) {
    return {
      list: clonePlain(rules),
      allowedCategories: [],
      blockedCategories: [],
      reviewCategories: [],
      approvalThreshold: null,
      riskThreshold: null,
      suspiciousFlags: [],
    };
  }

  if (typeof rules === 'object') {
    return clonePlain(rules);
  }

  return {
    allowedCategories: [],
    blockedCategories: [],
    reviewCategories: [],
    approvalThreshold: null,
    riskThreshold: null,
    suspiciousFlags: [],
  };
}

class DepartmentModel {
  constructor(input = {}) {
    const source = input || {};

    this.id = source.id || randomUUID();
    this.enterpriseId = source.enterpriseId || null;
    this.name = typeof source.name === 'string' ? source.name.trim() : '';
    this.budget = normalizeBudget(source.budget);
    this.rules = normalizeRules(source.rules);
    this.createdAt = toIso(source.createdAt);
  }

  static from(input = {}) {
    return new DepartmentModel(input);
  }

  static create(input = {}) {
    return new DepartmentModel(input).toJSON();
  }

  toJSON() {
    return {
      id: this.id,
      enterpriseId: this.enterpriseId,
      name: this.name,
      budget: clonePlain(this.budget || {}),
      rules: clonePlain(this.rules || {}),
      createdAt: this.createdAt,
    };
  }
}

module.exports = DepartmentModel;
