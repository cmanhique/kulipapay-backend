/**
 * KYC RULE
 * 
 * Verifica o status do KYC
 * 
 * Prioridade: 10 (executa depois da conta)
 * 
 * Estados:
 * - NONE: Sem KYC
 * - PENDING: Em análise
 * - UNDER_REVIEW: Em revisão
 * - APPROVED: Aprovado
 * - REJECTED: Rejeitado
 * - SUSPENDED: Suspenso
 */

class KYCRule {
  
  constructor() {
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
    
    // Nível requerido para este tipo de conta
    const requiredLevel = this.requirements[accountType] || 'APPROVED';
    
    // Se KYC já está aprovado
    if (kycStatus === 'APPROVED') {
      return {
        allowed: true,
        reason: null,
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // Se KYC está pendente
    if (kycStatus === 'PENDING') {
      return {
        allowed: false,
        reason: 'KYC_PENDING',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // Se KYC está em revisão
    if (kycStatus === 'UNDER_REVIEW') {
      return {
        allowed: false,
        reason: 'KYC_UNDER_REVIEW',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // Se KYC foi rejeitado
    if (kycStatus === 'REJECTED') {
      return {
        allowed: false,
        reason: 'KYC_REJECTED',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // Se KYC está suspenso
    if (kycStatus === 'SUSPENDED') {
      return {
        allowed: false,
        reason: 'KYC_SUSPENDED',
        metadata: {
          currentLevel: kycStatus,
          requiredLevel: requiredLevel
        }
      };
    }
    
    // Se não tem KYC (NONE)
    return {
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
