import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const JINA_BASE_URL = 'https://r.jina.ai';
const CACHE_PREFIX = 'jina:';

/**
 * Fetch page content using Jina AI
 * @param {string} url - The URL to extract content from
 * @returns {Promise<string>} - The extracted content as markdown
 */
export async function fetchPageContent(url) {
  try {
    // Check cache first
    const cacheKey = `${CACHE_PREFIX}${url}`;
    const cachedContent = getCache(cacheKey);
    
    if (cachedContent) {
      console.log(`Cache hit for ${url}`);
      return cachedContent;
    }
    
    console.log(`Fetching content from Jina for ${url}`);
    
    // Encode URL for Jina
    const encodedUrl = encodeURIComponent(url);
    const jinaUrl = `${JINA_BASE_URL}/${encodedUrl}`;
    
    // Fetch from Jina
    const response = await axios.get(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Universal-Web-Assistant/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.data) {
      throw new Error('No content received from Jina');
    }
    
    // Extract text content
    const content = response.data;
    
    // Cache the result
    setCache(cacheKey, content);
    console.log(`Cached content for ${url}`);
    
    return content;
    
  } catch (error) {
    console.error('Jina extraction error:', error.message);
    
    // Return error message instead of throwing
    if (error.response) {
      throw new Error(`Jina API error: ${error.response.status}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Jina request timeout');
    } else {
      throw new Error('Failed to extract page content');
    }
  }
}

/**
 * Extract key information from page content
 * @param {string} content - The page content
 * @returns {object} - Extracted metadata
 */
export function extractMetadata(content) {
  const metadata = {
    title: '',
    headings: [],
    links: [],
    codeBlocks: 0,
    wordCount: 0
  };
  
  if (!content) return metadata;
  
  // Extract title (first H1 or first line)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1];
  } else {
    const firstLine = content.split('\n')[0];
    metadata.title = firstLine.substring(0, 100);
  }
  
  // Extract all headings
  const headingMatches = content.matchAll(/^#+\s+(.+)$/gm);
  for (const match of headingMatches) {
    metadata.headings.push(match[1]);
  }
  
  // Count code blocks
  const codeBlockMatches = content.matchAll(/```[\s\S]*?```/g);
  metadata.codeBlocks = Array.from(codeBlockMatches).length;
  
  // Extract links
  const linkMatches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
  for (const match of linkMatches) {
    metadata.links.push({
      text: match[1],
      url: match[2]
    });
  }
  
  // Word count
  metadata.wordCount = content.split(/\s+/).length;
  
  return metadata;
}

/**
 * Clean and truncate content for context
 * @param {string} content - Raw content
 * @param {number} maxLength - Maximum length
 * @returns {string} - Cleaned content
 */
export function cleanContent(content, maxLength = 3000) {
  if (!content) return '';
  
  // Remove excessive whitespace
  let cleaned = content.replace(/\n{3,}/g, '\n\n');
  
  // Remove very long code blocks if needed
  if (cleaned.length > maxLength * 2) {
    cleaned = cleaned.replace(/```[\s\S]{500,}?```/g, '```\n[Long code block omitted]\n```');
  }
  
  // Truncate if still too long
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '...';
  }
  
  return cleaned;
}