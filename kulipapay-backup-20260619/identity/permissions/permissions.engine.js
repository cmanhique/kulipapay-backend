/**
 * PERMISSIONS ENGINE
 * RBAC real - define o que cada tipo de conta pode fazer
 */

const { ACCOUNT_TYPES, PERMISSION_LEVELS } = require('../session/session.types');

const PERMISSION_MATRIX = {
  [ACCOUNT_TYPES.INDIVIDUAL]: {
    modules: ['wallet', 'transfer', 'bill_payments', 'airtime', 'history', 'profile'],
    actions: {
      wallet: ['view', 'deposit', 'withdraw'],
      transfer: ['p2p', 'bank'],
      bill_payments: ['view', 'pay'],
      airtime: ['recharge'],
      history: ['view'],
      profile: ['view', 'update']
    }
  },
  [ACCOUNT_TYPES.MERCHANT]: {
    modules: ['wallet', 'merchant_dashboard', 'cashier', 'payments', 'settlements', 'sales_reports', 'history', 'profile'],
    actions: {
      wallet: ['view', 'deposit', 'withdraw'],
      merchant_dashboard: ['view'],
      cashier: ['create', 'manage', 'view', 'block'],
      payments: ['process', 'view', 'refund', 'void'],
      settlements: ['view', 'schedule'],
      sales_reports: ['view', 'export'],
      history: ['view'],
      profile: ['view', 'update']
    }
  },
  [ACCOUNT_TYPES.BUSINESS]: {
    modules: ['wallet', 'business_dashboard', 'multi_user', 'budgets', 'approvals', 'reports', 'history', 'profile'],
    actions: {
      wallet: ['view', 'deposit', 'withdraw', 'multi'],
      business_dashboard: ['view'],
      multi_user: ['create', 'manage', 'view'],
      budgets: ['create', 'approve', 'view'],
      approvals: ['request', 'approve', 'reject'],
      reports: ['view', 'export', 'consolidated'],
      history: ['view'],
      profile: ['view', 'update']
    }
  },
  [ACCOUNT_TYPES.AGENT]: {
    modules: ['wallet', 'agent_dashboard', 'cash_in', 'cash_out', 'commission', 'history', 'profile'],
    actions: {
      wallet: ['view'],
      agent_dashboard: ['view'],
      cash_in: ['process', 'view'],
      cash_out: ['process', 'view'],
      commission: ['view'],
      history: ['view'],
      profile: ['view', 'update']
    }
  }
};

const LIMITS_MATRIX = {
  [ACCOUNT_TYPES.INDIVIDUAL]: {
    dailyTransfer: 500000,
    monthlyTransfer: 5000000,
    maxPerTransaction: 200000,
    dailyBillPayments: 300000
  },
  [ACCOUNT_TYPES.MERCHANT]: {
    dailySales: 10000000,
    monthlySales: 250000000,
    maxPerTransaction: 1000000,
    dailySettlement: 10000000
  },
  [ACCOUNT_TYPES.BUSINESS]: {
    dailyBudget: 50000000,
    monthlyBudget: 1000000000,
    maxPerApproval: 10000000,
    maxUsers: 50
  },
  [ACCOUNT_TYPES.AGENT]: {
    dailyCashIn: 2000000,
    dailyCashOut: 2000000,
    maxPerTransaction: 500000,
    dailyCommission: 100000
  }
};

class PermissionsEngine {
  static getModules(accountType) {
    return PERMISSION_MATRIX[accountType]?.modules || [];
  }
  static canAccess(accountType, moduleName) {
    const modules = this.getModules(accountType);
    return modules.includes(moduleName);
  }
  static canPerform(accountType, moduleName, action) {
    const moduleConfig = PERMISSION_MATRIX[accountType];
    if (!moduleConfig) return false;
    const actions = moduleConfig.actions[moduleName];
    if (!actions) return false;
    return actions.includes(action) || actions.includes(PERMISSION_LEVELS.MANAGE);
  }
  static getActions(accountType, moduleName) {
    return PERMISSION_MATRIX[accountType]?.actions[moduleName] || [];
  }
  static getLimits(accountType) {
    return LIMITS_MATRIX[accountType] || LIMITS_MATRIX.INDIVIDUAL;
  }
  static getLimit(accountType, limitKey) {
    const limits = this.getLimits(accountType);
    return limits[limitKey] || null;
  }
  static isValidAccountType(accountType) {
    return Object.keys(PERMISSION_MATRIX).includes(accountType);
  }
  static getModulesWithDetails(accountType) {
    const modules = this.getModules(accountType);
    const moduleDetails = this.getModuleDetails();
    return modules.map(module => ({
      name: module,
      label: moduleDetails[module]?.label || module,
      icon: moduleDetails[module]?.icon || 'box',
      description: moduleDetails[module]?.description || '',
      actions: this.getActions(accountType, module)
    }));
  }
  static getModuleDetails() {
    return {
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
  }
}

module.exports = PermissionsEngine;
