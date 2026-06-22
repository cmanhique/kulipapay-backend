const { authenticate } = require('../middlewares/auth.middleware');
const { sendMoney } = require('../controllers/transaction.controller');

async function transactionRoutes(fastify) {

  fastify.post('/transfer', {
    preHandler: [authenticate],
    handler: sendMoney
  });

  fastify.get('/transactions', { preHandler: authenticate }, async (req) => {
    const { prisma } = require('../prisma');
    
    const transactions = await prisma.transactionLedger.findMany({
      where: {
        kp_id: req.user.kp_id
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return { transactions };
  });

  fastify.get('/balance', { preHandler: authenticate }, async (req) => {
    const { prisma } = require('../prisma');
    
    const wallet = await prisma.wallet.findUnique({
      where: { kp_id: req.user.kp_id }
    });

    return { balance: wallet?.balance || 0 };
  });
}

module.exports = transactionRoutes;
