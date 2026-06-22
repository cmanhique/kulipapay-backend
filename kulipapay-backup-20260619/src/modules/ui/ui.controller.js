/**
 * UI CONTROLLER
 * 
 * 🎯 Endpoint para contexto de UI
 */

const UIService = require('./ui.service');

const UIController = {
  /**
   * GET /ui/context
   * Retorna contexto de UI para o utilizador autenticado
   */
  async getContext(req, reply) {
    const account = req.user;
    
    // Buscar access do account (via Identity Facade)
    const IdentityFacade = require('../identity/identity.facade');
    const basic = await IdentityFacade.getBasic(account.kp_id);
    
    const context = await UIService.getContext(account, basic.access);
    
    return reply.send({
      success: true,
      data: context
    });
  }
};

module.exports = UIController;
