const { prisma } = require('../prisma');

class AgentReportService {

  static async getExecutiveSummary(agentKpId) {
    const agent = await prisma.agent.findUnique({
      where: { kp_id: agentKpId }
    });

    if (!agent) throw new Error('AGENT_NOT_FOUND');

    const transactions = await prisma.transactionLedger.findMany({
      where: {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    const totalVolume = transactions.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const cashIn = transactions.filter(t => t.type === 'AGENT_CASH_IN');
    const cashOut = transactions.filter(t => t.type === 'AGENT_CASH_OUT');

    return {
      success: true,
      data: {
        summary: {
          totalTransactions: transactions.length,
          totalVolume,
          cashIn: cashIn.reduce((s, t) => s + Number(t.amount), 0),
          cashOut: cashOut.reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
          currentBalance: Number(agent.float_balance || 0),
          agentStatus: agent.status
        },
        agent: {
          kp_id: agent.kp_id,
          business_name: agent.business_name,
          phone: agent.phone
        },
        recent_transactions: transactions.slice(0, 10)
      }
    };
  }

  static async getDailyReport(agentKpId, date) {
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);

    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transactionLedger.findMany({
      where: {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        },
        created_at: {
          gte: target,
          lte: end
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

    return {
      success: true,
      data: {
        date: target.toISOString().split('T')[0],
        totalTransactions: transactions.length,
        totalVolume: total,
        transactions
      }
    };
  }

  static async getCommissionReport(agentKpId) {
    const transactions = await prisma.transactionLedger.findMany({
      where: {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        }
      }
    });

    const commissions = transactions.reduce((sum, t) => {
      return sum + Number(t.metadata?.commission || 0);
    }, 0);

    return {
      success: true,
      data: {
        totalCommissions: commissions,
        transactionsCount: transactions.length
      }
    };
  }

  static async getStatement(agentKpId) {
    const transactions = await prisma.transactionLedger.findMany({
      where: {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return {
      success: true,
      data: {
        transactions
      }
    };
  }
}

module.exports = AgentReportService;