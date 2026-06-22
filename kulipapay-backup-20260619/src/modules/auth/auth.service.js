/**
 * AUTH SERVICE (v2)
 * 
 * Versão modular e limpa do auth
 */

const authService = require('../../services/auth.service');
const otpService = require('../../services/otp.service');
const { prisma } = require('../../prisma');

class AuthService {
  
  static async login(identifier, password, metadata) {
    return authService.login(identifier, password, metadata);
  }

  static async refreshToken(refreshToken, metadata) {
    return authService.refreshToken(refreshToken, metadata);
  }

  static async logout(refreshToken) {
    return authService.logout(refreshToken);
  }

  static async verifyOtp(kp_id, code, type, metadata) {
    // Verificar OTP
    await otpService.verifyOtp(kp_id, code, type || 'LOGIN');

    // Buscar conta
    const account = await prisma.account.findUnique({
      where: { kp_id }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Criar sessão
    return authService._createSession(account, {
      ip: metadata?.ip || 'unknown',
      userAgent: metadata?.userAgent || 'unknown'
    });
  }
}

module.exports = AuthService;
