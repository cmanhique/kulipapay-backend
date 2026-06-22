/**
 * ANALYTICS SERVICE
 * 
 * 🎯 Agrega métricas para dashboards enterprise
 */

const { prisma } = require('../../prisma');

class AnalyticsService {
  
  /**
   * KPIs Financeiros
   */
  static async getFinancialMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    // Volume hoje (apenas transações CONFIRMED)
    const todayVolume = await prisma.transactionLedger.aggregate({
      where: {
        type: 'DEBIT',
        status: 'CONFIRMED',
        created_at: { gte: today }
      },
      _sum: { amount: true }
    });
    
    // Volume mês
    const monthVolume = await prisma.transactionLedger.aggregate({
      where: {
        type: 'DEBIT',
        status: 'CONFIRMED',
        created_at: { gte: monthStart }
      },
      _sum: { amount: true }
    });
    
    // Taxas cobradas
    const fees = await prisma.transactionLedger.aggregate({
      where: {
        reference: { startsWith: 'FEE-' },
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });
    
    // Saldo total
    const totalBalance = await prisma.wallet.aggregate({
      _sum: { balance: true }
    });
    
    // Saldo em escrow (conta PLATFORM_ESCROW)
    const escrowWallet = await prisma.wallet.findUnique({
      where: { kp_id: 'PLATFORM_ESCROW' },
      select: { balance: true }
    });
    
    const escrowBalance = Number(escrowWallet?.balance || 0);
    const totalBal = Number(totalBalance._sum.balance || 0);
    
    return {
      volume: {
        today: Number(todayVolume._sum.amount || 0),
        month: Number(monthVolume._sum.amount || 0)
      },
      fees: Number(fees._sum.amount || 0),
      totalBalance: totalBal,
      escrowBalance: escrowBalance,
      availableBalance: totalBal - escrowBalance
    };
  }
  
  /**
   * KPIs Operacionais
   */
  static async getOperationalMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Contagens básicas
    const totalUsers = await prisma.account.count();
    const activeUsers = await prisma.account.count({ where: { status: 'ACTIVE' } });
    const merchants = await prisma.account.count({ where: { role: 'MERCHANT' } });
    const blockedUsers = await prisma.account.count({ where: { status: 'BLOCKED' } });
    
    // KYC (se existir o modelo KycProfile)
    let pendingKyc = 0;
    let approvedKyc = 0;
    try {
      pendingKyc = await prisma.kycProfile.count({ where: { status: 'PENDING' } });
      approvedKyc = await prisma.kycProfile.count({ where: { status: 'APPROVED' } });
    } catch (e) {
      // Se o modelo não existir, ignora
    }
    
    // Transações hoje
    const todayTransactions = await prisma.transactionLedger.count({
      where: {
        created_at: { gte: today },
        status: 'CONFIRMED'
      }
    });
    
    // Cashiers ativos (se existir o modelo Cashier)
    let activeCashiers = 0;
    try {
      activeCashiers = await prisma.cashier.count({
        where: { status: 'ACTIVE' }
      });
    } catch (e) {
      // Se o modelo não existir, ignora
    }
    
    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        merchants: merchants,
        blocked: blockedUsers
      },
      kyc: {
        pending: pendingKyc,
        approved: approvedKyc
      },
      transactions: {
        today: todayTransactions
      },
      cashiers: {
        active: activeCashiers
      }
    };
  }
  
  /**
   * KPIs de Risco/Fraude
   */
  static async getRiskMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fraud alerts (se existir o modelo)
    let fraudAlertsToday = 0;
    let totalFraudAlerts = 0;
    try {
      fraudAlertsToday = await prisma.fraudAlert.count({
        where: { created_at: { gte: today } }
      });
      totalFraudAlerts = await prisma.fraudAlert.count();
    } catch (e) {}
    
    // High risk users (se existir o modelo RiskScore)
    let highRiskUsers = 0;
    try {
      highRiskUsers = await prisma.riskScore.count({
        where: { score: { gte: 70 } }
      });
    } catch (e) {}
    
    // Blocked actions (se existir o modelo)
    let blockedActionsToday = 0;
    try {
      blockedActionsToday = await prisma.blockedAction.count({
        where: { created_at: { gte: today } }
      });
    } catch (e) {}
    
    return {
      fraud: {
        alertsToday: fraudAlertsToday,
        totalAlerts: totalFraudAlerts
      },
      risk: {
        highRiskUsers: highRiskUsers
      },
      security: {
        blockedActionsToday: blockedActionsToday
      }
    };
  }
  
  /**
   * Estado do Sistema
   */
  static async getSystemStatus() {
    // Verificar database
    let dbStatus = 'online';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'offline';
    }
    
    return {
      api: {
        status: 'online',
        uptime: process.uptime()
      },
      database: {
        status: dbStatus
      },
      cache: {
        status: 'online' // Redis status pode ser verificado
      },
      sse: {
        status: 'online'
      }
    };
  }
  
  /**
   * Ledger Reconciliation
   */
  static async getLedgerMetrics() {
    // Total débitos
    const debits = await prisma.transactionLedger.aggregate({
      where: { type: 'DEBIT', status: 'CONFIRMED' },
      _sum: { amount: true }
    });
    
    // Total créditos
    const credits = await prisma.transactionLedger.aggregate({
      where: { type: 'CREDIT', status: 'CONFIRMED' },
      _sum: { amount: true }
    });
    
    // Saldo total das wallets
    const wallets = await prisma.wallet.aggregate({
      _sum: { balance: true }
    });
    
    const totalDebits = Number(debits._sum.amount || 0);
    const totalCredits = Number(credits._sum.amount || 0);
    const totalBalance = Number(wallets._sum.balance || 0);
    const ledgerBalance = totalCredits - totalDebits;
    const diff = totalBalance - ledgerBalance;
    
    return {
      debits: totalDebits,
      credits: totalCredits,
      ledgerBalance: ledgerBalance,
      walletBalance: totalBalance,
      reconciled: Math.abs(diff) < 0.01,
      difference: diff
    };
  }
  
  /**
   * Dashboard Executivo (tudo agregado)
   */
  static async getExecutiveDashboard() {
    const [financial, operational, risk, system, ledger] = await Promise.all([
      this.getFinancialMetrics(),
      this.getOperationalMetrics(),
      this.getRiskMetrics(),
      this.getSystemStatus(),
      this.getLedgerMetrics()
    ]);
    
    return {
      financial,
      operational,
      risk,
      system,
      ledger,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AnalyticsService;
