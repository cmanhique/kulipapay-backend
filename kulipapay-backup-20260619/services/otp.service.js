const crypto = require('crypto');
const { prisma } = require('../prisma');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

const OTP_EXPIRATION_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_LENGTH = 6;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

class OtpService {

  async generateOtp(kp_id, type = 'LOGIN') {
    const account = await prisma.account.findUnique({
      where: { kp_id }
    });

    if (!account) {
      throw new ValidationError('Account not found');
    }

    const code = generateOTP();
    const hashed = hashOTP(code);
    
    await prisma.otpCode.deleteMany({
      where: {
        kp_id,
        type,
        used: false,
        expires_at: { lt: new Date() }
      }
    });

    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        kp_id,
        code: hashed,
        type,
        expires_at: expiresAt,
        used: false,
        attempts: 0
      }
    });

    console.log(`📱 Código OTP para ${account.email}: ${code}`);

    return {
      success: true,
      message: 'OTP enviado com sucesso',
      expiresIn: OTP_EXPIRATION_MINUTES * 60
    };
  }

  async verifyOtp(kp_id, code, type = 'LOGIN') {
    if (!code || code.length !== OTP_LENGTH) {
      throw new ValidationError('Código inválido');
    }

    const hashed = hashOTP(code);

    const otp = await prisma.otpCode.findFirst({
      where: {
        kp_id,
        code: hashed,
        type,
        used: false,
        expires_at: { gt: new Date() }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!otp) {
      throw new UnauthorizedError('Código inválido ou expirado');
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { used: true }
      });
      throw new UnauthorizedError('Muitas tentativas');
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: {
        used: true,
        attempts: { increment: 1 }
      }
    });

    return {
      success: true,
      message: 'Código verificado com sucesso'
    };
  }

  async requiresTwoFactor(kp_id) {
    return true;
  }
}

module.exports = new OtpService();
