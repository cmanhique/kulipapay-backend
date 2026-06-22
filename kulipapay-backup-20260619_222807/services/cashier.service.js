const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

class CashierService {
  // =========================
  // UTIL
  // =========================
  generateInviteCode() {
    return `INV-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
  }

  validateBasicData(data) {
    if (!data?.name || data.name.trim().length < 2) {
      throw new Error('INVALID_NAME');
    }
  }

  // =========================
  // CRIAR CAIXA
  // =========================
  async createCashier(merchantId, data) {
    this.validateBasicData(data);

    const inviteCode = this.generateInviteCode();

    return prisma.cashier.create({
      data: {
        merchantId,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        inviteCode,
        status: 'PENDING',
      },
    });
  }

  // =========================
  // LISTAR CAIXAS
  // =========================
  async getCashiers(merchantId) {
    return prisma.cashier.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          select: {
            amount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  // =========================
  // ACEITAR CONVITE
  // =========================
  async acceptInvite(inviteCode, data) {
    if (!inviteCode) throw new Error('INVITE_REQUIRED');

    const cashier = await prisma.cashier.findUnique({
      where: { inviteCode },
    });

    if (!cashier) throw new Error('INVITE_NOT_FOUND');
    if (cashier.status !== 'PENDING') throw new Error('INVITE_ALREADY_USED');

    return prisma.cashier.update({
      where: { id: cashier.id },
      data: {
        name: data?.name?.trim() || cashier.name,
        phone: data?.phone?.trim() || cashier.phone,
        status: 'ACTIVE',
      },
    });
  }

  // =========================
  // ALTERAR STATUS
  // =========================
  async toggleStatus(cashierId, status) {
    const allowed = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING'];

    if (!allowed.includes(status)) {
      throw new Error('INVALID_STATUS');
    }

    return prisma.cashier.update({
      where: { id: cashierId },
      data: { status },
    });
  }

  // =========================
  // ESTATÍSTICAS
  // =========================
  async getCashierStats(cashierId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await prisma.payment.findMany({
      where: {
        cashierId,
        createdAt: { gte: startDate },
      },
    });

    let total = 0;
    let fees = 0;

    for (const p of payments) {
      total += Number(p.amount || 0);
      fees += Number(p.fee || 0);
    }

    return {
      total,
      fees,
      count: payments.length,
      average: payments.length ? total / payments.length : 0,
    };
  }
}

module.exports = new CashierService();
