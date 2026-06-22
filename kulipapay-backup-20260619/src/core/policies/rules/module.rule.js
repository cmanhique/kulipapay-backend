/**
 * MODULE RULE
 * 
 * Verifica se o módulo está disponível para o utilizador
 */

const BaseRule = require('./base.rule');
const { REASON_CODES } = require('../reason.codes');

class ModuleRule extends BaseRule {
  
  constructor() {
    super();
    this.priority = 20; // Executa depois do KYC
  }
  
  evaluate(context) {
    const { account, module, action } = context;
    
    // Se não tem módulo definido, permite (sem verificação)
    if (!module) {
      return {
        allowed: true,
        reason: null,
        metadata: {}
      };
    }
    
    // Buscar permissões da conta
    const accessService = require('../../../modules/identity/services/access.service');
    const access = accessService.build(account);
    
    // Verificar se o módulo existe
    if (!access.permissions.modules.includes(module)) {
      return {
        allowed: false,
        reason: REASON_CODES.MODULE_NOT_AVAILABLE,
        metadata: {
          module: module,
          availableModules: access.permissions.modules
        }
      };
    }
    
    // Verificar se a ação é permitida
    if (action && !access.permissions.actions[module]?.includes(action)) {
      return {
        allowed: false,
        reason: REASON_CODES.ACTION_NOT_ALLOWED,
        metadata: {
          module: module,
          action: action,
          allowedActions: access.permissions.actions[module] || []
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

module.exports = ModuleRule;
