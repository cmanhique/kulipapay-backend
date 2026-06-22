const { prisma } = require('../prisma');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class PasswordRecoveryService {
  
  async requestRecovery(identifier) {
    const isEmail = identifier.includes('@');
    
    const account = await prisma.account.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier }
    });
    
    if (!account) {
      return { 
        success: true, 
        message: 'Se a conta existir, receberá um código de recuperação' 
      };
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await prisma.resetToken.create({
      data: {
        kpId: account.kp_id,
        token,
        expires_at: expiresAt,
        used: false
      }
    });
    
    console.log(`[RECOVERY] Token for ${account.kp_id}: ${token}`);
    console.log(`[RECOVERY] Link: http://localhost:3000/reset-password?token=${token}`);
    
    return {
      success: true,
      message: 'Código de recuperação enviado',
      ...(process.env.NODE_ENV !== 'production' && { token })
    };
  }
  
  async verifyToken(token) {
    const resetToken = await prisma.resetToken.findUnique({
      where: { token },
      include: { account: true }
    });
    
    if (!resetToken) {
      throw new Error('INVALID_TOKEN');
    }
    
    if (resetToken.used) {
      throw new Error('TOKEN_ALREADY_USED');
    }
    
    if (resetToken.expires_at < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }
    
    return {
      valid: true,
      kpId: resetToken.kpId
    };
  }
  
  async resetPassword(token, newPassword) {
    const resetToken = await prisma.resetToken.findUnique({
      where: { token }
    });
    
    if (!resetToken) {
      throw new Error('INVALID_TOKEN');
    }
    
    if (resetToken.used) {
      throw new Error('TOKEN_ALREADY_USED');
    }
    
    if (resetToken.expires_at < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }
    
    if (!newPassword || newPassword.length < 6) {
      throw new Error('PASSWORD_TOO_SHORT');
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.account.update({
      where: { kp_id: resetToken.kpId },
      data: { passwordHash: hashedPassword }
    });
    
    await prisma.resetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });
    
    await prisma.session.deleteMany({
      where: { kpId: resetToken.kpId }
    });
    
    return {
      success: true,
      message: 'Senha redefinida com sucesso'
    };
  }
}

module.exports = new PasswordRecoveryService();