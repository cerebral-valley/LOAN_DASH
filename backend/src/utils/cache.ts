/**
 * Simple in-memory cache for expensive operations
 * Cache entries expire after a configurable TTL
 * 
 * Note: This is a simple in-memory cache suitable for single-instance deployments.
 * For multi-instance deployments with high concurrency, consider using a
 * proven caching library like `node-cache` or a distributed cache like Redis.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL = 60000) {
    // Default TTL: 60 seconds
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from cache if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.defaultTTL) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear a specific key from cache
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.defaultTTL,
    };
  }
}

// Export singleton instance
export const cache = new SimpleCache(60000); // 60 seconds TTL
