/**
 * PAYMENT CORE (Stripe-lite v2)
 * 
 * 🎯 Único cérebro do sistema de pagamentos
 */

const { prisma } = require('../../prisma');
const crypto = require('crypto');
const ProviderFactory = require('./providers/provider.factory');

const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

const PAYMENT_TYPE = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL'
};

const FINAL_STATES = [PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.REFUNDED];

class PaymentCore {

  static async execute({
    kp_id,
    type,
    provider,
    phone,
    amount,
    idempotencyKey = null,
    metadata = {}
  }) {
    console.log('📝 PaymentCore.execute:', { kp_id, type, provider, phone, amount, idempotencyKey });

    // 1. VALIDAR
    this.validateInput({ kp_id, type, provider, phone, amount });

    // 2. IDEMPOTÊNCIA HARD STOP
    if (idempotencyKey) {
      const existing = await prisma.paymentTransaction.findUnique({
        where: { idempotency_key: idempotencyKey }
      });
      if (existing) {
        console.log(`🔄 IDEMPOTÊNCIA: transação existente ${existing.transactionId} (${existing.status})`);
        return { ...existing, _idempotent: true };
      }
    }

    // 3. VERIFICAR CONTA
    const account = await prisma.account.findUnique({
      where: { kp_id }
    });
    if (!account) {
      throw new Error('Account not found');
    }

    // 4. VERIFICAR SALDO
    if (type === PAYMENT_TYPE.WITHDRAWAL) {
      const wallet = await prisma.wallet.findUnique({
        where: { kp_id }
      });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }
    }

    // 5. CRIAR TRANSAÇÃO
    const transaction = await prisma.paymentTransaction.create({
      data: {
        transactionId: crypto.randomUUID(),
        kp_id,
        provider,
        type,
        amount,
        phone_number: phone,
        provider_reference: `${provider}-${Date.now()}`,
        status: PAYMENT_STATUS.PENDING,
        idempotency_key: idempotencyKey || null,
        metadata: {
          ...metadata,
          initiatedAt: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Transação criada: ${transaction.transactionId}`);

    // 6. PROCESSAR PROVIDER (assíncrono)
    this.processAsync(transaction.transactionId).catch(error => {
      console.error(`❌ Erro no processamento assíncrono: ${error.message}`);
    });

    return transaction;
  }

  static async processAsync(transactionId) {
    console.log(`⚙️ Processando transação: ${transactionId}`);

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (FINAL_STATES.includes(transaction.status)) {
      console.log(`⏭️ Transação já em estado final: ${transaction.status}`);
      return transaction;
    }

    // Atualizar para PROCESSING
    if (transaction.status === PAYMENT_STATUS.PENDING) {
      await this.setStatus(transactionId, PAYMENT_STATUS.PROCESSING);
    }

    try {
      // Obter provider
      const provider = ProviderFactory.get(transaction.provider);
      
      // Executar conforme tipo
      let result;
      if (transaction.type === PAYMENT_TYPE.DEPOSIT) {
        result = await provider.createPayment({
          phone: transaction.phone_number,
          amount: Number(transaction.amount),
          reference: transaction.transactionId
        });
      } else if (transaction.type === PAYMENT_TYPE.WITHDRAWAL) {
        result = await provider.createPayout({
          phone: transaction.phone_number,
          amount: Number(transaction.amount),
          reference: transaction.transactionId
        });
      } else {
        throw new Error(`Unsupported type: ${transaction.type}`);
      }

      // Atualizar com resultado
      const current = await prisma.paymentTransaction.findUnique({
        where: { transactionId }
      });
      
      if (!FINAL_STATES.includes(current.status)) {
        await this.updateWithProviderResult(transactionId, result);
      }

      // Finalizar se sucedido
      if (result.status === PAYMENT_STATUS.SUCCEEDED) {
        await this.finalize(transactionId);
      }

      console.log(`✅ Transação processada: ${transactionId} -> ${result.status}`);
      return result;

    } catch (error) {
      console.error(`❌ Erro no processamento: ${error.message}`);
      const current = await prisma.paymentTransaction.findUnique({
        where: { transactionId }
      });
      if (!FINAL_STATES.includes(current.status)) {
        await this.setStatus(transactionId, PAYMENT_STATUS.FAILED);
      }
      throw error;
    }
  }

  static async finalize(transactionId) {
    console.log(`🏁 Finalizando transação: ${transactionId}`);
    
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });

    if (!transaction || FINAL_STATES.includes(transaction.status)) {
      return transaction;
    }

    const LedgerEngine = require('../ledger.engine');
    const WebSocketService = require('../websocket/websocket.service');
    const AuditService = require('../audit/audit.service');

    try {
      if (transaction.type === PAYMENT_TYPE.DEPOSIT) {
        const result = await LedgerEngine.deposit({
          kp_id: transaction.kp_id,
          amount: Number(transaction.amount),
          description: `Depósito ${transaction.provider}`
        });

        await prisma.paymentTransaction.update({
          where: { transactionId },
          data: {
            status: PAYMENT_STATUS.SUCCEEDED,
            completed_at: new Date(),
            ledger_entry_id: result.entry?.id
          }
        });

      } else if (transaction.type === PAYMENT_TYPE.WITHDRAWAL) {
        const result = await LedgerEngine.transfer({
          fromKp: transaction.kp_id,
          toKp: 'PLATFORM_PAYMENTS',
          amount: Number(transaction.amount),
          reference: transaction.provider_reference,
          description: `Saque ${transaction.provider}`
        });

        await prisma.paymentTransaction.update({
          where: { transactionId },
          data: {
            status: PAYMENT_STATUS.SUCCEEDED,
            completed_at: new Date(),
            ledger_entry_id: result.debitEntry?.id
          }
        });
      }

      const updated = await prisma.paymentTransaction.findUnique({
        where: { transactionId }
      });

      // Notificar
      WebSocketService.sendToUser(transaction.kp_id, {
        type: `PAYMENT_${transaction.type}_COMPLETED`,
        data: {
          transactionId: updated.transactionId,
          amount: updated.amount,
          provider: updated.provider,
          status: updated.status,
          message: transaction.type === PAYMENT_TYPE.DEPOSIT
            ? `💰 Depósito de ${updated.amount} MZN via ${updated.provider} confirmado!`
            : `🏦 Saque de ${updated.amount} MZN para ${updated.provider} confirmado!`
        }
      });

      // Audit
      await AuditService.logUserAction(transaction.kp_id, `${transaction.type}_COMPLETED`, 'payment', {
        transactionId: updated.transactionId,
        amount: updated.amount,
        provider: updated.provider,
        status: updated.status
      });

      return updated;

    } catch (error) {
      console.error(`❌ Erro na finalização: ${error.message}`);
      throw error;
    }
  }

  static async updateWithProviderResult(transactionId, result) {
    const current = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });
    
    if (FINAL_STATES.includes(current.status)) {
      return current;
    }

    return prisma.paymentTransaction.update({
      where: { transactionId },
      data: {
        status: result.status,
        provider_response: result.raw || {},
        provider_reference: result.reference || undefined,
        completed_at: result.status === PAYMENT_STATUS.SUCCEEDED ? new Date() : undefined,
        failed_at: result.status === PAYMENT_STATUS.FAILED ? new Date() : undefined
      }
    });
  }

  static async setStatus(transactionId, status) {
    const current = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });
    
    if (FINAL_STATES.includes(current.status)) {
      return current;
    }

    return prisma.paymentTransaction.update({
      where: { transactionId },
      data: { status }
    });
  }

  static validateInput({ kp_id, type, provider, phone, amount }) {
    if (!kp_id || !type || !provider || !phone || !amount) {
      throw new Error('Missing required fields');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!ProviderFactory.has(provider)) {
      throw new Error(`Provider ${provider} not supported`);
    }
  }

  static async getTransactions(kp_id, limit = 50) {
    return prisma.paymentTransaction.findMany({
      where: { kp_id },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  }

  static async getStatus(transactionId, kp_id) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.kp_id !== kp_id) {
      throw new Error('Not authorized');
    }

    return transaction;
  }

  static async handleWebhook(provider, payload) {
    const providerInstance = ProviderFactory.get(provider);
    const normalized = await providerInstance.handleWebhook(payload);

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        provider_reference: normalized.reference,
        provider: provider
      }
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${normalized.reference}`);
    }

    if (FINAL_STATES.includes(transaction.status)) {
      return {
        success: true,
        transactionId: transaction.transactionId,
        status: transaction.status,
        _ignored: true
      };
    }

    await this.updateWithProviderResult(transaction.transactionId, normalized);

    if (normalized.status === PAYMENT_STATUS.SUCCEEDED) {
      await this.finalize(transaction.transactionId);
    }

    return {
      success: true,
      transactionId: transaction.transactionId,
      status: normalized.status
    };
  }
}

module.exports = PaymentCore;
