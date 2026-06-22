/**
 * FEATURE RULE
 * 
 * Verifica se a feature está ativa
 * 
 * Prioridade: 40 (executa por último)
 * Breaks flow: NÃO (apenas informa)
 */

class FeatureRule {
  
  constructor() {
    this.name = 'FeatureRule';
    this.priority = 40;
    this.breaksFlow = false;
  }
  
  evaluate(context) {
    const account = context.account;
    const module = context.action.module;
    
    // Mapeamento de features por módulo
    const featureMap = {
      cashier: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      payments: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      settlements: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      sales_reports: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      transfer: account.account_type === 'INDIVIDUAL' || account.account_type === 'MERCHANT',
      bill_payments: account.account_type === 'INDIVIDUAL',
      airtime: account.account_type === 'INDIVIDUAL',
      cash_in: account.account_type === 'AGENT',
      cash_out: account.account_type === 'AGENT',
      budgets: account.account_type === 'BUSINESS',
      approvals: account.account_type === 'BUSINESS'
    };
    
    const isEnabled = featureMap[module] || false;
    
    if (!isEnabled) {
      return {
        name: this.name,
        allowed: false,
        reason: 'FEATURE_DISABLED',
        metadata: {
          module: module,
          accountType: account.account_type,
          kycStatus: account.kyc_status
        }
      };
    }
    
    return {
      name: this.name,
      allowed: true,
      reason: null,
      metadata: {
        module: module,
        accountType: account.account_type,
        kycStatus: account.kyc_status
      }
    };
  }
}

module.exports = new FeatureRule();
