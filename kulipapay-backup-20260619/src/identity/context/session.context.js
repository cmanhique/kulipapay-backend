/**
 * SESSION CONTEXT
 * Contexto enriquecido da sessão do utilizador
 */

const PermissionsEngine = require('../permissions/permissions.engine');

class SessionContext {
  static build(account) {
    const accountType = account.account_type;
    const modules = PermissionsEngine.getModules(accountType);
    const limits = PermissionsEngine.getLimits(accountType);
    const modulesWithDetails = PermissionsEngine.getModulesWithDetails(accountType);
    return {
      identity: {
        kp_id: account.kp_id,
        account_type: accountType,
        role: account.role || 'USER',
        status: account.status,
        email: account.email,
        phone: account.phone,
        name: account.name
      },
      permissions: {
        modules: modules,
        modules_with_details: modulesWithDetails,
        canAccess: (module) => PermissionsEngine.canAccess(accountType, module),
        canPerform: (module, action) => PermissionsEngine.canPerform(accountType, module, action),
        getActions: (module) => PermissionsEngine.getActions(accountType, module)
      },
      limits: limits,
      ui: {
        dashboard_type: accountType.toLowerCase(),
        features: modules,
        navigation: this.getNavigation(accountType)
      },
      metrics: {
        today: { transactions: 0, volume: 0 },
        total: { transactions: 0 }
      }
    };
  }
  static getNavigation(accountType) {
    const navs = {
      INDIVIDUAL: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'Transferir', icon: 'send', path: '/transfer' },
        { label: 'Pagar Contas', icon: 'receipt', path: '/bills' },
        { label: 'Recarga', icon: 'phone', path: '/airtime' },
        { label: 'Histórico', icon: 'clock', path: '/history' },
        { label: 'Perfil', icon: 'user', path: '/profile' }
      ],
      MERCHANT: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'POS / Caixas', icon: 'store', path: '/cashiers' },
        { label: 'Pagamentos', icon: 'credit-card', path: '/payments' },
        { label: 'Vendas', icon: 'chart-bar', path: '/sales' },
        { label: 'Liquidações', icon: 'banknote', path: '/settlements' },
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
      ],
      AGENT: [
        { label: 'Dashboard', icon: 'home', path: '/' },
        { label: 'Cash-In', icon: 'arrow-down', path: '/cash-in' },
        { label: 'Cash-Out', icon: 'arrow-up', path: '/cash-out' },
        { label: 'Comissões', icon: 'coins', path: '/commission' },
        { label: 'Histórico', icon: 'clock', path: '/history' },
        { label: 'Perfil', icon: 'user', path: '/profile' }
      ]
    };
    return navs[accountType] || navs.INDIVIDUAL;
  }
}

module.exports = SessionContext;
