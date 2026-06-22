/**
 * ACCESS MODEL
 * Fonte única de verdade para o que o utilizador pode fazer
 * 
 * 🎯 Princípios:
 * 1. Uma única fonte de verdade
 * 2. Separado de UI
 * 3. Deriva limits do core
 * 4. Permissões limpas
 */

const PermissionsEngine = require('../permissions/permissions.engine');

class AccessModel {
  
  /**
   * Construir modelo de acesso para um tipo de conta
   */
  static build(accountType) {
    // 1. Módulos disponíveis
    const modules = PermissionsEngine.getModules(accountType);
    
    // 2. Ações por módulo
    const actions = {};
    modules.forEach(module => {
      actions[module] = PermissionsEngine.getActions(accountType, module);
    });
    
    // 3. Limites (vêm do core)
    const limits = PermissionsEngine.getLimits(accountType);
    
    // 4. Estrutura unificada
    return {
      // O que o utilizador pode aceder
      modules: modules,
      
      // O que pode fazer em cada módulo
      actions: actions,
      
      // Regras de negócio (limites)
      limits: limits,
      
      // Métodos auxiliares
      canAccess: (module) => modules.includes(module),
      canPerform: (module, action) => {
        const moduleActions = actions[module] || [];
        return moduleActions.includes(action);
      }
    };
  }
}

module.exports = AccessModel;
