/**
 * TENANT SERVICE
 * 
 * 🎯 Gerenciar configurações por tenant
 * 
 * Responsabilidades:
 * 1. Buscar configuração do tenant
 * 2. Aplicar overrides
 * 3. Preparar para migração DB
 */

const TENANT_OVERRIDES = require('./tenant.module.config');

class TenantService {
  
  /**
   * Obter configuração de um tenant
   */
  static getConfig(kp_id) {
    return TENANT_OVERRIDES[kp_id] || TENANT_OVERRIDES.default;
  }
  
  /**
   * Aplicar overrides a um módulo
   */
  static applyOverrides(module, tenantConfig) {
    if (!module) return null;
    
    const override = tenantConfig.renamedModules[module] || {};
    return {
      ...module,
      ...override
    };
  }
  
  /**
   * Filtrar módulos baseado em configuração
   */
  static filterModules(modules, tenantConfig) {
    return modules.filter(m => {
      // Verificar se está desativado
      if (tenantConfig.disabledModules.includes(m)) return false;
      // Verificar se está oculto
      if (tenantConfig.hiddenModules.includes(m)) return false;
      return true;
    });
  }
}

module.exports = TenantService;
