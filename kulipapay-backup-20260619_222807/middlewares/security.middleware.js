const rateLimit = require('@fastify/rate-limit');
const helmet = require('@fastify/helmet');

// Limites por tipo de rota
const rateLimits = {
  public: { max: 30, timeWindow: '1 minute' },      // Registro, login
  authenticated: { max: 100, timeWindow: '1 minute' }, // Usuários logados
  financial: { max: 20, timeWindow: '1 minute' },    // Transferências, depósitos
  admin: { max: 10, timeWindow: '1 minute' }         // Rotas administrativas
};

// Validação de input
function validateInput(schema) {
  return async (request, reply) => {
    try {
      // Validar body
      if (schema.body && request.body) {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema.body)) {
          const value = request.body[field];
          
          if (rules.required && !value) {
            errors.push(`${field} is required`);
          }
          
          if (rules.type && typeof value !== rules.type) {
            errors.push(`${field} must be of type ${rules.type}`);
          }
          
          if (rules.min && value < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
          }
          
          if (rules.max && value > rules.max) {
            errors.push(`${field} must be at most ${rules.max}`);
          }
          
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} has invalid format`);
          }
        }
        
        if (errors.length > 0) {
          return reply.status(400).send({ 
            error: 'VALIDATION_ERROR', 
            details: errors 
          });
        }
      }
    } catch (error) {
      return reply.status(400).send({ error: 'INVALID_INPUT' });
    }
  };
}

// Sanitização de inputs (prevenir XSS, SQL injection)
function sanitizeInput(data) {
  if (typeof data === 'string') {
    // Remover caracteres perigosos
    return data.replace(/[<>]/g, '').trim();
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return data;
}

// Middleware de sanitização
async function sanitizeRequest(request, reply) {
  if (request.body) {
    request.body = sanitizeInput(request.body);
  }
  if (request.query) {
    request.query = sanitizeInput(request.query);
  }
  if (request.params) {
    request.params = sanitizeInput(request.params);
  }
}

// Logging de segurança
async function securityLog(request, reply, duration) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: request.ip,
    method: request.method,
    url: request.url,
    userId: request.user?.kpId || 'anonymous',
    statusCode: reply.statusCode,
    duration: duration,
    userAgent: request.headers['user-agent']
  };
  
  // Em produção, enviar para sistema de logs
  console.log('[SECURITY]', JSON.stringify(logEntry));
  
  // Alertas para comportamentos suspeitos
  if (reply.statusCode === 401 || reply.statusCode === 403) {
    console.warn('[ALERT] Unauthorized access attempt:', logEntry);
  }
}

// Prevenção de brute force (contagem de tentativas)
const attempts = new Map();

async function preventBruteForce(request, reply) {
  const ip = request.ip;
  const key = `login_${ip}`;
  
  const now = Date.now();
  const userAttempts = attempts.get(key) || { count: 0, firstAttempt: now };
  
  // Resetar após 15 minutos
  if (now - userAttempts.firstAttempt > 15 * 60 * 1000) {
    userAttempts.count = 0;
    userAttempts.firstAttempt = now;
  }
  
  if (userAttempts.count >= 5) {
    return reply.status(429).send({ 
      error: 'TOO_MANY_ATTEMPTS', 
      message: 'Try again in 15 minutes' 
    });
  }
  
  userAttempts.count++;
  attempts.set(key, userAttempts);
  
  // Limpar mapa periodicamente
  if (attempts.size > 1000) {
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > 15 * 60 * 1000) {
        attempts.delete(k);
      }
    }
  }
}

module.exports = {
  rateLimits,
  validateInput,
  sanitizeRequest,
  securityLog,
  preventBruteForce
};
