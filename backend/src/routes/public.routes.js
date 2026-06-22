/**
 * PUBLIC ROUTES
 * 
 * 🌐 Rotas públicas que não precisam de autenticação
 */

const BootstrapPublicController = require('../modules/bootstrap/bootstrap.public.controller');

async function publicRoutes(fastify) {
  /**
   * GET /api/public/bootstrap
   * Dados públicos do app
   */
  fastify.get('/bootstrap', BootstrapPublicController.getPublicBootstrap);

  /**
   * GET /api/public/status
   * Status do sistema
   */
  fastify.get('/status', async (req, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        status: 'operational',
        version: '2.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  });

  /**
   * GET /api/public/health
   * Health check público
   */
  fastify.get('/health', async (req, reply) => {
    return reply.status(200).send({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = publicRoutes;
