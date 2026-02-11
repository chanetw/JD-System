/**
 * @file cacheService.js
 * @description Backend cache service using in-memory storage
 *
 * For production, replace with Redis for:
 * - Persistence across restarts
 * - Shared cache across multiple server instances
 * - Better memory management
 *
 * Usage:
 *   import { cacheService } from './cacheService.js';
 *
 *   // Get cached data
 *   const data = cacheService.get('approval_flow:123');
 *   if (data) return data;
 *
 *   // Set cache with default TTL (5 min)
 *   cacheService.set('approval_flow:123', flowData);
 *
 *   // Set cache with custom TTL (1 hour)
 *   cacheService.set('user:456', userData, 3600);
 *
 *   // Invalidate specific key
 *   cacheService.delete('approval_flow:123');
 *
 *   // Invalidate by prefix
 *   cacheService.invalidateByPrefix('approval_flow:');
 */

class CacheService {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 300; // 5 minutes in seconds

        console.log('[Cache] 🚀 Backend cache service initialized (in-memory, TTL: 5 min)');
        console.log('[Cache] ⚠️  For production, consider Redis for persistence and scalability');
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any|null} - Cached data or null if expired/missing
     */
    get(key) {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if expired
        const now = Math.floor(Date.now() / 1000);
        if (now > cached.expiresAt) {
            this.cache.delete(key);
            console.log(`[Cache] ⏰ EXPIRED: ${key}`);
            return null;
        }

        console.log(`[Cache] ✅ HIT: ${key}`);
        return cached.value;
    }

    /**
     * Set cache data
     * @param {string} key - Cache key
     * @param {any} value - Data to cache
     * @param {number} ttlSeconds - Time to live in seconds (optional, default 5 min)
     */
    set(key, value, ttlSeconds = null) {
        const finalTTL = ttlSeconds || this.defaultTTL;
        const now = Math.floor(Date.now() / 1000);

        this.cache.set(key, {
            value,
            expiresAt: now + finalTTL
        });

        console.log(`[Cache] 💾 SET: ${key} (TTL: ${finalTTL}s)`);
    }

    /**
     * Delete specific key
     * @param {string} key - Key to delete
     * @returns {boolean} - True if key was deleted
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`[Cache] 🗑️  DELETE: ${key}`);
        }
        return deleted;
    }

    /**
     * Clear all cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[Cache] 🗑️  CLEAR ALL (${size} entries)`);
    }

    /**
     * Invalidate cache by prefix
     * @param {string} prefix - Key prefix to invalidate
     *
     * Example:
     *   cacheService.invalidateByPrefix('approval_flow:')
     *   // Clears: approval_flow:123, approval_flow:456, etc.
     */
    invalidateByPrefix(prefix) {
        const keysToDelete = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
            console.log(`[Cache] 🗑️  INVALIDATE PREFIX: ${prefix} (${keysToDelete.length} keys)`);
        }

        return keysToDelete.length;
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    getStats() {
        const now = Math.floor(Date.now() / 1000);
        let expired = 0;
        let active = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiresAt) {
                expired++;
            } else {
                active++;
            }
        }

        return {
            total: this.cache.size,
            active,
            expired
        };
    }

    /**
     * Clean up expired entries
     * @returns {number} - Number of entries removed
     */
    cleanup() {
        const now = Math.floor(Date.now() / 1000);
        const keysToDelete = [];

        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiresAt) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
            console.log(`[Cache] 🧹 CLEANUP: Removed ${keysToDelete.length} expired entries`);
        }

        return keysToDelete.length;
    }

    /**
     * Get cache size in bytes (approximate)
     * @returns {number} - Approximate size in bytes
     */
    getSize() {
        const stats = this.getStats();
        return {
            entries: stats.total,
            approximateBytes: stats.total * 1024  // Rough estimate
        };
    }
}

// Export singleton instance
export const cacheService = new CacheService();

// Run cleanup every 10 minutes
setInterval(() => {
    cacheService.cleanup();
}, 10 * 60 * 1000); // 10 minutes

export default cacheService;
