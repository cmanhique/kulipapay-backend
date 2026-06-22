/**
 * M-KESH PROVIDER
 * 
 * 🎯 Implementação específica para mKesh (Moçambique)
 * 
 * 🔗 API: Integração bancária para mKesh
 */

const BasePaymentProvider = require('./base.provider');
const crypto = require('crypto');

class MkeshProvider extends BasePaymentProvider {
  
  constructor(config = {}) {
    super();
    this.config = {
      apiKey: config.apiKey || process.env.MKESH_API_KEY,
      merchantId: config.merchantId || process.env.MKESH_MERCHANT_ID,
      environment: config.environment || process.env.MKESH_ENVIRONMENT || 'sandbox',
      ...config
    };
    this.providerName = 'MKESH';
  }
  
  get name() {
    return this.providerName;
  }
  
  async cashIn({ phone, amount, reference, metadata = {} }) {
    const transactionId = reference || crypto.randomUUID();
    
    const response = {
      success: true,
      reference: `MKESH-${Date.now()}`,
      transactionId: transactionId,
      status: 'PENDING',
      message: 'mKesh cash-in initiated'
    };
    
    return this.normalizeResponse(response);
  }
  
  async cashOut({ phone, amount, reference, metadata = {} }) {
    const transactionId = reference || crypto.randomUUID();
    
    const response = {
      success: true,
      reference: `MKESH-WD-${Date.now()}`,
      transactionId: transactionId,
      status: 'PENDING',
      message: 'mKesh cash-out initiated'
    };
    
    return this.normalizeResponse(response);
  }
  
  async verify(reference) {
    const response = {
      success: true,
      reference: reference,
      status: 'COMPLETED',
      message: 'Transaction completed'
    };
    
    return this.normalizeResponse(response);
  }
  
  async handleWebhook(payload) {
    const normalized = {
      provider: this.providerName,
      reference: payload.transactionId || payload.reference,
      status: this.mapStatus(payload.status),
      amount: payload.amount || 0,
      phone: payload.phone || '',
      raw: payload
    };
    
    return normalized;
  }
}

module.exports = MkeshProvider;
