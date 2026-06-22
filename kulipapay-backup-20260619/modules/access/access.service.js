/**
 * ACCESS SERVICE
 * 
 * 🎯 Motor de decisão de acesso isolado
 * 
 * Princípios:
 * 1. Totalmente independente do Identity
 * 2. Apenas avalia regras
 * 3. Retorna decisão consistente
 */

const AccountRule = require('./rules/account.rule');
const KYCRule = require('./rules/kyc.rule');
const ModuleRule = require('./rules/module.rule');

class AccessService {
  
  /**
   * Avaliar se uma ação é permitida
   */
  async evaluate(context, module, action) {
    const rules = [];
    
    // 1. REGRA: Conta (prioridade 5)
    const accountResult = AccountRule.evaluate(context);
    rules.push({
      name: 'AccountRule',
      priority: 5,
      result: accountResult
    });
    
    if (!accountResult.allowed) {
      return this.buildDecision(false, rules);
    }
    
    // 2. REGRA: KYC (prioridade 10)
    const kycResult = KYCRule.evaluate(context);
    rules.push({
      name: 'KYCRule',
      priority: 10,
      result: kycResult
    });
    
    if (!kycResult.allowed) {
      return this.buildDecision(false, rules);
    }
    
    // 3. REGRA: Módulo (prioridade 20)
    const moduleResult = ModuleRule.evaluate(context, module, action);
    rules.push({
      name: 'ModuleRule',
      priority: 20,
      result: moduleResult
    });
    
    if (!moduleResult.allowed) {
      return this.buildDecision(false, rules);
    }
    
    // TODAS AS REGRAS PASSARAM
    return this.buildDecision(true, rules);
  }
  
  /**
   * Construir decisão padronizada
   */
  buildDecision(allowed, rules) {
    const deniedRule = rules.find(r => !r.result.allowed);
    
    return {
      allowed: allowed,
      reason: deniedRule?.result?.reason || null,
      metadata: deniedRule?.result?.metadata || {},
      rules: rules,
      decision: allowed ? 'ALLOW' : 'DENY',
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Avaliar múltiplas ações
   */
  async evaluateBatch(context, actions) {
    const results = {};
    
    for (const { module, action } of actions) {
      results[`${module}:${action}`] = await this.evaluate(context, module, action);
    }
    
    return results;
  }
}

module.exports = new AccessService();
