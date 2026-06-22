/**
 * ACCESS SERVICE
 * 
 * Agora usa o Policy Engine central
 */

const AccessModel = require('../../../identity/access/access.model');
const PermissionsEngine = require('../../../identity/permissions/permissions.engine');
const PolicyEngine = require('../../../core/policies/policy.engine');

class AccessService {
  
  static build(account) {
    const accountType = account.account_type;
    const baseAccess = AccessModel.build(accountType);
    
    return {
      permissions: {
        modules: baseAccess.modules,
        actions: baseAccess.actions
      },
      constraints: {
        limits: baseAccess.limits
      },
      canAccess: baseAccess.canAccess,
      canPerform: baseAccess.canPerform
    };
  }

  static evaluate(account, module, action, context = {}) {
    // Usar o Policy Engine central
    return PolicyEngine.evaluate({
      account,
      module,
      action,
      extra: context
    });
  }
}

module.exports = AccessService;
