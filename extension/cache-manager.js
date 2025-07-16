// Cache Manager Module for Universal Web Assistant
// Handles all caching operations

export const CACHE_PREFIX = 'uwa_cache_';
export const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Get cached data from Chrome storage
export async function getCachedData(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    const cached = result[key];
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      await chrome.storage.local.remove([key]);
    }
  } catch (error) {
    console.error('Cache get error:', error);
  }
  
  return null;
}

// Set cached data in Chrome storage
export async function setCachedData(key, data, ttl) {
  try {
    const expires = Date.now() + ttl;
    await chrome.storage.local.set({
      [key]: { data, expires }
    });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// Clean up expired cache entries
export async function cleanupExpiredCache() {
  try {
    const items = await chrome.storage.local.get(null);
    const now = Date.now();
    const keysToRemove = [];
    
    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith(CACHE_PREFIX) && value && value.expires && value.expires < now) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

// Set up periodic cache cleanup
export function setupCacheCleanup() {
  if (chrome.alarms) {
    chrome.alarms.create('cleanupCache', { periodInMinutes: 60 }, () => {
      if (chrome.runtime.lastError) {
        console.log('Alarm setup info:', chrome.runtime.lastError.message);
      }
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'cleanupCache') {
        cleanupExpiredCache().catch(console.error);
      }
    });
  }
}