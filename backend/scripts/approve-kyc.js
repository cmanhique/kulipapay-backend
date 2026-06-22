const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function approveKYC() {
  try {
    const kp_id = process.argv[2] || 'MER-00001';
    
    console.log(`📌 A aprovar KYC para ${kp_id}...`);
    
    // Verificar se o perfil KYC existe
    const existing = await prisma.kycProfile.findUnique({
      where: { kp_id }
    });
    
    if (!existing) {
      console.log('❌ Perfil KYC não encontrado. A criar...');
      
      // Criar perfil KYC se não existir (incluindo files obrigatório)
      await prisma.kycProfile.create({
        data: {
          kp_id: kp_id,
          status: 'APPROVED',
          type: 'MERCHANT',
          full_name: 'Merchant Test',
          files: {} // Campo obrigatório - vazio por enquanto
        }
      });
      
      console.log('✅ Perfil KYC criado e aprovado!');
    } else {
      // Atualizar status
      const updated = await prisma.kycProfile.update({
        where: { kp_id },
        data: { status: 'APPROVED' }
      });
      
      console.log('✅ KYC atualizado com sucesso!');
      console.log('   kp_id:', updated.kp_id);
      console.log('   status:', updated.status);
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar KYC:', error.message);
    console.error('   Detalhes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveKYC();
