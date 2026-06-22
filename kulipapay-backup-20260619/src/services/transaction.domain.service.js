/**
 * TRANSACTION DOMAIN SERVICE
 * 
 * 🎯 Gerencia o ciclo de vida das transações
 */

const { prisma } = require('../prisma');
const LedgerEngine = require('../core/ledger.engine');
const FeeEngine = require('../core/fee.engine');
const LimitsEngine = require('../core/limits.engine');
const WebSocketService = require('../core/websocket/websocket.service');
const AuditService = require('../core/audit/audit.service');
const crypto = require('crypto');

class TransactionDomainService {
  
  /**
   * Criar uma nova transação
   */
  static async create({ from, to, amount, idempotencyKey, description = null, mode = 'SECURE' }) {
    // 1. Validar
    if (!from || !to || !amount) {
      throw new Error('Missing required fields');
    }
    if (from === to) {
      throw new Error('Cannot transfer to yourself');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // 2. Verificar destinatário
    const toAccount = await prisma.account.findUnique({
      where: { kp_id: to }
    });
    if (!toAccount) {
      throw new Error(`Recipient not found: ${to}`);
    }
    
    // 3. Verificar limites
    await LimitsEngine.check({ kp_id: from, amount });
    
    // 4. Verificar idempotência
    if (idempotencyKey) {
      const existing = await prisma.transaction.findUnique({
        where: { idempotency_key: idempotencyKey }
      });
      if (existing) {
        return existing;
      }
    }
    
    // 5. Calcular fee
    const feeResult = FeeEngine.applyFee({ amount });
    
    // 6. Definir data de expiração (24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // 7. Criar Transaction (PENDING)
    const transaction = await prisma.transaction.create({
      data: {
        transactionId: crypto.randomUUID(),
        from_kp: from,
        to_kp: to,
        amount: feeResult.grossAmount,
        fee: feeResult.fee.total,
        status: 'PENDING',
        mode: mode,
        idempotency_key: idempotencyKey,
        description: description || `Transfer to ${to}`,
        expired_at: expiresAt,
        metadata: {
          feeBreakdown: feeResult.fee.breakdown,
          grossAmount: feeResult.grossAmount,
          netAmount: feeResult.netAmount,
          expiresAt: expiresAt.toISOString()
        }
      }
    });
    
    // 8. Se for INSTANT, confirmar imediatamente
    if (mode === 'INSTANT') {
      return await this.confirm(transaction.transactionId, to);
    }
    
    // 9. Notificar destinatário (SECURE)
    WebSocketService.sendToUser(to, {
      type: 'TRANSACTION_PENDING',
      data: {
        transactionId: transaction.transactionId,
        from: from,
        amount: amount,
        expiresAt: expiresAt.toISOString(),
        message: `💰 Recebeste ${amount} MZN de ${from}. Tens 24h para confirmar ou rejeitar.`
      }
    });
    
    WebSocketService.sendToUser(from, {
      type: 'TRANSACTION_AWAITING_CONFIRMATION',
      data: {
        transactionId: transaction.transactionId,
        to: to,
        amount: amount,
        expiresAt: expiresAt.toISOString(),
        message: `⏳ Transferência de ${amount} MZN aguardando confirmação de ${to} (expira em 24h)`
      }
    });
    
    return transaction;
  }
  
  /**
   * Confirmar transação
   */
  static async confirm(transactionId, kp_id) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.to_kp !== kp_id) {
      throw new Error('Only the recipient can confirm');
    }
    
    if (transaction.status !== 'PENDING' && transaction.status !== 'RESERVED') {
      throw new Error(`Cannot confirm transaction with status ${transaction.status}`);
    }
    
    // Verificar se expirou
    if (transaction.expired_at && new Date() > transaction.expired_at) {
      await this.expire(transactionId);
      throw new Error('Transaction has expired');
    }
    
    // Executar ledger
    const result = await LedgerEngine.transfer({
      fromKp: transaction.from_kp,
      toKp: transaction.to_kp,
      amount: Number(transaction.amount),
      reference: transaction.transactionId,
      description: transaction.description || `Transfer to ${transaction.to_kp}`
    });
    
    // Atualizar transação
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'CONFIRMED',
        confirmed_at: new Date(),
        confirmed_by: kp_id,
        debit_entry_id: result.debitEntryId,
        credit_entry_id: result.creditEntryId,
        metadata: {
          ...transaction.metadata,
          ledgerResult: result
        }
      }
    });
    
    // Notificar
    WebSocketService.sendToUser(transaction.to_kp, {
      type: 'TRANSACTION_CONFIRMED',
      data: {
        transactionId,
        amount: transaction.amount,
        message: `✅ Confirmaste recebimento de ${transaction.amount} MZN`
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_CONFIRMED',
      data: {
        transactionId,
        amount: transaction.amount,
        to: transaction.to_kp,
        message: `✅ ${transaction.to_kp} confirmou recebimento de ${transaction.amount} MZN`
      }
    });
    
    return updated;
  }
  
  /**
   * Rejeitar transação
   */
  static async reject(transactionId, kp_id, reason = null) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.to_kp !== kp_id) {
      throw new Error('Only the recipient can reject');
    }
    
    if (transaction.status !== 'PENDING') {
      throw new Error(`Cannot reject transaction with status ${transaction.status}`);
    }
    
    // Verificar se expirou
    if (transaction.expired_at && new Date() > transaction.expired_at) {
      await this.expire(transactionId);
      throw new Error('Transaction has already expired');
    }
    
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'REJECTED',
        rejected_at: new Date(),
        rejected_by: kp_id,
        metadata: {
          ...transaction.metadata,
          rejectReason: reason
        }
      }
    });
    
    WebSocketService.sendToUser(transaction.to_kp, {
      type: 'TRANSACTION_REJECTED',
      data: {
        transactionId,
        amount: transaction.amount,
        message: `❌ Rejeitaste recebimento de ${transaction.amount} MZN`
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_REJECTED',
      data: {
        transactionId,
        amount: transaction.amount,
        to: transaction.to_kp,
        message: `❌ ${transaction.to_kp} rejeitou recebimento de ${transaction.amount} MZN`
      }
    });
    
    return updated;
  }
  
  /**
   * Expirar transação (automático)
   */
  static async expire(transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status !== 'PENDING') {
      return transaction;
    }
    
    // Atualizar status para EXPIRED
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'EXPIRED',
        expired_at: new Date(),
        metadata: {
          ...transaction.metadata,
          expiredReason: 'Auto-expired after 24 hours'
        }
      }
    });
    
    // Notificar ambas as partes
    WebSocketService.sendToUser(transaction.to_kp, {
      type: 'TRANSACTION_EXPIRED',
      data: {
        transactionId,
        amount: transaction.amount,
        from: transaction.from_kp,
        message: `⏰ Transferência de ${transaction.amount} MZN expirou (24h sem confirmação)`
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_EXPIRED',
      data: {
        transactionId,
        amount: transaction.amount,
        to: transaction.to_kp,
        message: `⏰ Transferência de ${transaction.amount} MZN expirou (24h sem confirmação)`
      }
    });
    
    return updated;
  }
  
  /**
   * Verificar transações expiradas (cron job)
   */
  static async checkExpired() {
    const expiredTransactions = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        expired_at: { lt: new Date() }
      }
    });
    
    let count = 0;
    for (const tx of expiredTransactions) {
      await this.expire(tx.transactionId);
      count++;
    }
    
    return count;
  }
  
  /**
   * Buscar pendentes de um utilizador
   */
  static async getPending(kp_id) {
    return prisma.transaction.findMany({
      where: {
        to_kp: kp_id,
        status: 'PENDING',
        expired_at: { gt: new Date() } // Apenas não expiradas
      },
      orderBy: { created_at: 'desc' }
    });
  }
  
  /**
   * Buscar transações de um utilizador
   */
  static async getUserTransactions(kp_id, limit = 50) {
    return prisma.transaction.findMany({
      where: {
        OR: [
          { from_kp: kp_id },
          { to_kp: kp_id }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  }
  
  /**
   * Buscar uma transação específica
   */
  static async getTransaction(transactionId, kp_id) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.from_kp !== kp_id && transaction.to_kp !== kp_id) {
      throw new Error('Not authorized to view this transaction');
    }
    
    return transaction;
  }
}

module.exports = TransactionDomainService;
