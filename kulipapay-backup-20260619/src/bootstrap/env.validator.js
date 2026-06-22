const fs = require('fs');
const path = require('path');

class EnvValidator {
  static requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET'
  ];

  static validate() {
    const missing = [];
    const warnings = [];

    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (process.env.JWT_SECRET === 'CHANGE_IN_PRODUCTION' || 
        process.env.JWT_SECRET === 'kulipapay-secret-key') {
      warnings.push('JWT_SECRET usando valor padrão inseguro');
    }

    if (missing.length > 0) {
      throw new Error(`Variáveis faltando: ${missing.join(', ')}`);
    }

    if (warnings.length > 0) {
      console.warn('⚠️  Warnings:', warnings);
    }

    console.log('✅ Environment validation passed');
    return true;
  }
}

module.exports = EnvValidator;
