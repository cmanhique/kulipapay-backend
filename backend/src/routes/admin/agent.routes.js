const AdminController = require('../../controllers/admin.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

async function adminAgentRoutes(fastify) {
  
  // Listar todos os agentes (com filtros)
  fastify.get('/admin/agents', {
    preHandler: [authenticate, requireRole(['ADMIN'])]
  }, AdminController.getAgents);

  // Estatísticas gerais dos agentes
  fastify.get('/admin/agents/stats', {
    preHandler: [authenticate, requireRole(['ADMIN'])]
  }, AdminController.getAgentStats);

  // Detalhes de um agente específico
  fastify.get('/admin/agents/:kpId', {
    preHandler: [authenticate, requireRole(['ADMIN'])]
  }, AdminController.getAgentDetails);

  // Atualizar status de um agente
  fastify.put('/admin/agents/:kpId/status', {
    preHandler: [authenticate, requireRole(['ADMIN'])]
  }, AdminController.updateAgentStatus);
}

module.exports = adminAgentRoutes;