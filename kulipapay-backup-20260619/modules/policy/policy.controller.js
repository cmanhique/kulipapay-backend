/**
 * POLICY CONTROLLER
 * 
 * 🎯 Endpoints para avaliação de políticas
 */

const PolicyEngine = require('./engine/policy.engine');

class PolicyController {
  
  /**
   * POST /policy/evaluate
   * Avalia uma ação específica
   */
  async evaluate(req, reply) {
    const { module, action } = req.body;
    const kp_id = req.user.kp_id;
    
    if (!module) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MODULE_REQUIRED',
          message: 'Module is required'
        }
      });
    }
    
    const result = await PolicyEngine.evaluate(kp_id, module, action);
    
    return reply.send({
      success: true,
      data: result
    });
  }
  
  /**
   * POST /policy/evaluate/batch
   * Avalia múltiplas ações
   */
  async evaluateBatch(req, reply) {
    const { actions } = req.body;
    const kp_id = req.user.kp_id;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'ACTIONS_REQUIRED',
          message: 'Actions array is required'
        }
      });
    }
    
    const results = await PolicyEngine.evaluateBatch(kp_id, actions);
    
    return reply.send({
      success: true,
      data: results
    });
  }
}

module.exports = new PolicyController();
