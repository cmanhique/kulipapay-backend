const { prisma } = require('../prisma');

class LimitsEngine {
  constructor() {
    this.dailyLimit = 50000;  // 50.000 MZN por dia
    this.transactionLimit = 10000; // 10.000 MZN por transação
    this.monthlyLimit = 500000; // 500.000 MZN por mês
  }

  // =========================
  // VERIFICAR LIMITES
  // =========================
  async check({ kp_id, amount }) {
    if (!kp_id) {
      throw new Error('kp_id is required');
    }

    // Verificar limite por transação
    if (Number(amount) > this.transactionLimit) {
      throw new Error(`Transaction limit exceeded: ${amount} > ${this.transactionLimit}`);
    }

    // Verificar limite diário
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyVolume = await prisma.transactionLedger.aggregate({
      where: {
        kp_id,
        type: 'DEBIT',
        status: 'CONFIRMED',
        created_at: { gte: today }
      },
      _sum: { amount: true }
    });

    const dailyTotal = Number(dailyVolume._sum.amount || 0);
    if (dailyTotal + Number(amount) > this.dailyLimit) {
      throw new Error(`Daily limit exceeded: ${dailyTotal + amount} > ${this.dailyLimit}`);
    }

    // Verificar limite mensal
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyVolume = await prisma.transactionLedger.aggregate({
      where: {
        kp_id,
        type: 'DEBIT',
        status: 'CONFIRMED',
        created_at: { gte: monthStart }
      },
      _sum: { amount: true }
    });

    const monthlyTotal = Number(monthlyVolume._sum.amount || 0);
    if (monthlyTotal + Number(amount) > this.monthlyLimit) {
      throw new Error(`Monthly limit exceeded: ${monthlyTotal + amount} > ${this.monthlyLimit}`);
    }

    return {
      approved: true,
      dailyUsed: dailyTotal,
      dailyLimit: this.dailyLimit,
      monthlyUsed: monthlyTotal,
      monthlyLimit: this.monthlyLimit,
      remainingDaily: this.dailyLimit - dailyTotal,
      remainingMonthly: this.monthlyLimit - monthlyTotal
    };
  }
}

module.exports = new LimitsEngine();
