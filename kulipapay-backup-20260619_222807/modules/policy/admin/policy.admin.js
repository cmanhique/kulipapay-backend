/**
 * POLICY ADMIN
 * 
 * 🎯 Endpoints de administração do Policy Engine
 */

const PolicyEngine = require('../engine/policy.engine');
const RuleRegistry = require('../../../core/rules/rule.registry');

class PolicyAdmin {
  
  /**
   * GET /policy/admin/rules
   * Listar todas as regras
   */
  async getRules(req, reply) {
    const rules = RuleRegistry.getAllRules().map(rule => ({
      name: rule.name,
      priority: rule.priority,
      enabled: rule.enabled,
      breaksFlow: rule.breaksFlow,
      action: rule.action,
      reason: rule.reason,
      metadata: rule.metadata
    }));
    
    return reply.send({
      success: true,
      data: { rules }
    });
  }
  
  /**
   * POST /policy/admin/rules/:name/toggle
   * Ativar/desativar uma regra
   */
  async toggleRule(req, reply) {
    const { name } = req.params;
    const { enabled } = req.body;
    
    const result = RuleRegistry.setRuleEnabled(name, enabled);
    
    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: `Rule ${name} not found`
        }
      });
    }
    
    // Invalidar cache de todos os utilizadores
    await PolicyEngine.invalidateCache('*');
    
    return reply.send({
      success: true,
      data: {
        name,
        enabled,
        message: `Rule ${name} ${enabled ? 'enabled' : 'disabled'}`
      }
    });
  }
  
  /**
   * POST /policy/admin/cache/invalidate
   * Invalidar cache de um utilizador
   */
  async invalidateCache(req, reply) {
    const { kp_id } = req.body;
    
    if (!kp_id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'KP_ID_REQUIRED',
          message: 'kp_id is required'
        }
      });
    }
    
    await PolicyEngine.invalidateCache(kp_id);
    
    return reply.send({
      success: true,
      data: {
        kp_id,
        message: `Cache invalidated for ${kp_id}`
      }
    });
  }
  
  /**
   * POST /policy/admin/rules/reload
   * Recarregar regras do banco de dados
   */
  async reloadRules(req, reply) {
    await PolicyEngine.reloadRules();
    
    return reply.send({
      success: true,
      data: {
        message: 'Rules reloaded from database'
      }
    });
  }
}

module.exports = new PolicyAdmin();
