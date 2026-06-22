const jwt = require('jsonwebtoken');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Cashier JWT auth — separate from account auth (not modifying auth.middleware.js).
 */
async function authenticateCashier(req, reply) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing token');
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'CASHIER') {
      throw new UnauthorizedError('Not a cashier token');
    }

    if (!decoded.cashierId || !decoded.merchantId || !decoded.sessionId) {
      throw new UnauthorizedError('Invalid cashier token payload');
    }

    req.user = {
      cashierId: decoded.cashierId,
      merchantId: decoded.merchantId,
      sessionId: decoded.sessionId,
      role: 'CASHIER',
    };
  } catch (error) {
    if (error.name === 'UnauthorizedError') {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: error.message },
      });
    }

    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

/**
 * Accept merchant account JWT OR cashier JWT.
 */
async function authenticateMerchantOrCashier(req, reply) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing token');
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'CASHIER') {
      req.user = {
        cashierId: decoded.cashierId,
        merchantId: decoded.merchantId,
        sessionId: decoded.sessionId,
        role: 'CASHIER',
      };
      return;
    }

    if (decoded.kp_id) {
      req.user = {
        kpId: decoded.kp_id,
        role: decoded.role || 'USER',
      };
      return;
    }

    throw new UnauthorizedError('Invalid token');
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });
  }
}

module.exports = {
  authenticateCashier,
  authenticateMerchantOrCashier,
};
