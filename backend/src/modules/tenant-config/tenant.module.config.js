/**
 * TENANT MODULE CONFIG
 * 
 * 🎯 Overrides por tenant (merchant/conta)
 * 
 * Princípios:
 * 1. Configuração específica por kp_id
 * 2. Pode ser movido para DB no futuro
 * 3. Permite personalização sem deploy
 */

const TENANT_MODULE_OVERRIDES = {
  // Merchant específico
  "MER-00001": {
    disabledModules: [],
    renamedModules: {
      cashier: {
        label: "POS Avançado"
      }
    },
    hiddenModules: []
  },
  
  // Merchant 2 (exemplo)
  "MER-00002": {
    disabledModules: ["sales_reports"],
    renamedModules: {},
    hiddenModules: []
  },
  
  // Configuração default para todos
  default: {
    disabledModules: [],
    renamedModules: {},
    hiddenModules: []
  }
};

module.exports = TENANT_MODULE_OVERRIDES;
