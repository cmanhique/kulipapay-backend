const { authenticate } = require('../middlewares/auth.middleware');
const { prisma } = require('../prisma');
const { handleError, ValidationError } = require('../utils/errors');
const { transfer } = require('../services/transaction.service');

// Mapper para normalizar os nomes dos campos
function mapAccount(account) {
  return {
    id: account.id,
    kp_id: account.kp_id,
    email: account.email,
    phone: account.phone,
    name: account.name,
    accountType: account.account_type,
    role: account.role,
    status: account.status,
    country: account.country,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    wallet: account.wallet
  };
}

async function merchantRoutes(fastify) {

  // =========================
  // DASHBOARD MERCHANT
  // =========================
  fastify.get('/dashboard', { preHandler: authenticate }, async (req, reply) => {
    try {
      const kp_id = req.user?.kp_id;

      if (!kp_id) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User context missing'
          }
        });
      }

      const account = await prisma.account.findUnique({
        where: { kp_id },
        include: {
          wallet: true,
          risk_score: true
        }
      });

      if (!account) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Account not found'
          }
        });
      }

      // Buscar transações recentes
      const transactions = await prisma.transactionLedger.findMany({
        where: { kp_id },
        orderBy: { created_at: 'desc' },
        take: 10
      });

      const totalTransactions = await prisma.transactionLedger.count({
        where: { kp_id }
      });

      // Calcular volume do dia
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayVolume = await prisma.transactionLedger.aggregate({
        where: {
          kp_id,
          created_at: { gte: today },
          status: 'CONFIRMED'
        },
        _sum: { amount: true }
      });

      return reply.send({
        success: true,
        data: {
          account: mapAccount(account),
          wallet: {
            balance: account.wallet?.balance || 0,
            currency: 'MZN'
          },
          risk: account.risk_score || { score: 0, level: 'LOW' },
          stats: {
            totalTransactions,
            todayVolume: todayVolume._sum.amount || 0
          },
          recentTransactions: transactions
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // HISTÓRICO DE TRANSAÇÕES
  // =========================
  fastify.get('/transactions', { preHandler: authenticate }, async (req, reply) => {
    try {
      const kp_id = req.user?.kp_id;

      if (!kp_id) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User context missing' }
        });
      }

      const { limit = 50, offset = 0 } = req.query;

      const transactions = await prisma.transactionLedger.findMany({
        where: { kp_id },
        orderBy: { created_at: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.transactionLedger.count({
        where: { kp_id }
      });

      return reply.send({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset)
          }
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // ESTATÍSTICAS
  // =========================
  fastify.get('/stats', { preHandler: authenticate }, async (req, reply) => {
    try {
      const kp_id = req.user?.kp_id;

      if (!kp_id) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User context missing' }
        });
      }

      const wallet = await prisma.wallet.findUnique({
        where: { kp_id }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTransactions = await prisma.transactionLedger.aggregate({
        where: {
          kp_id,
          created_at: { gte: today },
          status: 'CONFIRMED'
        },
        _sum: { amount: true }
      });

      const totalTransactions = await prisma.transactionLedger.count({
        where: { kp_id }
      });

      return reply.send({
        success: true,
        data: {
          balance: wallet?.balance || 0,
          todayVolume: todayTransactions._sum.amount || 0,
          totalTransactions
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // TRANSFERÊNCIA (VIA MERCHANT)
  // =========================
  fastify.post('/transfer', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { to, amount, description } = req.body;
      const from = req.user?.kp_id;

      if (!from) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User context missing' }
        });
      }

      if (!to || !amount) {
        throw new ValidationError('MISSING_FIELDS', 'Destino e valor são obrigatórios');
      }

      const result = await transfer({
        from,
        to,
        amount: Number(amount),
        req,
        description
      });

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // LISTAR TODOS OS MERCHANTS (ADMIN)
  // =========================
  fastify.get('/list', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchants = await prisma.account.findMany({
        where: {
          account_type: 'MERCHANT'
        },
        include: {
          wallet: true
        },
        take: 100
      });

      return reply.send({
        success: true,
        data: merchants.map(mapAccount)
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = merchantRoutes;