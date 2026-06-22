const { prisma } = require('../prisma');

class AgentService {

  // =========================
  // DASHBOARD
  // =========================
  static async getAgentDashboard(agentKpId) {
    const agent = await prisma.agent.findUnique({
      where: { kp_id: agentKpId },
    });

    if (!agent) {
      throw new Error('Agente não encontrado');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 🔥 Buscar pelo metadata.agent_kp_id
    const transactions = await prisma.transactionLedger.findMany({
      where: {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        },
        created_at: { gte: today },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const todayVolume = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // Total volume (todos os tempos)
    const allTransactions = await prisma.transactionLedger.findMany({
      where: {
        metadata: {
          path: ['agent_kp_id'],
          equals: agentKpId
        },
      },
    });

    const totalVolume = allTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    return {
      agent: {
        kp_id: agent.kp_id,
        business_name: agent.business_name,
        phone: agent.phone,
        email: agent.email,
        status: agent.status,
        float_balance: Number(agent.float_balance),
        commission_rate: Number(agent.commission_rate),
        business_photo_url: agent.business_photo_url || null,
      },
      today: {
        transactions: transactions.length,
        volume: todayVolume,
      },
      total: {
        volume: totalVolume,
      },
      recent_transactions: transactions.slice(0, 10),
    };
  }

  // =========================
  // SALDO
  // =========================
  static async getAgentBalance(agentKpId) {
    const agent = await prisma.agent.findUnique({
      where: { kp_id: agentKpId },
    });

    if (!agent) {
      throw new Error('Agente não encontrado');
    }

    return {
      float_balance: Number(agent.float_balance),
      commission_rate: Number(agent.commission_rate),
      status: agent.status,
      business_name: agent.business_name,
    };
  }

  // =========================
  // LIMITES
  // =========================
  static async getAgentLimits() {
    return {
      dailyLimit: 500000,
      transactionLimit: 50000,
      monthlyLimit: 5000000,
    };
  }

  // =========================
  // CASH-IN
  // =========================
  static async cashIn({ agentKpId, customerKpId, amount, notes = '' }) {
    if (!agentKpId || !customerKpId) {
      throw new Error('Dados inválidos');
    }

    if (!amount || amount <= 0) {
      throw new Error('Amount deve ser positivo');
    }

    const agent = await prisma.agent.findUnique({
      where: { kp_id: agentKpId },
    });

    if (!agent) throw new Error('Agente não encontrado');
    if (agent.status !== 'ACTIVE') throw new Error('Agente não está ativo');

    const customer = await prisma.account.findUnique({
      where: { kp_id: customerKpId },
    });

    if (!customer) throw new Error('Cliente não encontrado');

    const wallet = await prisma.wallet.findUnique({
      where: { kp_id: customerKpId },
    });

    if (!wallet) throw new Error('Carteira não encontrada');

    const commissionRate = Number(agent.deposit_commission_rate || 0.025);
    const commission = amount * commissionRate;

    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { kp_id: customerKpId },
        data: {
          balance: { increment: amount },
          available_balance: { increment: amount },
          version: { increment: 1 },
        },
      });

      const ledgerEntry = await tx.transactionLedger.create({
        data: {
          kp_id: customerKpId,
          type: 'AGENT_CASH_IN',
          amount: amount,
          balance_before: wallet.balance,
          balance_after: updatedWallet.balance,
          reference: `CASH-IN-${Date.now()}`,
          status: 'COMPLETED',
          metadata: {
            agent_kp_id: agentKpId,
            customer_kp_id: customerKpId,
            commission,
            notes,
          },
        },
      });

      await tx.agent.update({
        where: { kp_id: agentKpId },
        data: {
          total_deposits_volume: { increment: amount },
          total_commission_earned: { increment: commission },
        },
      });

      return { updatedWallet, ledgerEntry };
    });

    return {
      amount,
      commission,
      commission_rate: commissionRate,
      customer_kp_id: customerKpId,
      agent_kp_id: agentKpId,
      new_balance: Number(result.updatedWallet.balance),
      ledger_entry: result.ledgerEntry,
    };
  }

  // =========================
  // CASH-OUT
  // =========================
  static async cashOut({ agentKpId, customerKpId, amount, notes = '' }) {
    if (!agentKpId || !customerKpId) {
      throw new Error('Dados inválidos');
    }

    if (!amount || amount <= 0) {
      throw new Error('Amount deve ser positivo');
    }

    const agent = await prisma.agent.findUnique({
      where: { kp_id: agentKpId },
    });

    if (!agent) throw new Error('Agente não encontrado');
    if (agent.status !== 'ACTIVE') throw new Error('Agente não está ativo');

    const customer = await prisma.account.findUnique({
      where: { kp_id: customerKpId },
    });

    if (!customer) throw new Error('Cliente não encontrado');

    const wallet = await prisma.wallet.findUnique({
      where: { kp_id: customerKpId },
    });

    if (!wallet) throw new Error('Carteira não encontrada');

    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
      throw new Error('Saldo insuficiente');
    }

    const commissionRate = Number(agent.withdrawal_commission_rate || 0.02);
    const commission = amount * commissionRate;

    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { kp_id: customerKpId },
        data: {
          balance: { decrement: amount },
          available_balance: { decrement: amount },
          version: { increment: 1 },
        },
      });

      const ledgerEntry = await tx.transactionLedger.create({
        data: {
          kp_id: customerKpId,
          type: 'AGENT_CASH_OUT',
          amount: -amount,
          balance_before: wallet.balance,
          balance_after: updatedWallet.balance,
          reference: `CASH-OUT-${Date.now()}`,
          status: 'COMPLETED',
          metadata: {
            agent_kp_id: agentKpId,
            customer_kp_id: customerKpId,
            commission,
            notes,
          },
        },
      });

      await tx.agent.update({
        where: { kp_id: agentKpId },
        data: {
          total_withdrawals_volume: { increment: amount },
          total_commission_earned: { increment: commission },
        },
      });

      return { updatedWallet, ledgerEntry };
    });

    return {
      amount,
      commission,
      commission_rate: commissionRate,
      customer_kp_id: customerKpId,
      agent_kp_id: agentKpId,
      new_balance: Number(result.updatedWallet.balance),
      ledger_entry: result.ledgerEntry,
    };
  }

  // =========================
  // LIQUIDITY (FUTURO)
  // =========================
  static async requestLiquidity() {
    throw new Error('Não implementado');
  }

  static async getLiquidityRequests() {
    throw new Error('Não implementado');
  }
}

module.exports = AgentService;