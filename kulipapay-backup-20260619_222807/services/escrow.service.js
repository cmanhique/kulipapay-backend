/**
 * ESCROW SERVICE
 * 
 * 🎯 Gerencia fundos em custódia
 */

const { prisma } = require('../prisma');
const LedgerEngine = require('../core/ledger.engine');
const FeeEngine = require('../core/fee.engine');
const LimitsEngine = require('../core/limits.engine');
const WebSocketService = require('../core/websocket/websocket.service');
const AuditService = require('../core/audit/audit.service');
const crypto = require('crypto');

class EscrowService {
  
  /**
   * Criar uma transação Escrow
   */
  static async create({ buyer, seller, amount, condition = null, description = null }) {
    // 1. Validar
    if (!buyer || !seller || !amount) {
      throw new Error('Missing required fields');
    }
    if (buyer === seller) {
      throw new Error('Buyer and seller cannot be the same');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // 2. Verificar contas
    const buyerAccount = await prisma.account.findUnique({
      where: { kp_id: buyer }
    });
    if (!buyerAccount) {
      throw new Error('Buyer not found');
    }
    
    const sellerAccount = await prisma.account.findUnique({
      where: { kp_id: seller }
    });
    if (!sellerAccount) {
      throw new Error('Seller not found');
    }
    
    // 3. Verificar limites
    await LimitsEngine.check({ kp_id: buyer, amount });
    
    // 4. Calcular fee
    const feeResult = FeeEngine.applyFee({ amount });
    
    // 5. Definir expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // 6. Criar Escrow
    const escrow = await prisma.escrowTransaction.create({
      data: {
        transactionId: crypto.randomUUID(),
        buyer_kp: buyer,
        seller_kp: seller,
        amount: feeResult.grossAmount,
        fee: feeResult.fee.total,
        status: 'PENDING',
        condition: condition || 'Entrega do produto/serviço',
        expires_at: expiresAt,
        metadata: {
          feeBreakdown: feeResult.fee.breakdown,
          grossAmount: feeResult.grossAmount,
          netAmount: feeResult.netAmount,
          description: description || `Escrow: ${condition || 'Entrega'}`
        }
      }
    });
    
    // 7. Manter fundos (escrow)
    // Nota: Neste momento, apenas criamos a entidade. Os fundos só são movidos
    // quando o comprador confirma o pagamento para escrow.
    
    // 8. Notificar
    WebSocketService.sendToUser(buyer, {
      type: 'ESCROW_CREATED',
      data: {
        transactionId: escrow.transactionId,
        seller: seller,
        amount: amount,
        expiresAt: expiresAt.toISOString(),
        message: `🔐 Escrow criado: ${amount} MZN para ${seller}`
      }
    });
    
    WebSocketService.sendToUser(seller, {
      type: 'ESCROW_CREATED',
      data: {
        transactionId: escrow.transactionId,
        buyer: buyer,
        amount: amount,
        expiresAt: expiresAt.toISOString(),
        message: `🔐 Escrow criado: ${amount} MZN de ${buyer}`
      }
    });
    
    return escrow;
  }
  
  /**
   * Confirmar pagamento para escrow (comprador confirma)
   */
  static async confirmPayment(transactionId, buyer_kp) {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { transactionId }
    });
    
    if (!escrow) {
      throw new Error('Escrow transaction not found');
    }
    
    if (escrow.buyer_kp !== buyer_kp) {
      throw new Error('Only the buyer can confirm payment');
    }
    
    if (escrow.status !== 'PENDING') {
      throw new Error(`Escrow already ${escrow.status}`);
    }
    
    // 1. Mover fundos do comprador para escrow (ledger)
    const result = await LedgerEngine.transfer({
      fromKp: escrow.buyer_kp,
      toKp: 'PLATFORM_ESCROW', // Conta especial de escrow
      amount: Number(escrow.amount),
      reference: `ESCROW-${escrow.transactionId}`,
      description: `Escrow: ${escrow.condition || 'Entrega'}`
    });
    
    // 2. Atualizar status
    const updated = await prisma.escrowTransaction.update({
      where: { transactionId },
      data: {
        status: 'HELD',
        held_at: new Date(),
        escrow_entry_id: result.debitEntryId,
        metadata: {
          ...escrow.metadata,
          ledgerResult: result
        }
      }
    });
    
    // 3. Notificar
    WebSocketService.sendToUser(escrow.buyer_kp, {
      type: 'ESCROW_PAID',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `💰 ${escrow.amount} MZN em custódia. Aguardando confirmação do vendedor.`
      }
    });
    
    WebSocketService.sendToUser(escrow.seller_kp, {
      type: 'ESCROW_PAID',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `💰 ${escrow.amount} MZN em custódia. Confirma a entrega?`
      }
    });
    
    return updated;
  }
  
  /**
   * Libertar fundos para o vendedor (vendedor confirma entrega)
   */
  static async release(transactionId, seller_kp) {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { transactionId }
    });
    
    if (!escrow) {
      throw new Error('Escrow transaction not found');
    }
    
    if (escrow.seller_kp !== seller_kp) {
      throw new Error('Only the seller can release funds');
    }
    
    if (escrow.status !== 'HELD') {
      throw new Error(`Escrow already ${escrow.status}`);
    }
    
    // 1. Mover fundos do escrow para o vendedor
    const result = await LedgerEngine.transfer({
      fromKp: 'PLATFORM_ESCROW',
      toKp: escrow.seller_kp,
      amount: Number(escrow.amount),
      reference: `ESCROW-RELEASE-${escrow.transactionId}`,
      description: `Escrow release: ${escrow.condition || 'Entrega'}`
    });
    
    // 2. Atualizar status
    const updated = await prisma.escrowTransaction.update({
      where: { transactionId },
      data: {
        status: 'RELEASED',
        released_at: new Date(),
        condition_met: true,
        release_entry_id: result.debitEntryId,
        metadata: {
          ...escrow.metadata,
          releaseResult: result
        }
      }
    });
    
    // 3. Notificar
    WebSocketService.sendToUser(escrow.seller_kp, {
      type: 'ESCROW_RELEASED',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `✅ ${escrow.amount} MZN libertados para a sua conta`
      }
    });
    
    WebSocketService.sendToUser(escrow.buyer_kp, {
      type: 'ESCROW_RELEASED',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `✅ ${escrow.amount} MZN libertados para ${escrow.seller_kp}`
      }
    });
    
    return updated;
  }
  
  /**
   * Disputar uma transação
   */
  static async dispute(transactionId, kp_id, reason = null) {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { transactionId }
    });
    
    if (!escrow) {
      throw new Error('Escrow transaction not found');
    }
    
    if (escrow.buyer_kp !== kp_id && escrow.seller_kp !== kp_id) {
      throw new Error('Only buyer or seller can dispute');
    }
    
    if (escrow.status !== 'HELD') {
      throw new Error(`Cannot dispute transaction with status ${escrow.status}`);
    }
    
    const updated = await prisma.escrowTransaction.update({
      where: { transactionId },
      data: {
        status: 'DISPUTED',
        disputed_at: new Date(),
        metadata: {
          ...escrow.metadata,
          disputeReason: reason,
          disputedBy: kp_id
        }
      }
    });
    
    // Notificar ambas as partes
    WebSocketService.sendToUser(escrow.buyer_kp, {
      type: 'ESCROW_DISPUTED',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `⚠️ Transação em disputa: ${reason || 'Motivo não especificado'}`
      }
    });
    
    WebSocketService.sendToUser(escrow.seller_kp, {
      type: 'ESCROW_DISPUTED',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `⚠️ Transação em disputa: ${reason || 'Motivo não especificado'}`
      }
    });
    
    return updated;
  }
  
  /**
   * Reembolsar comprador
   */
  static async refund(transactionId, admin_kp) {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { transactionId }
    });
    
    if (!escrow) {
      throw new Error('Escrow transaction not found');
    }
    
    if (escrow.status !== 'HELD' && escrow.status !== 'DISPUTED') {
      throw new Error(`Cannot refund transaction with status ${escrow.status}`);
    }
    
    // 1. Mover fundos do escrow de volta para o comprador
    const result = await LedgerEngine.transfer({
      fromKp: 'PLATFORM_ESCROW',
      toKp: escrow.buyer_kp,
      amount: Number(escrow.amount),
      reference: `ESCROW-REFUND-${escrow.transactionId}`,
      description: `Escrow refund: ${escrow.condition || 'Reembolso'}`
    });
    
    // 2. Atualizar status
    const updated = await prisma.escrowTransaction.update({
      where: { transactionId },
      data: {
        status: 'REFUNDED',
        refunded_at: new Date(),
        refund_entry_id: result.debitEntryId,
        metadata: {
          ...escrow.metadata,
          refundResult: result,
          refundedBy: admin_kp
        }
      }
    });
    
    // Notificar ambas as partes
    WebSocketService.sendToUser(escrow.buyer_kp, {
      type: 'ESCROW_REFUNDED',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `💰 ${escrow.amount} MZN reembolsados para a sua conta`
      }
    });
    
    WebSocketService.sendToUser(escrow.seller_kp, {
      type: 'ESCROW_REFUNDED',
      data: {
        transactionId,
        amount: escrow.amount,
        message: `💰 ${escrow.amount} MZN reembolsados para ${escrow.buyer_kp}`
      }
    });
    
    return updated;
  }
  
  /**
   * Buscar transações Escrow de um utilizador
   */
  static async getUserEscrows(kp_id) {
    return prisma.escrowTransaction.findMany({
      where: {
        OR: [
          { buyer_kp: kp_id },
          { seller_kp: kp_id }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
  }
  
  /**
   * Buscar escrows pendentes
   */
  static async getPendingEscrows(kp_id) {
    return prisma.escrowTransaction.findMany({
      where: {
        OR: [
          { buyer_kp: kp_id },
          { seller_kp: kp_id }
        ],
        status: 'PENDING'
      },
      orderBy: { created_at: 'desc' }
    });
  }
  
  /**
   * Buscar escrows em custódia
   */
  static async getHeldEscrows(kp_id) {
    return prisma.escrowTransaction.findMany({
      where: {
        OR: [
          { buyer_kp: kp_id },
          { seller_kp: kp_id }
        ],
        status: 'HELD'
      },
      orderBy: { created_at: 'desc' }
    });
  }
}

module.exports = EscrowService;
