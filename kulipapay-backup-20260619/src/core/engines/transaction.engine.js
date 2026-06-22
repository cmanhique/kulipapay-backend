/**
 * TRANSACTION ENGINE
 * 
 * 🎯 Orquestrador de transações com dois modos:
 * 1. INSTANT - Transferência imediata (confirmada automaticamente)
 * 2. SECURE - Transferência segura (aguarda confirmação do destinatário)
 */

const { prisma } = require('../../prisma');
const LedgerEngine = require('../ledger.engine');
const FeeEngine = require('../fee.engine');
const LimitsEngine = require('../limits.engine');
const IdempotencyEngine = require('./idempotency.engine');
const AuditService = require('../audit/audit.service');
const WebSocketService = require('../websocket/websocket.service');

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
    
    try {
      await LimitsEngine.check({ kp_id: from, amount });
      feeResult = FeeEngine.applyFee({ amount });
      
      result = await LedgerEngine.transfer({
        fromKp: from,
        toKp: to,
        amount: feeResult.grossAmount,
        reference: idempotencyKey,
        description: description || `Transfer to ${to}`
      });
      
      if (feeResult.fee.total > 0) {
        await prisma.transactionLedger.create({
          data: {
            kp_id: from,
            type: 'DEBIT',
            amount: feeResult.fee.total,
            balance_before: result.from.balance + feeResult.fee.total,
            balance_after: result.from.balance,
            reference: `FEE-${result.transactionId}`,
            status: mode === 'INSTANT' ? 'CONFIRMED' : 'PENDING',
            metadata: {
              transactionId: result.transactionId,
              feeBreakdown: feeResult.fee.breakdown,
              mode: mode
            }
          }
        });
      }
      
      let finalStatus = 'CONFIRMED';
      let requiresConfirmation = false;
      
      if (mode === 'SECURE') {
        finalStatus = 'PENDING';
        requiresConfirmation = true;
        
        await prisma.transactionLedger.updateMany({
          where: {
            OR: [
              { reference: { startsWith: result.transactionId } },
              { reference: `FEE-${result.transactionId}` }
            ]
          },
          data: {
            status: 'PENDING',
            metadata: {
              mode: mode,
              pendingSince: new Date().toISOString(),
              requiresConfirmation: true,
              toKp: to,
              fromKp: from
            }
          }
        });
        
        WebSocketService.sendToUser(to, {
          type: 'TRANSACTION_PENDING',
          data: {
            transactionId: result.transactionId,
            from: from,
            amount: feeResult.grossAmount,
            message: `💰 Recebeste ${feeResult.grossAmount} MZN de ${from}. Confirma ou rejeita?`
          }
        });
        
        WebSocketService.sendToUser(from, {
          type: 'TRANSACTION_AWAITING_CONFIRMATION',
          data: {
            transactionId: result.transactionId,
            to: to,
            amount: feeResult.grossAmount,
            message: `⏳ Transferência de ${feeResult.grossAmount} MZN aguardando confirmação de ${to}`
          }
        });
      } else {
        await this.confirmTransaction(result.transactionId);
      }
      
      await AuditService.logUserAction(from, 'TRANSFER', 'wallet', {
        to,
        amount,
        transactionId: result.transactionId,
        fee: feeResult.fee.total,
        mode: mode,
        status: finalStatus
      });
      
      await IdempotencyEngine.complete(idempotencyKey, result);
      
      return {
        success: true,
        transactionId: result.transactionId,
        mode: mode,
        status: finalStatus,
        requiresConfirmation: requiresConfirmation,
        from: {
          kp_id: from,
          balance: result.from.balance
        },
        to: {
          kp_id: to,
          balance: result.to.balance
        },
        amount: feeResult.grossAmount,
        fee: feeResult.fee,
        reference: idempotencyKey,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      await IdempotencyEngine.fail(idempotencyKey, error.message);
      await AuditService.logUserAction(from, 'TRANSFER_FAILED', 'wallet', {
        to,
        amount,
        error: error.message,
        mode: mode
      });
      throw error;
    }
  }
  
  static async confirmTransaction(transactionId) {
    await prisma.transactionLedger.updateMany({
      where: {
        OR: [
          { reference: { startsWith: transactionId } },
          { reference: `FEE-${transactionId}` }
        ]
      },
      data: {
        status: 'CONFIRMED',
        metadata: {
          confirmedAt: new Date().toISOString()
        }
      }
    });
  }
  
  static async confirmByRecipient(transactionId, kp_id) {
    const debitTransaction = await prisma.transactionLedger.findFirst({
      where: {
        reference: { startsWith: transactionId },
        type: 'DEBIT'
      }
    });
    
    if (!debitTransaction) {
      throw new Error('Transaction not found');
    }
    
    const toKp = debitTransaction.metadata?.toKp || debitTransaction.metadata?.to;
    if (!toKp || toKp !== kp_id) {
      throw new Error('Only the recipient can confirm this transaction');
    }
    
    if (debitTransaction.status !== 'PENDING') {
      throw new Error(`Transaction already ${debitTransaction.status}`);
    }
    
    await this.confirmTransaction(transactionId);
    
    WebSocketService.sendToUser(toKp, {
      type: 'TRANSACTION_CONFIRMED',
      data: {
        transactionId,
        amount: debitTransaction.amount,
        message: `✅ Confirmaste recebimento de ${debitTransaction.amount} MZN`
      }
    });
    
    WebSocketService.sendToUser(debitTransaction.kp_id, {
      type: 'TRANSACTION_CONFIRMED',
      data: {
        transactionId,
        amount: debitTransaction.amount,
        to: toKp,
        message: `✅ ${toKp} confirmou recebimento de ${debitTransaction.amount} MZN`
      }
    });
    
    return { success: true, transactionId, status: 'CONFIRMED' };
  }
  
  static async rejectByRecipient(transactionId, kp_id, reason = null) {
    const debitTransaction = await prisma.transactionLedger.findFirst({
      where: {
        reference: { startsWith: transactionId },
        type: 'DEBIT'
      }
    });
    
    if (!debitTransaction) {
      throw new Error('Transaction not found');
    }
    
    const toKp = debitTransaction.metadata?.toKp || debitTransaction.metadata?.to;
    if (!toKp || toKp !== kp_id) {
      throw new Error('Only the recipient can reject this transaction');
    }
    
    if (debitTransaction.status !== 'PENDING') {
      throw new Error(`Transaction already ${debitTransaction.status}`);
    }
    
    await this.reverseTransaction({
      transactionId: transactionId,
      reason: `Rejeitado pelo destinatário: ${reason || 'Sem motivo'}`
    });
    
    return { success: true, transactionId, status: 'REJECTED' };
  }
  
  static async reverseTransaction({ transactionId, reason = 'Refund requested', idempotencyKey = null }) {
    const refundKey = idempotencyKey || `REFUND-${transactionId}-${Date.now()}`;
    
    const debitTransaction = await prisma.transactionLedger.findFirst({
      where: {
        reference: { startsWith: transactionId },
        type: 'DEBIT'
      }
    });
    
    if (!debitTransaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }
    
    const from = debitTransaction.metadata?.toKp || debitTransaction.metadata?.to || debitTransaction.kp_id;
    const to = debitTransaction.kp_id;
    const amount = Number(debitTransaction.amount);
    
    const refundResult = await this.executeTransfer({
      from: from,
      to: to,
      amount: amount,
      idempotencyKey: refundKey,
      description: `Refund of ${transactionId} - ${reason}`,
      mode: 'INSTANT'
    });
    
    await prisma.transactionLedger.updateMany({
      where: {
        OR: [
          { reference: { startsWith: transactionId } },
          { reference: `FEE-${transactionId}` }
        ]
      },
      data: {
        status: 'REVERSED',
        metadata: {
          reversedAt: new Date().toISOString(),
          reversedReason: reason,
          refundTransactionId: refundResult.transactionId
        }
      }
    });
    
    return refundResult;
  }
  
  static validateInput({ from, to, amount }) {
    if (!from || !to || !amount) {
      throw new Error('Missing required fields: from, to, amount');
    }
    if (from === to) {
      throw new Error('Cannot transfer to yourself');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
  }
}

module.exports = TransactionEngine;
