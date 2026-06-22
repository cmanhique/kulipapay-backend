/**
 * LIMITS RULE
 * 
 * Verifica se os limites estão a ser respeitados
 * 
 * Prioridade: 30 (executa depois do módulo)
 * Breaks flow: NÃO (avalia, mas não bloqueia a cadeia)
 */

class LimitsRule {
  
  constructor() {
    this.name = 'LimitsRule';
    this.priority = 30;
    this.breaksFlow = false;
  }
  
  evaluate(context) {
    const limits = context.access.limits || {};
    const wallet = context.wallet || {};
    const action = context.action;
    
    // Verificar limites específicos por ação
    const limitResults = [];
    
    // Exemplo: verificar saldo mínimo para transferências
    if (action.module === 'transfer' && action.action === 'send') {
      const minBalance = 100; // Saldo mínimo para transferir
      if (wallet.balance < minBalance) {
        return {
          name: this.name,
          allowed: false,
          reason: 'INSUFFICIENT_BALANCE',
          metadata: {
            required: minBalance,
            current: wallet.balance
          }
        };
      }
    }
    
    // Limite diário (exemplo - seria buscado do banco)
    // TODO: Buscar transações do dia e verificar limite
    
    return {
      name: this.name,
      allowed: true,
      reason: null,
      metadata: {
        limits: limits,
        walletBalance: wallet.balance
      }
    };
  }
}

module.exports = new LimitsRule();
