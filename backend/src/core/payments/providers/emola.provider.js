/**
 * E-MOLA PROVIDER
 * 
 * 🎯 Implementação específica para e-Mola (Vodacom)
 */

const BasePaymentProvider = require('./base.provider');
const crypto = require('crypto');

class EMolaProvider extends BasePaymentProvider {
  
  constructor(config = {}) {
    super();
    this.config = {
      apiKey: config.apiKey || process.env.EMOLA_API_KEY,
      clientId: config.clientId || process.env.EMOLA_CLIENT_ID,
      environment: config.environment || process.env.EMOLA_ENVIRONMENT || 'sandbox',
      callbackUrl: config.callbackUrl || process.env.EMOLA_CALLBACK_URL,
      ...config
    };
    this.providerName = 'EMOLA';
  }
  
  get name() {
    return this.providerName;
  }
  
  async cashIn({ phone, amount, reference, metadata = {} }) {
    const transactionId = reference || crypto.randomUUID();
    
    const response = {
      success: true,
      reference: `EMOLA-${Date.now()}`,
      transactionId: transactionId,
      status: 'PENDING',
      message: 'e-Mola cash-in initiated'
    };
    
    return this.normalizeResponse(response);
  }
  
  async cashOut({ phone, amount, reference, metadata = {} }) {
    const transactionId = reference || crypto.randomUUID();
    
    const response = {
      success: true,
      reference: `EMOLA-WD-${Date.now()}`,
      transactionId: transactionId,
      status: 'PENDING',
      message: 'e-Mola cash-out initiated'
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

module.exports = EMolaProvider;
