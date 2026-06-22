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
const { getDomainData } = require('../../utils/domain-data');

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
  
  static async getDomainData(kp_id, accountType) {
    return getDomainData(kp_id, accountType);
  }
}

module.exports = MeService;