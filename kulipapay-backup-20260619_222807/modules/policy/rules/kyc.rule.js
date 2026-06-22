/**
 * KYC RULE
 * 
 * Verifica o status do KYC
 * 
 * Prioridade: 10 (executa depois da conta)
 * Breaks flow: SIM (se KYC não for aprovado, bloqueia)
 */

class KYCRule {
  
  constructor() {
    this.name = 'KYCRule';
    this.priority = 10;
    this.breaksFlow = true;
    this.requirements = {
      MERCHANT: 'APPROVED',
      AGENT: 'APPROVED',
      BUSINESS: 'APPROVED',
      INDIVIDUAL: 'APPROVED'
    };
  }
  
  evaluate(context) {
    const account = context.account;
    const accountType = account.account_type;
    const kycStatus = account.kyc_status || 'NONE';
    const requiredLevel = this.requirements[accountType] || 'APPROVED';
    
    // KYC aprovado
    if (kycStatus === 'APPROVED') {
      return {
        name: this.name,
        allowed: true,
        reason: null,
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // KYC pendente
    if (kycStatus === 'PENDING') {
      return {
        name: this.name,
        allowed: false,
        reason: 'KYC_PENDING',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // KYC em revisão
    if (kycStatus === 'UNDER_REVIEW') {
      return {
        name: this.name,
        allowed: false,
        reason: 'KYC_UNDER_REVIEW',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // KYC rejeitado
    if (kycStatus === 'REJECTED') {
      return {
        name: this.name,
        allowed: false,
        reason: 'KYC_REJECTED',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // KYC suspenso
    if (kycStatus === 'SUSPENDED') {
      return {
        name: this.name,
        allowed: false,
        reason: 'KYC_SUSPENDED',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // Sem KYC
    return {
      name: this.name,
      allowed: false,
      reason: 'KYC_REQUIRED',
      metadata: {
        currentLevel: kycStatus,
        requiredLevel: requiredLevel
      }
    };
  }
}

module.exports = new KYCRule();
