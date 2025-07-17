/**
 * Jina AI Service for extracting content from web pages
 * Converts any URL to clean markdown content
 */

import { CacheService } from '../services/CacheService';

export interface JinaResponse {
  content: string;
  title?: string;
  description?: string;
  url: string;
  cached: boolean;
}

export class JinaService {
  private readonly baseUrl = 'https://r.jina.ai';
  private cache: CacheService;
  private readonly cachePrefix = 'jina_';
  private readonly cacheTTL = 3600; // 1 hour in seconds

  constructor(cache: CacheService) {
    this.cache = cache;
  }

  /**
   * Extract content from a URL using Jina AI
   */
  async extractContent(url: string): Promise<JinaResponse> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(url);
    const cached = await this.cache.get<string>(cacheKey);
    
    if (cached) {
      console.log(`Jina cache hit for ${url}`);
      return {
        content: cached,
        url,
        cached: true,
      };
    }

    console.log(`Jina cache miss for ${url}, fetching...`);

    try {
      // Fetch content from Jina
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/markdown',
          'User-Agent': 'MiCha Mobile App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();

      // Cache the result
      await this.cache.set(cacheKey, content, this.cacheTTL);

      // Extract metadata from content
      const { title, description } = this.extractMetadata(content);

      return {
        content,
        title,
        description,
        url,
        cached: false,
      };
    } catch (error) {
      console.error('Jina extraction error:', error);
      throw new Error(`Failed to extract content from ${url}: ${error.message}`);
    }
  }

  /**
   * Extract content from multiple URLs in parallel
   */
  async extractMultiple(urls: string[]): Promise<JinaResponse[]> {
    const promises = urls.map(url => 
      this.extractContent(url).catch(error => ({
        content: '',
        url,
        cached: false,
        error: error.message,
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Clear cache for a specific URL
   */
  async clearCache(url: string): Promise<void> {
    const cacheKey = this.getCacheKey(url);
    await this.cache.delete(cacheKey);
  }

  /**
   * Clear all Jina cache entries
   */
  async clearAllCache(): Promise<void> {
    await this.cache.deleteByPrefix(this.cachePrefix);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
  }> {
    return this.cache.getStatsByPrefix(this.cachePrefix);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private getCacheKey(url: string): string {
    // Create a consistent cache key
    return `${this.cachePrefix}${this.hashUrl(url)}`;
  }

  private hashUrl(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private extractMetadata(content: string): {
    title?: string;
    description?: string;
  } {
    const metadata: { title?: string; description?: string } = {};

    // Try to extract title from markdown
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Try to extract description from first paragraph
    const paragraphMatch = content.match(/^(?!#|\*|-|\d+\.|\[).+$/m);
    if (paragraphMatch) {
      metadata.description = paragraphMatch[0].trim().substring(0, 160);
    }

    return metadata;
  }

  /**
   * Process content for better AI consumption
   */
  processForAI(content: string, maxLength: number = 3000): string {
    // Remove excessive whitespace
    let processed = content.replace(/\n{3,}/g, '\n\n');
    
    // Remove markdown images but keep alt text
    processed = processed.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[$1]');
    
    // Truncate if necessary
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength) + '...';
    }
    
    return processed;
  }
}