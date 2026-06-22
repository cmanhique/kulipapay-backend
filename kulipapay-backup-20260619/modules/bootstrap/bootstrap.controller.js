/**
 * BOOTSTRAP CONTROLLER
 * 
 * 🎯 Endpoint único de bootstrap
 */

const BootstrapService = require('./bootstrap.service');

class BootstrapController {
  
  /**
   * GET /bootstrap
   * Retorna todos os dados necessários para o frontend
   */
  async getBootstrap(req, reply) {
    const kp_id = req.user.kp_id;
    
    const data = await BootstrapService.getBootstrap(kp_id);
    
    return reply.send({
      success: true,
      data: data
    });
  }
}

module.exports = new BootstrapController();
