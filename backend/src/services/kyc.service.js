const { prisma } = require('../prisma');

class KycService {
  async submitKyc(kpId, data) {
    const { type, businessName, address, documentNumber, nuit } = data;
    
    await prisma.account.update({
      where: { kp_id: kpId },
      data: { account_type: type }
    });
    
    const kyc = await prisma.kycProfile.upsert({
      where: { kp_id: kpId },
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
        kp_id: kpId,
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
    const kyc = await prisma.kycProfile.findUnique({ 
      where: { kp_id: kpId } 
    });
    if (!kyc) return { status: 'NOT_SUBMITTED', accountType: 'INDIVIDUAL' };
    return { status: kyc.status, accountType: kyc.type };
  }
  
  async getPendingKycs() {
    return prisma.kycProfile.findMany({
      where: { status: 'PENDING' },
      include: { 
        account: { 
          select: { email: true, phone: true, name: true } 
        } 
      }
    });
  }
  
  async approveKyc(kycId, notes) {
    const kyc = await prisma.kycProfile.update({
      where: { id: kycId },
      data: { 
        status: 'APPROVED', 
        updated_at: new Date(),
        approved_notes: notes
      }
    });
    return kyc;
  }
  
  async rejectKyc(kycId, reason) {
    const kyc = await prisma.kycProfile.update({
      where: { id: kycId },
      data: { 
        status: 'REJECTED', 
        rejected_reason: reason, 
        updated_at: new Date() 
      }
    });
    await prisma.account.update({
      where: { kp_id: kyc.kp_id },
      data: { account_type: 'INDIVIDUAL' }
    });
    return kyc;
  }
}

module.exports = new KycService();