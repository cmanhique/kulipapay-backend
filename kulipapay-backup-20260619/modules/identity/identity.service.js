/**
 * IDENTITY SERVICE
 * 
 * 🎯 Fonte única de verdade para identidade
 * 
 * Regras:
 * - Nunca acede diretamente a Prisma fora da service
 * - Usa engines para lógica de negócio
 * - Retorna dados consistentes
 */

const { prisma } = require('../../prisma');
const AccessModel = require('../../identity/access/access.model');
const UIRegistry = require('../../identity/ui/ui.registry');

class IdentityService {

  /**
   * Obter dados completos do utilizador
   */
  static async getMe(kp_id) {
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
      wallet: account.wallet ? {
        balance: parseFloat(account.wallet.balance),
        version: account.wallet.version
      } : null,
      access: {
        modules: access.modules,
        actions: access.actions,
        limits: access.limits,
        canAccess: access.canAccess,
        canPerform: access.canPerform
      },
      ui: {
        dashboard_type: ui.dashboard_type,
        navigation: ui.navigation,
        module_details: ui.module_details
      },
      metrics: metrics,
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
        const todaySales = await prisma.payment.aggregate({
          where: { merchantId: kp_id, status: 'COMPLETED', completedAt: { gte: today } },
          _sum: { total: true }
        });
        metrics.today.volume = parseFloat(todaySales._sum.total || 0);
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
    try {
      if (accountType === 'MERCHANT') {
        const merchant = await prisma.merchantProfile.findUnique({
          where: { kp_id },
          include: {
            cashiers: {
              where: { status: 'ACTIVE' },
              select: {
                cashierId: true,
                name: true,
                status: true,
                totalTransactions: true,
                totalAmount: true
              }
            }
          }
        });
        if (!merchant) return null;
        return {
          type: 'merchant',
          business_name: merchant.businessName,
          business_type: merchant.businessType,
          tax_id: merchant.taxId,
          verified: merchant.verified,
          cashiers_count: merchant.cashiers.length,
          cashiers: merchant.cashiers
        };
      }

      if (accountType === 'AGENT') {
        const agent = await prisma.agent.findUnique({ where: { kp_id } });
        if (!agent) return null;
        return {
          type: 'agent',
          business_name: agent.business_name,
          phone: agent.phone,
          status: agent.status,
          float_balance: parseFloat(agent.float_balance),
          commission_rate: parseFloat(agent.commission_rate),
          total_commission: parseFloat(agent.total_commission)
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = IdentityService;
