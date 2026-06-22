/**
 * M-PESA PROVIDER
 * 
 * Implementa a interface BaseProvider
 */

const BaseProvider = require('./base.provider');
const crypto = require('crypto');

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
  
  /**
   * Criar pagamento (Cash-In / STK Push)
   */
  async createPayment({ phone, amount, reference, metadata = {} }) {
    console.log(`📝 M-PESA: Criando pagamento ${reference} para ${phone} no valor de ${amount} MZN`);
    
    // Simulação - em produção: chamar API real da M-Pesa
    // https://api.mpesa.vodacom.co.mz/v1/stkpush
    
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
    console.log(`📝 M-PESA: Criando payout ${reference} para ${phone} no valor de ${amount} MZN`);
    
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
  
  /**
   * Verificar status
   */
  async verifyStatus(reference) {
    console.log(`📝 M-PESA: Verificando status de ${reference}`);
    
    const response = {
      status: 'SUCCEEDED',
      reference: reference,
      message: 'Transaction completed successfully'
    };
    
    return this.normalizeResponse(response);
  }
  
  /**
   * Processar webhook da M-Pesa
   */
  async handleWebhook(payload) {
    console.log(`📝 M-PESA: Processando webhook`);
    
    // Normalizar payload da M-Pesa
    return {
      provider: this.name,
      reference: payload.Reference || payload.transactionId || payload.CheckoutRequestID,
      status: this.mapStatus(payload.ResultCode || payload.status),
      amount: payload.Amount || payload.amount || 0,
      phone: payload.PhoneNumber || payload.phone || '',
      raw: payload
    };
  }
}

module.exports = MpesaProvider;
