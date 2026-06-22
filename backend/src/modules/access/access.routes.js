/**
 * ACCESS ROUTES
 * 
 * 🎯 Rotas para avaliação de acesso
 */

const AccessController = require('./access.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

async function accessRoutes(fastify) {
  
  /**
   * POST /api/v2/access/evaluate
   * Avalia se uma ação é permitida
   */
  fastify.post('/evaluate', {
    preHandler: authenticate
  }, AccessController.evaluate);
  
  /**
   * POST /api/v2/access/evaluate/batch
   * Avalia múltiplas ações
   */
  fastify.post('/evaluate/batch', {
    preHandler: authenticate
  }, AccessController.evaluateBatch);
}

module.exports = accessRoutes;
