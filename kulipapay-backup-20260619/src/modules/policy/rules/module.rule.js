/**
 * MODULE RULE
 * 
 * Verifica se o módulo e ação estão disponíveis
 * 
 * Prioridade: 20 (executa depois do KYC)
 * Breaks flow: SIM (se módulo não estiver disponível, bloqueia)
 */

class ModuleRule {
  
  constructor() {
    this.name = 'ModuleRule';
    this.priority = 20;
    this.breaksFlow = true;
  }
  
  evaluate(context) {
    const access = context.access;
    const module = context.action.module;
    const action = context.action.action;
    
    // Verificar se o módulo existe
    if (!access.modules.includes(module)) {
      return {
        name: this.name,
        allowed: false,
        reason: 'MODULE_NOT_AVAILABLE',
        metadata: {
          module: module,
          availableModules: access.modules
        }
      };
    }
    
    // Verificar se a ação é permitida
    if (action) {
      const allowedActions = access.actions[module] || [];
      if (!allowedActions.includes(action)) {
        return {
          name: this.name,
          allowed: false,
          reason: 'ACTION_NOT_ALLOWED',
          metadata: {
            module: module,
            action: action,
            allowedActions: allowedActions
          }
        };
      }
    }
    
    return {
      name: this.name,
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
