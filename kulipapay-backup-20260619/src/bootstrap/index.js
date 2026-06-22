const EnvValidator = require('./env.validator');
const DBValidator = require('./db.validator');
const RedisValidator = require('./redis.validator');

class Bootstrap {
  static async initialize() {
    console.log('\n🚀 KULIPAPAY BANKING SYSTEM\n');
    console.log('═'.repeat(50));
    
    // Step 1: Validate Environment
    console.log('\n📋 Step 1: Validating environment...');
    EnvValidator.validate();
    
    // Step 2: Check Database
    console.log('\n🗄️  Step 2: Checking database...');
    await DBValidator.checkConnection();
    
    // Step 3: Run pending migrations
    console.log('\n📦 Step 3: Running migrations...');
    await DBValidator.runMigrations();
    
    // Step 4: Check Redis (optional)
    console.log('\n⚡ Step 4: Checking cache...');
    await RedisValidator.checkConnection();
    
    // Step 5: Health check ready
    console.log('\n═'.repeat(50));
    console.log('✅ All systems ready!');
    console.log('═'.repeat(50));
    
    return true;
  }
}

module.exports = Bootstrap;
