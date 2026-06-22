/**
 * KYC RULE
 */

const BaseRule = require('./base.rule');
const { REASON_CODES } = require('../reason.codes');

class KYCRule extends BaseRule {
  
  constructor() {
    super();
    this.priority = 10;
    this.requirements = {
      MERCHANT: 'BUSINESS',
      AGENT: 'AGENT',
      INDIVIDUAL: 'BASIC'
    };
  }
  
  evaluate(context) {
    const { account, action } = context;
    
    // 🔥 LOG para debug
    console.log('🔍 KYCRule - Account:', {
      kp_id: account?.kp_id,
      hasKyc: !!account?.kyc,
      kycStatus: account?.kyc?.status
    });
    
    // Se não tem KYC configurado
    if (!account.kyc) {
      return {
        allowed: false,
        reason: REASON_CODES.KYC_REQUIRED,
        metadata: {
          requiredLevel: this.requirements[account.account_type] || 'BASIC',
          currentLevel: 'NONE'
        }
      };
    }
    
    const requiredLevel = this.requirements[account.account_type] || 'BASIC';
    
    // Se KYC está pendente
    if (account.kyc.status === 'PENDING') {
      return {
        allowed: false,
        reason: REASON_CODES.KYC_PENDING,
        metadata: {
          requiredLevel: requiredLevel,
          currentLevel: account.kyc.status
        }
      };
    }
    
    // Se KYC foi rejeitado
    if (account.kyc.status === 'REJECTED') {
      return {
        allowed: false,
        reason: REASON_CODES.KYC_REJECTED,
        metadata: {
          requiredLevel: requiredLevel,
          currentLevel: account.kyc.status
        }
      };
    }
    
    // Se KYC está aprovado
    if (account.kyc.status === 'APPROVED') {
      return {
        allowed: true,
        reason: null,
        metadata: {
          requiredLevel: requiredLevel,
          currentLevel: account.kyc.status
        }
      };
    }
    
    // Por padrão, permite
    return {
      allowed: true,
      reason: null,
      metadata: {}
    };
  }
}

module.exports = KYCRule;
