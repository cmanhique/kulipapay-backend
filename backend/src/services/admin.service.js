const { prisma } = require('../prisma');

// Constante para status de transações - baseado no schema real
const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  HELD: 'HELD',
  RESERVED: 'RESERVED',
  SETTLED: 'SETTLED',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVERSED: 'REVERSED',
  RECEIVER_PENDING: 'RECEIVER_PENDING',
  RECEIVER_ACCEPTED: 'RECEIVER_ACCEPTED'
};

class AdminService {

  // =========================
  // LISTAR TODOS OS AGENTES
  // =========================
  static async getAgents(filters = {}) {
    const { status, search, limit = 50, offset = 0 } = filters;

    const where = {};
    
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { business_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { kp_id: { contains: search } }
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          account: {
            select: {
              name: true,
              email: true,
              phone: true,
              status: true,
              created_at: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.agent.count({ where })
    ]);

    // Calcular estatísticas para cada agente usando transações
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        // Buscar transações do agente - usar SETTLED
        const transactions = await prisma.transaction.findMany({
          where: {
            OR: [
              { from_kp: agent.kp_id },
              { to_kp: agent.kp_id }
            ],
            status: TRANSACTION_STATUS.SETTLED
          }
        });

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const todayTransactions = transactions.filter(t => 
          new Date(t.created_at) >= today
        );

        const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const todayVolume = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          kp_id: agent.kp_id,
          business_name: agent.business_name,
          phone: agent.phone,
          email: agent.email,
          status: agent.status,
          created_at: agent.created_at,
          float_balance: 0,
          commission_balance: 0,
          today: {
            transactions: todayTransactions.length,
            volume: todayVolume,
            commission: 0
          },
          total: {
            transactions: transactions.length,
            volume: totalVolume,
            commission: 0
          },
          account: agent.account
        };
      })
    );

    return {
      agents: agentsWithStats,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    };
  }

  // =========================
  // ESTATÍSTICAS GERAIS DOS AGENTES
  // =========================
  static async getAgentStats() {
    const [
      totalAgents,
      activeAgents,
      pendingAgents,
      totalTransactions
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { status: 'ACTIVE' } }),
      prisma.agent.count({ where: { status: 'PENDING_KYC' } }),
      prisma.transaction.count({
        where: { status: TRANSACTION_STATUS.SETTLED }
      })
    ]);

    // Calcular volume total de transações
    const volumeAgg = await prisma.transaction.aggregate({
      where: { status: TRANSACTION_STATUS.SETTLED },
      _sum: { amount: true }
    });

    // Calcular transações de hoje
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        created_at: { gte: today },
        status: TRANSACTION_STATUS.SETTLED
      }
    });

    const todayVolume = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalAgents,
      activeAgents,
      pendingAgents,
      totalVolume: Number(volumeAgg._sum.amount || 0),
      totalCommissions: 0,
      today: {
        transactions: todayTransactions.length,
        volume: todayVolume,
        commission: 0,
        cashIn: 0,
        cashOut: 0
      }
    };
  }

  // =========================
  // DETALHES DE UM AGENTE ESPECÍFICO
  // =========================
  static async getAgentDetails(kpId) {
    const agent = await prisma.agent.findUnique({
      where: { kp_id: kpId },
      include: {
        account: {
          select: {
            name: true,
            email: true,
            phone: true,
            status: true,
            created_at: true
          }
        }
      }
    });

    if (!agent) {
      throw new Error('AGENT_NOT_FOUND');
    }

    // Buscar transações do agente - usar SETTLED
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { from_kp: kpId },
          { to_kp: kpId }
        ],
        status: TRANSACTION_STATUS.SETTLED
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    // Estatísticas
    const cashInTotal = transactions
      .filter(t => t.to_kp === kpId)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const cashOutTotal = transactions
      .filter(t => t.from_kp === kpId)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      agent: {
        kp_id: agent.kp_id,
        business_name: agent.business_name,
        phone: agent.phone,
        email: agent.email,
        status: agent.status,
        created_at: agent.created_at,
        float_balance: 0,
        commission_balance: 0
      },
      account: agent.account,
      statistics: {
        totalTransactions: transactions.length,
        cashInTotal,
        cashOutTotal,
        totalCommission: 0,
        averageTransaction: transactions.length > 0 
          ? (cashInTotal + cashOutTotal) / transactions.length 
          : 0
      },
      recentTransactions: transactions.slice(0, 20).map(t => ({
        id: t.id,
        type: t.from_kp === kpId ? 'CASH_OUT' : 'CASH_IN',
        amount: Number(t.amount),
        commission: 0,
        customer: t.from_kp === kpId ? t.to_kp : t.from_kp,
        notes: t.metadata?.notes || '',
        createdAt: t.created_at
      }))
    };
  }

  // =========================
  // ATUALIZAR STATUS DO AGENTE
  // =========================
  static async updateAgentStatus(kpId, status, notes = '') {
    const allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_KYC', 'TERMINATED'];
    
    if (!allowed.includes(status)) {
      throw new Error('INVALID_STATUS');
    }

    const agent = await prisma.agent.findUnique({
      where: { kp_id: kpId }
    });

    if (!agent) {
      throw new Error('AGENT_NOT_FOUND');
    }

    const updated = await prisma.agent.update({
      where: { kp_id: kpId },
      data: { 
        status,
        updated_at: new Date()
      }
    });

    return updated;
  }
}

module.exports = AdminService;