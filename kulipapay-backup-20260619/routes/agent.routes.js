const { authenticate } = require('../middlewares/auth.middleware');

async function agentRoutes(fastify, options) {
  
  // Middleware para verificar se é agente
  const isAgent = async (request, reply) => {
    try {
      const account = request.user; // Account model
      
      if (!account.isAgent) {
        return reply.status(403).send({ error: 'Acesso apenas para agentes' });
      }
      
      // Buscar ou criar float balance do agente
      let floatBalance = await fastify.prisma.agentFloatBalance.findUnique({
        where: { agentKpId: account.kpId }
      });
      
      if (!floatBalance) {
        floatBalance = await fastify.prisma.agentFloatBalance.create({
          data: {
            agentKpId: account.kpId,
            floatBalance: 0,
            cashBalance: 0,
            commissionBalance: 0
          }
        });
      }
      
      request.floatBalance = floatBalance;
    } catch (error) {
      console.error('Error in isAgent:', error);
      return reply.status(500).send({ error: 'Erro ao verificar agente' });
    }
  };
  
  // GET /api/agent/stats
  fastify.get('/stats', { preHandler: [authenticate, isAgent] }, async (request, reply) => {
    try {
      const { floatBalance } = request;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const transactions = await fastify.prisma.agentCashTransaction.findMany({
        where: {
          agentKpId: request.user.kpId,
          createdAt: { gte: today },
          status: 'COMPLETED'
        }
      });
      
      const cashInTotal = transactions
        .filter(t => t.transactionType === 'CASH_IN')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const cashOutTotal = transactions
        .filter(t => t.transactionType === 'CASH_OUT')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission), 0);
      const uniqueCustomers = new Set(transactions.map(t => t.customerKpId)).size;
      
      reply.send({
        success: true,
        data: {
          floatBalance: Number(floatBalance.floatBalance),
          cashBalance: Number(floatBalance.cashBalance),
          commissionBalance: Number(floatBalance.commissionBalance),
          walletBalance: Number(request.user.balance || 0),
          today: {
            transactions: transactions.length,
            cashInTotal,
            cashOutTotal,
            commission: totalCommission,
            customersServed: uniqueCustomers
          }
        }
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      reply.status(500).send({ error: 'Erro ao carregar estatísticas' });
    }
  });
  
  // POST /api/agent/cash-in
  fastify.post('/cash-in', { preHandler: [authenticate, isAgent] }, async (request, reply) => {
    const { customerPhone, amount, agentPin } = request.body;
    
    if (!customerPhone || !amount || amount <= 0 || !agentPin) {
      return reply.status(400).send({ error: 'Dados inválidos' });
    }
    
    try {
      if (request.user.pin !== agentPin) {
        return reply.status(401).send({ error: 'PIN do agente inválido' });
      }
      
      const customer = await fastify.prisma.account.findFirst({
        where: { phone: customerPhone }
      });
      
      if (!customer) {
        return reply.status(404).send({ error: 'Cliente não encontrado' });
      }
      
      const fee = amount * 0.025;
      const commission = fee * 0.7;
      const transactionRef = `CASHIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await fastify.prisma.$transaction(async (tx) => {
        // Criar transação
        await tx.agentCashTransaction.create({
          data: {
            agentKpId: request.user.kpId,
            customerKpId: customer.kpId,
            transactionType: 'CASH_IN',
            amount,
            fee,
            commission,
            status: 'COMPLETED',
            agentPinVerified: true,
            transactionRef
          }
        });
        
        // Atualizar float balance do agente
        await tx.agentFloatBalance.update({
          where: { agentKpId: request.user.kpId },
          data: {
            cashBalance: { increment: amount },
            commissionBalance: { increment: commission }
          }
        });
        
        // Depositar na wallet do cliente
        await tx.account.update({
          where: { kpId: customer.kpId },
          data: { balance: { increment: amount } }
        });
      });
      
      reply.send({
        success: true,
        message: 'Cash In realizado com sucesso',
        data: { amount, fee, commission }
      });
    } catch (error) {
      console.error('Error in cash-in:', error);
      reply.status(500).send({ error: 'Erro ao processar Cash In' });
    }
  });
  
  // POST /api/agent/cash-out
  fastify.post('/cash-out', { preHandler: [authenticate, isAgent] }, async (request, reply) => {
    const { customerPhone, amount, agentPin } = request.body;
    
    if (!customerPhone || !amount || amount <= 0) {
      return reply.status(400).send({ error: 'Dados inválidos' });
    }
    
    try {
      if (request.user.pin !== agentPin) {
        return reply.status(401).send({ error: 'PIN do agente inválido' });
      }
      
      const customer = await fastify.prisma.account.findFirst({
        where: { phone: customerPhone }
      });
      
      if (!customer) {
        return reply.status(404).send({ error: 'Cliente não encontrado' });
      }
      
      if (Number(customer.balance) < amount) {
        return reply.status(400).send({ error: 'Saldo insuficiente do cliente' });
      }
      
      const fee = amount * 0.02;
      const commission = fee * 0.7;
      const transactionRef = `CASHOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transaction = await fastify.prisma.agentCashTransaction.create({
        data: {
          agentKpId: request.user.kpId,
          customerKpId: customer.kpId,
          transactionType: 'CASH_OUT',
          amount,
          fee,
          commission,
          status: 'PENDING_CUSTOMER_APPROVAL',
          agentPinVerified: true,
          transactionRef
        }
      });
      
      reply.send({
        success: true,
        message: 'Aguardando confirmação do cliente',
        data: { transactionRef, amount, fee }
      });
    } catch (error) {
      console.error('Error in cash-out:', error);
      reply.status(500).send({ error: 'Erro ao processar Cash Out' });
    }
  });
  
  // POST /api/agent/cash-out/confirm
  fastify.post('/cash-out/confirm', { preHandler: [authenticate] }, async (request, reply) => {
    const { transactionRef, customerPin } = request.body;
    
    try {
      const transaction = await fastify.prisma.agentCashTransaction.findUnique({
        where: { transactionRef }
      });
      
      if (!transaction || transaction.status !== 'PENDING_CUSTOMER_APPROVAL') {
        return reply.status(404).send({ error: 'Transação não encontrada' });
      }
      
      if (transaction.customerKpId !== request.user.kpId) {
        return reply.status(403).send({ error: 'Transação não pertence a este cliente' });
      }
      
      if (request.user.pin !== customerPin) {
        return reply.status(401).send({ error: 'PIN do cliente inválido' });
      }
      
      await fastify.prisma.$transaction(async (tx) => {
        await tx.agentCashTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            customerConfirmed: true,
            completedAt: new Date()
          }
        });
        
        await tx.account.update({
          where: { kpId: request.user.kpId },
          data: { balance: { decrement: transaction.amount } }
        });
        
        await tx.agentFloatBalance.update({
          where: { agentKpId: transaction.agentKpId },
          data: {
            cashBalance: { decrement: transaction.amount },
            commissionBalance: { increment: transaction.commission }
          }
        });
      });
      
      reply.send({ success: true, message: 'Cash Out confirmado' });
    } catch (error) {
      console.error('Error confirming cash-out:', error);
      reply.status(500).send({ error: 'Erro ao confirmar Cash Out' });
    }
  });
}

module.exports = agentRoutes;
