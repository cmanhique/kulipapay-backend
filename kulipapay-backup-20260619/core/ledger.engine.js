const { prisma } = require('../prisma');
const crypto = require('crypto');

class LedgerEngine {
  constructor() {
    this.prisma = prisma;
  }

  // =========================
  // LOCK FUNCTIONS
  // =========================
  async lockWallet(tx, kp_id) {
    try {
      await tx.walletLock.create({
        data: { kp_id }
      });
    } catch (e) {
      throw new Error(`WALLET_LOCKED: ${kp_id}`);
    }
  }

  async unlockWallet(tx, kp_id) {
    await tx.walletLock.delete({
      where: { kp_id }
    }).catch(() => {});
  }

  // =========================
  // TRANSFERÊNCIA COMPLETA
  // =========================
  async transfer({ fromKp, toKp, amount, reference = null, description = null }) {
    if (!fromKp || !toKp || !amount) {
      throw new Error('Missing required fields: fromKp, toKp, amount');
    }

    if (fromKp === toKp) {
      throw new Error('Cannot transfer to same account');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const transactionId = reference || crypto.randomUUID();

    return await this.prisma.$transaction(async (tx) => {
      try {
        // 1. LOCK SENDER WALLET
        await this.lockWallet(tx, fromKp);

        // 2. BUSCAR WALLETS
        const fromWallet = await tx.wallet.findUnique({
          where: { kp_id: fromKp }
        });

        const toWallet = await tx.wallet.findUnique({
          where: { kp_id: toKp }
        });

        if (!fromWallet) {
          throw new Error(`Sender wallet not found: ${fromKp}`);
        }

        if (!toWallet) {
          throw new Error(`Receiver wallet not found: ${toKp}`);
        }

        // 3. VERIFICAR SALDO
        const fromBalance = Number(fromWallet.balance);
        const transferAmount = Number(amount);

        if (fromBalance < transferAmount) {
          throw new Error(`Insufficient funds: ${fromBalance} < ${transferAmount}`);
        }

        // 4. CALCULAR NOVOS SALDOS
        const newFromBalance = fromBalance - transferAmount;
        const newToBalance = Number(toWallet.balance) + transferAmount;

        // 5. ATUALIZAR WALLETS
        await tx.wallet.update({
          where: { kp_id: fromKp },
          data: { 
            balance: newFromBalance,
            version: { increment: 1 }
          }
        });

        await tx.wallet.update({
          where: { kp_id: toKp },
          data: { 
            balance: newToBalance,
            version: { increment: 1 }
          }
        });

        // 6. CRIAR LEDGER ENTRIES
        const debitEntry = await tx.transactionLedger.create({
          data: {
            kp_id: fromKp,
            type: 'DEBIT',
            amount: transferAmount,
            balance_before: fromBalance,
            balance_after: newFromBalance,
            reference: `${transactionId}-D`,
            status: 'CONFIRMED',
            metadata: {
              to: toKp,
              description: description || `Transfer to ${toKp}`,
              transactionId
            }
          }
        });

        const creditEntry = await tx.transactionLedger.create({
          data: {
            kp_id: toKp,
            type: 'CREDIT',
            amount: transferAmount,
            balance_before: Number(toWallet.balance),
            balance_after: newToBalance,
            reference: `${transactionId}-C`,
            status: 'CONFIRMED',
            metadata: {
              from: fromKp,
              description: description || `Transfer from ${fromKp}`,
              transactionId
            }
          }
        });

        // 7. UNLOCK SENDER WALLET
        await this.unlockWallet(tx, fromKp);

        return {
          success: true,
          transactionId,
          from: {
            kp_id: fromKp,
            balance: newFromBalance,
            previousBalance: fromBalance
          },
          to: {
            kp_id: toKp,
            balance: newToBalance,
            previousBalance: Number(toWallet.balance)
          },
          amount: transferAmount,
          debitEntry,
          creditEntry
        };

      } catch (error) {
        await this.unlockWallet(tx, fromKp);
        throw error;
      }
    });
  }

  // =========================
  // DEPÓSITO
  // =========================
  async deposit({ kp_id, amount, description = null }) {
    if (!kp_id || !amount || amount <= 0) {
      throw new Error('Missing required fields: kp_id, amount');
    }

    return await this.prisma.$transaction(async (tx) => {
      try {
        await this.lockWallet(tx, kp_id);

        const wallet = await tx.wallet.findUnique({
          where: { kp_id }
        });

        if (!wallet) {
          throw new Error(`Wallet not found: ${kp_id}`);
        }

        const currentBalance = Number(wallet.balance);
        const newBalance = currentBalance + Number(amount);
        const reference = `DEP-${Date.now()}`;

        await tx.wallet.update({
          where: { kp_id },
          data: {
            balance: newBalance,
            version: { increment: 1 }
          }
        });

        const entry = await tx.transactionLedger.create({
          data: {
            kp_id,
            type: 'CREDIT',
            amount: Number(amount),
            balance_before: currentBalance,
            balance_after: newBalance,
            reference,
            status: 'CONFIRMED',
            metadata: {
              type: 'DEPOSIT',
              description: description || 'Depósito manual'
            }
          }
        });

        await this.unlockWallet(tx, kp_id);

        return {
          success: true,
          reference,
          kp_id,
          balance: newBalance,
          previousBalance: currentBalance,
          entry
        };

      } catch (error) {
        await this.unlockWallet(tx, kp_id);
        throw error;
      }
    });
  }

  // =========================
  // REVERSÃO DE TRANSAÇÃO
  // =========================
  async reverse({ transactionId, reason = null }) {
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      const entries = await tx.transactionLedger.findMany({
        where: { 
          OR: [
            { reference: transactionId },
            { reference: `${transactionId}-D` },
            { reference: `${transactionId}-C` }
          ]
        }
      });

      if (entries.length === 0) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const alreadyReversed = entries.some(e => e.status === 'REVERSED');
      if (alreadyReversed) {
        throw new Error(`Transaction already reversed: ${transactionId}`);
      }

      for (const entry of entries) {
        try {
          await this.lockWallet(tx, entry.kp_id);

          if (entry.type === 'DEBIT') {
            await tx.wallet.update({
              where: { kp_id: entry.kp_id },
              data: {
                balance: { increment: entry.amount },
                version: { increment: 1 }
              }
            });
          } else if (entry.type === 'CREDIT') {
            await tx.wallet.update({
              where: { kp_id: entry.kp_id },
              data: {
                balance: { decrement: entry.amount },
                version: { increment: 1 }
              }
            });
          }

          await tx.transactionLedger.update({
            where: { id: entry.id },
            data: {
              status: 'REVERSED',
              metadata: {
                ...entry.metadata,
                reversedAt: new Date().toISOString(),
                reverseReason: reason || 'Manual reversal'
              }
            }
          });

          await this.unlockWallet(tx, entry.kp_id);

        } catch (error) {
          await this.unlockWallet(tx, entry.kp_id);
          throw error;
        }
      }

      return {
        success: true,
        transactionId,
        reversed: true,
        reason: reason || 'Manual reversal',
        entries: entries.length
      };
    });
  }

  // =========================
  // BUSCAR TRANSAÇÕES
  // =========================
  async getTransactions({ kp_id, limit = 50, offset = 0 }) {
    const where = kp_id ? { kp_id } : {};

    const entries = await this.prisma.transactionLedger.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await this.prisma.transactionLedger.count({ where });

    return {
      entries,
      total,
      limit,
      offset
    };
  }

  // =========================
  // BUSCAR SALDO
  // =========================
  async getBalance({ kp_id }) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { kp_id }
    });

    if (!wallet) {
      return { balance: 0, kp_id };
    }

    return {
      balance: Number(wallet.balance),
      kp_id,
      version: wallet.version
    };
  }
}

module.exports = new LedgerEngine();