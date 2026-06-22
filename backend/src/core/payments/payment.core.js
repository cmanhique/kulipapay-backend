/**
 * PAYMENT CORE - V2.0 (CORRIGIDO)
 */

const { prisma } = require('../../prisma');
const crypto = require('crypto');
const ProviderFactory = require('./providers/provider.factory');
const { PAYMENT_STATUS, isFinalStatus, isSuccessStatus } = require('./payment.status');
const PaymentStateMachine = require('./payment.state.machine');

class PaymentCore {

  static async createIntent({
    kp_id,
    type,
    provider,
    phone,
    amount,
    idempotencyKey = null,
    metadata = {}
  }) {
    console.log('📝 PaymentCore.createIntent:', { kp_id, type, provider, phone, amount, idempotencyKey });

    if (!kp_id || !type || !provider || !phone || !amount) {
      throw new Error('Missing required fields');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!ProviderFactory.has(provider)) {
      throw new Error(`Provider ${provider} not supported`);
    }

    if (idempotencyKey) {
      const existing = await prisma.paymentTransaction.findUnique({
        where: { idempotency_key: idempotencyKey }
      });
      if (existing) {
        console.log(`🔄 IDEMPOTÊNCIA: ${existing.transactionId} (${existing.status})`);
        return { ...existing, _idempotent: true };
      }
    }

    const account = await prisma.account.findUnique({
      where: { kp_id }
    });
    if (!account) {
      throw new Error('Account not found');
    }

    if (type === 'WITHDRAWAL') {
      const wallet = await prisma.wallet.findUnique({
        where: { kp_id }
      });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }
    }

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
        method: provider,
        reference: `${provider}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        metadata: {
          ...metadata,
          initiatedAt: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Intenção criada: ${transaction.transactionId}`);

    this.processProvider(transaction.transactionId).catch(error => {
      console.error(`❌ Erro no processamento do provider: ${error.message}`);
    });

    return transaction;
  }

  static async processProvider(transactionId) {
    console.log(`⚙️ Processando provider: ${transactionId}`);

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });

    if (!transaction || isFinalStatus(transaction.status)) {
      return transaction;
    }

    try {
      PaymentStateMachine.validateTransition(transaction.status, PAYMENT_STATUS.PROCESSING);
    } catch (error) {
      console.error(`❌ State transition error: ${error.message}`);
      throw error;
    }

    await prisma.paymentTransaction.update({
      where: { transactionId },
      data: { status: PAYMENT_STATUS.PROCESSING }
    });

    try {
      const provider = ProviderFactory.get(transaction.provider);
      
      let result;
      if (transaction.type === 'DEPOSIT') {
        result = await provider.createPayment({
          phone: transaction.phone_number,
          amount: Number(transaction.amount),
          reference: transaction.transactionId
        });
      } else if (transaction.type === 'WITHDRAWAL') {
        result = await provider.createPayout({
          phone: transaction.phone_number,
          amount: Number(transaction.amount),
          reference: transaction.transactionId
        });
      }

      console.log(`📊 Provider result:`, {
        status: result.status,
        reference: result.reference,
        hasRaw: !!result.raw
      });

      const isSuccess = result.status === 'SUCCESS' || result.status === 'SUCCEEDED';
      const isPending = result.status === 'PENDING' || result.status === 'PROCESSING';
      
      if (isSuccess) {
        console.log(`✅ Provider retornou SUCCESS, confirmando...`);
        await prisma.paymentTransaction.update({
          where: { transactionId },
          data: {
            provider_response: result.raw || {},
            provider_reference: result.reference || undefined
          }
        });
        return await this.confirmPayment(transactionId);
        
      } else if (isPending) {
        console.log(`⏳ Provider processando, aguardando webhook: ${transactionId}`);
        await prisma.paymentTransaction.update({
          where: { transactionId },
          data: {
            provider_response: result.raw || {},
            provider_reference: result.reference || undefined,
            status: PAYMENT_STATUS.PROCESSING
          }
        });
        return result;
        
      } else {
        console.log(`❌ Provider retornou erro: ${result.status}`);
        try {
          PaymentStateMachine.validateTransition(transaction.status, PAYMENT_STATUS.FAILED);
          await prisma.paymentTransaction.update({
            where: { transactionId },
            data: {
              status: PAYMENT_STATUS.FAILED,
              provider_response: result.raw || {}
            }
          });
        } catch (stateError) {
          console.error(`❌ Erro na transição para FAILED: ${stateError.message}`);
        }
        return result;
      }

    } catch (error) {
      console.error(`❌ Erro no provider: ${error.message}`);
      const current = await prisma.paymentTransaction.findUnique({
        where: { transactionId }
      });
      if (!isFinalStatus(current.status)) {
        try {
          PaymentStateMachine.validateTransition(current.status, PAYMENT_STATUS.FAILED);
          await prisma.paymentTransaction.update({
            where: { transactionId },
            data: { status: PAYMENT_STATUS.FAILED }
          });
        } catch (stateError) {
          console.error(`❌ Erro na transição para FAILED: ${stateError.message}`);
        }
      }
      throw error;
    }
  }

  static async confirmPayment(transactionId) {
    console.log(`✅ Confirmando pagamento: ${transactionId}`);

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (isFinalStatus(transaction.status)) {
      console.log(`⏭️ Transação já finalizada: ${transaction.status}`);
      return transaction;
    }

    try {
      PaymentStateMachine.validateTransition(transaction.status, PAYMENT_STATUS.SUCCESS);
    } catch (error) {
      console.error(`❌ State transition error: ${error.message}`);
      throw error;
    }

    const LedgerEngine = require('../ledger.engine');
    const WebSocketService = require('../websocket/websocket.service');
    const AuditService = require('../audit/audit.service');

    try {
      let ledgerResult;
      if (transaction.type === 'DEPOSIT') {
        ledgerResult = await LedgerEngine.deposit({
          kp_id: transaction.kp_id,
          amount: Number(transaction.amount),
          description: `Depósito ${transaction.provider} confirmado`
        });
      } else if (transaction.type === 'WITHDRAWAL') {
        ledgerResult = await LedgerEngine.transfer({
          fromKp: transaction.kp_id,
          toKp: 'PLATFORM_PAYMENTS',
          amount: Number(transaction.amount),
          reference: transaction.provider_reference,
          description: `Saque ${transaction.provider} confirmado`
        });
      }

      const updated = await prisma.paymentTransaction.update({
        where: { transactionId },
        data: {
          status: PAYMENT_STATUS.SUCCESS,
          completed_at: new Date(),
          settled_at: new Date(),
          ledger_entry_id: ledgerResult?.entry?.id || ledgerResult?.debitEntry?.id
        }
      });

      WebSocketService.sendToUser(transaction.kp_id, {
        type: `PAYMENT_${transaction.type}_CONFIRMED`,
        data: {
          transactionId: updated.transactionId,
          amount: updated.amount,
          provider: updated.provider,
          status: updated.status,
          message: transaction.type === 'DEPOSIT'
            ? `💰 Depósito de ${updated.amount} MZN via ${updated.provider} confirmado!`
            : `🏦 Saque de ${updated.amount} MZN para ${updated.provider} confirmado!`
        }
      });

      await AuditService.logUserAction(transaction.kp_id, `${transaction.type}_CONFIRMED`, 'payment', {
        transactionId: updated.transactionId,
        amount: updated.amount,
        provider: updated.provider,
        status: updated.status
      });

      console.log(`✅ Pagamento confirmado: ${transactionId}`);
      return updated;

    } catch (error) {
      console.error(`❌ Erro ao confirmar pagamento: ${error.message}`);
      
      try {
        PaymentStateMachine.validateTransition(transaction.status, PAYMENT_STATUS.FAILED);
        await prisma.paymentTransaction.update({
          where: { transactionId },
          data: { status: PAYMENT_STATUS.FAILED }
        });
      } catch (stateError) {
        console.error(`❌ Erro na transição de estado: ${stateError.message}`);
      }
      throw error;
    }
  }

  static async handleWebhook(provider, payload) {
    console.log(`📨 Webhook recebido: ${provider}`);
    
    const WebhookVerifier = require('./webhook.verifier');
    const normalized = WebhookVerifier.normalize(payload, provider);

    console.log(`📊 Webhook normalizado:`, {
      reference: normalized.reference,
      status: normalized.status,
      amount: normalized.amount,
      phone: normalized.phone
    });

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { provider_reference: normalized.reference },
          { transactionId: normalized.reference },
          { reference: normalized.reference }
        ],
        provider: provider
      }
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${normalized.reference}`);
    }

    console.log(`📋 Transação encontrada: ${transaction.transactionId} (${transaction.status})`);

    if (isFinalStatus(transaction.status)) {
      console.log(`⏭️ Transação já finalizada: ${transaction.status}`);
      return {
        success: true,
        transactionId: transaction.transactionId,
        status: transaction.status,
        _ignored: true
      };
    }

    const isSuccess = normalized.status === 'SUCCESS' || 
                      normalized.status === 'SUCCEEDED' ||
                      normalized.status === 'COMPLETED';

    if (isSuccess) {
      console.log(`✅ Webhook indica SUCCESS`);

      if (transaction.status === PAYMENT_STATUS.PENDING) {
        console.log(`🔄 Movendo PENDING → PROCESSING...`);
        try {
          PaymentStateMachine.validateTransition(transaction.status, PAYMENT_STATUS.PROCESSING);
          await prisma.paymentTransaction.update({
            where: { transactionId: transaction.transactionId },
            data: { 
              status: PAYMENT_STATUS.PROCESSING,
              provider_response: normalized.raw || {}
            }
          });
          console.log(`✅ Transação movida para PROCESSING: ${transaction.transactionId}`);
        } catch (error) {
          console.error(`❌ Erro ao mover para PROCESSING: ${error.message}`);
          throw error;
        }
      }

      console.log(`🔄 Confirmando pagamento (PROCESSING → SUCCESS)...`);
      return await this.confirmPayment(transaction.transactionId);
      
    } else {
      console.log(`❌ Webhook indica FAILED - atualizando...`);
      await prisma.paymentTransaction.update({
        where: { transactionId: transaction.transactionId },
        data: { 
          status: PAYMENT_STATUS.FAILED,
          provider_response: normalized.raw || {}
        }
      });
      return {
        success: false,
        transactionId: transaction.transactionId,
        status: PAYMENT_STATUS.FAILED
      };
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

    if (!transaction || transaction.kp_id !== kp_id) {
      throw new Error('Not found or unauthorized');
    }

    return transaction;
  }

  static async cancelPayment(transactionId, reason = null) {
    console.log(`❌ Cancelando pagamento: ${transactionId}`);

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (isFinalStatus(transaction.status)) {
      throw new Error(`Cannot cancel transaction in final state: ${transaction.status}`);
    }

    try {
      PaymentStateMachine.validateTransition(transaction.status, PAYMENT_STATUS.CANCELLED);
    } catch (error) {
      console.error(`❌ State transition error: ${error.message}`);
      throw error;
    }

    const updated = await prisma.paymentTransaction.update({
      where: { transactionId },
      data: {
        status: PAYMENT_STATUS.CANCELLED,
        metadata: {
          ...transaction.metadata,
          cancelledAt: new Date().toISOString(),
          cancelReason: reason
        }
      }
    });

    console.log(`✅ Pagamento cancelado: ${transactionId}`);
    return updated;
  }

  static async execute({ kp_id, type, provider, phone, amount, idempotencyKey = null, metadata = {} }) {
    console.log('⚠️ PaymentCore.execute() é deprecated. Usar createIntent()');
    return this.createIntent({
      kp_id,
      type,
      provider: provider.toUpperCase ? provider.toUpperCase() : provider,
      phone,
      amount,
      idempotencyKey,
      metadata
    });
  }
}

module.exports = PaymentCore;
