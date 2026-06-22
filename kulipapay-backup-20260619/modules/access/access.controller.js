/**
 * ACCESS CONTROLLER
 * 
 * 🎯 Endpoints para avaliação de acesso
 */

const AccessService = require('./access.service');
const IdentityFacade = require('../identity/identity.facade');

class AccessController {
  
  /**
   * POST /access/evaluate
   * Avalia uma ação específica
   */
  async evaluate(req, reply) {
    const { module, action } = req.body;
    
    if (!module) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MODULE_REQUIRED',
          message: 'Module is required'
        }
      });
    }
    
    // Buscar contexto do utilizador
    const context = await IdentityFacade.getBasic(req.user.kp_id);
    
    // Avaliar acesso
    const result = await AccessService.evaluate(context, module, action);
    
    return reply.send({
      success: true,
      data: result
    });
  }
  
  /**
   * POST /access/evaluate/batch
   * Avalia múltiplas ações de uma vez
   */
  async evaluateBatch(req, reply) {
    const { actions } = req.body;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'ACTIONS_REQUIRED',
          message: 'Actions array is required'
        }
      });
    }
    
    // Buscar contexto do utilizador
    const context = await IdentityFacade.getBasic(req.user.kp_id);
    
    // Avaliar todas as ações
    const results = await AccessService.evaluateBatch(context, actions);
    
    return reply.send({
      success: true,
      data: results
    });
  }
}

module.exports = new AccessController();
