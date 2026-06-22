const { prisma } = require('../prisma');

function requireRole(allowedRoles) {
  return async (request, reply) => {
    try {
      const { kpId } = request.user;
      
      const account = await prisma.account.findUnique({
        where: { kp_id: kpId },
        select: { role: true }
      });
      
      if (!account) {
        return reply.status(401).send({ error: 'UNAUTHORIZED' });
      }
      
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      if (!roles.includes(account.role)) {
        return reply.status(403).send({ 
          error: 'FORBIDDEN', 
          message: 'Insufficient permissions. Required role: ' + roles.join(' or ')
        });
      }
      
      request.userRole = account.role;
      
    } catch (error) {
      console.error('RBAC error:', error);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    }
  };
}

module.exports = { requireRole };