/**
 * Domain-specific profile data keyed by kp_id (public identifier).
 */
const { prisma } = require('../prisma');

async function getDomainData(kp_id, accountType) {
  try {
    if (accountType === 'MERCHANT') {
      const account = await prisma.account.findUnique({
        where: { kp_id },
        include: {
          merchantProfile: {
            include: {
              cashiers: {
                where: { status: 'ACTIVE' },
                select: {
                  id: true,
                  name: true,
                  status: true,
                  total_received: true,
                  transaction_count: true,
                },
              },
            },
          },
        },
      });

      const merchant = account?.merchantProfile;
      if (!merchant) return null;

      return {
        type: 'merchant',
        business_name: merchant.business_name,
        business_type: merchant.business_type,
        tax_id: merchant.tax_id,
        cashiers_count: merchant.cashiers.length,
        cashiers: merchant.cashiers,
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
        deposit_commission_rate: agent.deposit_commission_rate,
        withdrawal_commission_rate: agent.withdrawal_commission_rate,
        business_photo_url: agent.business_photo_url,
        kyc_complete: Boolean(agent.business_photo_url),
        total_commission_earned: parseFloat(agent.total_commission_earned),
        total_deposits_volume: parseFloat(agent.total_deposits_volume),
        total_withdrawals_volume: parseFloat(agent.total_withdrawals_volume),
      };
    }

    if (accountType === 'ENTERPRISE') {
      const account = await prisma.account.findUnique({
        where: { kp_id },
        include: { enterpriseProfile: true },
      });

      const enterprise = account?.enterpriseProfile;
      if (!enterprise) return null;

      return {
        type: 'enterprise',
        business_name: enterprise.business_name,
        tax_id: enterprise.tax_id,
        industry: enterprise.industry,
        status: enterprise.status,
        business_license_url: enterprise.business_license_url,
        kyc_complete: Boolean(enterprise.business_license_url),
      };
    }

    if (accountType === 'BUSINESS') {
      return { type: 'business' };
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = { getDomainData };
