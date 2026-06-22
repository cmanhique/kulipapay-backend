const { authenticate } = require('../../middlewares/auth.middleware');
const { prisma } = require('../../prisma');

async function adminRoutes(fastify) {

  // =========================
  // TESTE PÚBLICO
  // =========================
  fastify.get('/test', async (req, reply) => {
    return { message: '✅ Admin route is working!' };
  });

  // =========================
  // DASHBOARD (PROTEGIDO)
  // =========================
  fastify.get('/dashboard', { preHandler: authenticate }, async (req, reply) => {
    try {
      const totalUsers = await prisma.account.count();
      const totalMerchants = await prisma.account.count({ where: { role: 'MERCHANT' } });
      const totalTransactions = await prisma.transactionLedger.count({ where: { status: 'CONFIRMED' } });
      
      return {
        success: true,
        data: {
          stats: {
            totalUsers,
            totalMerchants,
            totalTransactions
          },
          message: 'Dashboard admin funcionando!'
        }
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // =========================
  // LISTAR UTILIZADORES (PROTEGIDO)
  // =========================
  fastify.get('/users', { preHandler: authenticate }, async (req, reply) => {
    try {
      const users = await prisma.account.findMany({
        select: {
          kp_id: true,
          email: true,
          phone: true,
          name: true,
          account_type: true,
          status: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' },
        take: 50
      });
      
      return {
        success: true,
        data: users
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // =========================
  // LISTAR TRANSAÇÕES (PROTEGIDO)
  // =========================
  fastify.get('/transactions', { preHandler: authenticate }, async (req, reply) => {
    try {
      const transactions = await prisma.transactionLedger.findMany({
        orderBy: { created_at: 'desc' },
        take: 50
      });
      
      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // =========================
  // LISTAR ESCROWS (PROTEGIDO)
  // =========================
  fastify.get('/escrows', { preHandler: authenticate }, async (req, reply) => {
    try {
      const escrows = await prisma.escrowTransaction.findMany({
        orderBy: { created_at: 'desc' },
        take: 50
      });
      
      return {
        success: true,
        data: escrows
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // =========================
  // ATUALIZAR KYC (PROTEGIDO)
  // =========================
  fastify.post('/kyc/update', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { kp_id, status } = req.body;
      
      if (!kp_id || !status) {
        return reply.status(400).send({
          success: false,
          error: 'kp_id and status are required'
        });
      }
      
      const updated = await prisma.kycProfile.update({
        where: { kp_id },
        data: { status }
      });
      
      return {
        success: true,
        data: updated
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}

module.exports = adminRoutes;
