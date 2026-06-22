const dbCheck = require('./checks/db.check');
const ledgerCheck = require('./checks/ledger.check');
const authCheck = require('./checks/auth.check');
const identityCheck = require('./checks/identity.check');
const refundCheck = require('./checks/refund.check');

class HealthService {
  async runFullCheck() {
    const start = Date.now();

    console.log('🩺 Running health checks...');

    const results = {
      database: await this.safe(dbCheck),
      ledger: await this.safe(ledgerCheck),
      auth: await this.safe(authCheck),
      identity: await this.safe(identityCheck),
      refunds: await this.safe(refundCheck),
    };

    const allOk = Object.values(results).every(r => r === 'ok');
    const status = allOk ? 'ok' : 'degraded';

    const latency = Date.now() - start;

    console.log(`✅ Health check completed: ${status} (${latency}ms)`);

    return {
      status,
      timestamp: new Date().toISOString(),
      services: results,
      latency_ms: latency,
    };
  }

  async safe(fn) {
    try {
      return await fn();
    } catch (error) {
      console.error('Health check failed:', error.message);
      return 'error';
    }
  }
}

module.exports = new HealthService();