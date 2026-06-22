const AuthService = require('./auth.service');

const AuthController = {
  async login(req, reply) {
    const result = await AuthService.login(
      req.body.identifier,
      req.body.password,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id']
      }
    );
    
    return reply.send(result);
  },

  async refresh(req, reply) {
    const result = await AuthService.refreshToken(req.body.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return reply.send(result);
  },

  async logout(req, reply) {
    const result = await AuthService.logout(req.body.refreshToken);
    return reply.send(result);
  },

  async otpVerify(req, reply) {
    const { kp_id, code, type } = req.body;

    const result = await AuthService.verifyOtp(
      kp_id, 
      code, 
      type || 'LOGIN',
      {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    return reply.send(result);
  }
};

module.exports = AuthController;
