/**
 * IDENTITY FACADE
 */

const AccountService = require('./services/account.service');
const WalletService = require('./services/wallet.service');
const AccessService = require('./services/access.service');
const UIService = require('./services/ui.service');
const DomainService = require('./services/domain.service');

class IdentityFacade {
  
  static async getMe(kp_id) {
    const account = await AccountService.get(kp_id);
    const wallet = await WalletService.get(kp_id);
    const metrics = await WalletService.getMetrics(kp_id);
    const access = AccessService.build(account);
    const ui = UIService.build(account.account_type);
    const domain = await DomainService.get(kp_id, account.account_type);
    
    return {
      account,
      wallet,
      access,
      ui,
      metrics,
      domain,
      context: {
        timestamp: new Date().toISOString(),
        version: '2.0'
      }
    };
  }

  static async getBasic(kp_id) {
    const account = await AccountService.get(kp_id);
    const access = AccessService.build(account);
    
    return {
      account,
      access: {
        modules: access.permissions.modules,
        actions: access.permissions.actions  // 🔥 INCLUIR ACTIONS
      }
    };
  }

  static async evaluateAction(kp_id, module, action, context = {}) {
    const account = await AccountService.get(kp_id);
    return AccessService.evaluate(account, module, action, context);
  }
}

module.exports = IdentityFacade;
