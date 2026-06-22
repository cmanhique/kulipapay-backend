/**
 * SESSION CONTEXT
 * Contexto enriquecido da sessão do utilizador
 * 
 * ⚠️ NÃO MEXE NO LOGIN EXISTENTE
 * ✅ É usado APENAS no /me endpoint
 */

function buildSessionContext(account) {
  return {
    kp_id: account.kp_id,
    role: account.role,
    accountType: account.account_type,
    status: account.status,

    permissions: {
      canAccess: (module) => {
        if (account.role === 'ADMIN') return true;

        // Regra base simples (sem engine ainda)
        const map = {
          INDIVIDUAL: ['wallet', 'transfer', 'bill_payments', 'airtime', 'history', 'profile'],
          MERCHANT: ['wallet', 'merchant_dashboard', 'cashier', 'payments', 'settlements', 'sales_reports', 'history', 'profile'],
          BUSINESS: ['wallet', 'business_dashboard', 'multi_user', 'budgets', 'approvals', 'reports', 'history', 'profile']
        };

        return (map[account.account_type] || []).includes(module);
      },
      
      getModules: () => {
        const map = {
          INDIVIDUAL: ['wallet', 'transfer', 'bill_payments', 'airtime', 'history', 'profile'],
          MERCHANT: ['wallet', 'merchant_dashboard', 'cashier', 'payments', 'settlements', 'sales_reports', 'history', 'profile'],
          BUSINESS: ['wallet', 'business_dashboard', 'multi_user', 'budgets', 'approvals', 'reports', 'history', 'profile']
        };
        return map[account.account_type] || [];
      }
    },

    // Metadata para UI
    ui: {
      dashboardType: account.account_type.toLowerCase(),
      features: {
        INDIVIDUAL: ['wallet', 'transfer', 'payments'],
        MERCHANT: ['wallet', 'pos', 'cashier', 'payments', 'settlements'],
        BUSINESS: ['wallet', 'budgets', 'approvals', 'reports']
      }[account.account_type] || []
    }
  };
}

module.exports = { buildSessionContext };
