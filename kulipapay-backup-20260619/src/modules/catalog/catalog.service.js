/**
 * MODULE CATALOG
 * 
 * 🎯 Fonte única de verdade para módulos
 * 
 * Princípios:
 * 1. Define TODOS os módulos disponíveis no sistema
 * 2. Contém metadata (label, icon, description)
 * 3. Pode ser estendido via DB no futuro
 */

const MODULE_CATALOG = {
  // Core modules
  wallet: {
    label: 'Carteira',
    icon: 'wallet',
    description: 'Gerir saldo e transações'
  },
  history: {
    label: 'Histórico',
    icon: 'clock',
    description: 'Todas as transações'
  },
  profile: {
    label: 'Perfil',
    icon: 'user',
    description: 'Definições da conta'
  },
  
  // Merchant modules
  merchant_dashboard: {
    label: 'Dashboard',
    icon: 'home',
    description: 'Visão geral do negócio'
  },
  cashier: {
    label: 'POS / Caixas',
    icon: 'store',
    description: 'Gerir terminais de pagamento'
  },
  payments: {
    label: 'Pagamentos',
    icon: 'credit-card',
    description: 'Processar e gerir pagamentos'
  },
  settlements: {
    label: 'Liquidações',
    icon: 'banknote',
    description: 'Histórico de liquidações'
  },
  sales_reports: {
    label: 'Relatórios de Vendas',
    icon: 'chart-bar',
    description: 'Análise de vendas'
  },
  
  // Individual modules
  transfer: {
    label: 'Transferências',
    icon: 'send',
    description: 'Enviar e receber dinheiro'
  },
  bill_payments: {
    label: 'Pagamento de Contas',
    icon: 'receipt',
    description: 'Pagar água, luz, etc'
  },
  airtime: {
    label: 'Recarga Móvel',
    icon: 'phone',
    description: 'Recarregar telemóvel'
  },
  
  // Agent modules
  agent_dashboard: {
    label: 'Dashboard Agente',
    icon: 'home',
    description: 'Visão geral do agente'
  },
  cash_in: {
    label: 'Cash-In',
    icon: 'arrow-down',
    description: 'Depósito em dinheiro'
  },
  cash_out: {
    label: 'Cash-Out',
    icon: 'arrow-up',
    description: 'Saque em dinheiro'
  },
  commission: {
    label: 'Comissões',
    icon: 'coins',
    description: 'Comissões de agente'
  },
  
  // Business modules
  business_dashboard: {
    label: 'Dashboard Empresarial',
    icon: 'building',
    description: 'Visão consolidada'
  },
  multi_user: {
    label: 'Utilizadores',
    icon: 'users',
    description: 'Gerir equipa'
  },
  budgets: {
    label: 'Orçamentos',
    icon: 'calculator',
    description: 'Planeamento financeiro'
  },
  approvals: {
    label: 'Aprovações',
    icon: 'check-circle',
    description: 'Fluxos de aprovação'
  },
  reports: {
    label: 'Relatórios',
    icon: 'file-text',
    description: 'Relatórios financeiros'
  }
};

module.exports = MODULE_CATALOG;
