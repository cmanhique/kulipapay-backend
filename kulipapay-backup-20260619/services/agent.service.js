const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const LedgerService = require('./ledger.service');

class AgentService {
  
  static async getAgentDashboard(agentKpId) {
    const floatBalance = await prisma.agentFloatBalance.findUnique({
      where: { agentKpId }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.agentCashTransaction.findMany({
      where: {
        agentKpId,
        createdAt: { gte: today },
        status: 'COMPLETED'
      }
    });

    const limits = await this.getAgentLimits(agentKpId);
    const dailyVolume = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      balances: {
        float: Number(floatBalance?.floatBalance || 0),
        cash: Number(floatBalance?.cashBalance || 0),
        commission: Number(floatBalance?.commissionBalance || 0)
      },
      today: {
        transactions: todayTransactions.length,
        cashIn: todayTransactions
          .filter(t => t.transactionType === 'CASH_IN')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        cashOut: todayTransactions
          .filter(t => t.transactionType === 'CASH_OUT')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        profit: todayTransactions.reduce((sum, t) => sum + Number(t.commission), 0)
      },
      limits: {
        dailyLimit: limits.dailyLimit,
        dailyRemaining: limits.dailyLimit - dailyVolume,
        transactionLimit: limits.transactionLimit,
        dailyVolume
      }
    };
  }

  static async getAgentLimits(agentKpId) {
    const agent = await prisma.agent.findUnique({
      where: { kpId: agentKpId }
    });

    return {
      dailyLimit: 500000, // 500k MZN por dia
      transactionLimit: 50000, // 50k MZN por transação
      monthlyLimit: 5000000 // 5M MZN por mês
    };
  }

  static async requestLiquidity(agentKpId, amount) {
    const request = await prisma.liquidityRequest.create({
      data: {
        agentKpId,
        amount,
        status: 'PENDING'
      }
    });
    return request;
  }

  static async getLiquidityRequests(agentKpId) {
    const requests = await prisma.liquidityRequest.findMany({
      where: { agentKpId },
      orderBy: { createdAt: 'desc' }
    });
    return requests;
  }
}

module.exports = AgentService;
