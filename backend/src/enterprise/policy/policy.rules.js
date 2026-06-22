const {
  PolicyDecision,
  PolicyCheck,
  PolicySeverity,
  TransactionIntent,
} = require('./policy.types');

const DEFAULT_POLICY_PROFILE = Object.freeze({
  version: 'enterprise-overlay-v1',
  limits: {
    amount: null,
    dailyAmount: null,
    monthlyAmount: null,
    approvalThreshold: null,
  },
  categories: {
    allowed: [],
    blocked: [],
    review: [],
  },
  anomalies: {
    reviewThreshold: 70,
    blockThreshold: 90,
    suspiciousFlags: [],
  },
  metadata: {},
});

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

function asPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return clonePlain(value);
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

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim().toLowerCase() || fallback;
}

function toNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toList(value) {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeText(entry, ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => normalizeText(entry, ''))
      .filter(Boolean);
  }

  return [];
}

function pickSection(config = {}, key) {
  if (!config || typeof config !== 'object') {
    return {};
  }

  const value = config[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return clonePlain(value);
  }

  return {};
}

function normalizePolicyProfile(input = {}) {
  const enterprise = input.enterprise || {};
  const department = input.department || {};
  const overrides = input.overrides || {};

  const enterpriseConfig = asPlainObject(enterprise.settings?.policy || enterprise.settings || {});
  const departmentConfig = asPlainObject(department.rules || {});
  const overrideConfig = asPlainObject(overrides);

  const base = clonePlain(DEFAULT_POLICY_PROFILE);
  const merged = {
    ...base,
    ...clonePlain(enterpriseConfig),
    ...clonePlain(overrideConfig),
    limits: {
      ...base.limits,
      ...pickSection(enterpriseConfig, 'limits'),
      ...pickSection(departmentConfig, 'limits'),
      ...pickSection(overrideConfig, 'limits'),
    },
    categories: {
      ...base.categories,
      ...pickSection(enterpriseConfig, 'categories'),
      ...pickSection(departmentConfig, 'categories'),
      ...pickSection(overrideConfig, 'categories'),
    },
    anomalies: {
      ...base.anomalies,
      ...pickSection(enterpriseConfig, 'anomalies'),
      ...pickSection(departmentConfig, 'anomalies'),
      ...pickSection(overrideConfig, 'anomalies'),
    },
    metadata: {
      ...clonePlain(base.metadata),
      ...(enterpriseConfig.metadata || {}),
      ...(departmentConfig.metadata || {}),
      ...(overrideConfig.metadata || {}),
    },
  };

  merged.limits.amount = toNumber(
    merged.limits.amount ??
      merged.limits.limit ??
      department?.budget?.limit ??
      department?.budget?.amount ??
      null
  );
  merged.limits.dailyAmount = toNumber(merged.limits.dailyAmount ?? merged.limits.daily_limit ?? null);
  merged.limits.monthlyAmount = toNumber(merged.limits.monthlyAmount ?? merged.limits.monthly_limit ?? null);
  merged.limits.approvalThreshold = toNumber(
    merged.limits.approvalThreshold ??
      merged.limits.approval_threshold ??
      department?.rules?.approvalThreshold ??
      null
  );

  merged.categories.allowed = uniqueList(
    [
      ...toList(merged.categories.allowed),
      ...toList(merged.categories.allowedCategories),
    ]
  );
  merged.categories.blocked = uniqueList(
    [
      ...toList(merged.categories.blocked),
      ...toList(merged.categories.blockedCategories),
    ]
  );
  merged.categories.review = uniqueList(
    [
      ...toList(merged.categories.review),
      ...toList(merged.categories.reviewCategories),
    ]
  );

  merged.anomalies.reviewThreshold = toNumber(
    merged.anomalies.reviewThreshold ?? merged.anomalies.riskThreshold ?? 70
  );
  merged.anomalies.blockThreshold = toNumber(
    merged.anomalies.blockThreshold ?? merged.anomalies.riskBlockThreshold ?? 90
  );
  merged.anomalies.suspiciousFlags = uniqueList(
    [
      ...toList(merged.anomalies.suspiciousFlags),
      ...toList(merged.anomalies.flags),
    ]
  );

  merged.version = merged.version || DEFAULT_POLICY_PROFILE.version;

  return merged;
}

function normalizeCategory(value) {
  return normalizeText(value, 'unclassified');
}

function normalizeIntent(value) {
  const intent = normalizeText(value, TransactionIntent.UNKNOWN.toLowerCase()).toUpperCase();

  if (TransactionIntent[intent]) {
    return TransactionIntent[intent];
  }

  return TransactionIntent.UNKNOWN;
}

function resolveAmount(transaction = {}) {
  return (
    toNumber(transaction.amount) ??
    toNumber(transaction.value) ??
    toNumber(transaction.metadata?.amount) ??
    0
  );
}

function resolveRiskScore(transaction = {}) {
  const riskScore =
    toNumber(transaction.riskScore) ??
    toNumber(transaction.metadata?.riskScore) ??
    0;

  return Math.max(0, Math.min(100, riskScore));
}

function resolveBudgetLimit(department = {}, profile = {}) {
  const budget = department?.budget || {};

  return (
    toNumber(budget.limit) ??
    toNumber(budget.amount) ??
    toNumber(profile.limits.amount) ??
    null
  );
}

function resolveApprovalThreshold(department = {}, profile = {}) {
  const budget = department?.budget || {};

  return (
    toNumber(budget.approvalThreshold) ??
    toNumber(department?.rules?.approvalThreshold) ??
    toNumber(profile.limits.approvalThreshold) ??
    null
  );
}

function normalizeFlags(flags = []) {
  if (!flags) {
    return [];
  }

  if (Array.isArray(flags)) {
    return flags
      .map((flag) => {
        if (typeof flag === 'string') {
          return normalizeText(flag, '');
        }

        if (flag && typeof flag === 'object') {
          return normalizeText(flag.code || flag.type || flag.name, '');
        }

        return '';
      })
      .filter(Boolean);
  }

  if (typeof flags === 'object') {
    return Object.keys(flags).map((flag) => normalizeText(flag, '')).filter(Boolean);
  }

  return [];
}

function createOutcome({
  allowed = true,
  decision = PolicyDecision.ALLOW,
  reason = null,
  code = null,
  severity = PolicySeverity.LOW,
  reviewRequired = false,
  blocked = false,
  metadata = {},
} = {}) {
  return {
    allowed,
    decision,
    reason,
    code,
    severity,
    reviewRequired,
    blocked,
    metadata: clonePlain(metadata),
    createdAt: toIso(),
  };
}

function evaluateDepartmentBudget(profile = DEFAULT_POLICY_PROFILE, transaction = {}, department = {}) {
  const amount = resolveAmount(transaction);
  const limit = resolveBudgetLimit(department, profile);

  if (limit == null) {
    return createOutcome({
      allowed: true,
      decision: PolicyDecision.ALLOW,
      reason: 'LIMIT_NOT_CONFIGURED',
      code: PolicyCheck.LIMITS,
      metadata: {
        amount,
        limit,
        departmentId: department?.id || null,
      },
    });
  }

  if (amount > limit) {
    return createOutcome({
      allowed: false,
      decision: PolicyDecision.BLOCK,
      reason: 'DEPARTMENT_LIMIT_EXCEEDED',
      code: PolicyCheck.LIMITS,
      severity: PolicySeverity.HIGH,
      blocked: true,
      metadata: {
        amount,
        limit,
        excess: amount - limit,
        departmentId: department?.id || null,
      },
    });
  }

  return createOutcome({
    allowed: true,
    decision: PolicyDecision.ALLOW,
    reason: 'WITHIN_LIMIT',
    code: PolicyCheck.LIMITS,
    metadata: {
      amount,
      limit,
      departmentId: department?.id || null,
    },
  });
}

function evaluateCategoryPolicy(profile = DEFAULT_POLICY_PROFILE, transaction = {}) {
  const category = normalizeCategory(
    transaction.category ||
      transaction.metadata?.category ||
      transaction.mcc ||
      transaction.intent
  );
  const allowedCategories = toList(profile.categories.allowed);
  const blockedCategories = toList(profile.categories.blocked);
  const reviewCategories = toList(profile.categories.review);

  if (blockedCategories.includes(category)) {
    return createOutcome({
      allowed: false,
      decision: PolicyDecision.BLOCK,
      reason: 'CATEGORY_BLOCKED',
      code: PolicyCheck.CATEGORY,
      severity: PolicySeverity.MEDIUM,
      blocked: true,
      metadata: {
        category,
        allowedCategories,
        blockedCategories,
      },
    });
  }

  if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
    return createOutcome({
      allowed: true,
      decision: PolicyDecision.REVIEW,
      reason: 'CATEGORY_REVIEW_REQUIRED',
      code: PolicyCheck.CATEGORY,
      severity: PolicySeverity.MEDIUM,
      reviewRequired: true,
      metadata: {
        category,
        allowedCategories,
        blockedCategories,
      },
    });
  }

  if (reviewCategories.includes(category)) {
    return createOutcome({
      allowed: true,
      decision: PolicyDecision.REVIEW,
      reason: 'CATEGORY_REVIEWED',
      code: PolicyCheck.CATEGORY,
      severity: PolicySeverity.MEDIUM,
      reviewRequired: true,
      metadata: {
        category,
        reviewCategories,
      },
    });
  }

  return createOutcome({
    allowed: true,
    decision: PolicyDecision.ALLOW,
    reason: 'CATEGORY_ALLOWED',
    code: PolicyCheck.CATEGORY,
    metadata: {
      category,
      allowedCategories,
      blockedCategories,
      reviewCategories,
    },
  });
}

function evaluateRiskPolicy(profile = DEFAULT_POLICY_PROFILE, transaction = {}) {
  const riskScore = resolveRiskScore(transaction);
  const reviewThreshold = toNumber(profile.anomalies.reviewThreshold) ?? 70;
  const blockThreshold = toNumber(profile.anomalies.blockThreshold) ?? 90;
  const flags = normalizeFlags(transaction.auditFlags || transaction.flags || transaction.metadata?.auditFlags);
  const suspiciousFlags = toList(profile.anomalies.suspiciousFlags);
  const hasSuspiciousFlag = flags.some((flag) => suspiciousFlags.includes(flag));

  if (riskScore >= blockThreshold) {
    return createOutcome({
      allowed: false,
      decision: PolicyDecision.BLOCK,
      reason: 'RISK_BLOCK_THRESHOLD_REACHED',
      code: PolicyCheck.ANOMALY,
      severity: PolicySeverity.CRITICAL,
      blocked: true,
      metadata: {
        riskScore,
        reviewThreshold,
        blockThreshold,
        flags,
        suspiciousFlags,
      },
    });
  }

  if (riskScore >= reviewThreshold || hasSuspiciousFlag) {
    return createOutcome({
      allowed: true,
      decision: PolicyDecision.REVIEW,
      reason: hasSuspiciousFlag ? 'SUSPICIOUS_FLAG_DETECTED' : 'RISK_REVIEW_THRESHOLD_REACHED',
      code: PolicyCheck.ANOMALY,
      severity: PolicySeverity.HIGH,
      reviewRequired: true,
      metadata: {
        riskScore,
        reviewThreshold,
        blockThreshold,
        flags,
        suspiciousFlags,
      },
    });
  }

  return createOutcome({
    allowed: true,
    decision: PolicyDecision.ALLOW,
    reason: 'RISK_WITHIN_ACCEPTABLE_RANGE',
    code: PolicyCheck.ANOMALY,
    metadata: {
      riskScore,
      reviewThreshold,
      blockThreshold,
      flags,
      suspiciousFlags,
    },
  });
}

function evaluateApprovalPolicy(profile = DEFAULT_POLICY_PROFILE, transaction = {}, department = {}) {
  const amount = resolveAmount(transaction);
  const approvalThreshold = resolveApprovalThreshold(department, profile);

  if (approvalThreshold == null) {
    return createOutcome({
      allowed: true,
      decision: PolicyDecision.ALLOW,
      reason: 'APPROVAL_THRESHOLD_NOT_CONFIGURED',
      code: PolicyCheck.APPROVAL,
      metadata: {
        amount,
        approvalThreshold,
        departmentId: department?.id || null,
      },
    });
  }

  if (amount >= approvalThreshold) {
    return createOutcome({
      allowed: true,
      decision: PolicyDecision.REVIEW,
      reason: 'APPROVAL_REQUIRED',
      code: PolicyCheck.APPROVAL,
      severity: PolicySeverity.HIGH,
      reviewRequired: true,
      metadata: {
        amount,
        approvalThreshold,
        departmentId: department?.id || null,
      },
    });
  }

  return createOutcome({
    allowed: true,
    decision: PolicyDecision.ALLOW,
    reason: 'APPROVAL_NOT_REQUIRED',
    code: PolicyCheck.APPROVAL,
    metadata: {
      amount,
      approvalThreshold,
      departmentId: department?.id || null,
    },
  });
}

function buildPolicyRules(profile = DEFAULT_POLICY_PROFILE) {
  return [
    {
      id: 'department-budget-limit',
      name: 'Department Budget Limit',
      type: PolicyCheck.LIMITS,
      enabled: true,
      evaluate: ({ transaction = {}, department = {} } = {}) =>
        evaluateDepartmentBudget(profile, transaction, department),
    },
    {
      id: 'category-policy',
      name: 'Category Policy',
      type: PolicyCheck.CATEGORY,
      enabled: true,
      evaluate: ({ transaction = {} } = {}) => evaluateCategoryPolicy(profile, transaction),
    },
    {
      id: 'risk-policy',
      name: 'Risk Policy',
      type: PolicyCheck.ANOMALY,
      enabled: true,
      evaluate: ({ transaction = {} } = {}) => evaluateRiskPolicy(profile, transaction),
    },
    {
      id: 'approval-threshold',
      name: 'Approval Threshold',
      type: PolicyCheck.APPROVAL,
      enabled: true,
      evaluate: ({ transaction = {}, department = {} } = {}) =>
        evaluateApprovalPolicy(profile, transaction, department),
    },
  ];
}

module.exports = {
  DEFAULT_POLICY_PROFILE,
  normalizePolicyProfile,
  buildPolicyRules,
  createOutcome,
  evaluateDepartmentBudget,
  evaluateCategoryPolicy,
  evaluateRiskPolicy,
  evaluateApprovalPolicy,
  resolveAmount,
  resolveRiskScore,
  normalizeCategory,
  normalizeIntent,
  normalizeFlags,
  toNumber,
};
