/**
 * @file cacheService.js
 * @description Simple in-memory cache service for API responses
 *
 * Features:
 * - TTL-based expiration (default 5 minutes)
 * - Cache invalidation by key or prefix
 * - Automatic cleanup of expired entries
 * - Console logging for debugging
 *
 * Usage:
 *   import { cacheService } from './cacheService';
 *
 *   // Get cached data
 *   const data = cacheService.get('users:1:20');
 *   if (data) return data;
 *
 *   // Set cache with default TTL (5 min)
 *   cacheService.set('users:1:20', responseData);
 *
 *   // Set cache with custom TTL (10 min)
 *   cacheService.set('projects', projectsData, 10 * 60 * 1000);
 *
 *   // Invalidate specific key
 *   cacheService.clear('users:1:20');
 *
 *   // Invalidate by prefix (all users cache)
 *   cacheService.invalidateByPrefix('users:');
 */

class CacheService {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

        console.log('[Cache] 🚀 Cache service initialized (TTL: 5 min)');
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
        const isExpired = Date.now() - cached.timestamp > cached.ttl;

        if (isExpired) {
            this.cache.delete(key);
            console.log(`[Cache] ⏰ EXPIRED: ${key}`);
            return null;
        }

        console.log(`[Cache] ✅ HIT: ${key}`);
        return cached.data;
    }

    /**
     * Set cache data
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in ms (optional, default 5 min)
     */
    set(key, data, ttl = null) {
        const finalTTL = ttl || this.defaultTTL;

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: finalTTL
        });

        console.log(`[Cache] 💾 SET: ${key} (TTL: ${finalTTL / 1000}s)`);
    }

    /**
     * Clear specific key or all cache
     * @param {string|null} key - Key to clear, or null for all
     */
    clear(key = null) {
        if (key) {
            const deleted = this.cache.delete(key);
            if (deleted) {
                console.log(`[Cache] 🗑️  CLEAR: ${key}`);
            }
        } else {
            const size = this.cache.size;
            this.cache.clear();
            console.log(`[Cache] 🗑️  CLEAR ALL (${size} entries)`);
        }
    }

    /**
     * Invalidate cache by prefix
     * @param {string} prefix - Key prefix to invalidate
     *
     * Example:
     *   cacheService.invalidateByPrefix('users:')
     *   // Clears: users:1:20, users:2:10, etc.
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
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    getStats() {
        const now = Date.now();
        let expired = 0;
        let active = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
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
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
            console.log(`[Cache] 🧹 CLEANUP: Removed ${keysToDelete.length} expired entries`);
        }

        return keysToDelete.length;
    }
}

// Export singleton instance
export const cacheService = new CacheService();

// Optional: Run cleanup every 10 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        cacheService.cleanup();
    }, 10 * 60 * 1000); // 10 minutes
}
