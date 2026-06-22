/**
 * SECURE TRANSFER SERVICE
 * 
 * 🎯 Transferências com confirmação do destinatário
 */

const { prisma } = require('../prisma');
const { transfer } = require('./transaction.service');
const WebSocketService = require('../core/websocket/websocket.service');

class SecureTransferService {
  
  static async sendWithConfirmation({ from, to, amount, req, description = null }) {
    const toAccount = await prisma.account.findUnique({
      where: { kp_id: to }
    });
    
    if (!toAccount) {
      throw new Error(`Recipient not found: ${to}`);
    }
    
    const result = await transfer({
      from,
      to,
      amount,
      req,
      description: description || `Transferência segura para ${to}`
    });
    
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
          transactionId: result.transactionId,
          mode: 'SECURE',
          requiresConfirmation: true,
          pendingSince: new Date().toISOString(),
          toKp: to,
          fromKp: from,
          amount: amount,
          fee: result.fee
        }
      }
    });
    
    WebSocketService.sendToUser(to, {
      type: 'TRANSACTION_PENDING',
      data: {
        transactionId: result.transactionId,
        from: from,
        amount: amount,
        message: `💰 Recebeste ${amount} MZN de ${from}. Confirma ou rejeita?`
      }
    });
    
    WebSocketService.sendToUser(from, {
      type: 'TRANSACTION_AWAITING_CONFIRMATION',
      data: {
        transactionId: result.transactionId,
        to: to,
        amount: amount,
        message: `⏳ Transferência de ${amount} MZN aguardando confirmação de ${to}`
      }
    });
    
    return {
      success: true,
      transactionId: result.transactionId,
      status: 'PENDING',
      requiresConfirmation: true,
      from: result.from,
      to: result.to,
      amount: amount,
      fee: result.fee,
      message: `Transferência de ${amount} MZN enviada. Aguardando confirmação de ${to}.`
    };
  }
  
  static async confirm(transactionId, kp_id) {
    const transaction = await prisma.transactionLedger.findFirst({
      where: {
        reference: { startsWith: transactionId },
        type: 'DEBIT'
      }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    const toKp = transaction.metadata?.toKp || transaction.metadata?.to;
    if (!toKp || toKp !== kp_id) {
      throw new Error('Only the recipient can confirm');
    }
    
    if (transaction.status !== 'PENDING') {
      throw new Error(`Transaction already ${transaction.status}`);
    }
    
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
          confirmedAt: new Date().toISOString(),
          confirmedBy: kp_id
        }
      }
    });
    
    WebSocketService.sendToUser(toKp, {
      type: 'TRANSACTION_CONFIRMED',
      data: {
        transactionId,
        amount: transaction.amount,
        message: `✅ Confirmaste recebimento de ${transaction.amount} MZN`
      }
    });
    
    WebSocketService.sendToUser(transaction.kp_id, {
      type: 'TRANSACTION_CONFIRMED',
      data: {
        transactionId,
        amount: transaction.amount,
        to: toKp,
        message: `✅ ${toKp} confirmou recebimento de ${transaction.amount} MZN`
      }
    });
    
    return { success: true, transactionId, status: 'CONFIRMED' };
  }
  
  static async reject(transactionId, kp_id, reason = null) {
    const transaction = await prisma.transactionLedger.findFirst({
      where: {
        reference: { startsWith: transactionId },
        type: 'DEBIT'
      }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    const toKp = transaction.metadata?.toKp || transaction.metadata?.to;
    if (!toKp || toKp !== kp_id) {
      throw new Error('Only the recipient can reject');
    }
    
    if (transaction.status !== 'PENDING') {
      throw new Error(`Transaction already ${transaction.status}`);
    }
    
    const TransactionEngine = require('../core/engines/transaction.engine');
    await TransactionEngine.reverseTransaction({
      transactionId: transactionId,
      reason: `Rejeitado pelo destinatário: ${reason || 'Sem motivo'}`
    });
    
    WebSocketService.sendToUser(toKp, {
      type: 'TRANSACTION_REJECTED',
      data: {
        transactionId,
        amount: transaction.amount,
        message: `❌ Rejeitaste recebimento de ${transaction.amount} MZN`
      }
    });
    
    WebSocketService.sendToUser(transaction.kp_id, {
      type: 'TRANSACTION_REJECTED',
      data: {
        transactionId,
        amount: transaction.amount,
        to: toKp,
        message: `❌ ${toKp} rejeitou recebimento de ${transaction.amount} MZN`
      }
    });
    
    return { success: true, transactionId, status: 'REJECTED' };
  }
  
  static async getPending(kp_id) {
    // Usar Prisma raw query para buscar por metadata.toKp
    const pending = await prisma.$queryRaw`
      SELECT * FROM transaction_ledger 
      WHERE status = 'PENDING' 
      AND type = 'DEBIT'
      AND metadata->>'toKp' = ${kp_id}
      ORDER BY created_at DESC
    `;
    
    return pending;
  }
}

module.exports = SecureTransferService;
