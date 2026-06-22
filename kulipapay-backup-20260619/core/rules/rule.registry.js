/**
 * RULE REGISTRY
 * 
 * 🎯 Registo central de regras dinâmicas
 * 
 * Pode ser populado via:
 * 1. Configuração estática
 * 2. Banco de dados
 * 3. Admin panel
 */

const DynamicRule = require('./dynamic.rule');

class RuleRegistry {
  
  constructor() {
    this.rules = [];
    this.loadDefaultRules();
  }
  
  /**
   * Carregar regras padrão
   */
  loadDefaultRules() {
    // Regra: Bloquear se KYC não for aprovado (já existe no Policy Engine)
    // Regra: Bloquear se saldo for insuficiente (já existe)
    // Regras específicas para tenants podem ser adicionadas aqui
    
    // Exemplo: Regra para merchant com alto risco
    this.register({
      name: 'HighRiskMerchantRule',
      priority: 45,
      breaksFlow: true,
      enabled: false, // Desativado por padrão
      condition: (context) => {
        // Exemplo: bloquear se merchant tem score de risco alto
        const riskScore = context.extra?.riskScore || 0;
        return riskScore < 70;
      },
      action: 'DENY',
      reason: 'HIGH_RISK_MERCHANT',
      metadata: {
        category: 'risk',
        severity: 'high'
      }
    });
  }
  
  /**
   * Registar uma nova regra
   */
  register(config) {
    const rule = new DynamicRule(config);
    this.rules.push(rule);
    // Reordenar por prioridade
    this.rules.sort((a, b) => a.priority - b.priority);
    return rule;
  }
  
  /**
   * Obter todas as regras ativas
   */
  getActiveRules() {
    return this.rules.filter(rule => rule.enabled);
  }
  
  /**
   * Obter todas as regras (incluindo desativadas)
   */
  getAllRules() {
    return this.rules;
  }
  
  /**
   * Ativar/desativar uma regra
   */
  setRuleEnabled(name, enabled) {
    const rule = this.rules.find(r => r.name === name);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
  
  /**
   * Remover uma regra
   */
  removeRule(name) {
    const index = this.rules.findIndex(r => r.name === name);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Carregar regras do banco de dados
   */
  async loadFromDatabase() {
    // TODO: Implementar quando modelo de regras existir
    // const rules = await prisma.rule.findMany({ where: { enabled: true } });
    // rules.forEach(rule => this.register(rule));
  }
}

module.exports = new RuleRegistry();
