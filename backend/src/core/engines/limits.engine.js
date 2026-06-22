const { prisma } = require('../../prisma');

class LimitsEngine {
  constructor() {
    this.dailyLimit = 50000;
    this.transactionLimit = 10000;
    this.monthlyLimit = 500000;
  }

  async check(kp_id, amount) {
    if (!kp_id) {
      throw new Error('kp_id is required');
    }

    const transferAmount = Number(amount);

    // 1. Limite por transação
    if (transferAmount > this.transactionLimit) {
      throw new Error(`Transaction limit exceeded: ${transferAmount} > ${this.transactionLimit}`);
    }

    // 2. Limite diário
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
    if (dailyTotal + transferAmount > this.dailyLimit) {
      throw new Error(`Daily limit exceeded: ${dailyTotal + transferAmount} > ${this.dailyLimit}`);
    }

    // 3. Limite mensal
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
    if (monthlyTotal + transferAmount > this.monthlyLimit) {
      throw new Error(`Monthly limit exceeded: ${monthlyTotal + transferAmount} > ${this.monthlyLimit}`);
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

module.exports = LimitsEngine;
