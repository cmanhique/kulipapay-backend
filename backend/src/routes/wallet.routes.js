const { authenticate } = require('../middlewares/auth.middleware');
const { prisma } = require('../prisma');
const { handleError, ValidationError } = require('../utils/errors');
const { transfer } = require('../services/transaction.service');

async function walletRoutes(fastify) {

  // =========================
  // BALANCE
  // =========================
  fastify.get('/balance', { preHandler: authenticate }, async (req, reply) => {
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

      const wallet = await prisma.wallet.findUnique({
        where: { kp_id }
      });

      if (!wallet) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Wallet not found'
          }
        });
      }

      return reply.send({
        success: true,
        data: {
          balance: wallet.balance,
          currency: 'MZN',
          kp_id: kp_id
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // DEPOSIT (SIMULADO)
  // =========================
  fastify.post('/deposit', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { amount, description } = req.body;
      const kp_id = req.user?.kp_id;

      if (!kp_id) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User context missing' }
        });
      }

      if (!amount || amount <= 0) {
        throw new ValidationError('INVALID_AMOUNT', 'Amount must be greater than 0');
      }

      const wallet = await prisma.wallet.update({
        where: { kp_id },
        data: {
          balance: {
            increment: Number(amount)
          }
        }
      });

      await prisma.transactionLedger.create({
        data: {
          kp_id: kp_id,
          type: 'CREDIT',
          amount: Number(amount),
          balance_before: Number(wallet.balance) - Number(amount),
          balance_after: Number(wallet.balance),
          reference: `DEP-${Date.now()}`,
          status: 'CONFIRMED',
          metadata: {
            description: description || 'Depósito manual',
            type: 'DEPOSIT'
          }
        }
      });

      return reply.send({
        success: true,
        data: {
          balance: wallet.balance,
          message: 'Depósito realizado com sucesso'
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // TRANSFERÊNCIA
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
        where: { kp_id: kp_id },
        orderBy: { created_at: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.transactionLedger.count({
        where: { kp_id: kp_id }
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
  // RESUMO DA WALLET
  // =========================
  fastify.get('/summary', { preHandler: authenticate }, async (req, reply) => {
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
          kp_id: kp_id,
          created_at: { gte: today },
          status: 'CONFIRMED'
        },
        _sum: { amount: true }
      });

      const totalTransactions = await prisma.transactionLedger.count({
        where: { kp_id: kp_id }
      });

      return reply.send({
        success: true,
        data: {
          balance: wallet?.balance || 0,
          todayVolume: todayTransactions._sum.amount || 0,
          totalTransactions,
          lastActivity: await prisma.transactionLedger.findFirst({
            where: { kp_id: kp_id },
            orderBy: { created_at: 'desc' }
          })
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = walletRoutes;