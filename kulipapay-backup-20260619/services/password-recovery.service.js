const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

class PasswordRecoveryService {
  
  // Solicitar recuperação de senha
  async requestRecovery(identifier) {
    // Verificar se é email ou telefone
    const isEmail = identifier.includes('@');
    
    const account = await prisma.account.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier }
    });
    
    if (!account) {
      // Por segurança, não revelar se o utilizador existe
      return { 
        success: true, 
        message: 'Se a conta existir, receberá um código de recuperação' 
      };
    }
    
    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    
    // Guardar token
    await prisma.resetToken.create({
      data: {
        kpId: account.kpId,
        token,
        expires_at: expiresAt,
        used: false
      }
    });
    
    // TODO: Enviar email/SMS com o token
    console.log(`[RECOVERY] Token for ${account.kpId}: ${token}`);
    console.log(`[RECOVERY] Link: http://localhost:3000/reset-password?token=${token}`);
    
    return {
      success: true,
      message: 'Código de recuperação enviado',
      // Em desenvolvimento, retornar token para teste
      ...(process.env.NODE_ENV !== 'production' && { token })
    };
  }
  
  // Verificar token
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
  
  // Redefinir senha
  async resetPassword(token, newPassword) {
    // Validar token
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
    
    // Validar nova senha
    if (!newPassword || newPassword.length < 6) {
      throw new Error('PASSWORD_TOO_SHORT');
    }
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Atualizar senha
    await prisma.account.update({
      where: { kpId: resetToken.kpId },
      data: { passwordHash: hashedPassword }
    });
    
    // Marcar token como usado
    await prisma.resetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });
    
    // Invalidar todas as sessões ativas
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
