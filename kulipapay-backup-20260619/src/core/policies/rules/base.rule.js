/**
 * BASE RULE
 * 
 * Classe base para todas as regras
 * 
 * Cada regra deve implementar:
 * - evaluate(context) → { allowed, reason, metadata }
 * - getPriority() → número (menor = executado primeiro)
 */

class BaseRule {
  
  constructor() {
    this.priority = 100; // Prioridade padrão
    this.enabled = true;
  }
  
  /**
   * Avaliar a regra
   * @param {Object} context - Contexto da avaliação
   * @returns {Object} { allowed, reason, metadata }
   */
  evaluate(context) {
    throw new Error('evaluate() must be implemented by subclass');
  }
  
  /**
   * Obter prioridade da regra
   * @returns {Number} Prioridade (menor = executa primeiro)
   */
  getPriority() {
    return this.priority;
  }
  
  /**
   * Verificar se a regra está ativa
   * @returns {Boolean}
   */
  isEnabled() {
    return this.enabled;
  }
  
  /**
   * Ativar/desativar regra
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

module.exports = BaseRule;
