const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function requireAdmin(request, reply) {
  try {
    const { kpId } = request.user;
    
    const account = await prisma.account.findUnique({
      where: { kpId: kpId },
      select: { account_type: true, email: true }
    });
    
    // Admin se: tipo BUSINESS OU email específico
    const isAdmin = account?.account_type === 'BUSINESS' || 
                    account?.email === 'admin@kulipapay.com';
    
    console.log('Admin check:', { kpId, account_type: account?.account_type, email: account?.email, isAdmin });
    
    if (!isAdmin) {
      return reply.status(403).send({ 
        error: 'FORBIDDEN', 
        message: 'Acesso restrito a administradores' 
      });
    }
    
    request.isAdmin = true;
    
  } catch (error) {
    console.error('Admin middleware error:', error);
    return reply.status(403).send({ error: 'FORBIDDEN' });
  }
}

module.exports = { requireAdmin };
