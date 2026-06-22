const prisma = require('../../../prisma/client.js')

class AdminService {
  async getDashboardStats() {
    try {
      const [totalUsers, totalMerchants, totalAgents, totalTransactions, totalVolume, fraudAlerts] = await Promise.all([
        prisma.account.count(),
        prisma.account.count({ where: { role: 'MERCHANT' } }),
        prisma.agent.count(),
        prisma.transaction.count(),
        prisma.transaction.aggregate({ _sum: { amount: true } }),
        prisma.fraudAlert.count({ where: { status: 'OPEN' } })
      ])

      const recentTransactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          from_account: { select: { name: true, email: true, kp_id: true } },
          to_account: { select: { name: true, email: true, kp_id: true } }
        }
      })

      return {
        stats: { 
          totalUsers, 
          totalMerchants, 
          totalAgents, 
          totalTransactions, 
          totalVolume: totalVolume._sum.amount || 0, 
          fraudAlerts 
        },
        recentTransactions,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      throw error
    }
  }

  async getUsers(filters = {}) {
    const { page = 1, limit = 20, role, search } = filters
    const where = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { wallet: true, kyc: true }
      }),
      prisma.account.count({ where })
    ])

    return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
  }

  async updateUserRole(kpId, newRole) {
    const validRoles = ['USER', 'MERCHANT', 'ENTERPRISE', 'AGENT', 'ADMIN']
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role. Valid roles: USER, MERCHANT, ENTERPRISE, AGENT, ADMIN')
    }
    return prisma.account.update({
      where: { kp_id: kpId },
      data: { role: newRole }
    })
  }

  async toggleUserBlock(kpId) {
    const user = await prisma.account.findUnique({ where: { kp_id: kpId } })
    if (!user) throw new Error('User not found')
    const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'
    return prisma.account.update({
      where: { kp_id: kpId },
      data: { status: newStatus }
    })
  }

  async getFraudAlerts(status = 'OPEN') {
    return prisma.fraudAlert.findMany({
      where: { status },
      orderBy: { created_at: 'desc' },
      include: { account: { select: { name: true, email: true, kp_id: true } } }
    })
  }

  async resolveFraudAlert(id, resolution) {
    return prisma.fraudAlert.update({
      where: { id },
      data: { 
        status: 'RESOLVED', 
        resolution, 
        resolved_at: new Date() 
      }
    })
  }

  async getPendingKYC() {
    return prisma.kycProfile.findMany({
      where: { status: 'PENDING' },
      include: { account: { select: { name: true, email: true, kp_id: true } } }
    })
  }

  async approveKYC(id) {
    return prisma.kycProfile.update({
      where: { id },
      data: { status: 'APPROVED', verified_at: new Date() }
    })
  }

  async getAgents() {
    return prisma.agent.findMany({
      include: {
        account: { select: { name: true, email: true, phone: true, kp_id: true } },
        wallet: true
      }
    })
  }

  async getTransactions(filters = {}) {
    const { page = 1, limit = 20, status, type } = filters
    const where = {}
    if (status) where.status = status
    if (type) where.type = type

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          from_account: { select: { name: true, email: true, kp_id: true } },
          to_account: { select: { name: true, email: true, kp_id: true } }
        }
      }),
      prisma.transaction.count({ where })
    ])

    return { 
      transactions, 
      pagination: { 
        page, 
        limit, 
        total, 
        pages: Math.ceil(total / limit) 
      } 
    }
  }
}

module.exports = new AdminService()
