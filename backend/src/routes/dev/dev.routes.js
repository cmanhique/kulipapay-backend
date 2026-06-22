const { prisma } = require('../../prisma');
const { authenticate } = require('../../middlewares/auth.middleware');
const { handleError, ValidationError } = require('../../utils/errors');

/**
 * ROTAS DEV APENAS PARA TESTES
 * Estas rotas NÃO DEVEM estar disponíveis em produção
 */
async function devRoutes(fastify) {

  // ============================================
  // 1. FUND WALLET (Adicionar saldo de teste)
  // ============================================
  fastify.post('/wallet/fund', async (req, reply) => {
    try {
      const { kp_id, amount } = req.body;

      if (!kp_id) {
        throw new ValidationError('KP_ID_REQUIRED', 'kp_id é obrigatório');
      }

      if (!amount || amount <= 0) {
        throw new ValidationError('INVALID_AMOUNT', 'Amount deve ser positivo');
      }

      // Verificar se a conta existe
      const account = await prisma.account.findUnique({
        where: { kp_id },
        include: { wallet: true }
      });

      if (!account) {
        throw new ValidationError('ACCOUNT_NOT_FOUND', 'Conta não encontrada');
      }

      // Atualizar saldo da carteira
      const updatedWallet = await prisma.wallet.update({
        where: { kp_id: kp_id },
        data: {
          balance: { increment: amount },
          available_balance: { increment: amount },
          version: { increment: 1 }
        }
      });

      // Registrar no ledger (para auditoria)
      await prisma.transactionLedger.create({
        data: {
          kp_id: kp_id,
          type: 'DEV_FUNDING',
          amount: amount,
          balance_before: account.wallet.balance,
          balance_after: Number(account.wallet.balance) + amount,
          reference: `DEV-FUND-${Date.now()}`,
          status: 'COMPLETED',
          metadata: {
            source: 'dev_funding',
            timestamp: new Date().toISOString(),
            funded_by: 'developer'
          }
        }
      });

      return reply.send({
        success: true,
        message: `💰 ${amount} MZN adicionados à carteira de ${kp_id}`,
        data: {
          kp_id: kp_id,
          balance: Number(updatedWallet.balance),
          previous_balance: Number(account.wallet.balance),
          amount_funded: amount,
          new_balance: Number(updatedWallet.balance)
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 2. RESET WALLET (Resetar saldo para valor inicial)
  // ============================================
  fastify.post('/wallet/reset', async (req, reply) => {
    try {
      const { kp_id, default_amount = 1000 } = req.body;

      if (!kp_id) {
        throw new ValidationError('KP_ID_REQUIRED', 'kp_id é obrigatório');
      }

      const account = await prisma.account.findUnique({
        where: { kp_id },
        include: { wallet: true }
      });

      if (!account) {
        throw new ValidationError('ACCOUNT_NOT_FOUND', 'Conta não encontrada');
      }

      const updatedWallet = await prisma.wallet.update({
        where: { kp_id: kp_id },
        data: {
          balance: default_amount,
          available_balance: default_amount,
          version: { increment: 1 }
        }
      });

      return reply.send({
        success: true,
        message: `🔄 Saldo de ${kp_id} resetado para ${default_amount} MZN`,
        data: {
          kp_id: kp_id,
          balance: Number(updatedWallet.balance),
          default_amount: default_amount
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 3. GET WALLET (Ver saldo)
  // ============================================
  fastify.get('/wallet/:kp_id', async (req, reply) => {
    try {
      const { kp_id } = req.params;

      const wallet = await prisma.wallet.findUnique({
        where: { kp_id: kp_id }
      });

      if (!wallet) {
        throw new ValidationError('WALLET_NOT_FOUND', 'Carteira não encontrada');
      }

      return reply.send({
        success: true,
        data: {
          kp_id: kp_id,
          balance: Number(wallet.balance),
          available_balance: Number(wallet.available_balance),
          frozen_balance: Number(wallet.frozen_balance),
          version: wallet.version
        }
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 4. LIST ALL WALLETS (Ver todas as carteiras)
  // ============================================
  fastify.get('/wallets', async (req, reply) => {
    try {
      const wallets = await prisma.wallet.findMany({
        include: {
          account: {
            select: {
              kp_id: true,
              email: true,
              name: true,
              account_type: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const formatted = wallets.map(w => ({
        kp_id: w.kp_id,
        email: w.account?.email,
        name: w.account?.name,
        account_type: w.account?.account_type,
        balance: Number(w.balance),
        available_balance: Number(w.available_balance),
        frozen_balance: Number(w.frozen_balance)
      }));

      return reply.send({
        success: true,
        data: formatted,
        count: formatted.length
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 5. FUND MULTIPLE (Adicionar saldo a várias contas)
  // ============================================
  fastify.post('/wallet/fund-multiple', async (req, reply) => {
    try {
      const { accounts } = req.body;

      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        throw new ValidationError('INVALID_ACCOUNTS', 'accounts deve ser um array não vazio');
      }

      const results = [];

      for (const acc of accounts) {
        const { kp_id, amount } = acc;

        if (!kp_id || !amount || amount <= 0) {
          results.push({
            kp_id: kp_id || 'unknown',
            success: false,
            error: 'Dados inválidos'
          });
          continue;
        }

        try {
          const account = await prisma.account.findUnique({
            where: { kp_id },
            include: { wallet: true }
          });

          if (!account) {
            results.push({
              kp_id: kp_id,
              success: false,
              error: 'Conta não encontrada'
            });
            continue;
          }

          const updatedWallet = await prisma.wallet.update({
            where: { kp_id: kp_id },
            data: {
              balance: { increment: amount },
              available_balance: { increment: amount },
              version: { increment: 1 }
            }
          });

          results.push({
            kp_id: kp_id,
            success: true,
            balance: Number(updatedWallet.balance),
            amount_funded: amount
          });

        } catch (err) {
          results.push({
            kp_id: kp_id,
            success: false,
            error: err.message
          });
        }
      }

      return reply.send({
        success: true,
        message: `✅ ${results.filter(r => r.success).length} contas financiadas`,
        results: results
      });

    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 6. HEALTH CHECK (DEV)
  // ============================================
  fastify.get('/health', async (req, reply) => {
    try {
      const walletCount = await prisma.wallet.count();
      const accountCount = await prisma.account.count();

      return reply.send({
        success: true,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        stats: {
          accounts: accountCount,
          wallets: walletCount
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports = devRoutes;
