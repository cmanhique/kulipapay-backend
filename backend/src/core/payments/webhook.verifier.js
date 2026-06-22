/**
 * WEBHOOK VERIFIER
 */

const crypto = require('crypto');
const { normalizeStatus } = require('./payment.status');

class WebhookVerifier {
  
  static verifySignature(payload, signature, secret) {
    if (!signature || !secret) {
      return false;
    }
    
    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
  
  static normalize(payload, provider) {
    const normalizers = {
      MPESA: this.normalizeMpesa,
      EMOLA: this.normalizeEmola,
      MKESH: this.normalizeMkesh
    };
    
    const normalizer = normalizers[provider];
    if (!normalizer) {
      throw new Error(`Provider ${provider} not supported`);
    }
    
    return normalizer(payload);
  }
  
  static normalizeMpesa(payload) {
    // 🔥 normalizeStatus trata todos os casos
    const rawStatus = payload.ResultCode !== undefined ? String(payload.ResultCode) : payload.status;
    const status = normalizeStatus(rawStatus);
    
    return {
      reference: payload.Reference || payload.transactionId || payload.CheckoutRequestID,
      status: status,
      amount: payload.Amount || payload.amount || 0,
      phone: payload.PhoneNumber || payload.phone || '',
      raw: payload
    };
  }
  
  static normalizeEmola(payload) {
    const status = normalizeStatus(payload.status);
    
    return {
      reference: payload.transactionId || payload.reference,
      status: status,
      amount: payload.amount || 0,
      phone: payload.phone || '',
      raw: payload
    };
  }
  
  static normalizeMkesh(payload) {
    const status = normalizeStatus(payload.status);
    
    return {
      reference: payload.transactionId || payload.reference,
      status: status,
      amount: payload.amount || 0,
      phone: payload.phone || '',
      raw: payload
    };
  }
}

module.exports = WebhookVerifier;
