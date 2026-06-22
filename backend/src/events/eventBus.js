const Redis = require('ioredis');
const crypto = require('crypto');

// Criar cliente Redis normal (NÃO subscriber mode)
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('Redis connection failed after 10 attempts');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

const CHANNEL = 'kulipapay_events';

class EventBus {
  constructor() {
    this.listeners = [];
    this.connected = false;
    
    redis.on('connect', () => {
      console.log('✅ Redis connected');
      this.connected = true;
    });
    
    redis.on('error', (err) => {
      console.error('Redis error:', err.message);
      this.connected = false;
    });
  }

  async publish(eventType, data) {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };

    try {
      if (this.connected) {
        await redis.publish(CHANNEL, JSON.stringify(event));
      }
      console.log(`📡 Event published: ${eventType}`);
    } catch (err) {
      console.error('Publish error:', err.message);
    }
    
    return event;
  }

  async subscribe(callback) {
    try {
      const subscriber = new Redis({
        host: 'localhost',
        port: 6379
      });
      
      await subscriber.subscribe(CHANNEL);
      
      subscriber.on('message', (channel, message) => {
        if (channel === CHANNEL) {
          const event = JSON.parse(message);
          callback(event);
        }
      });
      
      console.log(`👂 Listening for events on: ${CHANNEL}`);
    } catch (err) {
      console.error('Subscribe error:', err.message);
    }
  }
}

module.exports = new EventBus();
