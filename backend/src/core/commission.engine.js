/**
 * Fee & commission engine for merchants, agents, and enterprise accounts.
 * Extends fee.engine.js patterns without breaking existing P2P fee logic.
 */
const feeEngine = require('./fee.engine');

class CommissionEngine {
  /**
   * Merchant POS transaction fee (% of payment amount).
   */
  calculateMerchantFee({ amount, accountType = 'MERCHANT' }) {
    const merchantType =
      accountType === 'ENTERPRISE' ? 'enterprise' : 'standard';

    return feeEngine.calculate({ amount, merchantType, isInternal: false });
  }

  /**
   * Agent commission on cash-in (deposit) operations.
   */
  calculateAgentDepositCommission({ amount, commissionRate = 0.025 }) {
    const gross = Number(amount) * Number(commissionRate);
    return {
      grossAmount: Number(amount),
      commissionRate: Number(commissionRate),
      commission: Math.round(gross * 100) / 100,
      platformShare: Math.round(gross * 0.3 * 100) / 100,
      agentShare: Math.round(gross * 0.7 * 100) / 100,
    };
  }

  /**
   * Agent commission on cash-out (withdrawal) operations.
   */
  calculateAgentWithdrawalCommission({ amount, commissionRate = 0.02 }) {
    const gross = Number(amount) * Number(commissionRate);
    return {
      grossAmount: Number(amount),
      commissionRate: Number(commissionRate),
      commission: Math.round(gross * 100) / 100,
      platformShare: Math.round(gross * 0.3 * 100) / 100,
      agentShare: Math.round(gross * 0.7 * 100) / 100,
    };
  }

  /**
   * Enterprise reduced fee tier.
   */
  calculateEnterpriseFee({ amount }) {
    return feeEngine.calculate({ amount, merchantType: 'enterprise', isInternal: false });
  }

  /**
   * Resolve fee tier from account type.
   */
  resolveFeeTier(accountType) {
    switch (accountType) {
      case 'ENTERPRISE':
        return 'enterprise';
      case 'MERCHANT':
        return 'standard';
      default:
        return 'standard';
    }
  }
}

module.exports = new CommissionEngine();
