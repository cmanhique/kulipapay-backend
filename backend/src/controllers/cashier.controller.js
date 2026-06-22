const cashierService = require('../services/cashier.service');
const { prisma } = require('../prisma');
const { handleError, ValidationError } = require('../utils/errors');

class CashierController {
  /**
   * Criar um novo caixa (Comerciante)
   */
  async create(req, reply) {
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
  }

  /**
   * Listar caixas do comerciante
   */
  async list(req, reply) {
    try {
      const merchantId = req.user.kpId;
      const cashiers = await cashierService.getCashiers(merchantId);

      return reply.send({ success: true, data: cashiers });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  /**
   * Ativar um caixa
   */
  async activate(req, reply) {
    try {
      const merchantId = req.user.kpId;
      const { cashierId } = req.params;

      const cashier = await prisma.cashier.findFirst({
        where: { id: cashierId, merchantId },
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

      const updated = await cashierService.toggleStatus(cashierId, 'ACTIVE');

      return reply.send({
        success: true,
        data: updated,
        message: 'Caixa ativado com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  /**
   * Bloquear um caixa
   */
  async block(req, reply) {
    try {
      const merchantId = req.user.kpId;
      const { cashierId } = req.params;

      const cashier = await prisma.cashier.findFirst({
        where: { id: cashierId, merchantId },
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

      const updated = await cashierService.toggleStatus(cashierId, 'BLOCKED');

      return reply.send({
        success: true,
        data: updated,
        message: 'Caixa bloqueado com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }

  /**
   * Apagar um caixa (só se não tiver transações)
   */
  async delete(req, reply) {
    try {
      const merchantId = req.user.kpId;
      const { cashierId } = req.params;

      const cashier = await prisma.cashier.findFirst({
        where: { id: cashierId, merchantId },
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

      if (cashier.payments && cashier.payments.length > 0) {
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
  }

  /**
   * Dashboard do caixa
   */
  async dashboard(req, reply) {
    try {
      const cashierId = req.user.cashierId;

      const cashier = await prisma.cashier.findUnique({
        where: { id: cashierId },
      });

      if (!cashier) {
        throw new ValidationError('NOT_FOUND', 'Caixa não encontrado');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const payments = await prisma.paymentTransaction.findMany({
        where: {
          cashier_id: cashierId,
          created_at: { gte: today },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      });

      const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      return reply.send({
        success: true,
        data: {
          cashier: {
            id: cashier.id,
            name: cashier.name,
            status: cashier.status,
          },
          today: {
            total,
            count: payments.length,
            payments,
          },
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  }
}

module.exports = new CashierController();