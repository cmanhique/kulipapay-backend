/**
 * IDENTITY CONTEXT ENGINE
 * 
 * 🎯 Fonte única de verdade para identidade
 * 
 * Responsabilidades:
 * 1. Buscar dados da conta
 * 2. Buscar dados da wallet
 * 3. Construir permissões (Access Model)
 * 4. Construir UI (UI Registry)
 * 5. Buscar métricas
 * 6. Montar contexto completo e consistente
 */

const { prisma } = require('../../../prisma');
const AccessModel = require('../../../identity/access/access.model');
const UIRegistry = require('../../../identity/ui/ui.registry');
const PermissionsEngine = require('../../../identity/permissions/permissions.engine');
const { getDomainData } = require('../../../utils/domain-data');

class IdentityContextEngine {

  /**
   * Build completo do contexto de identidade
   */
  static async build(kp_id) {
    // 1. Buscar conta com wallet
    const account = await prisma.account.findUnique({
      where: { kp_id },
      include: {
        wallet: true,
        kyc: true
      }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // 2. Construir Access Model
    const access = AccessModel.build(account.account_type);

    // 3. Construir UI
    const ui = UIRegistry.getUI(account.account_type);

    // 4. Buscar métricas
    const metrics = await this.getMetrics(kp_id, account.account_type);

    // 5. Buscar dados do domínio
    const domainData = await this.getDomainData(kp_id, account.account_type);

    // 6. Montar resposta consistente
    return {
      // Quem é
      account: {
        kp_id: account.kp_id,
        email: account.email,
        phone: account.phone,
        name: account.name,
        account_type: account.account_type,
        role: account.role,
        status: account.status,
        country: account.country,
        kyc_status: account.kyc?.status || 'PENDING',
        created_at: account.created_at
      },

      // Onde está o dinheiro
      wallet: account.wallet ? {
        balance: parseFloat(account.wallet.balance),
        version: account.wallet.version
      } : null,

      // O que pode fazer (ACCESS MODEL)
      access: {
        modules: access.modules,
        actions: access.actions,
        limits: access.limits,
        canAccess: access.canAccess,
        canPerform: access.canPerform
      },

      // UI (separado)
      ui: {
        dashboard_type: ui.dashboard_type,
        navigation: ui.navigation,
        module_details: ui.module_details
      },

      // Métricas
      metrics: metrics,

      // Dados do domínio
      domain: domainData
    };
  }

  /**
   * Buscar métricas rápidas
   */
  static async getMetrics(kp_id, accountType) {
    const metrics = {
      today: { transactions: 0, volume: 0 },
      total: { transactions: 0 }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const todayCount = await prisma.transactionLedger.count({
        where: { kp_id, created_at: { gte: today } }
      });
      metrics.today.transactions = todayCount;

      const totalCount = await prisma.transactionLedger.count({
        where: { kp_id }
      });
      metrics.total.transactions = totalCount;

      if (accountType === 'MERCHANT') {
        // 🔥 CORRIGIDO: prisma.payment → prisma.paymentTransaction
        const todaySales = await prisma.paymentTransaction.aggregate({
          where: { merchant_id: kp_id, status: 'COMPLETED', created_at: { gte: today } },
          _sum: { amount: true }
        });
        metrics.today.volume = parseFloat(todaySales._sum.amount || 0);
      }
    } catch (error) {
      // Ignorar erros de métricas
    }

    return metrics;
  }

  /**
   * Buscar dados do domínio específico
   */
  static async getDomainData(kp_id, accountType) {
    return getDomainData(kp_id, accountType);
  }

  /**
   * Método auxiliar para obter apenas a conta
   */
  static async getAccount(kp_id) {
    const account = await prisma.account.findUnique({
      where: { kp_id },
      include: {
        wallet: true,
        kyc: true
      }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }
}

module.exports = IdentityContextEngine;