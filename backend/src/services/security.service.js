const crypto = require('crypto');

class SecurityService {
  
  generateTokens(kpId) {
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(64).toString('hex');
    
    return {
      accessToken,
      refreshToken,
      accessExpiresIn: 15 * 60, // 15 minutos
      refreshExpiresIn: 7 * 24 * 60 * 60 // 7 dias
    };
  }
  
  validatePassword(password) {
    if (password.length < 6) {
      return { valid: false, error: 'PASSWORD_TOO_SHORT' };
    }
    return { valid: true };
  }
  
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '');
    }
    return input;
  }
  
  maskSensitiveData(data) {
    if (data && data.phone) {
      data.phone = data.phone.replace(/(\+258\d{3})\d{4}/, '$1****');
    }
    if (data && data.email) {
      const [local, domain] = data.email.split('@');
      data.email = `${local.slice(0, 2)}***@${domain}`;
    }
    return data;
  }
  
  logSecurityEvent(event, details) {
    console.log(`[SECURITY] ${new Date().toISOString()} - ${event}`, details);
  }
}

module.exports = new SecurityService();
