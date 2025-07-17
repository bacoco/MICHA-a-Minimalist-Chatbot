/**
 * Cache Service for storing temporary data
 * Supports both memory and persistent storage
 */

export interface CacheEntry<T> {
  data: T;
  expires: number;
  created: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry?: Date;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private persistentStorage?: any; // Will be AsyncStorage on React Native

  constructor(persistentStorage?: any) {
    this.persistentStorage = persistentStorage;
    this.startCleanupTimer();
  }

  /**
   * Get item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data;
    }

    // Check persistent storage if available
    if (this.persistentStorage) {
      try {
        const stored = await this.persistentStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Clean up expired entry
            await this.persistentStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Cache get error:', error);
      }
    }

    return null;
  }

  /**
   * Set item in cache
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + (ttlSeconds * 1000),
      created: Date.now(),
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in persistent storage if available
    if (this.persistentStorage) {
      try {
        await this.persistentStorage.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.error('Cache set error:', error);
      }
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    if (this.persistentStorage) {
      try {
        await this.persistentStorage.removeItem(key);
      } catch (error) {
        console.error('Cache delete error:', error);
      }
    }
  }

  /**
   * Delete all items with a specific prefix
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    // Clear from memory
    const keysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear from persistent storage
    if (this.persistentStorage) {
      try {
        const allKeys = await this.persistentStorage.getAllKeys();
        const matchingKeys = allKeys.filter((key: string) => key.startsWith(prefix));
        await this.persistentStorage.multiRemove(matchingKeys);
      } catch (error) {
        console.error('Cache delete by prefix error:', error);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.persistentStorage) {
      try {
        await this.persistentStorage.clear();
      } catch (error) {
        console.error('Cache clear error:', error);
      }
    }
  }

  /**
   * Get statistics for entries with a specific prefix
   */
  async getStatsByPrefix(prefix: string): Promise<CacheStats> {
    let totalEntries = 0;
    let totalSize = 0;
    let oldestEntry: number | undefined;

    // Check memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.startsWith(prefix)) {
        totalEntries++;
        totalSize += JSON.stringify(entry).length;
        if (!oldestEntry || entry.created < oldestEntry) {
          oldestEntry = entry.created;
        }
      }
    }

    // Check persistent storage
    if (this.persistentStorage) {
      try {
        const allKeys = await this.persistentStorage.getAllKeys();
        const matchingKeys = allKeys.filter((key: string) => key.startsWith(prefix));
        
        for (const key of matchingKeys) {
          if (!this.memoryCache.has(key)) {
            const stored = await this.persistentStorage.getItem(key);
            if (stored) {
              totalEntries++;
              totalSize += stored.length;
              const entry = JSON.parse(stored);
              if (!oldestEntry || entry.created < oldestEntry) {
                oldestEntry = entry.created;
              }
            }
          }
        }
      } catch (error) {
        console.error('Cache stats error:', error);
      }
    }

    return {
      totalEntries,
      totalSize,
      oldestEntry: oldestEntry ? new Date(oldestEntry) : undefined,
    };
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return entry.expires > Date.now();
  }

  /**
   * Start cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  /**
   * Remove expired entries from cache
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean memory cache
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires < now) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clean persistent storage
    if (this.persistentStorage && keysToDelete.length > 0) {
      try {
        await this.persistentStorage.multiRemove(keysToDelete);
      } catch (error) {
        console.error('Cache cleanup error:', error);
      }
    }
  }
}