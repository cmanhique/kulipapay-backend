const { prisma } = require('../prisma');

class DBValidator {
  static async checkConnection() {
    const maxRetries = 5;
    let retry = 0;

    while (retry < maxRetries) {
      try {
        await prisma.$connect();
        console.log('✅ Database connected');
        
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        
        console.log(`📊 Tables found: ${tables.length}`);
        await prisma.$disconnect();
        return true;
      } catch (error) {
        retry++;
        console.error(`DB connection attempt ${retry}/${maxRetries} failed`);
        if (retry === maxRetries) {
          throw new Error(`Database connection failed: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  static async runMigrations() {
    const { execSync } = require('child_process');
    try {
      console.log('📦 Running Prisma migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('❌ Migrations failed:', error.message);
      throw error;
    }
  }
}

module.exports = DBValidator;