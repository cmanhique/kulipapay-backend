/**
 * UI REGISTRY
 * Mapeamento de módulos para UI
 */

class UIRegistry {
  
  // Mapeamento de nomes de navegação para nomes de módulos
  static getModuleMapping() {
    return {
      'Dashboard': 'merchant_dashboard',
      'POS / Caixas': 'cashier',
      'Pagamentos': 'payments',
      'Vendas': 'sales_reports',
      'Liquidações': 'settlements',
      'Histórico': 'history',
      'Perfil': 'profile',
      'Transferir': 'transfer',
      'Pagar Contas': 'bill_payments',
      'Recarga': 'airtime',
      'Utilizadores': 'multi_user',
      'Orçamentos': 'budgets',
      'Aprovações': 'approvals',
      'Relatórios': 'reports',
      'Cash-In': 'cash_in',
      'Cash-Out': 'cash_out',
      'Comissões': 'commission'
    };
  }
  
  static getModuleUI(moduleName) {
    const map = {
      wallet: { label: 'Carteira', icon: 'wallet', description: 'Gerir saldo e transações' },
      transfer: { label: 'Transferências', icon: 'send', description: 'Enviar e receber dinheiro' },
      bill_payments: { label: 'Pagamento de Contas', icon: 'receipt', description: 'Pagar água, luz, etc' },
      airtime: { label: 'Recarga Móvel', icon: 'phone', description: 'Recarregar telemóvel' },
      merchant_dashboard: { label: 'Dashboard', icon: 'home', description: 'Visão geral do negócio' },
      cashier: { label: 'POS / Caixas', icon: 'store', description: 'Gerir terminais de pagamento' },
      payments: { label: 'Pagamentos', icon: 'credit-card', description: 'Processar e gerir pagamentos' },
      settlements: { label: 'Liquidações', icon: 'banknote', description: 'Histórico de liquidações' },
      sales_reports: { label: 'Relatórios de Vendas', icon: 'chart-bar', description: 'Análise de vendas' },
      business_dashboard: { label: 'Dashboard Empresarial', icon: 'building', description: 'Visão consolidada' },
      enterprise_dashboard: { label: 'Dashboard Empresarial', icon: 'building', description: 'Visão consolidada empresarial' },
      multi_user: { label: 'Utilizadores', icon: 'users', description: 'Gerir equipa' },
      budgets: { label: 'Orçamentos', icon: 'calculator', description: 'Planeamento financeiro' },
      approvals: { label: 'Aprovações', icon: 'check-circle', description: 'Fluxos de aprovação' },
      reports: { label: 'Relatórios', icon: 'file-text', description: 'Relatórios financeiros' },
      history: { label: 'Histórico', icon: 'clock', description: 'Todas as transações' },
      profile: { label: 'Perfil', icon: 'user', description: 'Definições da conta' },
      agent_dashboard: { label: 'Dashboard Agente', icon: 'home', description: 'Visão geral do agente' },
      cash_in: { label: 'Cash-In', icon: 'arrow-down', description: 'Depósito em dinheiro' },
      cash_out: { label: 'Cash-Out', icon: 'arrow-up', description: 'Saque em dinheiro' },
      commission: { label: 'Comissões', icon: 'coins', description: 'Comissões de agente' }
    };
    return map[moduleName] || { label: moduleName, icon: 'box', description: '' };
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
      ENTERPRISE: [
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
  
  static getUI(accountType) {
    const navigation = this.getNavigation(accountType);
    const moduleDetails = {};
    const mapping = this.getModuleMapping();
    
    // Para cada item na navegação, mapear para o nome do módulo
    navigation.forEach(item => {
      const moduleName = mapping[item.label] || item.label.toLowerCase().replace(/ /g, '_');
      moduleDetails[item.label] = this.getModuleUI(moduleName);
    });
    
    return {
      dashboard_type: accountType.toLowerCase(),
      navigation: navigation,
      module_details: moduleDetails
    };
  }
}

module.exports = UIRegistry;
