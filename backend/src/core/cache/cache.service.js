/**
 * CACHE SERVICE
 * 
 * 🎯 Serviço de cache para decisões do Policy Engine
 */

class CacheService {
  
  constructor() {
    this.memoryCache = new Map();
    this.defaultTTL = 60;
    this.redis = null;
    this.initRedis();
  }
  
  async initRedis() {
    try {
      const Redis = require('ioredis');
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('⚠️ Redis não disponível, usando cache em memória');
            return null;
          }
          return Math.min(times * 50, 2000);
        }
      });
      
      this.redis.on('error', () => {
        // Silenciosamente fallback para memória
      });
      
      console.log('✅ Redis conectado (cache disponível)');
    } catch (error) {
      console.log('ℹ️ Redis não disponível, usando cache em memória');
      this.redis = null;
    }
  }
  
  /**
   * Gerar chave de cache
   */
  generateKey(kp_id, module, action) {
    return `policy:${kp_id}:${module}:${action || 'all'}`;
  }
  
  async get(key) {
    try {
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }
      
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key);
        if (Date.now() < entry.expiresAt) {
          return entry.value;
        }
        this.memoryCache.delete(key);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.redis) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
      }
      
      this.memoryCache.set(key, {
        value: value,
        expiresAt: Date.now() + (ttl * 1000)
      });
    } catch (error) {
      // Ignorar erros de cache
    }
  }
  
  async invalidate(pattern) {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      // Ignorar erros
    }
  }
  
  async invalidateUser(kp_id) {
    await this.invalidate(`policy:${kp_id}:*`);
    await this.invalidate(`bootstrap:${kp_id}`);
  }
}

module.exports = new CacheService();
