/**
 * E-MOLA PROVIDER
 * 
 * Implementa a interface BaseProvider
 */

const BaseProvider = require('./base.provider');
const crypto = require('crypto');

class EMolaProvider extends BaseProvider {
  
  constructor(config = {}) {
    super();
    this.name = 'EMOLA';
    this.config = {
      apiKey: config.apiKey || process.env.EMOLA_API_KEY,
      clientId: config.clientId || process.env.EMOLA_CLIENT_ID,
      environment: config.environment || process.env.EMOLA_ENVIRONMENT || 'sandbox',
      ...config
    };
  }
  
  async createPayment({ phone, amount, reference, metadata = {} }) {
    console.log(`📝 e-Mola: Criando pagamento ${reference} para ${phone} no valor de ${amount} MZN`);
    
    const response = {
      status: 'PENDING',
      reference: `EMOLA-${Date.now()}`,
      message: 'e-Mola payment initiated'
    };
    
    return this.normalizeResponse(response);
  }
  
  async createPayout({ phone, amount, reference, metadata = {} }) {
    console.log(`📝 e-Mola: Criando payout ${reference} para ${phone} no valor de ${amount} MZN`);
    
    const response = {
      status: 'PENDING',
      reference: `EMOLA-WD-${Date.now()}`,
      message: 'e-Mola payout initiated'
    };
    
    return this.normalizeResponse(response);
  }
  
  async verifyStatus(reference) {
    const response = {
      status: 'SUCCEEDED',
      reference: reference,
      message: 'Transaction completed'
    };
    
    return this.normalizeResponse(response);
  }
  
  async handleWebhook(payload) {
    return {
      provider: this.name,
      reference: payload.transactionId || payload.reference,
      status: this.mapStatus(payload.status),
      amount: payload.amount || 0,
      phone: payload.phone || '',
      raw: payload
    };
  }
}

module.exports = EMolaProvider;
