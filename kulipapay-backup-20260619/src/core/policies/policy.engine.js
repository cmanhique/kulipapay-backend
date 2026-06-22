/**
 * POLICY ENGINE
 * 
 * 🎯 Motor central de decisão de políticas
 * 
 * Princípios:
 * 1. Avaliação em cadeia (chain of responsibility)
 * 2. Prioridade por regra
 * 3. Decisão final = AND lógico de todas as regras
 * 4. Primeiro "DENY" interrompe a cadeia
 */

const AccountRule = require('./rules/account.rule');
const KYCRule = require('./rules/kyc.rule');
const ModuleRule = require('./rules/module.rule');

// Registry de regras
const RULE_REGISTRY = [
  new AccountRule(),
  new KYCRule(),
  new ModuleRule()
];

// Ordenar por prioridade (menor = executa primeiro)
const SORTED_RULES = RULE_REGISTRY.sort((a, b) => a.getPriority() - b.getPriority());

class PolicyEngine {
  
  /**
   * Avaliar uma ação com base no contexto
   * 
   * @param {Object} context
   * @param {Object} context.account - Conta do utilizador
   * @param {String} context.module - Módulo a aceder
   * @param {String} context.action - Ação a executar
   * @param {Object} context.extra - Dados adicionais (ip, device, etc)
   * 
   * @returns {Object} { allowed, reason, metadata, rules }
   */
  static evaluate(context) {
    // Preparar contexto enriquecido
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString()
    };
    
    // Executar todas as regras em ordem de prioridade
    let finalDecision = {
      allowed: true,
      reason: null,
      metadata: {},
      rules: []
    };
    
    for (const rule of SORTED_RULES) {
      if (!rule.isEnabled()) continue;
      
      try {
        const result = rule.evaluate(enrichedContext);
        
        // Adicionar ao histórico de regras
        finalDecision.rules.push({
          name: rule.constructor.name,
          priority: rule.getPriority(),
          result: result
        });
        
        // Se alguma regra negar, interrompe a cadeia
        if (!result.allowed) {
          finalDecision.allowed = false;
          finalDecision.reason = result.reason;
          finalDecision.metadata = result.metadata || {};
          break; // Chain break - primeiro DENY ganha
        }
      } catch (error) {
        // Erro na regra - nega por segurança
        finalDecision.allowed = false;
        finalDecision.reason = 'INTERNAL_ERROR';
        finalDecision.metadata = {
          error: error.message,
          rule: rule.constructor.name
        };
        break;
      }
    }
    
    // Adicionar metadados da decisão
    finalDecision.decision = finalDecision.allowed ? 'ALLOW' : 'DENY';
    finalDecision.timestamp = new Date().toISOString();
    
    return finalDecision;
  }
  
  /**
   * Registrar uma nova regra
   */
  static registerRule(rule) {
    RULE_REGISTRY.push(rule);
    // Reordenar
    RULE_REGISTRY.sort((a, b) => a.getPriority() - b.getPriority());
  }
  
  /**
   * Obter todas as regras registradas
   */
  static getRules() {
    return RULE_REGISTRY.map(rule => ({
      name: rule.constructor.name,
      priority: rule.getPriority(),
      enabled: rule.isEnabled()
    }));
  }
}

module.exports = PolicyEngine;
