/**
 * ACCOUNT SERVICE
 */

const { prisma } = require('../../../prisma');

class AccountService {
  
  static async get(kp_id) {
    const account = await prisma.account.findUnique({
      where: { kp_id },
      include: {
        kyc: true  // 🔥 INCLUIR KYC
      }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      kp_id: account.kp_id,
      email: account.email,
      phone: account.phone,
      name: account.name,
      account_type: account.account_type,
      role: account.role,
      status: account.status,
      country: account.country,
      kyc: account.kyc,  // 🔥 INCLUIR KYC NA RESPOSTA
      kyc_status: account.kyc?.status || 'PENDING',
      created_at: account.created_at
    };
  }

  static async updateProfile(kp_id, data) {
    return prisma.account.update({
      where: { kp_id },
      data
    });
  }
}

module.exports = AccountService;
