const IdentityFacade = require('./identity.facade');

const IdentityController = {
  async getMe(req, reply) {
    const data = await IdentityFacade.getMe(req.user.kp_id);
    
    return reply.send({
      success: true,
      data
    });
  },

  async getBasic(req, reply) {
    const data = await IdentityFacade.getBasic(req.user.kp_id);
    
    return reply.send({
      success: true,
      data
    });
  },

  async evaluateAction(req, reply) {
    const { module, action } = req.body;
    const result = await IdentityFacade.evaluateAction(
      req.user.kp_id,
      module,
      action,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );
    
    return reply.send({
      success: true,
      data: result
    });
  }
};

module.exports = IdentityController;
