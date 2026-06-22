/**
 * ME SERVICE (REFATORADO)
 * 
 * 🎯 Mudanças:
 * 1. Usa Access Model como fonte única
 * 2. UI vem do UIRegistry (separado)
 * 3. Limits vêm do core via Access Model
 * 4. /me fica limpo e responsável
 */

const { prisma } = require('../../prisma');
const AccessModel = require('../access/access.model');
const UIRegistry = require('../ui/ui.registry');

class MeService {
  
  static async getMe(kp_id) {
    // 1. Buscar conta
    const account = await prisma.account.findUnique({
      where: { kp_id },
      include: { wallet: true, kyc: true }
    });
    
    if (!account) throw new Error('Account not found');
    
    // 2. Construir Access Model (fonte única)
    const access = AccessModel.build(account.account_type);
    
    // 3. Buscar UI (separado)
    const ui = UIRegistry.getUI(account.account_type);
    
    // 4. Buscar métricas
    const metrics = await this.getMetrics(kp_id, account.account_type);
    
    // 5. Buscar domain data
    const domainData = await this.getDomainData(kp_id, account.account_type);
    
    // 6. Resposta limpa e organizada
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
      
      // O que pode fazer (ACCESS MODEL - fonte única)
      access: {
        modules: access.modules,
        actions: access.actions,
        limits: access.limits,
        canAccess: access.canAccess,
        canPerform: access.canPerform
      },
      
      // UI (separado do access)
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
  
  // ============ MÉTODOS AUXILIARES ============
  
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
  
  static async getDomainData(kp_id, accountType) {
    try {
      if (accountType === 'MERCHANT') {
        const merchant = await prisma.merchantProfile.findUnique({
          where: { kp_id },
          include: {
            cashiers: {
              where: { status: 'ACTIVE' },
              select: { cashierId: true, name: true, status: true, totalTransactions: true, totalAmount: true }
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

module.exports = MeService;
