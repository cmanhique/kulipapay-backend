const { authenticate } = require('../../middlewares/auth.middleware');
const IdentityController = require('./identity.controller');

async function identityRoutes(fastify) {

  // GET /me - Dados completos do utilizador
  fastify.get('/me', { preHandler: authenticate }, IdentityController.getMe);
  
  // GET /basic - Dados básicos (para auth checks rápidos)
  fastify.get('/basic', { preHandler: authenticate }, IdentityController.getBasic);
  
  // POST /evaluate - Avaliar permissão para uma ação
  fastify.post('/evaluate', { preHandler: authenticate }, IdentityController.evaluateAction);

}

module.exports = identityRoutes;
