/**
 * ACCOUNT RULE
 * 
 * Verifica o status da conta
 * 
 * Prioridade: 5 (executa primeiro)
 */

class AccountRule {
  
  evaluate(context) {
    const account = context.account;

    if (!account) {
      return {
        allowed: false,
        reason: 'NO_ACCOUNT',
        metadata: {}
      };
    }

    // Conta suspensa
    if (account.status === 'SUSPENDED') {
      return {
        allowed: false,
        reason: 'ACCOUNT_SUSPENDED',
        metadata: { status: account.status }
      };
    }

    // Conta bloqueada
    if (account.status === 'BLOCKED') {
      return {
        allowed: false,
        reason: 'ACCOUNT_BLOCKED',
        metadata: { status: account.status }
      };
    }

    // Conta inativa
    if (account.status === 'INACTIVE') {
      return {
        allowed: false,
        reason: 'ACCOUNT_INACTIVE',
        metadata: { status: account.status }
      };
    }

    // Conta ativa
    if (account.status === 'ACTIVE') {
      return {
        allowed: true,
        reason: null,
        metadata: { status: account.status }
      };
    }

    // Fallback: permite por segurança
    return {
      allowed: true,
      reason: null,
      metadata: {}
    };
  }
}

module.exports = new AccountRule();
