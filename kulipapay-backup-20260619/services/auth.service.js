const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../prisma');
const {
  ValidationError,
  UnauthorizedError,
  NotFoundError
} = require('../utils/errors');

const {
  generateDeviceFingerprint,
  isIpSuspicious,
  isUserAgentSuspicious,
  enforceSessionLimit
} = require('../utils/security');

const otpService = require('./otp.service');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXP = '15m';
const REFRESH_DAYS = 7;

if (!JWT_SECRET) throw new Error('JWT_SECRET missing');

const hashToken = (t) =>
  crypto.createHash('sha256').update(t).digest('hex');

const generateRefreshToken = () =>
  crypto.randomBytes(64).toString('hex');

const generateFamilyId = () =>
  crypto.randomUUID();

const isLocked = (acc) =>
  acc.lockedUntil && acc.lockedUntil > new Date();

class AuthService {

  async _createSession(account, meta = {}) {

    await enforceSessionLimit(account.kp_id, 3);

    const fingerprint = generateDeviceFingerprint(
      meta.ip, 
      meta.userAgent,
      { deviceId: meta.deviceId }
    );

    const accessToken = jwt.sign(
      {
        kp_id: account.kp_id,
        accountType: account.account_type,
        role: account.role,
        isAgent: account.isAgent || false,
        fingerprint: fingerprint
      },
      JWT_SECRET,
      { expiresIn: ACCESS_EXP }
    );

    const refreshToken = generateRefreshToken();
    const familyId = meta.familyId || generateFamilyId();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_DAYS * 86400000);

    await prisma.session.create({
      data: {
        kp_id: account.kp_id,
        access_token: accessToken,
        refresh_token: hashToken(refreshToken),

        family_id: familyId,
        device_id: meta.deviceId || fingerprint,
        ip: meta.ip || null,
        user_agent: meta.userAgent || null,
        fingerprint: fingerprint,

        revoked: false,
        expires_at: expiresAt,
        refresh_expires_at: expiresAt
      }
    });

    return {
      success: true,
      token: accessToken,
      refreshToken,
      familyId,
      account: {
        kp_id: account.kp_id,
        email: account.email,
        phone: account.phone,
        name: account.name,
        accountType: account.account_type
      }
    };
  }

  async login(identifier, password, meta = {}) {

    if (!identifier || !password) {
      throw new ValidationError('Missing credentials');
    }

    const value = identifier.trim();

    const account = await prisma.account.findFirst({
      where: {
        OR: [
          { kp_id: value },
          { email: value.toLowerCase() },
          { phone: value }
        ]
      }
    });

    if (!account) throw new UnauthorizedError('Invalid credentials');
    if (isLocked(account)) throw new UnauthorizedError('Account locked');

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    // 🔥 VERIFICA SE PRECISA DE 2FA
    const needs2FA = await otpService.requiresTwoFactor(account.kp_id);

    if (needs2FA) {
      await otpService.generateOtp(account.kp_id, 'LOGIN');

      return {
        success: true,
        requiresTwoFactor: true,
        kp_id: account.kp_id,
        message: 'Código OTP enviado'
      };
    }

    return this._createSession(account, meta);
  }

  async refreshToken(refreshToken, meta = {}) {

    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    const hashed = hashToken(refreshToken);

    const session = await prisma.session.findFirst({
      where: { refresh_token: hashed },
      include: { account: true }
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (session.refresh_expires_at < new Date()) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true }
      });
      throw new UnauthorizedError('Expired refresh token');
    }

    if (session.revoked) {
      await prisma.session.updateMany({
        where: {
          family_id: session.family_id
        },
        data: { revoked: true }
      });

      throw new UnauthorizedError('Refresh token reuse detected');
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { revoked: true }
    });

    return this._createSession(session.account, {
      familyId: session.family_id,
      deviceId: session.device_id,
      ip: meta.ip || session.ip,
      userAgent: meta.userAgent || session.user_agent
    });
  }

  async logout(refreshToken, mode = 'device') {

    const hashed = hashToken(refreshToken);

    const session = await prisma.session.findFirst({
      where: { refresh_token: hashed }
    });

    if (!session) return { success: true };

    if (mode === 'all') {
      await prisma.session.updateMany({
        where: { family_id: session.family_id },
        data: { revoked: true }
      });
    } else {
      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true }
      });
    }

    return { success: true };
  }

  async logoutAll(kp_id) {
    await prisma.session.updateMany({
      where: {
        kp_id,
        revoked: false
      },
      data: { revoked: true }
    });

    return { success: true };
  }

  async getAccount(kp_id) {
    const account = await prisma.account.findUnique({
      where: { kp_id },
      include: { wallet: true }
    });

    if (!account) throw new NotFoundError('Account');

    return account;
  }
}

module.exports = new AuthService();