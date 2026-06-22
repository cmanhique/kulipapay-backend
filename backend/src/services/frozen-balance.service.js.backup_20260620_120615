/**
 * FROZEN BALANCE SERVICE
 * 
 * 🎯 Gerencia saldo congelado
 * 
 * Regras:
 * 1. Saldo Total = Saldo Disponível + Saldo Congelado
 * 2. Transferências usam apenas saldo disponível
 * 3. Escrow congela saldo automaticamente
 * 4. Disputas congelam saldo
 */

const { prisma } = require('../prisma');

class FrozenBalanceService {
  
  /**
   * Congelar saldo de uma wallet
   */
  static async freeze(kp_id, amount, reason, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const balance = Number(wallet.balance);
    const frozenBalance = Number(wallet.frozen_balance || 0);
    const availableBalance = Number(wallet.available_balance || 0);

    // Verificar se há saldo disponível suficiente
    if (availableBalance < amount) {
      throw new Error(`Insufficient available balance: ${availableBalance} < ${amount}`);
    }

    // Calcular novos valores
    const newFrozenBalance = frozenBalance + amount;
    const newAvailableBalance = availableBalance - amount;

    // Atualizar wallet
    const updated = await prisma.wallet.update({
      where: { kp_id },
      data: {
        frozen_balance: newFrozenBalance,
        available_balance: newAvailableBalance,
        version: { increment: 1 },
        metadata: {
          ...wallet.metadata,
          frozenHistory: [
            ...(wallet.metadata?.frozenHistory || []),
            {
              timestamp: new Date().toISOString(),
              amount,
              reason,
              metadata,
              frozenBalance: newFrozenBalance,
              availableBalance: newAvailableBalance
            }
          ]
        }
      }
    });

    // Criar auditoria
    await prisma.auditLog.create({
      data: {
        kp_id,
        action: 'FREEZE_BALANCE',
        module: 'wallet',
        details: {
          amount,
          reason,
          metadata,
          newFrozenBalance: newFrozenBalance,
          newAvailableBalance: newAvailableBalance
        }
      }
    });

    return updated;
  }

  /**
   * Descongelar saldo de uma wallet
   */
  static async unfreeze(kp_id, amount, reason, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const frozenBalance = Number(wallet.frozen_balance || 0);
    const availableBalance = Number(wallet.available_balance || 0);

    // Verificar se há saldo congelado suficiente
    if (frozenBalance < amount) {
      throw new Error(`Insufficient frozen balance: ${frozenBalance} < ${amount}`);
    }

    // Calcular novos valores
    const newFrozenBalance = frozenBalance - amount;
    const newAvailableBalance = availableBalance + amount;

    // Atualizar wallet
    const updated = await prisma.wallet.update({
      where: { kp_id },
      data: {
        frozen_balance: newFrozenBalance,
        available_balance: newAvailableBalance,
        version: { increment: 1 },
        metadata: {
          ...wallet.metadata,
          frozenHistory: [
            ...(wallet.metadata?.frozenHistory || []),
            {
              timestamp: new Date().toISOString(),
              amount,
              reason,
              metadata,
              frozenBalance: newFrozenBalance,
              availableBalance: newAvailableBalance
            }
          ]
        }
      }
    });

    // Criar auditoria
    await prisma.auditLog.create({
      data: {
        kp_id,
        action: 'UNFREEZE_BALANCE',
        module: 'wallet',
        details: {
          amount,
          reason,
          metadata,
          newFrozenBalance: newFrozenBalance,
          newAvailableBalance: newAvailableBalance
        }
      }
    });

    return updated;
  }

  /**
   * Obter saldo disponível
   */
  static async getAvailableBalance(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return 0;
    }

    return Number(wallet.available_balance || 0);
  }

  /**
   * Obter saldo congelado
   */
  static async getFrozenBalance(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return 0;
    }

    return Number(wallet.frozen_balance || 0);
  }

  /**
   * Obter saldo total
   */
  static async getTotalBalance(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return 0;
    }

    return Number(wallet.balance || 0);
  }

  /**
   * Verificar se há saldo disponível suficiente
   */
  static async hasSufficientAvailableBalance(kp_id, amount) {
    const available = await this.getAvailableBalance(kp_id);
    return available >= amount;
  }

  /**
   * Congelar para Escrow
   */
  static async freezeForEscrow(kp_id, amount, escrowId) {
    return this.freeze(kp_id, amount, 'ESCROW', {
      escrowId,
      type: 'escrow_freeze'
    });
  }

  /**
   * Descongelar após Escrow
   */
  static async unfreezeFromEscrow(kp_id, amount, escrowId) {
    return this.unfreeze(kp_id, amount, 'ESCROW_RELEASED', {
      escrowId,
      type: 'escrow_release'
    });
  }

  /**
   * Congelar para disputa
   */
  static async freezeForDispute(kp_id, amount, disputeId) {
    return this.freeze(kp_id, amount, 'DISPUTE', {
      disputeId,
      type: 'dispute_freeze'
    });
  }

  /**
   * Congelar para chargeback
   */
  static async freezeForChargeback(kp_id, amount, chargebackId) {
    return this.freeze(kp_id, amount, 'CHARGEBACK', {
      chargebackId,
      type: 'chargeback_freeze'
    });
  }
}

module.exports = FrozenBalanceService;
