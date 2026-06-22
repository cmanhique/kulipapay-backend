const { prisma } = require('../prisma');
const crypto = require('crypto');
const PosAuditService = require('../core/payments/pos-audit.service');

class CashierService {
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

  async resolveMerchant(merchantKey) {
    const account = await prisma.account.findFirst({
      where: {
        OR: [{ id: merchantKey }, { kp_id: merchantKey }],
        account_type: 'MERCHANT',
      },
      include: { merchantProfile: true },
    });

    if (!account?.merchantProfile) {
      throw new Error('MERCHANT_NOT_FOUND');
    }

    return {
      accountId: account.id,
      kpId: account.kp_id,
      merchantProfile: account.merchantProfile,
    };
  }

  async createCashier(merchantKey, data, createdByKpId = null) {
    this.validateBasicData(data);
    const merchant = await this.resolveMerchant(merchantKey);
    const inviteCode = this.generateInviteCode();

    const cashier = await prisma.cashier.create({
      data: {
        merchant: { connect: { account_id: merchant.accountId } },
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        invite_code: inviteCode,
        status: 'PENDING',
      },
    });

    await PosAuditService.log({
      merchantId: merchant.accountId,
      action: 'CASHIER_CREATED',
      actorType: 'MERCHANT',
      actorId: createdByKpId || merchant.kpId,
      cashierId: cashier.id,
      metadata: { name: cashier.name, invite_code: inviteCode },
    });

    return cashier;
  }

  async getCashiers(merchantKey) {
    const merchant = await this.resolveMerchant(merchantKey);

    return prisma.cashier.findMany({
      where: { merchant_id: merchant.accountId },
      orderBy: { created_at: 'desc' },
      include: {
        ledger_transactions: {
          select: { amount: true, created_at: true },
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
  }

  async getCashierForMerchant(cashierId, merchantKey) {
    const merchant = await this.resolveMerchant(merchantKey);

    return prisma.cashier.findFirst({
      where: {
        id: cashierId,
        merchant_id: merchant.accountId,
      },
    });
  }

  async acceptInvite(inviteCode, data) {
    if (!inviteCode) throw new Error('INVITE_REQUIRED');

    const cashier = await prisma.cashier.findUnique({
      where: { invite_code: inviteCode },
    });

    if (!cashier) throw new Error('INVITE_NOT_FOUND');
    if (cashier.status !== 'PENDING') throw new Error('INVITE_ALREADY_USED');

    const updated = await prisma.cashier.update({
      where: { id: cashier.id },
      data: {
        name: data?.name?.trim() || cashier.name,
        phone: data?.phone?.trim() || cashier.phone,
        status: 'ACTIVE',
      },
    });

    await PosAuditService.log({
      merchantId: cashier.merchant_id,
      action: 'CASHIER_INVITE_ACCEPTED',
      actorType: 'CASHIER',
      actorId: updated.id,
      cashierId: updated.id,
    });

    return updated;
  }

  async setStatus(cashierId, merchantKey, status, actorKpId) {
    const allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'];

    if (!allowed.includes(status)) {
      throw new Error('INVALID_STATUS');
    }

    const cashier = await this.getCashierForMerchant(cashierId, merchantKey);
    if (!cashier) throw new Error('NOT_FOUND');

    const updated = await prisma.cashier.update({
      where: { id: cashierId },
      data: { status },
    });

    await PosAuditService.log({
      merchantId: cashier.merchant_id,
      action: `CASHIER_STATUS_${status}`,
      actorType: 'MERCHANT',
      actorId: actorKpId,
      cashierId,
      metadata: { previous_status: cashier.status },
    });

    return updated;
  }

  async toggleStatus(cashierId, status) {
    const allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING', 'BLOCKED'];

    if (!allowed.includes(status)) {
      throw new Error('INVALID_STATUS');
    }

    const mapped = status === 'BLOCKED' ? 'SUSPENDED' : status;

    return prisma.cashier.update({
      where: { id: cashierId },
      data: { status: mapped },
    });
  }

  async openSession(cashierId, { deviceId = null, ipAddress = null } = {}) {
    const cashier = await prisma.cashier.findUnique({ where: { id: cashierId } });

    if (!cashier) throw new Error('NOT_FOUND');
    if (cashier.status !== 'ACTIVE') throw new Error('CASHIER_INACTIVE');

    const session = await prisma.cashierSession.create({
      data: {
        cashier_id: cashierId,
        merchant_id: cashier.merchant_id,
        device_id: deviceId,
        ip_address: ipAddress,
        status: 'ACTIVE',
        opened_at: new Date(),
      },
    });

    await PosAuditService.log({
      merchantId: cashier.merchant_id,
      action: 'SESSION_OPENED',
      actorType: 'CASHIER',
      actorId: cashierId,
      cashierId,
      cashierSessionId: session.id,
      metadata: { device_id: deviceId, ip_address: ipAddress },
    });

    return session;
  }

  async closeSession(cashierId, sessionId, closedBy = null) {
    const session = await prisma.cashierSession.findFirst({
      where: {
        id: sessionId,
        cashier_id: cashierId,
        status: 'ACTIVE',
      },
    });

    if (!session) throw new Error('SESSION_NOT_FOUND');

    const updated = await prisma.cashierSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
        closed_by: closedBy || cashierId,
      },
    });

    await PosAuditService.log({
      merchantId: session.merchant_id,
      action: 'SESSION_CLOSED',
      actorType: 'CASHIER',
      actorId: closedBy || cashierId,
      cashierId,
      cashierSessionId: sessionId,
      metadata: {
        total_received: session.total_received,
        transaction_count: session.transaction_count,
      },
    });

    return updated;
  }

  async getSessionSummary(sessionId) {
    const session = await prisma.cashierSession.findUnique({
      where: { id: sessionId },
      include: {
        payment_intents: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!session) throw new Error('SESSION_NOT_FOUND');

    return session;
  }

  async getCashierStats(cashierId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await prisma.paymentTransaction.findMany({
      where: {
        cashier_id: cashierId,
        created_at: { gte: startDate },
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