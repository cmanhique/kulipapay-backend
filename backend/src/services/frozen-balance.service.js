/**
 * FROZEN BALANCE SERVICE
 * 
 * 🎯 Gerencia saldo congelado
 * 
 * REGRA DE OURO:
 * - Wallet = estado atual do dinheiro (APENAS saldos)
 * - Ledger = verdade financeira (movimentos)
 * - Audit = histórico (quem, quando, porquê)
 */

const { prisma } = require('../prisma');

class FrozenBalanceService {
  
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

    const availableBalance = Number(wallet.available_balance || 0);

    if (availableBalance < amount) {
      throw new Error(`Insufficient available balance: ${availableBalance} < ${amount}`);
    }

    const newFrozenBalance = Number(wallet.frozen_balance || 0) + amount;
    const newAvailableBalance = availableBalance - amount;

    // ✅ WALLET: apenas estado atual (SEM metadata)
    const updated = await prisma.wallet.update({
      where: { kp_id },
      data: {
        frozen_balance: newFrozenBalance,
        available_balance: newAvailableBalance,
        version: { increment: 1 }
      }
    });

    // ✅ AUDIT: histórico (quem, quando, porquê)
    await prisma.auditLog.create({
      data: {
        kp_id,
        action: 'FREEZE_BALANCE',
        module: 'wallet',
        details: {
          amount,
          reason,
          metadata,
          newFrozenBalance,
          newAvailableBalance
        }
      }
    });

    return updated;
  }

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

    if (frozenBalance < amount) {
      throw new Error(`Insufficient frozen balance: ${frozenBalance} < ${amount}`);
    }

    const newFrozenBalance = frozenBalance - amount;
    const newAvailableBalance = Number(wallet.available_balance || 0) + amount;

    // ✅ WALLET: apenas estado atual (SEM metadata)
    const updated = await prisma.wallet.update({
      where: { kp_id },
      data: {
        frozen_balance: newFrozenBalance,
        available_balance: newAvailableBalance,
        version: { increment: 1 }
      }
    });

    // ✅ AUDIT: histórico
    await prisma.auditLog.create({
      data: {
        kp_id,
        action: 'UNFREEZE_BALANCE',
        module: 'wallet',
        details: {
          amount,
          reason,
          metadata,
          newFrozenBalance,
          newAvailableBalance
        }
      }
    });

    return updated;
  }

  static async getAvailableBalance(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return 0;
    }

    return Number(wallet.available_balance || 0);
  }

  static async getFrozenBalance(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return 0;
    }

    return Number(wallet.frozen_balance || 0);
  }

  static async getTotalBalance(kp_id) {
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return 0;
    }

    return Number(wallet.balance || 0);
  }

  static async hasSufficientAvailableBalance(kp_id, amount) {
    const available = await this.getAvailableBalance(kp_id);
    return available >= amount;
  }

  static async freezeForEscrow(kp_id, amount, escrowId) {
    return this.freeze(kp_id, amount, 'ESCROW', {
      escrowId,
      type: 'escrow_freeze'
    });
  }

  static async unfreezeFromEscrow(kp_id, amount, escrowId) {
    return this.unfreeze(kp_id, amount, 'ESCROW_RELEASED', {
      escrowId,
      type: 'escrow_release'
    });
  }

  static async freezeForDispute(kp_id, amount, disputeId) {
    return this.freeze(kp_id, amount, 'DISPUTE', {
      disputeId,
      type: 'dispute_freeze'
    });
  }

  static async freezeForChargeback(kp_id, amount, chargebackId) {
    return this.freeze(kp_id, amount, 'CHARGEBACK', {
      chargebackId,
      type: 'chargeback_freeze'
    });
  }
}

module.exports = FrozenBalanceService;
