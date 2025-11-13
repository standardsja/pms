import { createClient } from 'redis';

// Redis client for caching
let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export async function initRedis() {
  try {
    // Create Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts');
          }
          // Exponential backoff: 50ms, 100ms, 200ms, etc.
          return Math.min(retries * 50, 3000);
        },
      },
    });

    // Event handlers
    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Ready - Cache layer active');
      isRedisConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
      isRedisConnected = false;
    });

    redisClient.on('end', () => {
      console.log('[Redis] Connection closed');
      isRedisConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    console.log('[Redis] Application will run without caching');
    redisClient = null;
    isRedisConnected = false;
  }
}

export function getRedisClient() {
  return isRedisConnected ? redisClient : null;
}

export function isRedisAvailable(): boolean {
  return isRedisConnected && redisClient !== null;
}

// Cache helper functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable() || !redisClient) return null;
  
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`[Redis] Cache GET error for key "${key}":`, error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 30
): Promise<boolean> {
  if (!isRedisAvailable() || !redisClient) return false;
  
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Redis] Cache SET error for key "${key}":`, error);
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  if (!isRedisAvailable() || !redisClient) return false;
  
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] Cache DELETE error for key "${key}":`, error);
    return false;
  }
}

export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  if (!isRedisAvailable() || !redisClient) return false;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error(`[Redis] Cache DELETE pattern error for "${pattern}":`, error);
    return false;
  }
}

// Close Redis connection gracefully
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisConnected = false;
    console.log('[Redis] Connection closed gracefully');
  }
}
