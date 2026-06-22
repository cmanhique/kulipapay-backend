const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  const adminEmail = 'admin@kulipa.com'
  const existingAdmin = await prisma.account.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10)
    
    const admin = await prisma.account.create({
      data: {
        kp_id: 'ADMIN-00001',
        name: 'System Administrator',
        email: adminEmail,
        phone: '+258841234567',
        password_hash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    })

    await prisma.wallet.create({
      data: {
        kp_id: admin.kp_id,
        balance: 0,
        frozen_balance: 0,
        available_balance: 0
      }
    })

    console.log('✅ Admin user created:', adminEmail)
    console.log('🔑 Password: Admin@123')
  } else {
    console.log('✅ Admin user already exists:', adminEmail)
  }

  const merchantEmail = 'merchant@kulipa.com'
  const existingMerchant = await prisma.account.findUnique({
    where: { email: merchantEmail }
  })

  if (!existingMerchant) {
    const hashedPassword = await bcrypt.hash('Merchant@123', 10)
    
    const merchant = await prisma.account.create({
      data: {
        kp_id: 'MER-00001',
        name: 'Test Merchant',
        email: merchantEmail,
        phone: '+258841234568',
        password_hash: hashedPassword,
        role: 'MERCHANT',
        status: 'ACTIVE'
      }
    })

    await prisma.wallet.create({
      data: {
        kp_id: merchant.kp_id,
        balance: 1000,
        frozen_balance: 0,
        available_balance: 1000
      }
    })

    console.log('✅ Test merchant created:', merchantEmail)
    console.log('🔑 Password: Merchant@123')
  }

  console.log('🌱 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
