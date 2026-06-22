const { authenticate } = require('../middlewares/auth.middleware');
const cashierService = require('../services/cashier.service');
const { handleError, ValidationError } = require('../utils/errors');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');
const LedgerEngine = require('../core/ledger.engine'); // 🔥 CORRIGIDO

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

async function cashierRoutes(fastify) {
  
  // ========================================
  // ROTAS EXISTENTES (NÃO MEXER)
  // ========================================

  // 1. CRIAR CAIXA (MERCHANT)
  fastify.post('/create', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { name, email, phone } = req.body;

      if (!name || name.trim().length < 2) {
        throw new ValidationError('NAME_REQUIRED', 'Nome inválido');
      }

      const cashier = await cashierService.createCashier(merchantId, {
        name,
        email,
        phone,
      });

      return reply.send({ success: true, data: cashier });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 2. LISTAR CAIXAS (MERCHANT)
  fastify.get('/list', { preHandler: authenticate }, async (req, reply) => {
    try {
      const cashiers = await cashierService.getCashiers(req.user.kpId);
      return reply.send({ success: true, data: cashiers });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // 3. LOGIN CAIXA (COM SESSÃO - SEM KPD)
  // ========================================
  fastify.post('/auth/login', async (req, reply) => {
    try {
      const { inviteCode, deviceId, ipAddress } = req.body;

      if (!inviteCode) {
        throw new ValidationError('INVITE_REQUIRED', 'Código obrigatório');
      }

      const cashier = await prisma.cashier.findUnique({
        where: { inviteCode },
      });

      if (!cashier) {
        throw new ValidationError('INVALID_INVITE', 'Convite inválido');
      }

      if (cashier.status !== 'ACTIVE' && cashier.status !== 'PENDING') {
        throw new ValidationError('CASHIER_BLOCKED', 'Caixa bloqueado');
      }

      const session = await prisma.cashierSession.create({
        data: {
          cashierId: cashier.id,
          merchantId: cashier.merchantId,
          deviceId: deviceId || null,
          ipAddress: ipAddress || null,
          status: 'ACTIVE',
          openedAt: new Date(),
        },
      });

      const token = jwt.sign(
        {
          cashierId: cashier.id,
          merchantId: cashier.merchantId,
          sessionId: session.id,
          role: 'CASHIER',
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return reply.send({
        success: true,
        token,
        sessionId: session.id,
        data: {
          id: cashier.id,
          name: cashier.name,
          merchantId: cashier.merchantId,
          status: cashier.status,
          session: {
            id: session.id,
            status: session.status,
            openedAt: session.openedAt,
          },
        },
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // 4. REGISTAR PAGAMENTO (LEDGER ENGINE)
  // ========================================
  fastify.post('/payment', { preHandler: authenticate }, async (req, reply) => {
    try {
      const cashierId = req.user.cashierId;
      const merchantId = req.user.merchantId;
      const sessionId = req.user.sessionId;

      if (!cashierId || !merchantId) {
        throw new ValidationError('UNAUTHORIZED', 'Não é caixa');
      }

      if (!sessionId) {
        throw new ValidationError('SESSION_REQUIRED', 'Sessão inválida');
      }

      const amount = Number(req.body.amount);
      if (!amount || amount <= 0) {
        throw new ValidationError('INVALID_AMOUNT', 'Valor inválido');
      }

      const cashier = await prisma.cashier.findUnique({
        where: { id: cashierId },
      });

      if (!cashier || cashier.status !== 'ACTIVE') {
        throw new ValidationError('CASHIER_INACTIVE', 'Caixa inativo');
      }

      const session = await prisma.cashierSession.findFirst({
        where: {
          id: sessionId,
          cashierId: cashierId,
          status: 'ACTIVE',
        },
      });

      if (!session) {
        throw new ValidationError('SESSION_EXPIRED', 'Sessão expirada ou inválida');
      }

      // 🔥 USAR LEDGER ENGINE
      const result = await LedgerEngine.recordSale({
        merchantId: merchantId,
        cashierId: cashierId,
        amount: amount,
        description: req.body.description || 'Venda',
        customerName: req.body.customerName || null,
        serviceType: req.body.serviceType || null,
        method: req.body.method || 'QR',
        idempotencyKey: req.headers['idempotency-key'] || null,
      });

      // Atualizar o payment com o sessionId
      await prisma.payment.update({
        where: { id: result.data.payment.id },
        data: { sessionId: sessionId },
      });

      return reply.send({
        success: true,
        data: result.data.payment,
        ledger: result.data.ledger,
        netAmount: result.data.netAmount,
        fee: result.data.fee,
        regionId: result.data.regionId,
        idempotent: result.idempotent,
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 5. OBTER QR CODE (MERCHANT)
  fastify.get('/qr/:cashierId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { cashierId } = req.params;
      const merchantId = req.user.kpId;

      const cashier = await prisma.cashier.findFirst({
        where: {
          id: cashierId,
          merchantId,
        },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      return reply.send({
        success: true,
        data: {
          inviteCode: cashier.inviteCode,
          qrData: {
            type: 'CASHIER_INVITE',
            inviteCode: cashier.inviteCode,
            merchantId,
            cashierName: cashier.name,
          },
          status: cashier.status,
        },
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // NOVAS ROTAS
  // ========================================

  // 6. ATIVAR CAIXA (MERCHANT)
  fastify.patch('/:cashierId/activate', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { cashierId } = req.params;

      const cashier = await prisma.cashier.findFirst({
        where: {
          id: cashierId,
          merchantId: merchantId,
        },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      if (cashier.status === 'ACTIVE') {
        return reply.send({
          success: true,
          data: cashier,
          message: 'Caixa já está ativo',
        });
      }

      const updated = await prisma.cashier.update({
        where: { id: cashierId },
        data: { status: 'ACTIVE' },
      });

      return reply.send({
        success: true,
        data: updated,
        message: 'Caixa ativado com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 7. BLOQUEAR CAIXA (MERCHANT)
  fastify.patch('/:cashierId/block', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { cashierId } = req.params;

      const cashier = await prisma.cashier.findFirst({
        where: {
          id: cashierId,
          merchantId: merchantId,
        },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      if (cashier.status === 'BLOCKED') {
        return reply.send({
          success: true,
          data: cashier,
          message: 'Caixa já está bloqueado',
        });
      }

      const updated = await prisma.cashier.update({
        where: { id: cashierId },
        data: { status: 'BLOCKED' },
      });

      return reply.send({
        success: true,
        data: updated,
        message: 'Caixa bloqueado com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 8. APAGAR CAIXA (MERCHANT) - SÓ SEM TRANSAÇÕES
  fastify.delete('/:cashierId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { cashierId } = req.params;

      const cashier = await prisma.cashier.findFirst({
        where: {
          id: cashierId,
          merchantId: merchantId,
        },
        include: {
          payments: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      if (cashier.payments.length > 0) {
        throw new ValidationError(
          'HAS_TRANSACTIONS', 
          'Não é possível apagar caixa com transações históricas'
        );
      }

      await prisma.cashier.delete({
        where: { id: cashierId },
      });

      return reply.send({
        success: true,
        message: 'Caixa apagado com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 9. LISTAR FATURAS (MERCHANT VÊ TUDO, CAIXA VÊ SÓ AS SUAS)
  fastify.get('/invoices', { preHandler: authenticate }, async (req, reply) => {
    try {
      const kpId = req.user.kpId;
      const isCashier = req.user.role === 'CASHIER';
      const cashierId = req.user.cashierId;

      const where = {};
      
      if (isCashier && cashierId) {
        where.cashierId = cashierId;
      } else {
        where.merchantId = kpId;
      }

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          cashier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalFees = payments.reduce((sum, p) => sum + Number(p.fee), 0);
      const totalNet = totalAmount - totalFees;

      return reply.send({
        success: true,
        data: payments,
        summary: {
          total: payments.length,
          totalAmount: totalAmount,
          totalFees: totalFees,
          totalNet: totalNet,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 10. DETALHES DE UMA FATURA ESPECÍFICA
  fastify.get('/invoices/:paymentId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { paymentId } = req.params;
      const kpId = req.user.kpId;
      const isCashier = req.user.role === 'CASHIER';
      const cashierId = req.user.cashierId;

      const where = { id: paymentId };

      if (isCashier && cashierId) {
        where.cashierId = cashierId;
      } else {
        where.merchantId = kpId;
      }

      const payment = await prisma.payment.findFirst({
        where,
        include: {
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!payment) {
        throw new ValidationError('NOT_FOUND', 'Fatura não encontrada');
      }

      return reply.send({
        success: true,
        data: payment,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 11. FILTRAR FATURAS POR DATA
  fastify.get('/invoices/filter', { preHandler: authenticate }, async (req, reply) => {
    try {
      const kpId = req.user.kpId;
      const isCashier = req.user.role === 'CASHIER';
      const cashierId = req.user.cashierId;
      const { startDate, endDate, cashierId: filterCashierId } = req.query;

      const where = {};

      if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      }
      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
      }

      if (!isCashier && filterCashierId) {
        where.cashierId = filterCashierId;
      }

      if (isCashier && cashierId) {
        where.cashierId = cashierId;
      } else {
        where.merchantId = kpId;
      }

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: payments,
        count: payments.length,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 12. ESTATÍSTICAS DE FATURAS (MERCHANT)
  fastify.get('/invoices/stats', { preHandler: authenticate }, async (req, reply) => {
    try {
      const kpId = req.user.kpId;
      const isCashier = req.user.role === 'CASHIER';

      if (isCashier) {
        throw new ValidationError('UNAUTHORIZED', 'Apenas merchants podem ver estatísticas');
      }

      const where = { merchantId: kpId };

      const [totalPayments, todayPayments, weekPayments, monthPayments] = await Promise.all([
        prisma.payment.aggregate({
          where,
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            ...where,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            ...where,
            createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            ...where,
            createdAt: { gte: new Date(new Date().setDate(1)) },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          total: {
            count: totalPayments._count || 0,
            amount: Number(totalPayments._sum?.amount || 0),
          },
          today: {
            count: todayPayments._count || 0,
            amount: Number(todayPayments._sum?.amount || 0),
          },
          week: {
            count: weekPayments._count || 0,
            amount: Number(weekPayments._sum?.amount || 0),
          },
          month: {
            count: monthPayments._count || 0,
            amount: Number(monthPayments._sum?.amount || 0),
          },
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // 13. FECHAR SESSÃO DO CAIXA (LOGOUT)
  fastify.post('/session/close', { preHandler: authenticate }, async (req, reply) => {
    try {
      const cashierId = req.user.cashierId;
      const sessionId = req.user.sessionId;

      if (!cashierId || !sessionId) {
        throw new ValidationError('UNAUTHORIZED', 'Não é caixa');
      }

      const session = await prisma.cashierSession.findFirst({
        where: {
          id: sessionId,
          cashierId: cashierId,
          status: 'ACTIVE',
        },
      });

      if (!session) {
        throw new ValidationError('SESSION_NOT_FOUND', 'Sessão não encontrada');
      }

      await prisma.cashierSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedBy: cashierId,
        },
      });

      return reply.send({
        success: true,
        message: 'Sessão encerrada com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ========================================
  // 🔥 DASHBOARD DO CAIXA (NOVO)
  // ========================================
  fastify.get('/dashboard', { preHandler: authenticate }, async (req, reply) => {
    try {
      const cashierId = req.user.cashierId;
      const merchantId = req.user.merchantId;

      const cashier = await prisma.cashier.findUnique({
        where: { id: cashierId },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      // Buscar pagamentos do caixa hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const payments = await prisma.payment.findMany({
        where: {
          cashierId: cashierId,
          createdAt: { gte: today },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const count = payments.length;

      return reply.send({
        success: true,
        data: {
          cashier: {
            id: cashier.id,
            name: cashier.name,
            status: cashier.status,
          },
          today: {
            total: total,
            count: count,
            payments: payments,
          },
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = cashierRoutes;