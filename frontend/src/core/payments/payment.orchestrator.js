/**
 * PAYMENT ORCHESTRATOR
 */

const { prisma } = require('../../prisma');
const LedgerEngine = require('../ledger.engine');
const WebSocketService = require('../websocket/websocket.service');
const AuditService = require('../audit/audit.service');
const crypto = require('crypto');

// Registry de providers
const providers = {
  MPESA: require('./providers/mpesa.provider'),
  EMOLA: require('./providers/emola.provider'),
  MKESH: require('./providers/mkesh.provider')
};

class PaymentOrchestrator {
  
  static getProvider(name) {
    const ProviderClass = providers[name];
    if (!ProviderClass) {
      throw new Error(`Provider ${name} not supported`);
    }
    return new ProviderClass();
  }
  
  static async deposit({ kp_id, provider, phone, amount, idempotencyKey = null }) {
    console.log('📝 DEPOSIT chamado:', { kp_id, provider, phone, amount, idempotencyKey });
    
    this.validateInput({ kp_id, provider, phone, amount });
    
    // 🔥 VERIFICAR IDEMPOTÊNCIA
    if (idempotencyKey) {
      console.log('🔍 Verificando idempotência para key:', idempotencyKey);
      const existing = await prisma.paymentTransaction.findUnique({
        where: { idempotency_key: idempotencyKey }
      });
      if (existing) {
        console.log(`🔄 Idempotência: transação existente ${existing.transactionId}`);
        return existing;
      }
    }
    
    const account = await prisma.account.findUnique({
      where: { kp_id }
    });
    if (!account) {
      throw new Error('Account not found');
    }
    
    console.log('📝 Criando transação...');
    const transaction = await prisma.paymentTransaction.create({
      data: {
        transactionId: crypto.randomUUID(),
        kp_id,
        provider,
        type: 'DEPOSIT',
        amount,
        phone_number: phone,
        provider_reference: `${provider}-${Date.now()}`,
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        metadata: {
          initiatedAt: new Date().toISOString()
        }
      }
    });
    console.log('✅ Transação criada:', transaction.transactionId);
    
    const providerInstance = this.getProvider(provider);
    const result = await providerInstance.cashIn({
      phone,
      amount,
      reference: transaction.transactionId
    });
    
    await prisma.paymentTransaction.update({
      where: { transactionId: transaction.transactionId },
      data: {
        status: result.status,
        provider_response: result.raw || {},
        provider_reference: result.reference || transaction.provider_reference
      }
    });
    
    if (result.status === 'COMPLETED') {
      await this.completeDeposit(transaction.transactionId);
    }
    
    return transaction;
  }
  
  static async withdraw({ kp_id, provider, phone, amount, idempotencyKey = null }) {
    console.log('📝 WITHDRAW chamado:', { kp_id, provider, phone, amount, idempotencyKey });
    
    this.validateInput({ kp_id, provider, phone, amount });
    
    if (idempotencyKey) {
      console.log('🔍 Verificando idempotência para key:', idempotencyKey);
      const existing = await prisma.paymentTransaction.findUnique({
        where: { idempotency_key: idempotencyKey }
      });
      if (existing) {
        console.log(`🔄 Idempotência: transação existente ${existing.transactionId}`);
        return existing;
      }
    }
    
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id }
    });
    if (!wallet || Number(wallet.balance) < amount) {
      throw new Error('Insufficient balance');
    }
    
    console.log('📝 Criando transação de saque...');
    const transaction = await prisma.paymentTransaction.create({
      data: {
        transactionId: crypto.randomUUID(),
        kp_id,
        provider,
        type: 'WITHDRAWAL',
        amount,
        phone_number: phone,
        provider_reference: `${provider}-WD-${Date.now()}`,
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        metadata: {
          initiatedAt: new Date().toISOString()
        }
      }
    });
    console.log('✅ Transação de saque criada:', transaction.transactionId);
    
    const providerInstance = this.getProvider(provider);
    const result = await providerInstance.cashOut({
      phone,
      amount,
      reference: transaction.transactionId
    });
    
    await prisma.paymentTransaction.update({
      where: { transactionId: transaction.transactionId },
      data: {
        status: result.status,
        provider_response: result.raw || {},
        provider_reference: result.reference || transaction.provider_reference
      }
    });
    
    if (result.status === 'COMPLETED') {
      await this.completeWithdrawal(transaction.transactionId);
    }
    
    return transaction;
  }
  
  static async completeDeposit(transactionId) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status === 'COMPLETED') {
      return transaction;
    }
    
    const result = await LedgerEngine.deposit({
      kp_id: transaction.kp_id,
      amount: Number(transaction.amount),
      description: `Depósito ${transaction.provider}: ${transaction.provider_reference}`
    });
    
    const updated = await prisma.paymentTransaction.update({
      where: { transactionId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        ledger_entry_id: result.entry?.id
      }
    });
    
    WebSocketService.sendToUser(transaction.kp_id, {
      type: 'PAYMENT_DEPOSIT_COMPLETED',
      data: {
        transactionId,
        amount: transaction.amount,
        provider: transaction.provider,
        message: `💰 Depósito de ${transaction.amount} MZN via ${transaction.provider} confirmado!`
      }
    });
    
    return updated;
  }
  
  static async completeWithdrawal(transactionId) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status === 'COMPLETED') {
      return transaction;
    }
    
    const result = await LedgerEngine.transfer({
      fromKp: transaction.kp_id,
      toKp: 'PLATFORM_PAYMENTS',
      amount: Number(transaction.amount),
      reference: transaction.provider_reference,
      description: `Saque ${transaction.provider}: ${transaction.provider_reference}`
    });
    
    const updated = await prisma.paymentTransaction.update({
      where: { transactionId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        ledger_entry_id: result.debitEntry?.id
      }
    });
    
    WebSocketService.sendToUser(transaction.kp_id, {
      type: 'PAYMENT_WITHDRAWAL_COMPLETED',
      data: {
        transactionId,
        amount: transaction.amount,
        provider: transaction.provider,
        message: `🏦 Saque de ${transaction.amount} MZN para ${transaction.provider} confirmado!`
      }
    });
    
    return updated;
  }
  
  static async handleWebhook(provider, payload) {
    const providerInstance = this.getProvider(provider);
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
    
    await prisma.paymentTransaction.update({
      where: { transactionId: transaction.transactionId },
      data: {
        status: normalized.status,
        provider_response: normalized.raw || {},
        completed_at: normalized.status === 'COMPLETED' ? new Date() : undefined,
        failed_at: normalized.status === 'FAILED' ? new Date() : undefined
      }
    });
    
    if (normalized.status === 'COMPLETED') {
      if (transaction.type === 'DEPOSIT') {
        await this.completeDeposit(transaction.transactionId);
      } else if (transaction.type === 'WITHDRAWAL') {
        await this.completeWithdrawal(transaction.transactionId);
      }
    }
    
    return { success: true, transactionId: transaction.transactionId, status: normalized.status };
  }
  
  static validateInput({ kp_id, provider, phone, amount }) {
    if (!kp_id || !provider || !phone || !amount) {
      throw new Error('Missing required fields');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!providers[provider]) {
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
}

module.exports = PaymentOrchestrator;
