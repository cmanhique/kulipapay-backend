const AgentService = require('../services/agent.service');
const { prisma } = require('../prisma');

class AgentController {
  
  // Dashboard do agente
  static async getDashboard(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const dashboard = await AgentService.getAgentDashboard(agentKpId);
      return reply.send({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: error.message
        }
      });
    }
  }

  // Cash-in: Cliente deposita dinheiro no agente
  static async cashIn(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const { customerKpId, amount, notes } = req.body;

      if (!customerKpId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_CUSTOMER',
            message: 'Customer KP ID is required'
          }
        });
      }

      if (!amount || amount <= 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than 0'
          }
        });
      }

      const result = await AgentService.cashIn({
        agentKpId,
        customerKpId,
        amount: Number(amount),
        notes
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Cash-in error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CASH_IN_ERROR',
          message: error.message
        }
      });
    }
  }

  // Cash-out: Cliente saca dinheiro do agente
  static async cashOut(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const { customerKpId, amount, notes } = req.body;

      if (!customerKpId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_CUSTOMER',
            message: 'Customer KP ID is required'
          }
        });
      }

      if (!amount || amount <= 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than 0'
          }
        });
      }

      const result = await AgentService.cashOut({
        agentKpId,
        customerKpId,
        amount: Number(amount),
        notes
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Cash-out error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CASH_OUT_ERROR',
          message: error.message
        }
      });
    }
  }

  // 🔥 CORRIGIDO: Histórico de transações via TransactionLedger
  static async getTransactions(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const { limit = 50, offset = 0, type } = req.query;

      // Buscar transações pelo metadata.agent_kp_id
      const where = {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        }
      };

      if (type) {
        where.type = type;
      }

      const [transactions, total] = await Promise.all([
        prisma.transactionLedger.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: Number(limit),
          skip: Number(offset),
        }),
        prisma.transactionLedger.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset)
          }
        }
      });
    } catch (error) {
      console.error('Transactions error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TRANSACTIONS_ERROR',
          message: error.message
        }
      });
    }
  }

  // Solicitar liquidez
  static async requestLiquidity(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const { amount, notes } = req.body;

      if (!amount || amount <= 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than 0'
          }
        });
      }

      const request = await AgentService.requestLiquidity(agentKpId, amount, notes);
      return reply.send({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Liquidity request error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIQUIDITY_REQUEST_ERROR',
          message: error.message
        }
      });
    }
  }

  // Ver solicitações de liquidez
  static async getLiquidityRequests(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const requests = await AgentService.getLiquidityRequests(agentKpId);
      return reply.send({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Liquidity requests error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIQUIDITY_REQUESTS_ERROR',
          message: error.message
        }
      });
    }
  }

  // Verificar saldo do agente
  static async getBalance(req, reply) {
    try {
      const agentKpId = req.user.kp_id;
      const balance = await AgentService.getAgentBalance(agentKpId);
      return reply.send({
        success: true,
        data: balance
      });
    } catch (error) {
      console.error('Balance error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BALANCE_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = AgentController;