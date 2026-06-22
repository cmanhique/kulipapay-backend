const PolicyDecision = Object.freeze({
  ALLOW: 'ALLOW',
  REVIEW: 'REVIEW',
  BLOCK: 'BLOCK',
});

const PolicyCheck = Object.freeze({
  LIMITS: 'LIMITS',
  CATEGORY: 'CATEGORY',
  ANOMALY: 'ANOMALY',
  APPROVAL: 'APPROVAL',
});

const PolicySeverity = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

const PolicyOrigin = Object.freeze({
  SYSTEM: 'SYSTEM',
  ENTERPRISE: 'ENTERPRISE',
  DEPARTMENT: 'DEPARTMENT',
});

const TransactionIntent = Object.freeze({
  PAYMENT: 'PAYMENT',
  TRANSFER: 'TRANSFER',
  REFUND: 'REFUND',
  WITHDRAWAL: 'WITHDRAWAL',
  DEPOSIT: 'DEPOSIT',
  TOPUP: 'TOPUP',
  UNKNOWN: 'UNKNOWN',
});

const PolicyEnforcementMode = Object.freeze({
  OBSERVE_ONLY: 'OBSERVE_ONLY',
  LOGICAL_ONLY: 'LOGICAL_ONLY',
});

module.exports = {
  PolicyDecision,
  PolicyCheck,
  PolicySeverity,
  PolicyOrigin,
  TransactionIntent,
  PolicyEnforcementMode,
};
