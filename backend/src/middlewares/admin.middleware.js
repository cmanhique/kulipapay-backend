const { UnauthorizedError } = require('../utils/errors');

async function adminMiddleware(req, reply) {
  // O middleware authenticate já foi executado antes
  if (!req.user) {
    throw new UnauthorizedError('Unauthenticated');
  }

  const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(req.user.role)) {
    throw new UnauthorizedError('Admin access required');
  }
}

module.exports = { adminMiddleware };
