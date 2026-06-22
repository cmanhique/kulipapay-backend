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
  fastify.post('/register', async (req, reply) => {
    try {
      const { accountType } = req.body;

      let result;
      
      switch (accountType) {
        case 'MERCHANT':
          result = await authService.registerMerchant(req.body);
          break;
        case 'AGENT':
          result = await authService.registerAgent(req.body);
          break;
        case 'ENTERPRISE':
          result = await authService.registerEnterprise(req.body);
          break;
        default:
          result = await authService.registerIndividual(req.body);
      }

      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: {
          message: error.message,
          code: 'REGISTRATION_FAILED'
        }
      });
    }
  });

  // =========================
  // LOGIN (NÃO MEXER)
  // =========================
  fastify.post('/login', async (req, reply) => {
    try {
      const result = await authService.login(
        req.body.identifier, 
        req.body.password,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          deviceId: req.headers['x-device-id']
        }
      );

      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          message: error.message,
          code: 'LOGIN_FAILED'
        }
      });
    }
  });

  // =========================
  // REFRESH TOKEN
  // =========================
  fastify.post('/refresh', async (req, reply) => {
    try {
      const result = await authService.refreshToken(
        req.body.refreshToken,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          message: error.message,
          code: 'REFRESH_FAILED'
        }
      });
    }
  });

  // =========================
  // LOGOUT
  // =========================
  fastify.post('/logout', async (req, reply) => {
    try {
      const result = await authService.logout(
        req.body.refreshToken,
        req.body.mode || 'device'
      );

      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: {
          message: error.message,
          code: 'LOGOUT_FAILED'
        }
      });
    }
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

  fastify.post('/otp/generate', async (req, reply) => {
    try {
      const { kp_id, type } = req.body;
      const result = await otpService.generateOtp(kp_id, type || 'LOGIN');
      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: {
          message: error.message,
          code: 'OTP_GENERATION_FAILED'
        }
      });
    }
  });

  fastify.post('/otp/verify', async (req, reply) => {
    try {
      const { kp_id, code, type } = req.body;
      
      // Verificar OTP
      await otpService.verifyOtp(kp_id, code, type || 'LOGIN');
      
      // Buscar conta
      const account = await prisma.account.findUnique({
        where: { kp_id }
      });
      
      if (!account) {
        throw new Error('Conta não encontrada');
      }

      // Criar sessão
      const session = await authService._createSession(account, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return reply.send({
        success: true,
        ...session
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          message: error.message,
          code: 'OTP_VERIFICATION_FAILED'
        }
      });
    }
  });
}

module.exports = authRoutes;