/**
 * BOOTSTRAP ROUTES
 * 
 * 🎯 Rotas de bootstrap
 */

const BootstrapController = require('./bootstrap.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

async function bootstrapRoutes(fastify) {
  
  /**
   * GET /api/v2/bootstrap
   * Retorna todos os dados para o frontend
   */
  fastify.get('/', {
    preHandler: authenticate
  }, BootstrapController.getBootstrap);
}

module.exports = bootstrapRoutes;
