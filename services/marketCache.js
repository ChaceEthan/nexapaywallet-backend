// f:/nexapaywallet-backend2/cache/marketCache.js

// --- Configuration ---
// How long data is considered "fresh" before we attempt to re-fetch from API
const CACHE_FRESH_DURATION_MS = 30 * 1000; // 30 seconds

// How long stale data can be used as a fallback if API fails
const CACHE_STALE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache storage
const cacheStore = new Map(); // Using Map for better performance with string keys than plain objects

/**
 * Retrieves data from the cache.
 * @param {string} key - The cache key.
 * @param {boolean} [checkFreshness=true] - If true, only return data if it's within the fresh duration.
 *                                        If false, return any data if it's within the stale duration.
 * @returns {object|null} - Cached data or null if not found or expired.
 */
function get(key, checkFreshness = true) {
    const entry = cacheStore.get(key);

    if (!entry) {
        return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (checkFreshness) {
        // For fresh check, data must be within CACHE_FRESH_DURATION_MS
        if (age <= CACHE_FRESH_DURATION_MS) {
            return entry.data;
        }
    } else {
        // For stale fallback, data must be within CACHE_STALE_DURATION_MS
        if (age <= CACHE_STALE_DURATION_MS) {
            return entry.data;
        }
    }

    // If data is too old (even for stale fallback), remove it and return null
    // This is a simple form of cache cleanup. More robust systems might use a dedicated
    // garbage collector or TTL mechanism.
    if (age > CACHE_STALE_DURATION_MS) {
        console.log(`Cache entry for ${key} expired and removed.`);
        cacheStore.delete(key);
    }
    return null;
}

/**
 * Stores data in the cache with the current timestamp.
 * @param {string} key - The cache key.
 * @param {object} data - The data to store.
 */
function set(key, data) {
    cacheStore.set(key, {
        data,
        timestamp: Date.now(),
    });
    console.log(`Cache updated for ${key}.`);
}

module.exports = { get, set };