const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class KycService {
  async submitKyc(kpId, data) {
    const { type, businessName, address, documentNumber, nuit } = data;
    
    await prisma.account.update({
      where: { kpId: kpId },
      data: { account_type: type }
    });
    
    const kyc = await prisma.kycProfile.upsert({
      where: { kpId: kpId },
      update: {
        type,
        status: 'PENDING',
        business_name: businessName,
        address,
        document_number: documentNumber,
        tax_number: nuit,
        updated_at: new Date()
      },
      create: {
        kpId: kpId,
        type,
        status: 'PENDING',
        business_name: businessName,
        address,
        document_number: documentNumber,
        tax_number: nuit,
        files: []
      }
    });
    
    return kyc;
  }
  
  async getKycStatus(kpId) {
    const kyc = await prisma.kycProfile.findUnique({ where: { kpId: kpId } });
    if (!kyc) return { status: 'NOT_SUBMITTED', accountType: 'INDIVIDUAL' };
    return { status: kyc.status, accountType: kyc.type };
  }
  
  async getPendingKycs() {
    return prisma.kycProfile.findMany({
      where: { status: 'PENDING' },
      include: { account: { select: { email: true, phone: true, name: true } } }
    });
  }
  
  async approveKyc(kycId, notes) {
    const kyc = await prisma.kycProfile.update({
      where: { id: kycId },
      data: { status: 'APPROVED', updated_at: new Date() }
    });
    return kyc;
  }
  
  async rejectKyc(kycId, reason) {
    const kyc = await prisma.kycProfile.update({
      where: { id: kycId },
      data: { status: 'REJECTED', rejected_reason: reason, updated_at: new Date() }
    });
    await prisma.account.update({
      where: { kpId: kyc.kpId },
      data: { account_type: 'INDIVIDUAL' }
    });
    return kyc;
  }
}

module.exports = new KycService();
