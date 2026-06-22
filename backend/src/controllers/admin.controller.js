const AdminService = require('../services/admin.service');

class AdminController {

  // =========================
  // LISTAR AGENTES
  // =========================
  static async getAgents(req, reply) {
    try {
      const { status, search, limit, offset } = req.query;
      
      const result = await AdminService.getAgents({
        status,
        search,
        limit,
        offset
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get agents error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ADMIN_ERROR',
          message: error.message
        }
      });
    }
  }

  // =========================
  // ESTATÍSTICAS DOS AGENTES
  // =========================
  static async getAgentStats(req, reply) {
    try {
      const stats = await AdminService.getAgentStats();

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get agent stats error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ADMIN_ERROR',
          message: error.message
        }
      });
    }
  }

  // =========================
  // DETALHES DE UM AGENTE
  // =========================
  static async getAgentDetails(req, reply) {
    try {
      const { kpId } = req.params;
      
      const details = await AdminService.getAgentDetails(kpId);

      return reply.send({
        success: true,
        data: details
      });
    } catch (error) {
      console.error('Get agent details error:', error);
      return reply.status(404).send({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: error.message
        }
      });
    }
  }

  // =========================
  // ATUALIZAR STATUS DO AGENTE
  // =========================
  static async updateAgentStatus(req, reply) {
    try {
      const { kpId } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_STATUS',
            message: 'Status is required'
          }
        });
      }

      const updated = await AdminService.updateAgentStatus(kpId, status, notes);

      return reply.send({
        success: true,
        data: updated,
        message: `Agent status updated to ${status}`
      });
    } catch (error) {
      console.error('Update agent status error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = AdminController;