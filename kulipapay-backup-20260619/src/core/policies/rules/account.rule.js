/**
 * ACCOUNT RULE
 * 
 * Verifica o status da conta
 */

const BaseRule = require('./base.rule');
const { REASON_CODES } = require('../reason.codes');

class AccountRule extends BaseRule {
  
  constructor() {
    super();
    this.priority = 5; // Executa primeiro (antes do KYC)
  }
  
  evaluate(context) {
    const { account } = context;
    
    // Verificar status da conta
    if (account.status === 'SUSPENDED') {
      return {
        allowed: false,
        reason: REASON_CODES.ACCOUNT_SUSPENDED,
        metadata: {
          status: account.status
        }
      };
    }
    
    if (account.status === 'BLOCKED') {
      return {
        allowed: false,
        reason: REASON_CODES.ACCOUNT_BLOCKED,
        metadata: {
          status: account.status
        }
      };
    }
    
    if (account.status === 'INACTIVE') {
      return {
        allowed: false,
        reason: REASON_CODES.ACCOUNT_INACTIVE,
        metadata: {
          status: account.status
        }
      };
    }
    
    return {
      allowed: true,
      reason: null,
      metadata: {}
    };
  }
}

module.exports = AccountRule;
