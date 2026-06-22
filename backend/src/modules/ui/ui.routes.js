/**
 * UI ROUTES
 * 
 * 🎯 Rotas para contexto de UI
 */

const { authenticate } = require('../../middlewares/auth.middleware');
const UIController = require('./ui.controller');

async function uiRoutes(fastify) {
  
  /**
   * GET /api/v2/ui/context
   * Retorna contexto de UI para o utilizador autenticado
   */
  fastify.get('/context', {
    preHandler: authenticate
  }, UIController.getContext);
  
}

module.exports = uiRoutes;
