/**
 * BASE PROVIDER (INTERFACE PADRÃO)
 * 
 * Todos os providers DEVEM implementar esta interface
 */

class BaseProvider {
  
  /**
   * Criar pagamento (Cash-In / DEPOSIT)
   */
  async createPayment({ phone, amount, reference, metadata = {} }) {
    throw new Error('createPayment() must be implemented by provider');
  }
  
  /**
   * Criar payout (Cash-Out / WITHDRAWAL)
   */
  async createPayout({ phone, amount, reference, metadata = {} }) {
    throw new Error('createPayout() must be implemented by provider');
  }
  
  /**
   * Verificar status de uma transação
   */
  async verifyStatus(reference) {
    throw new Error('verifyStatus() must be implemented by provider');
  }
  
  /**
   * Processar webhook
   */
  async handleWebhook(payload) {
    throw new Error('handleWebhook() must be implemented by provider');
  }
  
  /**
   * Validar assinatura do webhook
   */
  validateWebhookSignature(payload, signature) {
    // Cada provider implementa a sua validação
    return true;
  }
  
  /**
   * Mapear status do provider para status interno
   */
  mapStatus(status) {
    const map = {
      'SUCCESS': 'SUCCEEDED',
      'COMPLETED': 'SUCCEEDED',
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'FAILED': 'FAILED',
      'CANCELLED': 'CANCELLED',
      'REVERSED': 'FAILED'
    };
    return map[status?.toUpperCase()] || 'PENDING';
  }
  
  /**
   * Normalizar resposta
   */
  normalizeResponse(response) {
    return {
      status: this.mapStatus(response.status),
      reference: response.reference || response.transactionId || response.id,
      raw: response,
      message: response.message || response.error || null
    };
  }
}

module.exports = BaseProvider;
