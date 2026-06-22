const AuthController = require('./auth.controller');

async function authRoutes(fastify) {

  fastify.post('/login', AuthController.login);
  fastify.post('/refresh', AuthController.refresh);
  fastify.post('/logout', AuthController.logout);
  fastify.post('/otp/verify', AuthController.otpVerify);

}

module.exports = authRoutes;
