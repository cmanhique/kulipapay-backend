/**
 * M-PESA PROVIDER
 */

const BaseProvider = require('./base.provider');

class MpesaProvider extends BaseProvider {
  
  constructor(config = {}) {
    super();
    this.name = 'MPESA';
    this.config = {
      apiKey: config.apiKey || process.env.MPESA_API_KEY,
      environment: config.environment || process.env.MPESA_ENVIRONMENT || 'sandbox',
      ...config
    };
  }
  
  // ========================================
  // 🔥 MÉTODOS REQUERIDOS PELO PAYMENT CORE
  // ========================================
  
  /**
   * Criar pagamento (Cash-In)
   */
  async createPayment({ phone, amount, reference, metadata = {} }) {
    console.log(`📝 M-PESA: createPayment ${reference} | phone: ${phone} | amount: ${amount}`);
    
    const response = {
      status: 'PENDING',
      reference: `MPESA-${Date.now()}`,
      message: 'STK Push sent successfully',
      raw: {
        merchantRequestId: `MER-${Date.now()}`,
        checkoutRequestId: `CHK-${Date.now()}`,
        responseCode: '0',
        responseDescription: 'Success. Request accepted for processing'
      }
    };
    
    return this.normalizeResponse(response);
  }
  
  /**
   * Criar payout (Cash-Out)
   */
  async createPayout({ phone, amount, reference, metadata = {} }) {
    console.log(`📝 M-PESA: createPayout ${reference} | phone: ${phone} | amount: ${amount}`);
    
    const response = {
      status: 'PENDING',
      reference: `MPESA-WD-${Date.now()}`,
      message: 'Payout initiated successfully',
      raw: {
        transactionId: reference,
        status: 'PENDING'
      }
    };
    
    return this.normalizeResponse(response);
  }
  
  // ========================================
  // ⚠️ MÉTODOS ANTIGOS (mantidos para compatibilidade)
  // ========================================
  
  async deposit({ phone_number, amount, reference = null }) {
    console.log(`⚠️ M-PESA: deposit (deprecated) - use createPayment`);
    return this.createPayment({ phone: phone_number, amount, reference });
  }
  
  async withdraw({ phone_number, amount, reference = null }) {
    console.log(`⚠️ M-PESA: withdraw (deprecated) - use createPayout`);
    return this.createPayout({ phone: phone_number, amount, reference });
  }
  
  async getStatus(reference) {
    console.log(`📝 M-PESA: getStatus ${reference}`);
    
    const response = {
      status: 'PROCESSING',
      reference: reference,
      message: 'Transaction in progress'
    };
    
    return this.normalizeResponse(response);
  }
  
  async handleWebhook(payload) {
    console.log(`📝 M-PESA: handleWebhook`);
    
    const normalized = {
      provider: this.name,
      reference: payload.Reference || payload.transactionId || payload.CheckoutRequestID,
      status: payload.ResultCode === '0' ? 'SUCCEEDED' : 'FAILED',
      amount: payload.Amount || payload.amount || 0,
      phone: payload.PhoneNumber || payload.phone || '',
      raw: payload
    };
    
    return normalized;
  }
}

module.exports = MpesaProvider;
