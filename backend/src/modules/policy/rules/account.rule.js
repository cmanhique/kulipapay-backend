/**
 * ACCOUNT RULE
 * 
 * Verifica o status da conta
 * 
 * Prioridade: 5 (executa primeiro)
 * Breaks flow: SIM (se conta não estiver ativa, não continua)
 */

class AccountRule {
  
  constructor() {
    this.name = 'AccountRule';
    this.priority = 5;
    this.breaksFlow = true;
  }
  
  evaluate(context) {
    const account = context.account;
    
    // Conta não existe
    if (!account) {
      return {
        name: this.name,
        allowed: false,
        reason: 'ACCOUNT_NOT_FOUND',
        metadata: {}
      };
    }
    
    // Conta suspensa
    if (account.status === 'SUSPENDED') {
      return {
        name: this.name,
        allowed: false,
        reason: 'ACCOUNT_SUSPENDED',
        metadata: { status: account.status }
      };
    }
    
    // Conta bloqueada
    if (account.status === 'BLOCKED') {
      return {
        name: this.name,
        allowed: false,
        reason: 'ACCOUNT_BLOCKED',
        metadata: { status: account.status }
      };
    }
    
    // Conta inativa
    if (account.status === 'INACTIVE') {
      return {
        name: this.name,
        allowed: false,
        reason: 'ACCOUNT_INACTIVE',
        metadata: { status: account.status }
      };
    }
    
    // Conta ativa
    return {
      name: this.name,
      allowed: true,
      reason: null,
      metadata: { status: account.status }
    };
  }
}

module.exports = new AccountRule();
