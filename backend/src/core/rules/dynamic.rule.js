/**
 * DYNAMIC RULE
 * 
 * 🎯 Regras configuráveis por tenant via banco de dados
 * 
 * Estrutura da regra:
 * {
 *   name: string,
 *   enabled: boolean,
 *   priority: number,
 *   condition: string,  // expressão ou função
 *   action: string,     // ALLOW | DENY
 *   reason: string,
 *   metadata: object
 * }
 */

class DynamicRule {
  
  constructor(config) {
    this.name = config.name || 'DynamicRule';
    this.priority = config.priority || 50;
    this.breaksFlow = config.breaksFlow || false;
    this.enabled = config.enabled !== false;
    this.condition = config.condition;
    this.action = config.action || 'DENY';
    this.reason = config.reason || 'DYNAMIC_RULE_VIOLATED';
    this.metadata = config.metadata || {};
  }
  
  /**
   * Avaliar a regra
   */
  evaluate(context) {
    if (!this.enabled) {
      return {
        name: this.name,
        allowed: true,
        reason: null,
        metadata: { enabled: false }
      };
    }
    
    // Avaliar condição (se for uma função)
    let result = false;
    try {
      if (typeof this.condition === 'function') {
        result = this.condition(context);
      } else if (typeof this.condition === 'string') {
        // Avaliar expressão (exemplo simples)
        result = this.evaluateExpression(this.condition, context);
      } else {
        result = this.condition || false;
      }
    } catch (error) {
      result = false;
    }
    
    if (!result) {
      return {
        name: this.name,
        allowed: this.action === 'ALLOW',
        reason: this.reason,
        metadata: {
          ...this.metadata,
          condition: this.condition,
          evaluated: result
        }
      };
    }
    
    return {
      name: this.name,
      allowed: true,
      reason: null,
      metadata: {
        ...this.metadata,
        condition: this.condition,
        evaluated: result
      }
    };
  }
  
  /**
   * Avaliar expressão simples
   */
  evaluateExpression(expression, context) {
    // Exemplo: "account.kyc_status === 'APPROVED'"
    // Implementação simples - usar em produção com segurança
    try {
      const fn = new Function('context', `return ${expression}`);
      return fn(context);
    } catch (error) {
      return false;
    }
  }
}

module.exports = DynamicRule;
