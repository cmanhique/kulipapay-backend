/**
 * SESSION TYPES
 * Constantes e tipos para sessões
 */

const ACCOUNT_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  MERCHANT: 'MERCHANT',
  BUSINESS: 'BUSINESS',
  AGENT: 'AGENT'
}

const SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
}

const PERMISSION_LEVELS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  PROCESS: 'process'
}

module.exports = {
  ACCOUNT_TYPES,
  SESSION_STATUS,
  PERMISSION_LEVELS
}
