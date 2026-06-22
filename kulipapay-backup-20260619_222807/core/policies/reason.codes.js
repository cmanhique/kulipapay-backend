/**
 * REASON CODES
 * 
 * Padrão único de códigos de razão para decisões de política
 * 
 * 🔑 Princípios:
 * 1. Códigos únicos e auto-explicativos
 * 2. Separados por categoria (AUTH, KYC, RISK, LIMIT, MODULE)
 * 3. Fácil de rastrear e auditar
 */

const REASON_CODES = {
  // Autenticação
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  
  // KYC
  KYC_REQUIRED: 'KYC_REQUIRED',
  KYC_PENDING: 'KYC_PENDING',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_LEVEL_INSUFFICIENT: 'KYC_LEVEL_INSUFFICIENT',
  
  // Módulos
  MODULE_NOT_AVAILABLE: 'MODULE_NOT_AVAILABLE',
  MODULE_DISABLED: 'MODULE_DISABLED',
  ACTION_NOT_ALLOWED: 'ACTION_NOT_ALLOWED',
  
  // Risco
  RISK_BLOCKED: 'RISK_BLOCKED',
  RISK_SCORE_EXCEEDED: 'RISK_SCORE_EXCEEDED',
  RISK_SUSPICIOUS: 'RISK_SUSPICIOUS',
  
  // Limites
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  MONTHLY_LIMIT_EXCEEDED: 'MONTHLY_LIMIT_EXCEEDED',
  PER_TRANSACTION_LIMIT: 'PER_TRANSACTION_LIMIT',
  
  // Dispositivo
  DEVICE_UNTRUSTED: 'DEVICE_UNTRUSTED',
  DEVICE_BLOCKED: 'DEVICE_BLOCKED',
  IP_BLOCKED: 'IP_BLOCKED',
  
  // Conta
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  
  // Geral
  UNKNOWN: 'UNKNOWN',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// Metadados para cada código
const REASON_METADATA = {
  [REASON_CODES.KYC_REQUIRED]: {
    category: 'KYC',
    severity: 'MEDIUM',
    message: 'KYC verification required',
    actionRequired: true
  },
  [REASON_CODES.KYC_PENDING]: {
    category: 'KYC',
    severity: 'LOW',
    message: 'KYC verification in progress',
    actionRequired: false
  },
  [REASON_CODES.KYC_REJECTED]: {
    category: 'KYC',
    severity: 'HIGH',
    message: 'KYC verification rejected',
    actionRequired: true
  },
  [REASON_CODES.MODULE_NOT_AVAILABLE]: {
    category: 'MODULE',
    severity: 'LOW',
    message: 'Module not available for this account type',
    actionRequired: false
  },
  [REASON_CODES.ACTION_NOT_ALLOWED]: {
    category: 'MODULE',
    severity: 'LOW',
    message: 'Action not allowed on this module',
    actionRequired: false
  },
  [REASON_CODES.RISK_BLOCKED]: {
    category: 'RISK',
    severity: 'HIGH',
    message: 'Action blocked by risk engine',
    actionRequired: true
  },
  [REASON_CODES.LIMIT_EXCEEDED]: {
    category: 'LIMIT',
    severity: 'MEDIUM',
    message: 'Limit exceeded',
    actionRequired: true
  },
  [REASON_CODES.DAILY_LIMIT_EXCEEDED]: {
    category: 'LIMIT',
    severity: 'MEDIUM',
    message: 'Daily limit exceeded',
    actionRequired: true
  },
  [REASON_CODES.ACCOUNT_SUSPENDED]: {
    category: 'ACCOUNT',
    severity: 'HIGH',
    message: 'Account suspended',
    actionRequired: true
  }
};

module.exports = {
  REASON_CODES,
  REASON_METADATA
};
