const authRoutes = require('./auth.routes.js')
const merchantRoutes = require('./merchant.routes.js')
const walletRoutes = require('./wallet.routes.js')
const cashierRoutes = require('./cashier.routes.js')
const adminRoutes = require('./admin/admin.routes.js')
const agentRoutes = require('./agent.routes.js')
const regionRoutes = require('./region.routes.js')
const bankingRoutes = require('./banking.routes.js')
const transactionRoutes = require('./transaction.routes.js')
const escrowRoutes = require('./escrow.routes.js')

async function registerRoutes(fastify) {
  await fastify.register(authRoutes, { prefix: '/api' })
  await fastify.register(walletRoutes, { prefix: '/api' })
  await fastify.register(merchantRoutes, { prefix: '/api' })
  await fastify.register(cashierRoutes, { prefix: '/api' })
  await fastify.register(agentRoutes, { prefix: '/api' })
  await fastify.register(regionRoutes, { prefix: '/api' })
  await fastify.register(bankingRoutes, { prefix: '/api' })
  await fastify.register(transactionRoutes, { prefix: '/api' })
  await fastify.register(escrowRoutes, { prefix: '/api' })
  
  // 🔥 ADMIN - REGISTAR COM PREFIXO /api
  await fastify.register(adminRoutes, { prefix: '/api' })
}

module.exports = registerRoutes
