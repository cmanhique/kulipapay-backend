const AgentController = require('../controllers/agent.controller');
const { authenticate } = require('../middlewares/auth.middleware');

async function agentRoutes(fastify) {
  // Dashboard do agente
  fastify.get('/agent/dashboard', {
    preHandler: authenticate
  }, AgentController.getDashboard);

  // KYC - Upload da foto de negócio
  fastify.post('/agent/kyc/business-photo', {
    preHandler: authenticate
  }, async (req, reply) => {
    try {
      const { photoUrl } = req.body;
      const agentKpId = req.user.kp_id;
      const { prisma } = require('../prisma');
      
      const agent = await prisma.agent.update({
        where: { kpId: agentKpId },
        data: {
          business_photo_url: photoUrl,
          status: 'ACTIVE'
        }
      });
      
      return reply.send({
        success: true,
        data: agent,
        message: 'Foto de negócio/banco registada. Conta activada.'
      });
    } catch (error) {
      console.error('KYC error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'KYC_ERROR',
          message: error.message
        }
      });
    }
  });

  // Cash-in
  fastify.post('/agent/cash-in', {
    preHandler: authenticate
  }, AgentController.cashIn);

  // Cash-out
  fastify.post('/agent/cash-out', {
    preHandler: authenticate
  }, AgentController.cashOut);

  // Histórico de transações
  fastify.get('/agent/transactions', {
    preHandler: authenticate
  }, AgentController.getTransactions);

  // Saldo do agente
  fastify.get('/agent/balance', {
    preHandler: authenticate
  }, AgentController.getBalance);

  // Solicitar liquidez
  fastify.post('/agent/liquidity/request', {
    preHandler: authenticate
  }, AgentController.requestLiquidity);

  // Ver solicitações de liquidez
  fastify.get('/agent/liquidity/requests', {
    preHandler: authenticate
  }, AgentController.getLiquidityRequests);

  // =========================
  // RELATÓRIOS DO AGENTE
  // =========================
  const AgentReportService = require('../services/agent.report.service');

  // Relatório Diário
  fastify.get('/agent/reports/daily', {
    preHandler: authenticate
  }, async (req, reply) => {
    try {
      const agentKpId = req.user.kp_id;
      const { date } = req.query;
      const report = await AgentReportService.getDailyReport(agentKpId, date);
      return reply.send({ success: true, data: report });
    } catch (error) {
      console.error('Daily report error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: error.message
        }
      });
    }
  });

  // Relatório de Comissões
  fastify.get('/agent/reports/commissions', {
    preHandler: authenticate
  }, async (req, reply) => {
    try {
      const agentKpId = req.user.kp_id;
      const { startDate, endDate } = req.query;
      const report = await AgentReportService.getCommissionReport(agentKpId, startDate, endDate);
      return reply.send({ success: true, data: report });
    } catch (error) {
      console.error('Commission report error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: error.message
        }
      });
    }
  });

  // Extrato de Movimentos
  fastify.get('/agent/reports/statement', {
    preHandler: authenticate
  }, async (req, reply) => {
    try {
      const agentKpId = req.user.kp_id;
      const { startDate, endDate, type } = req.query;
      const report = await AgentReportService.getStatement(agentKpId, startDate, endDate, type);
      return reply.send({ success: true, data: report });
    } catch (error) {
      console.error('Statement error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: error.message
        }
      });
    }
  });

  // Sumário Executivo
  fastify.get('/agent/reports/executive', {
    preHandler: authenticate
  }, async (req, reply) => {
    try {
      const agentKpId = req.user.kp_id;
      const report = await AgentReportService.getExecutiveSummary(agentKpId);
      return reply.send({ success: true, data: report });
    } catch (error) {
      console.error('Executive summary error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: error.message
        }
      });
    }
  });
}

module.exports = agentRoutes;