const {
  PolicyDecision,
  PolicyCheck,
  PolicyEnforcementMode,
} = require('./policy.types');
const {
  DEFAULT_POLICY_PROFILE,
  normalizePolicyProfile,
  buildPolicyRules,
  evaluateDepartmentBudget,
  evaluateCategoryPolicy,
  evaluateRiskPolicy,
  evaluateApprovalPolicy,
  resolveAmount,
  resolveRiskScore,
  normalizeCategory,
  normalizeIntent,
  toNumber,
} = require('./policy.rules');

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

function summarizeTransaction(transaction = {}) {
  return {
    transactionId: transaction.transactionId || transaction.id || null,
    amount: resolveAmount(transaction),
    category: normalizeCategory(
      transaction.category || transaction.metadata?.category || transaction.mcc || transaction.intent
    ),
    intent: normalizeIntent(
      transaction.intent || transaction.metadata?.intent || transaction.type || transaction.mode
    ),
    riskScore: resolveRiskScore(transaction),
  };
}

function mergeCheckResults(checks = []) {
  let decision = PolicyDecision.ALLOW;
  let reviewRequired = false;
  let blocked = false;

  for (const check of checks) {
    if (!check) continue;

    if (check.blocked || check.decision === PolicyDecision.BLOCK || check.allowed === false) {
      blocked = true;
      decision = PolicyDecision.BLOCK;
    } else if (check.reviewRequired || check.decision === PolicyDecision.REVIEW) {
      if (!blocked) {
        reviewRequired = true;
        if (decision === PolicyDecision.ALLOW) {
          decision = PolicyDecision.REVIEW;
        }
      }
    }
  }

  if (blocked) {
    decision = PolicyDecision.BLOCK;
  } else if (reviewRequired) {
    decision = PolicyDecision.REVIEW;
  }

  return {
    decision,
    allowed: decision !== PolicyDecision.BLOCK,
    reviewRequired,
    blocked,
  };
}

class PolicyEngine {
  static loadPolicies(input = {}) {
    const enterprise = input.enterprise || null;
    const department = input.department || null;
    const overrides = input.overrides || input.policyOverrides || input.rules || {};

    const profile = normalizePolicyProfile({
      enterprise,
      department,
      overrides,
    });

    return {
      profile,
      rules: buildPolicyRules(profile),
      source: {
        enterpriseId: enterprise?.id || null,
        departmentId: department?.id || null,
      },
      loadedAt: toIso(),
    };
  }

  static validateLimits(input = {}) {
    const transaction = input.transaction || input;
    const enterprise = input.enterprise || null;
    const department = input.department || null;
    const policies = input.policies || this.loadPolicies({ enterprise, department, overrides: input.overrides });

    const budgetCheck = evaluateDepartmentBudget(policies.profile, transaction, department);
    const approvalCheck = evaluateApprovalPolicy(policies.profile, transaction, department);

    const summary = mergeCheckResults([budgetCheck, approvalCheck]);

    return {
      ...summary,
      checkType: PolicyCheck.LIMITS,
      checks: [budgetCheck, approvalCheck],
      profile: clonePlain(policies.profile),
      enterpriseId: enterprise?.id || policies.source.enterpriseId || null,
      departmentId: department?.id || policies.source.departmentId || null,
      evaluatedAt: toIso(),
    };
  }

  static detectAnomalies(input = {}) {
    const transaction = input.transaction || input;
    const enterprise = input.enterprise || null;
    const department = input.department || null;
    const policies = input.policies || this.loadPolicies({ enterprise, department, overrides: input.overrides });

    const categoryCheck = evaluateCategoryPolicy(policies.profile, transaction);
    const riskCheck = evaluateRiskPolicy(policies.profile, transaction);

    const summary = mergeCheckResults([categoryCheck, riskCheck]);

    return {
      ...summary,
      checkType: PolicyCheck.ANOMALY,
      checks: [categoryCheck, riskCheck],
      profile: clonePlain(policies.profile),
      enterpriseId: enterprise?.id || policies.source.enterpriseId || null,
      departmentId: department?.id || policies.source.departmentId || null,
      evaluatedAt: toIso(),
    };
  }

  static evaluateTransaction(input = {}) {
    const transaction = input.transaction || input;
    const enterprise = input.enterprise || null;
    const department = input.department || null;
    const policies = input.policies || this.loadPolicies({
      enterprise,
      department,
      overrides: input.overrides || input.policyOverrides || input.rules,
    });

    const rules = policies.rules || buildPolicyRules(policies.profile || DEFAULT_POLICY_PROFILE);
    const checks = [];

    for (const rule of rules) {
      if (!rule || rule.enabled === false || typeof rule.evaluate !== 'function') {
        continue;
      }

      const result = rule.evaluate({
        transaction,
        enterprise,
        department,
        profile: policies.profile,
        policies,
      });

      checks.push({
        ruleId: rule.id || rule.name || 'unknown-rule',
        ruleType: rule.type || null,
        result: clonePlain(result),
      });
    }

    const summary = mergeCheckResults(checks.map((entry) => entry.result));
    const transactionSummary = summarizeTransaction(transaction);

    return {
      ...summary,
      mode: PolicyEnforcementMode.LOGICAL_ONLY,
      policyVersion: policies.profile?.version || DEFAULT_POLICY_PROFILE.version,
      profile: clonePlain(policies.profile),
      transaction: transactionSummary,
      enterpriseId: enterprise?.id || policies.source.enterpriseId || null,
      departmentId: department?.id || policies.source.departmentId || null,
      checks,
      evaluatedAt: toIso(),
    };
  }
}

module.exports = PolicyEngine;
module.exports.PolicyEngine = PolicyEngine;
module.exports.loadPolicies = PolicyEngine.loadPolicies.bind(PolicyEngine);
module.exports.validateLimits = PolicyEngine.validateLimits.bind(PolicyEngine);
module.exports.detectAnomalies = PolicyEngine.detectAnomalies.bind(PolicyEngine);
module.exports.evaluateTransaction = PolicyEngine.evaluateTransaction.bind(PolicyEngine);
