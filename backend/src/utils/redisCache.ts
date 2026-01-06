import Redis from 'ioredis';

/**
 * Redis-based distributed cache for multi-instance deployments
 * Falls back to in-memory cache if Redis is not available
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class RedisCache {
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private isRedisAvailable: boolean = false;

  constructor(defaultTTL = 60) {
    // Default TTL: 60 seconds
    this.defaultTTL = defaultTTL;
    this.inMemoryCache = new Map();

    // Try to connect to Redis
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('Redis connection failed after 3 retries, using in-memory cache');
            return null;
          }
          return Math.min(times * 100, 2000);
        },
        lazyConnect: true,
      });

      // Test connection
      await this.redis.connect();
      await this.redis.ping();
      this.isRedisAvailable = true;
      console.log('✅ Redis cache connected successfully');

      // Handle Redis errors
      this.redis.on('error', (err) => {
        console.error('Redis error:', err.message);
        this.isRedisAvailable = false;
      });

      this.redis.on('connect', () => {
        console.log('Redis reconnected');
        this.isRedisAvailable = true;
      });
    } catch (error) {
      console.warn('Redis not available, using in-memory cache:', (error as Error).message);
      this.isRedisAvailable = false;
      this.redis = null;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (this.isRedisAvailable && this.redis) {
      try {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
      } catch (error) {
        console.error('Redis get error:', error);
        // Fall through to in-memory cache
      }
    }

    // Fallback to in-memory cache
    const entry = this.inMemoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.defaultTTL * 1000) {
      this.inMemoryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheTTL = ttl || this.defaultTTL;

    // Try Redis first
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.setex(key, cacheTTL, JSON.stringify(data));
        return;
      } catch (error) {
        console.error('Redis set error:', error);
        // Fall through to in-memory cache
      }
    }

    // Fallback to in-memory cache
    this.inMemoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear a specific key from cache
   */
  async clear(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis del error:', error);
      }
    }

    this.inMemoryCache.delete(key);
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clearAll(): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.error('Redis flushdb error:', error);
      }
    }

    this.inMemoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    let redisKeys = 0;
    if (this.isRedisAvailable && this.redis) {
      try {
        redisKeys = await this.redis.dbsize();
      } catch (error) {
        console.error('Redis dbsize error:', error);
      }
    }

    return {
      redisAvailable: this.isRedisAvailable,
      redisKeys,
      inMemoryKeys: this.inMemoryCache.size,
      ttl: this.defaultTTL,
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Export singleton instance with 60-second TTL
export const cache = new RedisCache(60);
