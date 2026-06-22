const BankingService = require('../services/banking.service');

class BankingController {
  
  async cashIn(agentKpId, customerKpId, amount, agentPin) {
    try {
      return await BankingService.cashIn(agentKpId, customerKpId, amount, agentPin);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async cashOut(agentKpId, customerKpId, amount, agentPin) {
    try {
      return await BankingService.cashOut(agentKpId, customerKpId, amount, agentPin);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getStats(agentKpId) {
    try {
      return await BankingService.getAgentStats(agentKpId);
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new BankingController();
