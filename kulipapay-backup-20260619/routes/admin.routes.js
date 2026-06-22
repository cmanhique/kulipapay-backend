const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middlewares/rbac.middleware');

const prisma = new PrismaClient();

async function adminRoutes(fastify) {
  
  // Estatísticas do sistema
  fastify.get('/api/admin/stats', { preHandler: [fastify.authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const [totalUsers, totalWallets, totalLedgerEntries] = await Promise.all([
        prisma.account.count(),
        prisma.wallet.count(),
        prisma.ledgerEntry.count()
      ]);
      
      const totalBalance = await prisma.wallet.aggregate({
        _sum: { balance: true }
      });
      
      // Transações por tipo
      const transactionsByType = await prisma.ledgerEntry.groupBy({
        by: ['type'],
        _count: true,
        _sum: { amount: true }
      });
      
      // Utilizadores por tipo
      const usersByType = await prisma.account.groupBy({
        by: ['account_type'],
        _count: true
      });
      
      return reply.send({
        stats: {
          totalUsers,
          totalWallets,
          totalLedgerEntries,
          totalBalance: totalBalance._sum.balance || 0
        },
        transactionsByType,
        usersByType
      });
    } catch (error) {
      console.error('Stats error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // Listar todos os utilizadores
  fastify.get('/api/admin/users', { preHandler: [fastify.authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const { page = 1, limit = 50, search = '' } = request.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const where = search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { name: { contains: search, mode: 'insensitive' } },
          { kpId: { contains: search } }
        ]
      } : {};
      
      const [users, total] = await Promise.all([
        prisma.account.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: { wallet: true },
          orderBy: { created_at: 'desc' }
        }),
        prisma.account.count({ where })
      ]);
      
      return reply.send({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // Detalhes de um utilizador
  fastify.get('/api/admin/users/:kpId', { preHandler: [fastify.authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const { kpId } = request.params;
      
      const user = await prisma.account.findUnique({
        where: { kpId: kpId },
        include: {
          wallet: true,
          sessions: true,
          ledger_from: { take: 20, orderBy: { created_at: 'desc' } },
          ledger_to: { take: 20, orderBy: { created_at: 'desc' } },
          fraud_alerts: true,
          risk_score: true
        }
      });
      
      if (!user) {
        return reply.status(404).send({ error: 'USER_NOT_FOUND' });
      }
      
      return reply.send(user);
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // Atualizar role de um utilizador
  fastify.patch('/api/admin/users/:kpId/role', { preHandler: [fastify.authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const { kpId } = request.params;
      const { role } = request.body;
      
      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return reply.status(400).send({ error: 'INVALID_ROLE' });
      }
      
      const user = await prisma.account.update({
        where: { kpId: kpId },
        data: { role }
      });
      
      return reply.send({ success: true, user });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // Bloquear/Desbloquear utilizador
  fastify.post('/api/admin/users/:kpId/toggle-block', { preHandler: [fastify.authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const { kpId } = request.params;
      
      const user = await prisma.account.findUnique({
        where: { kpId: kpId },
        select: { status: true }
      });
      
      if (!user) {
        return reply.status(404).send({ error: 'USER_NOT_FOUND' });
      }
      
      const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
      
      await prisma.account.update({
        where: { kpId: kpId },
        data: { status: newStatus }
      });
      
      // Invalidar sessões se bloqueado
      if (newStatus === 'BLOCKED') {
        await prisma.session.deleteMany({ where: { kpId: kpId } });
      }
      
      return reply.send({ success: true, status: newStatus });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = adminRoutes;
