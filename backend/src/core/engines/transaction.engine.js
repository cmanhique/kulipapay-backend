/**
 * TRANSACTION ENGINE - VERSÃO CORRIGIDA (CORE BANKING SAFE)
 * 
 * 🔐 SECURE: HOLD + freeze → receiver accept → sender finalize → SETTLED
 * ⚡ INSTANT: ledger transfer imediato
 */

const { prisma } = require('../../prisma');
const LedgerEngine = require('../ledger.engine');
const FeeEngine = require('../fee.engine');
const LimitsEngine = require('../limits.engine');
const IdempotencyEngine = require('./idempotency.engine');
const AuditService = require('../audit/audit.service');
const WebSocketService = require('../websocket/websocket.service');
const FrozenBalanceService = require('../../services/frozen-balance.service');

class TransactionEngine {
  
  static async executeTransfer({ 
    from, 
    to, 
    amount, 
    idempotencyKey, 
    req = null, 
    description = null,
    mode = 'SECURE'
  }) {
    this.validateInput({ from, to, amount });
    
    const toAccount = await prisma.account.findUnique({
      where: { kp_id: to }
    });
    
    if (!toAccount) {
      throw new Error(`Recipient not found: ${to}`);
    }
    
    const idem = await IdempotencyEngine.start(idempotencyKey, from, { from, to, amount, description, mode });
    
    if (!idem.shouldProcess) {
      if (idem.retryLater) {
        throw new Error('Request is already being processed. Please retry later.');
      }
      return idem.response;
    }
    
    let result;
    let feeResult;
    let freezeResult = null;
    
    try {
      await LimitsEngine.check({ kp_id: from, amount });
      feeResult = FeeEngine.applyFee({ amount });
      
      const grossAmount = feeResult.grossAmount;
      
      // =========================
      // 🔐 SECURE MODE (CORRIGIDO - SEM LEDGER)
      // =========================
      if (mode === 'SECURE') {
        console.log(`🔐 SECURE HOLD: ${grossAmount} MZN para ${from}`);
        
        // 1. Freeze (reserva de dinheiro)
        freezeResult = await FrozenBalanceService.freeze(
          from,
          grossAmount,
          'TRANSACTION_PENDING',
          {
            to,
            amount: grossAmount,
            mode,
            idempotencyKey
          }
        );
        
        // 2. Criar transação HELD (NÃO MOVIMENTA DINHEIRO)
        const transaction = await prisma.transaction.create({
          data: {
            transactionId: idempotencyKey || crypto.randomUUID(),
            from_kp: from,
            to_kp: to,
            amount: grossAmount,
            fee: feeResult.fee.total,
            status: 'HELD',
            mode: 'SECURE',
            idempotency_key: idempotencyKey,
            description: description || `Transfer to ${to}`,
            expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            metadata: {
              frozen: true,
              frozenAmount: grossAmount,
              feeBreakdown: feeResult.fee.breakdown,
              grossAmount: grossAmount,
              netAmount: feeResult.netAmount
            }
          }
        });
        
        result = { transactionId: transaction.transactionId, from: { balance: freezeResult.balance }, to: { balance: 0 } };
        
        // Notificações
        WebSocketService.sendToUser(to, {
          type: 'TRANSACTION_PENDING',
          data: {
            transactionId: transaction.transactionId,
            from: from,
            amount: grossAmount,
            message: `💰 Recebeste ${grossAmount} MZN de ${from}. Confirma ou rejeita?`
          }
        });
        
        WebSocketService.sendToUser(from, {
          type: 'TRANSACTION_AWAITING_CONFIRMATION',
          data: {
            transactionId: transaction.transactionId,
            to: to,
            amount: grossAmount,
            message: `⏳ Transferência de ${grossAmount} MZN aguardando confirmação de ${to} (saldo congelado)`
          }
        });
        
      } 
      // =========================
      // ⚡ INSTANT MODE (OK)
      // =========================
      else {
        result = await LedgerEngine.transfer({
          fromKp: from,
          toKp: to,
          amount: grossAmount,
          reference: idempotencyKey,
          description: description || `Transfer to ${to}`
        });
      }
      
      await AuditService.logUserAction(from, 'TRANSFER', 'wallet', {
        to,
        amount,
        transactionId: result.transactionId,
        fee: feeResult.fee.total,
        mode: mode,
        status: mode === 'SECURE' ? 'HELD' : 'CONFIRMED',
        frozen: mode === 'SECURE'
      });
      
      await IdempotencyEngine.complete(idempotencyKey, result);
      
      return {
        success: true,
        transactionId: result.transactionId,
        mode: mode,
        status: mode === 'SECURE' ? 'HELD' : 'CONFIRMED',
        requiresConfirmation: mode === 'SECURE',
        frozen: mode === 'SECURE',
        frozenAmount: mode === 'SECURE' ? grossAmount : null,
        from: result.from,
        to: result.to,
        amount: grossAmount,
        fee: feeResult.fee,
        reference: idempotencyKey,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      if (mode === 'SECURE' && freezeResult) {
        console.log(`🔄 Descongelando saldo para ${from} devido a erro: ${error.message}`);
        try {
          await FrozenBalanceService.unfreeze(
            from,
            feeResult.grossAmount,
            'TRANSACTION_FAILED',
            { reason: error.message, mode: 'SECURE' }
          );
        } catch (unfreezeError) {
          console.error(`❌ Erro ao descongelar saldo: ${unfreezeError.message}`);
        }
      }
      
      await IdempotencyEngine.fail(idempotencyKey, error.message);
      throw error;
    }
  }
  
  static async confirmByRecipient(transactionId, kp_id) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.to_kp !== kp_id) throw new Error('Only the recipient can confirm');
    if (transaction.status !== 'HELD') throw new Error(`Cannot confirm transaction with status ${transaction.status}`);
    if (transaction.expired_at && new Date() > transaction.expired_at) {
      await this.expireTransaction(transactionId);
      throw new Error('Transaction has expired');
    }
    
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'RECEIVER_ACCEPTED',
        confirmed_at: new Date(),
        confirmed_by: kp_id,
        metadata: {
          ...transaction.metadata,
          receiverConfirmed: true,
          receiverConfirmedAt: new Date().toISOString()
        }
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_ACCEPTED_BY_RECIPIENT',
      data: {
        transactionId,
        amount: transaction.amount,
        to: transaction.to_kp,
        message: `✅ ${transaction.to_kp} aceitou receber ${transaction.amount} MZN. Finaliza a transferência.`
      }
    });
    
    WebSocketService.sendToUser(transaction.to_kp, {
      type: 'TRANSACTION_ACCEPTED_BY_RECIPIENT',
      data: {
        transactionId,
        amount: transaction.amount,
        message: `✅ Aceitaste receber ${transaction.amount} MZN. Aguarda a confirmação final.`
      }
    });
    
    return { success: true, transactionId, status: 'RECEIVER_ACCEPTED' };
  }
  
  static async rejectByRecipient(transactionId, kp_id, reason = null) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.to_kp !== kp_id) throw new Error('Only the recipient can reject');
    if (transaction.status !== 'HELD') throw new Error(`Cannot reject transaction with status ${transaction.status}`);
    
    await FrozenBalanceService.unfreeze(
      transaction.from_kp,
      Number(transaction.amount),
      'TRANSACTION_REJECTED',
      { transactionId, to: transaction.to_kp, rejectedBy: kp_id, reason }
    );
    
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'REJECTED',
        rejected_at: new Date(),
        rejected_by: kp_id,
        metadata: { ...transaction.metadata, rejected: true, rejectReason: reason }
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
        message: `❌ ${transaction.to_kp} rejeitou recebimento de ${transaction.amount} MZN. Saldo descongelado.`
      }
    });
    
    return { success: true, transactionId, status: 'REJECTED' };
  }
  
  static async senderFinalize(transactionId, kp_id, pin = null) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.from_kp !== kp_id) throw new Error('Only the sender can finalize');
    if (transaction.status !== 'RECEIVER_ACCEPTED') {
      throw new Error(`Cannot finalize transaction with status ${transaction.status}`);
    }
    if (transaction.expired_at && new Date() > transaction.expired_at) {
      await this.expireTransaction(transactionId);
      throw new Error('Transaction has expired');
    }
    
    // Verificar PIN (opcional)
    if (pin) {
      const securityPin = await prisma.securityPin.findUnique({
        where: { kp_id: kp_id }
      });
      if (!securityPin) throw new Error('PIN not set up');
      
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(pin, securityPin.pin_hash);
      if (!isValid) {
        await prisma.auditLog.create({
          data: {
            kp_id: kp_id,
            action: 'FINALIZE_FAILED',
            module: 'transaction',
            details: { transactionId, reason: 'Invalid PIN' }
          }
        });
        throw new Error('Invalid PIN');
      }
    }
    
    // 🔐 SETTLEMENT REAL (AGORA SIM!)
    const result = await LedgerEngine.transfer({
      fromKp: transaction.from_kp,
      toKp: transaction.to_kp,
      amount: Number(transaction.amount),
      reference: transactionId,
      description: transaction.description || `Transfer to ${transaction.to_kp}`,
      mode: 'SECURE_CONFIRM'  // Liberta frozen_balance e debita balance
    });
    
    // Libertar frozen balance
    await FrozenBalanceService.unfreeze(
      transaction.from_kp,
      Number(transaction.amount),
      'SETTLED',
      { transactionId }
    );
    
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'SETTLED',
        confirmed_at: new Date(),
        confirmed_by: kp_id,
        debit_entry_id: result.debitEntry?.id,
        credit_entry_id: result.creditEntry?.id,
        metadata: {
          ...transaction.metadata,
          finalized: true,
          finalizedAt: new Date().toISOString(),
          pinVerified: !!pin
        }
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_FINALIZED',
      data: {
        transactionId,
        amount: transaction.amount,
        to: transaction.to_kp,
        message: `✅ Transferência de ${transaction.amount} MZN finalizada! (irreversível)`
      }
    });
    
    WebSocketService.sendToUser(transaction.to_kp, {
      type: 'TRANSACTION_FINALIZED',
      data: {
        transactionId,
        amount: transaction.amount,
        from: transaction.from_kp,
        message: `✅ Transferência de ${transaction.amount} MZN creditada na sua conta!`
      }
    });
    
    return { success: true, transactionId, status: 'SETTLED', result };
  }
  
  static async reverseTransaction({ transactionId, reason }) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.status === 'SETTLED') {
      throw new Error('Cannot reverse settled transaction');
    }
    
    await FrozenBalanceService.unfreeze(
      transaction.from_kp,
      Number(transaction.amount),
      'REVERSED',
      { transactionId, reason }
    );
    
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'REVERSED',
        metadata: {
          ...transaction.metadata,
          reversedAt: new Date().toISOString(),
          reverseReason: reason
        }
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_REVERSED',
      data: {
        transactionId,
        amount: transaction.amount,
        reason,
        message: `🔄 Transferência de ${transaction.amount} MZN revertida.`
      }
    });
    
    return { success: true, transactionId, status: 'REVERSED' };
  }
  
  static async expireTransaction(transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.status !== 'HELD' && transaction.status !== 'RECEIVER_ACCEPTED') {
      return transaction;
    }
    
    await FrozenBalanceService.unfreeze(
      transaction.from_kp,
      Number(transaction.amount),
      'EXPIRED',
      { transactionId, to: transaction.to_kp }
    );
    
    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'EXPIRED',
        expired_at: new Date(),
        metadata: { ...transaction.metadata, expired: true }
      }
    });
    
    WebSocketService.sendToUser(transaction.to_kp, {
      type: 'TRANSACTION_EXPIRED',
      data: {
        transactionId,
        amount: transaction.amount,
        from: transaction.from_kp,
        message: `⏰ Transferência de ${transaction.amount} MZN expirou.`
      }
    });
    
    WebSocketService.sendToUser(transaction.from_kp, {
      type: 'TRANSACTION_EXPIRED_REFUND',
      data: {
        transactionId,
        amount: transaction.amount,
        message: `⏰ Transferência de ${transaction.amount} MZN expirou. Saldo devolvido.`
      }
    });
    
    return updated;
  }
  
  static validateInput({ from, to, amount }) {
    if (!from || !to || !amount) throw new Error('Missing required fields');
    if (from === to) throw new Error('Cannot transfer to yourself');
    if (amount <= 0) throw new Error('Amount must be greater than 0');
  }
}

module.exports = TransactionEngine;