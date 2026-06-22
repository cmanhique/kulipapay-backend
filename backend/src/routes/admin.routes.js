const { authenticate } = require('../middlewares/auth.middleware');
const { prisma } = require('../prisma');
const { handleError, ValidationError } = require('../utils/errors');

async function adminRoutes(fastify) {

  // =========================
  // ADMIN DASHBOARD
  // =========================
  fastify.get('/dashboard', { preHandler: authenticate }, async (req, reply) => {
    try {
      // Verificar se é admin
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        throw new ValidationError('UNAUTHORIZED', 'Acesso apenas para administradores');
      }

      // Estatísticas
      const [totalUsers, totalMerchants, totalAgents, totalTransactions, totalVolume] = await Promise.all([
        prisma.account.count(),
        prisma.account.count({ where: { role: 'MERCHANT' } }),
        prisma.agent.count(),
        prisma.transaction.count(),
        prisma.transaction.aggregate({ _sum: { amount: true } })
      ]);

      // Transações recentes
      const recentTransactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          from_account: { select: { name: true, email: true } },
          to_account: { select: { name: true, email: true } }
        }
      });

      // Fraud alerts abertos
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
  });

  // =========================
  // ADMIN USERS
  // =========================
  fastify.get('/users', { preHandler: authenticate }, async (req, reply) => {
    try {
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        throw new ValidationError('UNAUTHORIZED', 'Acesso apenas para administradores');
      }

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
          include: {
            wallet: true,
            risk_score: true
          }
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
  });

  // =========================
  // ADMIN STATS
  // =========================
  fastify.get('/stats', { preHandler: authenticate }, async (req, reply) => {
    try {
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        throw new ValidationError('UNAUTHORIZED', 'Acesso apenas para administradores');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalUsers, todayUsers, totalTransactions, todayTransactions, totalVolume, todayVolume] = await Promise.all([
        prisma.account.count(),
        prisma.account.count({ where: { created_at: { gte: today } } }),
        prisma.transaction.count(),
        prisma.transaction.count({ where: { created_at: { gte: today } } }),
        prisma.transaction.aggregate({ _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { created_at: { gte: today } }, _sum: { amount: true } })
      ]);

      return reply.send({
        success: true,
        data: {
          total: {
            users: totalUsers,
            transactions: totalTransactions,
            volume: totalVolume._sum.amount || 0
          },
          today: {
            users: todayUsers,
            transactions: todayTransactions,
            volume: todayVolume._sum.amount || 0
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // ADMIN HEALTH
  // =========================
  fastify.get('/health', { preHandler: authenticate }, async (req, reply) => {
    try {
      // Verificar banco
      await prisma.$queryRaw`SELECT 1`;

      return reply.send({
        success: true,
        data: {
          status: 'HEALTHY',
          database: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      return reply.send({
        success: true,
        data: {
          status: 'DEGRADED',
          database: false,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
}

module.exports = adminRoutes;
