const healthService = require('./health.service');

async function healthRoutes(fastify) {
  fastify.get('/health', async (req, reply) => {
    const result = await healthService.runFullCheck();
    return reply.status(result.status === 'ok' ? 200 : 503).send(result);
  });

  fastify.get('/health/ping', async (req, reply) => {
    return reply.send({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  fastify.get('/health/detailed', async (req, reply) => {
    const result = await healthService.runFullCheck();
    return reply.send({
      ...result,
      system: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
      }
    });
  });
}

module.exports = healthRoutes;