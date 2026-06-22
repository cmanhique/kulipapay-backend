/**
 * POLICY ADMIN ROUTES
 * 
 * 🎯 Rotas de administração do Policy Engine
 */

const PolicyAdmin = require('./policy.admin');
const { authenticate } = require('../../../middlewares/auth.middleware');
const { requireModule } = require('../../../middlewares/permission.middleware');

async function policyAdminRoutes(fastify) {
  
  /**
   * GET /api/v2/policy/admin/rules
   * Listar todas as regras
   */
  fastify.get('/admin/rules', {
    preHandler: [authenticate, requireModule('admin')]
  }, PolicyAdmin.getRules);
  
  /**
   * POST /api/v2/policy/admin/rules/:name/toggle
   * Ativar/desativar uma regra
   */
  fastify.post('/admin/rules/:name/toggle', {
    preHandler: [authenticate, requireModule('admin')]
  }, PolicyAdmin.toggleRule);
  
  /**
   * POST /api/v2/policy/admin/cache/invalidate
   * Invalidar cache
   */
  fastify.post('/admin/cache/invalidate', {
    preHandler: [authenticate, requireModule('admin')]
  }, PolicyAdmin.invalidateCache);
  
  /**
   * POST /api/v2/policy/admin/rules/reload
   * Recarregar regras
   */
  fastify.post('/admin/rules/reload', {
    preHandler: [authenticate, requireModule('admin')]
  }, PolicyAdmin.reloadRules);
}

module.exports = policyAdminRoutes;
