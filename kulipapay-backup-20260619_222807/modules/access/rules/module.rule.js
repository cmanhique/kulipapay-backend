/**
 * MODULE RULE
 * 
 * Verifica se o módulo e ação estão disponíveis
 * 
 * Prioridade: 20 (executa depois do KYC)
 */

class ModuleRule {
  
  evaluate(context, module, action) {
    const access = context.access || {};
    const modules = access.modules || [];
    
    // Verificar se o módulo existe
    if (!modules.includes(module)) {
      return {
        allowed: false,
        reason: 'MODULE_NOT_AVAILABLE',
        metadata: {
          module: module,
          availableModules: modules
        }
      };
    }
    
    // Verificar se a ação é permitida
    const actions = access.actions?.[module] || [];
    
    // Se action não for especificada, permite (apenas verifica módulo)
    if (!action) {
      return {
        allowed: true,
        reason: null,
        metadata: {
          module: module,
          action: null
        }
      };
    }
    
    // Verificar ação específica
    if (!actions.includes(action)) {
      return {
        allowed: false,
        reason: 'ACTION_NOT_ALLOWED',
        metadata: {
          module: module,
          action: action,
          allowedActions: actions
        }
      };
    }
    
    return {
      allowed: true,
      reason: null,
      metadata: {
        module: module,
        action: action
      }
    };
  }
}

module.exports = new ModuleRule();
