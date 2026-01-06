/**
 * Simple in-memory cache implementation
 * Lightweight and fast for single-instance deployments
 */

const MILLISECONDS_PER_SECOND = 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL = 60) {
    // Default TTL: 60 seconds
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    console.log('✅ Using in-memory cache (TTL: 60s)');
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.defaultTTL * MILLISECONDS_PER_SECOND) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear a specific key from cache
   */
  async clear(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return {
      inMemoryKeys: this.cache.size,
      ttl: this.defaultTTL,
    };
  }

  /**
   * Close cache (no-op for in-memory)
   */
  async close(): Promise<void> {
    // No-op for in-memory cache
  }
}

// Export singleton instance with 60-second TTL
export const cache = new InMemoryCache(60);
