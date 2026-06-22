/**
 * DOMAIN SERVICE
 * Merchant, Agent, Enterprise profile data via kp_id.
 */
const { getDomainData } = require('../../../utils/domain-data');

class DomainService {
  static async get(kp_id, accountType) {
    return getDomainData(kp_id, accountType);
  }
}

module.exports = DomainService;
