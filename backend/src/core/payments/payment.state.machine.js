/**
 * PAYMENT STATE MACHINE - V2.0
 * 
 * 🎯 Stripe-level state management com regras rigorosas
 * 
 * FLUXO CORRETO:
 * PENDING → PROCESSING → SUCCESS
 * PENDING → PROCESSING → FAILED
 * PENDING → CANCELLED
 * SUCCESS → REFUNDED
 * 
 * REGRAS:
 * - NUNCA saltar PROCESSING
 * - SEMPRE validar transições
 * - State Machine é a única fonte de verdade
 */

const { PAYMENT_STATUS, isFinalStatus } = require('./payment.status');

class PaymentStateMachine {
  
  /**
   * Transições permitidas (Stripe-like)
   */
  static TRANSITIONS = {
    // Estado inicial - só pode ir para PROCESSING ou CANCELLED
    [PAYMENT_STATUS.PENDING]: {
      to: [
        PAYMENT_STATUS.PROCESSING,  // ✅ Fluxo normal
        PAYMENT_STATUS.CANCELLED,    // ✅ Cancelado pelo usuário
        PAYMENT_STATUS.FAILED        // ✅ Falha imediata
      ],
      description: 'Pending → Processing / Cancelled / Failed'
    },
    
    // Estado de processamento - webhook confirma
    [PAYMENT_STATUS.PROCESSING]: {
      to: [
        PAYMENT_STATUS.SUCCESS,      // ✅ Confirmado com sucesso
        PAYMENT_STATUS.COMPLETED,    // ✅ Confirmado e completado
        PAYMENT_STATUS.FAILED        // ❌ Falha durante processamento
      ],
      description: 'Processing → Success / Completed / Failed'
    },
    
    // Estados finais de sucesso
    [PAYMENT_STATUS.SUCCESS]: {
      to: [
        PAYMENT_STATUS.REFUNDED      // 💰 Reembolsado
      ],
      description: 'Success → Refunded'
    },
    
    [PAYMENT_STATUS.COMPLETED]: {
      to: [
        PAYMENT_STATUS.REFUNDED      // 💰 Reembolsado
      ],
      description: 'Completed → Refunded'
    },
    
    // Estados finais (sem saída)
    [PAYMENT_STATUS.FAILED]: {
      to: [],
      description: 'Failed → (final)'
    },
    
    [PAYMENT_STATUS.CANCELLED]: {
      to: [],
      description: 'Cancelled → (final)'
    },
    
    [PAYMENT_STATUS.REFUNDED]: {
      to: [],
      description: 'Refunded → (final)'
    }
  };
  
  /**
   * Verificar se uma transição é válida
   */
  static canTransition(currentStatus, newStatus) {
    // Idempotência: mesmo estado é permitido
    if (currentStatus === newStatus) {
      return true;
    }
    
    const transitions = this.TRANSITIONS[currentStatus];
    if (!transitions) {
      return false;
    }
    
    return transitions.to.includes(newStatus);
  }
  
  /**
   * Validar transição (com erro detalhado)
   */
  static validateTransition(currentStatus, newStatus) {
    if (!this.canTransition(currentStatus, newStatus)) {
      const allowed = this.TRANSITIONS[currentStatus]?.to.join(', ') || 'none';
      throw new Error(
        `🚫 Invalid state transition: ${currentStatus} → ${newStatus}\n` +
        `✅ Allowed transitions: ${allowed}`
      );
    }
    return true;
  }
  
  /**
   * Verificar se um status é final
   */
  static isFinal(status) {
    return isFinalStatus(status);
  }
  
  /**
   * Verificar se um status é de sucesso
   */
  static isSuccess(status) {
    return [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COMPLETED].includes(status);
  }
  
  /**
   * Obter próximos estados possíveis
   */
  static getNextStates(status) {
    return this.TRANSITIONS[status]?.to || [];
  }
  
  /**
   * Obter descrição da transição
   */
  static getTransitionDescription(currentStatus, newStatus) {
    if (currentStatus === newStatus) {
      return 'Idempotent transition (same state)';
    }
    
    if (!this.canTransition(currentStatus, newStatus)) {
      return `❌ Invalid transition: ${currentStatus} → ${newStatus}`;
    }
    
    return `✅ Valid transition: ${currentStatus} → ${newStatus}`;
  }
}

module.exports = PaymentStateMachine;
