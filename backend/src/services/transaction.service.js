/**
 * TRANSACTION SERVICE
 * 
 * 🎯 Serviço de transações com suporte a dois modos:
 * - INSTANT: Transferência imediata (confirmada automaticamente)
 * - SECURE: Transferência segura (aguarda confirmação do destinatário)
 */

const TransactionEngine = require('../core/engines/transaction.engine');
const { computeRisk } = require('./risk.engine');

async function transfer({ from, to, amount, req, description = null, mode = 'SECURE' }) {
  // 1. RISK CHECK
  const risk = await computeRisk({
    kp_id: from,
    ip: req?.ip,
    fingerprint: req?.user?.fingerprint
  });

  if (risk.action === 'BLOCK') {
    throw new Error('Transaction blocked by risk engine');
  }

  // 2. DELEGAR PARA TRANSACTION ENGINE COM MODO
  return TransactionEngine.executeTransfer({
    from,
    to,
    amount,
    idempotencyKey: req?.headers?.['idempotency-key'],
    req,
    description,
    mode: mode || 'SECURE'
  });
}

module.exports = {
  transfer
};
