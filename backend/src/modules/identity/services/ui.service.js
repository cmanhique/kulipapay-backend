/**
 * UI SERVICE
 * 
 * Responsável por:
 * - Construir UI baseada no tipo de conta
 * - Navigation
 * - Module details
 * 
 * ⚠️ TOTALMENTE SEPARADO DO DOMÍNIO
 */

const UIRegistry = require('../../../identity/ui/ui.registry');

class UIService {
  
  static build(accountType) {
    return UIRegistry.getUI(accountType);
  }

  static getNavigation(accountType) {
    return UIRegistry.getNavigation(accountType);
  }

  static getModuleDetails(accountType) {
    const ui = this.build(accountType);
    return ui.module_details;
  }
}

module.exports = UIService;
