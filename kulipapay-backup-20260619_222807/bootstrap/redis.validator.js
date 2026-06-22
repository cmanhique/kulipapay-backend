const Redis = require('ioredis');

class RedisValidator {
  static async checkConnection() {
    if (!process.env.REDIS_URL) {
      console.log('⚠️  Redis not configured, skipping...');
      return true;
    }

    const redis = new Redis(process.env.REDIS_URL);
    const maxRetries = 3;
    let retry = 0;

    while (retry < maxRetries) {
      try {
        await redis.ping();
        console.log('✅ Redis connected');
        await redis.quit();
        return true;
      } catch (error) {
        retry++;
        console.error(`Redis connection attempt ${retry}/${maxRetries} failed`);
        if (retry === maxRetries) {
          console.warn('⚠️  Redis not available, continuing without cache');
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

module.exports = RedisValidator;
