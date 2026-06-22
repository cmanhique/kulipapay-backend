const { prisma } = require('../prisma');

class BankingService {
  
  async cashIn(agentKpId, customerKpId, amount, agentPin) {
    if (!agentKpId || !customerKpId || !amount || amount <= 0) {
      throw new Error('Dados inválidos');
    }

    const agent = await prisma.account.findUnique({
      where: { kp_id: agentKpId }
    });

    if (!agent || agent.pin !== agentPin) {
      throw new Error('PIN do agente inválido');
    }

    if (!agent.isAgent) {
      throw new Error('Usuário não é agente');
    }

    const customer = await prisma.account.findUnique({
      where: { kp_id: customerKpId }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    const commission = amount * 0.015;
    const fee = amount * 0.005;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.agentCashTransaction.create({
        data: {
          agentKpId,
          customerKpId,
          type: 'CASH_IN',
          amount,
          fee,
          commission,
          status: 'COMPLETED',
          agentConfirmed: true,
          customerConfirmed: true,
          transactionRef: `CI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          completedAt: new Date()
        }
      });

      await tx.wallet.update({
        where: { kp_id: customerKpId },
        data: { balance: { increment: amount } }
      });

      await tx.agentFloatBalance.upsert({
        where: { agentKpId },
        update: {
          cashBalance: { increment: amount },
          commissionBalance: { increment: commission }
        },
        create: {
          agentKpId,
          floatBalance: 0,
          cashBalance: amount,
          commissionBalance: commission
        }
      });

      return transaction;
    });

    return {
      success: true,
      message: 'Cash In realizado com sucesso',
      data: result
    };
  }

  async cashOut(agentKpId, customerKpId, amount, agentPin) {
    if (!agentKpId || !customerKpId || !amount || amount <= 0) {
      throw new Error('Dados inválidos');
    }

    const agent = await prisma.account.findUnique({
      where: { kp_id: agentKpId }
    });

    if (!agent || agent.pin !== agentPin) {
      throw new Error('PIN do agente inválido');
    }

    if (!agent.isAgent) {
      throw new Error('Usuário não é agente');
    }

    const customer = await prisma.account.findUnique({
      where: { kp_id: customerKpId },
      include: { wallet: true }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    if (!customer.wallet || customer.wallet.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    const commission = amount * 0.02;
    const fee = amount * 0.005;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.agentCashTransaction.create({
        data: {
          agentKpId,
          customerKpId,
          type: 'CASH_OUT',
          amount,
          fee,
          commission,
          status: 'COMPLETED',
          agentConfirmed: true,
          customerConfirmed: true,
          transactionRef: `CO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          completedAt: new Date()
        }
      });

      await tx.wallet.update({
        where: { kp_id: customerKpId },
        data: { balance: { decrement: amount } }
      });

      await tx.agentFloatBalance.upsert({
        where: { agentKpId },
        update: {
          cashBalance: { increment: amount },
          commissionBalance: { increment: commission }
        },
        create: {
          agentKpId,
          floatBalance: 0,
          cashBalance: amount,
          commissionBalance: commission
        }
      });

      return transaction;
    });

    return {
      success: true,
      message: 'Cash Out realizado com sucesso',
      data: result
    };
  }

  async getAgentStats(agentKpId) {
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

    return {
      success: true,
      data: {
        floatBalance: floatBalance?.floatBalance || 0,
        cashBalance: floatBalance?.cashBalance || 0,
        commissionBalance: floatBalance?.commissionBalance || 0,
        todayTransactions: todayTransactions.length,
        todayCashIn: todayTransactions
          .filter(t => t.type === 'CASH_IN')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        todayCashOut: todayTransactions
          .filter(t => t.type === 'CASH_OUT')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        todayProfit: todayTransactions.reduce((sum, t) => sum + Number(t.commission), 0)
      }
    };
  }
}

module.exports = new BankingService();