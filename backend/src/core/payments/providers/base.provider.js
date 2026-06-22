/**
 * BASE PROVIDER - INTERFACE ÚNICA
 * 
 * Todos os providers devem implementar estes 4 métodos
 */

class BaseProvider {
  
  /**
   * Iniciar pagamento (Cash-In)
   * @returns { status: 'PENDING'|'PROCESSING', reference, raw }
   */
  async charge({ phone, amount, reference, metadata = {} }) {
    throw new Error('charge() must be implemented');
  }
  
  /**
   * Iniciar payout (Cash-Out)
   * @returns { status: 'PENDING'|'PROCESSING', reference, raw }
   */
  async payout({ phone, amount, reference, metadata = {} }) {
    throw new Error('payout() must be implemented');
  }
  
  /**
   * Consultar status
   */
  async getStatus(reference) {
    throw new Error('getStatus() must be implemented');
  }
  
  /**
   * Processar webhook (callback do provider)
   */
  async handleWebhook(payload) {
    throw new Error('handleWebhook() must be implemented');
  }
  
  /**
   * Normalizar resposta
   */
  normalizeResponse(response) {
    return {
      status: response.status || 'PENDING',
      reference: response.reference || response.transactionId || response.id,
      raw: response,
      message: response.message || response.error || null
    };
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
      'CANCELLED': 'CANCELLED'
    };
    return map[status?.toUpperCase()] || 'PENDING';
  }
}

module.exports = BaseProvider;
