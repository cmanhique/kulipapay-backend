/**
 * POLICY ROUTES
 * 
 * 🎯 Rotas para avaliação de políticas
 */

const PolicyController = require('./policy.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

async function policyRoutes(fastify) {
  
  /**
   * POST /api/v2/policy/evaluate
   * Avalia uma ação
   */
  fastify.post('/evaluate', {
    preHandler: authenticate
  }, PolicyController.evaluate);
  
  /**
   * POST /api/v2/policy/evaluate/batch
   * Avalia múltiplas ações
   */
  fastify.post('/evaluate/batch', {
    preHandler: authenticate
  }, PolicyController.evaluateBatch);
}

module.exports = policyRoutes;
