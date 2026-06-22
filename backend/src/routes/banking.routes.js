const BankingController = require('../controllers/banking.controller');

async function bankingRoutes(fastify, options) {
  
  // Todas as rotas exigem autenticação
  fastify.addHook('preHandler', fastify.authenticate);

  // Cash In
  fastify.post('/cash-in', async (request, reply) => {
    try {
      const { agentKpId, customerKpId, amount, agentPin } = request.body;
      
      const result = await BankingController.cashIn(agentKpId, customerKpId, amount, agentPin);
      
      reply.status(200).send(result);
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Cash Out
  fastify.post('/cash-out', async (request, reply) => {
    try {
      const { agentKpId, customerKpId, amount, agentPin } = request.body;
      
      const result = await BankingController.cashOut(agentKpId, customerKpId, amount, agentPin);
      
      reply.status(200).send(result);
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Estatísticas
  fastify.get('/stats/:agentKpId', async (request, reply) => {
    try {
      const { agentKpId } = request.params;
      
      const stats = await BankingController.getStats(agentKpId);
      
      reply.status(200).send(stats);
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports = bankingRoutes;
