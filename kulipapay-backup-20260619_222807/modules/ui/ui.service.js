/**
 * UI SERVICE
 * 
 * 🎯 Responsável por fornecer contexto de UI
 * 
 * Agora com:
 * 1. Module Catalog (fonte única)
 * 2. Tenant Overrides (personalização)
 * 3. Access Control (filtragem)
 */

const MODULE_CATALOG = require('../catalog/catalog.service');
const TenantService = require('../tenant-config/tenant.service');

class UIService {
  
  /**
   * Obter contexto de UI para um utilizador
   */
  static async getContext(account, access = null) {
    const role = account.role || account.account_type;
    const kp_id = account.kp_id;
    
    // Buscar configuração do tenant
    const tenantConfig = TenantService.getConfig(kp_id);
    
    // Obter módulos do access (ou fallback)
    let modules = access?.modules || [];
    
    // Aplicar filtros do tenant
    modules = TenantService.filterModules(modules, tenantConfig);
    
    // Construir module_details a partir do catalog
    const module_details = this.buildModuleDetails(modules, tenantConfig);
    
    // Buscar UI baseada no role
    const uiMap = {
      MERCHANT: this.getMerchantUI(modules, module_details),
      INDIVIDUAL: this.getIndividualUI(modules, module_details),
      AGENT: this.getAgentUI(modules, module_details),
      BUSINESS: this.getBusinessUI(modules, module_details)
    };
    
    return uiMap[role] || this.getDefaultUI();
  }
  
  /**
   * Construir module_details a partir do catalog
   */
  static buildModuleDetails(modules, tenantConfig) {
    const details = {};
    
    modules.forEach(moduleName => {
      const catalogEntry = MODULE_CATALOG[moduleName];
      if (catalogEntry) {
        // Aplicar overrides do tenant
        const override = tenantConfig.renamedModules[moduleName] || {};
        details[moduleName] = {
          ...catalogEntry,
          ...override
        };
      }
    });
    
    return details;
  }
  
  /**
   * UI para Merchant
   */
  static getMerchantUI(modules, module_details) {
    return {
      dashboard_type: 'merchant',
      navigation: this.getNavigation('MERCHANT'),
      module_details
    };
  }
  
  /**
   * UI para Individual
   */
  static getIndividualUI(modules, module_details) {
    return {
      dashboard_type: 'individual',
      navigation: this.getNavigation('INDIVIDUAL'),
      module_details
    };
  }
  
  /**
   * UI para Agent
   */
  static getAgentUI(modules, module_details) {
    return {
      dashboard_type: 'agent',
      navigation: this.getNavigation('AGENT'),
      module_details
    };
  }
  
  /**
   * UI para Business
   */
  static getBusinessUI(modules, module_details) {
    return {
      dashboard_type: 'business',
      navigation: this.getNavigation('BUSINESS'),
      module_details
    };
  }
  
  /**
   * UI Default
   */
  static getDefaultUI() {
    return {
      dashboard_type: 'default',
      navigation: [],
      module_details: {}
    };
  }
  
  /**
   * Navegação por role
   */
  static getNavigation(role) {
    const navs = {
      MERCHANT: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'POS / Caixas', icon: 'store', path: '/cashiers' },
        { label: 'Pagamentos', icon: 'credit-card', path: '/payments' },
        { label: 'Vendas', icon: 'chart-bar', path: '/sales' },
        { label: 'Liquidações', icon: 'banknote', path: '/settlements' },
        { label: 'Histórico', icon: 'clock', path: '/history' },
        { label: 'Perfil', icon: 'user', path: '/profile' }
      ],
      INDIVIDUAL: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'Transferir', icon: 'send', path: '/transfer' },
        { label: 'Pagar Contas', icon: 'receipt', path: '/bills' },
        { label: 'Recarga', icon: 'phone', path: '/airtime' },
        { label: 'Histórico', icon: 'clock', path: '/history' },
        { label: 'Perfil', icon: 'user', path: '/profile' }
      ],
      AGENT: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'Cash-In', icon: 'arrow-down', path: '/cash-in' },
        { label: 'Cash-Out', icon: 'arrow-up', path: '/cash-out' },
        { label: 'Comissões', icon: 'coins', path: '/commission' },
        { label: 'Histórico', icon: 'clock', path: '/history' },
        { label: 'Perfil', icon: 'user', path: '/profile' }
      ],
      BUSINESS: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'Utilizadores', icon: 'users', path: '/users' },
        { label: 'Orçamentos', icon: 'calculator', path: '/budgets' },
        { label: 'Aprovações', icon: 'check-circle', path: '/approvals' },
        { label: 'Relatórios', icon: 'file-text', path: '/reports' },
        { label: 'Histórico', icon: 'clock', path: '/history' },
        { label: 'Perfil', icon: 'user', path: '/profile' }
      ]
    };
    
    return navs[role] || [];
  }
}

module.exports = UIService;
