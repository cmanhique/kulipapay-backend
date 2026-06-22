const AgentService = require('../services/agent.service');

class AgentCashController {
  
  // =========================
  // CASH IN
  // =========================
  
  async initiateCashIn(req, res) {
    try {
      const { agentKpId, customerPhone, amount, agentPin } = req.body;
      
      const result = await AgentService.initiateCashIn(
        agentKpId, customerPhone, amount, agentPin
      );
      
      res.status(200).json({
        success: true,
        message: 'Cash In iniciado. Aguardando confirmação do cliente.',
        data: result
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async confirmCashIn(req, res) {
    try {
      const { transactionRef, customerPin } = req.body;
      
      const result = await AgentService.confirmCashIn(transactionRef, customerPin);
      
      res.status(200).json(result);
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // =========================
  // CASH OUT
  // =========================
  
  async initiateCashOut(req, res) {
    try {
      const { agentKpId, customerPhone, amount, agentPin } = req.body;
      
      const result = await AgentService.initiateCashOut(
        agentKpId, customerPhone, amount, agentPin
      );
      
      res.status(200).json({
        success: true,
        message: 'Cash Out iniciado. Aguardando confirmação do cliente.',
        data: result
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async confirmCashOut(req, res) {
    try {
      const { transactionRef, customerPin } = req.body;
      
      const result = await AgentService.confirmCashOut(transactionRef, customerPin);
      
      res.status(200).json(result);
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // =========================
  // STATS & TRANSACTIONS
  // =========================
  
  async getStats(req, res) {
    try {
      const { agentKpId } = req.params;
      
      const stats = await AgentService.getAgentStats(agentKpId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async getTransactions(req, res) {
    try {
      const { agentKpId } = req.params;
      const { limit = 50 } = req.query;
      
      const transactions = await AgentService.getAgentTransactions(agentKpId, limit);
      
      res.status(200).json({
        success: true,
        data: { transactions }
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AgentCashController();
