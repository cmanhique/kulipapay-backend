const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');
const { authenticate } = require('../middlewares/auth.middleware');
const { prisma } = require('../prisma');
const { handleError } = require('../utils/errors');
const { MeService } = require('../identity');

async function authRoutes(fastify) {

  // =========================
  // REGISTER
  // =========================
  fastify.post('/register', async (req) => {
    const { accountType } = req.body;

    if (accountType === 'MERCHANT') {
      return authService.registerMerchant(req.body);
    }

    return authService.registerIndividual(req.body);
  });

  // =========================
  // LOGIN (NÃO MEXER)
  // =========================
  fastify.post('/login', async (req) => {
    return authService.login(
      req.body.identifier, 
      req.body.password,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id']
      }
    );
  });

  // =========================
  // REFRESH TOKEN
  // =========================
  fastify.post('/refresh', async (req) => {
    return authService.refreshToken(
      req.body.refreshToken,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );
  });

  // =========================
  // LOGOUT
  // =========================
  fastify.post('/logout', async (req) => {
    return authService.logout(req.body.refreshToken);
  });

  // =========================
  // ME (COM IDENTITY HIGH)
  // =========================
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    try {
      const me = await MeService.getMe(req.user.kp_id);
      
      return reply.send({
        success: true,
        data: me
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // RISK SCORE
  // =========================
  fastify.get('/risk', { preHandler: authenticate }, async (req, reply) => {
    try {
      const risk = await prisma.riskScore.findUnique({
        where: { kp_id: req.user.kp_id }
      });

      const alerts = await prisma.fraudAlert.findMany({
        where: { kp_id: req.user.kp_id },
        orderBy: { created_at: 'desc' },
        take: 10
      });

      return reply.send({
        success: true,
        data: {
          risk: risk || { score: 0, level: 'LOW' },
          alerts: alerts || []
        }
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // =========================
  // OTP ROTAS (2FA)
  // =========================

  fastify.post('/otp/generate', async (req) => {
    const { kp_id, type } = req.body;
    return otpService.generateOtp(kp_id, type || 'LOGIN');
  });

  fastify.post('/otp/verify', async (req) => {
    const { kp_id, code, type } = req.body;
    const result = await otpService.verifyOtp(kp_id, code, type || 'LOGIN');
    
    const account = await prisma.account.findUnique({
      where: { kp_id }
    });
    
    return authService._createSession(account, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  });
}

module.exports = authRoutes;
