const { prisma } = require('../../prisma');
const { handleError } = require('../../utils/errors');

class AdminController {
  async getDashboard(req, reply) {
    try {
      const [totalUsers, totalMerchants, totalAgents, totalTransactions, totalVolume] = await Promise.all([
        prisma.account.count(),
        prisma.account.count({ where: { role: 'MERCHANT' } }),
        prisma.agent.count(),
        prisma.transaction.count(),
        prisma.transaction.aggregate({ _sum: { amount: true } })
      ]);

      const recentTransactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          from_account: { select: { name: true, email: true } },
          to_account: { select: { name: true, email: true } }
        }
      });

      const fraudAlerts = await prisma.fraudAlert.findMany({
        where: { resolved: false },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          account: { select: { name: true, email: true } }
        }
      });

      return reply.send({
        success: true,
        data: {
          stats: {
            totalUsers,
            totalMerchants,
            totalAgents,
            totalTransactions,
            totalVolume: totalVolume._sum.amount || 0
          },
          recentTransactions,
          fraudAlerts,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async getUsers(req, reply) {
    try {
      const { page = 1, limit = 20, role, status, search } = req.query;

      const where = {};
      if (role) where.role = role;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { kp_id: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.account.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { created_at: 'desc' },
          include: { wallet: true }
        }),
        prisma.account.count({ where })
      ]);

      return reply.send({
        success: true,
        data: {
          users,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async updateUserRole(req, reply) {
    try {
      const { kpId } = req.params;
      const { role } = req.body;

      const validRoles = ['INDIVIDUAL', 'MERCHANT', 'ENTERPRISE', 'AGENT', 'ADMIN'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }

      const user = await prisma.account.update({
        where: { kp_id: kpId },
        data: { role }
      });

      return reply.send({ success: true, data: user });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async toggleUserBlock(req, reply) {
    try {
      const { kpId } = req.params;

      const user = await prisma.account.findUnique({
        where: { kp_id: kpId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';

      const updated = await prisma.account.update({
        where: { kp_id: kpId },
        data: { status: newStatus }
      });

      return reply.send({
        success: true,
        data: updated,
        message: `User ${newStatus === 'BLOCKED' ? 'blocked' : 'unblocked'}`
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async getTransactions(req, reply) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { created_at: 'desc' },
          include: {
            from_account: { select: { name: true, email: true } },
            to_account: { select: { name: true, email: true } }
          }
        }),
        prisma.transaction.count()
      ]);

      return reply.send({
        success: true,
        data: {
          transactions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async getFraudAlerts(req, reply) {
    try {
      const { status = 'OPEN' } = req.query;

      const alerts = await prisma.fraudAlert.findMany({
        where: { resolved: status === 'OPEN' ? false : true },
        orderBy: { created_at: 'desc' },
        include: {
          account: { select: { name: true, email: true } }
        }
      });

      return reply.send({ success: true, data: alerts });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async resolveFraudAlert(req, reply) {
    try {
      const { id } = req.params;

      const alert = await prisma.fraudAlert.update({
        where: { id },
        data: {
          resolved: true,
          resolved_at: new Date()
        }
      });

      return reply.send({ success: true, data: alert });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async getPendingKYC(req, reply) {
    try {
      const kycs = await prisma.kycProfile.findMany({
        where: { status: 'PENDING' },
        orderBy: { created_at: 'asc' },
        include: {
          account: { select: { name: true, email: true } }
        }
      });

      return reply.send({ success: true, data: kycs });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async approveKYC(req, reply) {
    try {
      const { id } = req.params;

      const kyc = await prisma.kycProfile.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      return reply.send({ success: true, data: kyc });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  async getAgents(req, reply) {
    try {
      const agents = await prisma.agent.findMany({
        include: {
          account: { select: { name: true, email: true } }
        }
      });

      return reply.send({ success: true, data: agents });
    } catch (error) {
      return handleError(error, reply);
    }
  }
}

module.exports = new AdminController();
