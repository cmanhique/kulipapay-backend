/**
 * ADMIN ANALYTICS ROUTES
 * 
 * 🎯 Endpoints para dashboards enterprise
 */

const { authenticate } = require('../../middlewares/auth.middleware');
const AnalyticsService = require('../../services/admin/analytics.service');

async function adminAnalyticsRoutes(fastify) {
  
  // Dashboard executivo (tudo)
  fastify.get('/admin/dashboard/executive', { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await AnalyticsService.getExecutiveDashboard();
      return { success: true, data };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // KPIs Financeiros
  fastify.get('/admin/dashboard/financial', { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await AnalyticsService.getFinancialMetrics();
      return { success: true, data };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // KPIs Operacionais
  fastify.get('/admin/dashboard/operational', { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await AnalyticsService.getOperationalMetrics();
      return { success: true, data };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // KPIs de Risco
  fastify.get('/admin/dashboard/risk', { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await AnalyticsService.getRiskMetrics();
      return { success: true, data };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // Estado do Sistema
  fastify.get('/admin/dashboard/system', { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await AnalyticsService.getSystemStatus();
      return { success: true, data };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // Ledger Reconciliation
  fastify.get('/admin/dashboard/ledger', { preHandler: authenticate }, async (req, reply) => {
    try {
      const data = await AnalyticsService.getLedgerMetrics();
      return { success: true, data };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = adminAnalyticsRoutes;
