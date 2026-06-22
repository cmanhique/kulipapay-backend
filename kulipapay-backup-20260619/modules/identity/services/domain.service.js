/**
 * DOMAIN SERVICE
 * 
 * Responsável por:
 * - Buscar dados específicos do domínio
 * - Merchant, Agent, Business
 */

const { prisma } = require('../../../prisma');

class DomainService {
  
  static async get(kp_id, accountType) {
    try {
      if (accountType === 'MERCHANT') {
        return await this.getMerchant(kp_id);
      }

      if (accountType === 'AGENT') {
        return await this.getAgent(kp_id);
      }

      if (accountType === 'BUSINESS') {
        return await this.getBusiness(kp_id);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  static async getMerchant(kp_id) {
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

  static async getAgent(kp_id) {
    const agent = await prisma.agent.findUnique({
      where: { kp_id }
    });

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

  static async getBusiness(kp_id) {
    // TODO: Implementar quando modelo Business existir
    return {
      type: 'business'
    };
  }
}

module.exports = DomainService;
