/**
 * PAYMENT STATUS - CANONICAL
 * 
 * 🎯 Único vocabulário de status para todo o sistema
 * 
 * 🔥 REGRA: NUNCA adicionar status fora daqui
 */

const PAYMENT_STATUS = {
  // Estados iniciais
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  
  // Estados finais (sucesso)
  SUCCESS: 'SUCCESS',
  COMPLETED: 'COMPLETED',
  
  // Estados finais (falha)
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  
  // Estados intermediários (opcionais)
  AUTHORIZED: 'AUTHORIZED',
  SETTLED: 'SETTLED'
};

// Estados finais (não podem ser alterados)
const FINAL_STATES = new Set([
  PAYMENT_STATUS.SUCCESS,
  PAYMENT_STATUS.COMPLETED,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.REFUNDED,
  PAYMENT_STATUS.SETTLED
]);

// Estados de sucesso
const SUCCESS_STATES = new Set([
  PAYMENT_STATUS.SUCCESS,
  PAYMENT_STATUS.COMPLETED,
  PAYMENT_STATUS.SETTLED
]);

// Estados de falha
const FAILURE_STATES = new Set([
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.REFUNDED
]);

// 🔥 Mapeamento de status externos para canonical
const PROVIDER_STATUS_MAP = {
  // M-Pesa / e-Mola / mKesh
  'SUCCEEDED': PAYMENT_STATUS.SUCCESS,
  'SUCCESS': PAYMENT_STATUS.SUCCESS,
  'COMPLETED': PAYMENT_STATUS.COMPLETED,
  'PENDING': PAYMENT_STATUS.PENDING,
  'PROCESSING': PAYMENT_STATUS.PROCESSING,
  'FAILED': PAYMENT_STATUS.FAILED,
  'CANCELLED': PAYMENT_STATUS.CANCELLED,
  'REVERSED': PAYMENT_STATUS.REFUNDED,
  
  // Códigos M-Pesa específicos
  '0': PAYMENT_STATUS.SUCCESS,
  '1': PAYMENT_STATUS.FAILED,
  '2': PAYMENT_STATUS.PENDING,
  '3': PAYMENT_STATUS.CANCELLED
};

/**
 * Normalizar um status externo para o canonical
 */
function normalizeStatus(externalStatus) {
  return PROVIDER_STATUS_MAP[externalStatus] || PAYMENT_STATUS.PENDING;
}

/**
 * Verificar se um status é final
 */
function isFinalStatus(status) {
  return FINAL_STATES.has(status);
}

/**
 * Verificar se um status é de sucesso
 */
function isSuccessStatus(status) {
  return SUCCESS_STATES.has(status);
}

/**
 * Verificar se um status é de falha
 */
function isFailureStatus(status) {
  return FAILURE_STATES.has(status);
}

/**
 * Verificar se uma transação pode ser confirmada
 */
function canConfirm(status) {
  return status === PAYMENT_STATUS.PENDING || status === PAYMENT_STATUS.PROCESSING;
}

/**
 * Verificar se uma transação pode ser cancelada
 */
function canCancel(status) {
  return !isFinalStatus(status) && status !== PAYMENT_STATUS.SUCCESS;
}

module.exports = {
  PAYMENT_STATUS,
  FINAL_STATES,
  SUCCESS_STATES,
  FAILURE_STATES,
  normalizeStatus,
  isFinalStatus,
  isSuccessStatus,
  isFailureStatus,
  canConfirm,
  canCancel
};
