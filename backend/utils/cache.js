import NodeCache from 'node-cache';

// Initialize cache with TTL from environment or default to 1 hour
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600');
const cache = new NodeCache({ 
  stdTTL: CACHE_TTL,
  checkperiod: 120, // Check for expired entries every 2 minutes
  useClones: false // Don't clone data for better performance
});

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any} - Cached value or undefined
 */
export function getCache(key) {
  const value = cache.get(key);
  
  if (value !== undefined) {
    cacheStats.hits++;
    console.log(`Cache hit: ${key}`);
  } else {
    cacheStats.misses++;
    console.log(`Cache miss: ${key}`);
  }
  
  return value;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Optional TTL in seconds
 * @returns {boolean} - Success status
 */
export function setCache(key, value, ttl) {
  const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
  
  if (success) {
    cacheStats.sets++;
    console.log(`Cache set: ${key} (TTL: ${ttl || CACHE_TTL}s)`);
  }
  
  return success;
}

/**
 * Delete from cache
 * @param {string} key - Cache key
 * @returns {number} - Number of deleted entries
 */
export function deleteCache(key) {
  const deleted = cache.del(key);
  
  if (deleted > 0) {
    cacheStats.deletes++;
    console.log(`Cache delete: ${key}`);
  }
  
  return deleted;
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  cache.flushAll();
  console.log('Cache cleared');
}

/**
 * Get cache statistics
 * @returns {object} - Cache statistics
 */
export function getCacheStats() {
  const nodeStats = cache.getStats();
  
  return {
    ...cacheStats,
    keys: cache.keys().length,
    size: nodeStats.ksize + nodeStats.vsize,
    ttl: CACHE_TTL
  };
}

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {boolean} - Exists status
 */
export function hasCache(key) {
  return cache.has(key);
}

/**
 * Get TTL for a key
 * @param {string} key - Cache key
 * @returns {number|undefined} - TTL in milliseconds or undefined
 */
export function getCacheTTL(key) {
  return cache.getTtl(key);
}

/**
 * Update TTL for a key
 * @param {string} key - Cache key
 * @param {number} ttl - New TTL in seconds
 * @returns {boolean} - Success status
 */
export function updateCacheTTL(key, ttl) {
  return cache.ttl(key, ttl);
}

// Log cache statistics periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getCacheStats();
    console.log('Cache Stats:', stats);
  }, 60000); // Every minute
}

// Handle cache events
cache.on('expired', (key, value) => {
  console.log(`Cache expired: ${key}`);
});

cache.on('flush', () => {
  console.log('Cache flushed');
});

export default cache;