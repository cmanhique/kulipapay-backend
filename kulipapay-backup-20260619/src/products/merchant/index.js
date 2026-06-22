/**
 * MERCHANT PRODUCT
 * Definição do produto Merchant
 */

module.exports = {
  name: 'merchant',
  displayName: 'Comerciante',
  description: 'Solução de pagamentos para comerciantes',
  
  modules: [
    'wallet',
    'merchant_dashboard',
    'cashier',
    'payments',
    'settlements',
    'sales_reports',
    'history',
    'profile'
  ],

  features: {
    cashier: {
      create: true,
      manage: true,
      block: true,
      view: true
    },
    payments: {
      process: true,
      view: true,
      refund: true,
      void: true
    },
    settlements: {
      view: true,
      schedule: true
    }
  },

  limits: {
    dailySales: 10000000,
    monthlySales: 250000000,
    maxPerTransaction: 1000000
  }
};
