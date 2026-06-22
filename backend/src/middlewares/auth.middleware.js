const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');
const { UnauthorizedError } = require('../utils/errors');
const { generateDeviceFingerprint } = require('../utils/security');

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET_REQUIRED');
}

async function authenticate(req, reply) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing token');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (!decoded.kp_id) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // =========================
    // 1. LOAD SESSION (HARD BIND)
    // =========================
    const session = await prisma.session.findFirst({
      where: {
        access_token: token,
        revoked: false
      }
    });

    if (!session) {
      throw new UnauthorizedError('Session not found or revoked');
    }

    if (session.expires_at < new Date()) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true }
      });
      throw new UnauthorizedError('Session expired');
    }

    // =========================
    // 2. LOAD USER
    // =========================
    const user = await prisma.account.findUnique({
      where: { kp_id: decoded.kp_id },
      include: {
        wallet: true,
        risk_score: true,
        sessions: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account inactive');
    }

    // =========================
    // 3. DEVICE FINGERPRINT CHECK
    // =========================
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    const currentFingerprint = generateDeviceFingerprint(ip, userAgent);

    if (session.fingerprint && session.fingerprint !== currentFingerprint) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true }
      });

      throw new UnauthorizedError('Device mismatch detected');
    }

    // =========================
    // 4. SESSION FAMILY POLICY
    // =========================
    if (session.family_id) {
      const activeSessions = await prisma.session.count({
        where: {
          kp_id: user.kp_id,
          family_id: session.family_id,
          revoked: false
        }
      });

      if (activeSessions > 5) {
        throw new UnauthorizedError('Too many active sessions');
      }
    }

    // =========================
    // 5. ATTACH USER CONTEXT
    // =========================
    req.user = {
      // 🔥 AMBOS OS FORMATOS PARA COMPATIBILIDADE
      kp_id: user.kp_id,           // ← snake_case (existente)
      kpId: user.kp_id,            // ← camelCase (ADICIONADO)
      email: user.email,
      phone: user.phone,
      accountType: user.account_type,
      role: user.role,
      wallet: user.wallet,
      sessionId: session.id,
      familyId: session.family_id,
      fingerprint: currentFingerprint,
      riskScore: user.risk_score?.score || 0,
      riskLevel: user.risk_score?.level || 'LOW'
    };

  } catch (err) {
    throw err;
  }
}

module.exports = { authenticate };