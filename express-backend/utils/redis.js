const Redis = require("ioredis");

let client = null;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;

if (!REDIS_HOST) {
  console.warn("REDIS_HOST not set in .env. Falling back to local Redis (127.0.0.1:6379)");
  client = new Redis({
    host: '127.0.0.1',
    port: 6379,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
  });
  client.on('error', (err) => console.error("Local Redis Error:", err.message));
} else {
  try {
    client = new Redis.Cluster(
      [{ host: REDIS_HOST, port: REDIS_PORT || 6379 }],
      {
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: { tls: {} },
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      }
    );

    let fallbackTriggered = false;
    client.on('error', (err) => {
      console.error('Redis Cluster Error:', err.message);
      if (!fallbackTriggered && (err.message.includes("Cluster isn't ready") || err.message.includes("refresh slots") || err.message.includes("ETIMEDOUT"))) {
        fallbackTriggered = true;
        console.warn('AWS ElastiCache unreachable. Falling back to local Redis (127.0.0.1:6379)...');
        try { client.quit(); } catch(e) {}
        
        client = new Redis({
          host: '127.0.0.1',
          port: 6379,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });
        client.on('error', (localErr) => console.error("Local Redis Error:", localErr.message));
      }
    });
  } catch (error) {
    console.error('Failed to initialize AWS Redis client:', error);
  }
}

const getCache = async (key) => {
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Redis GET error for key :", error.message);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds) => {
  if (!client) return;
  try {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, stringValue, "EX", ttlSeconds);
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    console.error("Redis SET error for key :", error.message);
  }
};

const delCache = async (key) => {
  if (!client) return;
  try {
    await client.del(key);
  } catch (error) {
    console.error("Redis DEL error for key :", error.message);
  }
};

module.exports = {
  client,
  getCache,
  setCache,
  delCache,
};
