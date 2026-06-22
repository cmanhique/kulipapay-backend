const { prisma } = require('../../prisma');

class RiskEngine {
  constructor() {
    this.prisma = prisma;
  }

  async check(kp_id, amount) {
    let score = 0;
    const reasons = [];

    // 1. Verificar sessões recentes
    const recentSessions = await this.prisma.session.count({
      where: {
        kp_id,
        created_at: {
          gte: new Date(Date.now() - 10 * 60 * 1000)
        }
      }
    });

    if (recentSessions >= 3) {
      score += 40;
      reasons.push('Multiple sessions in 10 minutes');
    }

    // 2. Verificar valor da transação
    if (amount > 1000) {
      score += 30;
      reasons.push('Large transaction amount');
    }

    if (amount > 5000) {
      score += 50;
      reasons.push('Very large transaction amount');
    }

    // 3. Verificar volume diário
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyVolume = await this.prisma.transactionLedger.aggregate({
      where: {
        kp_id,
        type: 'DEBIT',
        status: 'CONFIRMED',
        created_at: { gte: today }
      },
      _sum: { amount: true }
    });

    const dailyTotal = Number(dailyVolume._sum.amount || 0);
    if (dailyTotal + amount > 50000) {
      score += 50;
      reasons.push('Daily limit approaching');
    }

    // 4. Classificação final
    let level = 'LOW';
    if (score >= 80) {
      level = 'HIGH';
    } else if (score >= 40) {
      level = 'MEDIUM';
    }

    // 5. Atualizar risk score
    await this.prisma.riskScore.upsert({
      where: { kp_id },
      update: {
        score: score,
        level: level,
        updated_at: new Date()
      },
      create: {
        kp_id,
        score: score,
        level: level
      }
    });

    // 6. Criar alerta se necessário
    if (score >= 40) {
      await this.prisma.fraudAlert.create({
        data: {
          kp_id,
          type: 'AUTOMATIC',
          severity: level,
          details: {
            score,
            reasons,
            amount,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // 7. Bloquear se HIGH
    if (level === 'HIGH') {
      throw new Error('Transaction blocked by risk engine');
    }

    return { score, level, reasons };
  }
}

module.exports = RiskEngine;
