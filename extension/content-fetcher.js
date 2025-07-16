// Content Fetcher Module for Universal Web Assistant
// Handles page content extraction via Jina AI and caching

import { getCachedData, setCachedData } from './cache-manager.js';

// Note: These globals are from crypto-utils.js and supabase-utils.js loaded in service worker
/* global decrypt, InputValidator, SupabaseError, SupabaseClient, SupabaseCacheManager, HashGenerator */

const JINA_BASE_URL = 'https://r.jina.ai';
const CACHE_PREFIX = 'uwa_cache_';
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Fetch page content using Jina AI with hash-based Supabase caching
export async function fetchPageContent(url, context = {}) {
  try {
    // Get Supabase configuration
    const { supabaseConfig } = await chrome.storage.sync.get(['supabaseConfig']);
    
    // If Supabase is enabled and configured, use hash-based caching
    if (supabaseConfig && supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.key) {
      // Decrypt configuration
      let decryptedConfig = { ...supabaseConfig };
      try {
        decryptedConfig.url = decrypt(supabaseConfig.url);
        decryptedConfig.key = decrypt(supabaseConfig.key);
      } catch (error) {
        console.warn('Failed to decrypt Supabase config, using as-is for backward compatibility');
        decryptedConfig.url = supabaseConfig.url;
        decryptedConfig.key = supabaseConfig.key;
      }
      
      return await fetchPageContentWithSupabase(url, context, decryptedConfig);
    } else {
      // Fall back to original Chrome storage caching
      return await fetchPageContentWithChromeStorage(url);
    }
  } catch (error) {
    console.error('Error in fetchPageContent:', error);
    // Fall back to original method if Supabase fails
    return await fetchPageContentWithChromeStorage(url);
  }
}

// Fetch page content with Supabase hash-based caching
async function fetchPageContentWithSupabase(url, context, supabaseConfig) {
  try {
    // Input validation
    if (!url || !InputValidator.isValidUrl(url)) {
      throw new SupabaseError('Invalid URL provided');
    }
    
    if (!supabaseConfig.url || !supabaseConfig.key) {
      throw new SupabaseError('Invalid Supabase configuration');
    }
    
    const client = new SupabaseClient(supabaseConfig.url, supabaseConfig.key);
    
    // Set user context for RLS policies
    const userId = await getUserId();
    await client.setUserContext(userId);
    
    const cacheManager = new SupabaseCacheManager(client);
    
    // Generate page hash based on strategy with validation
    let pageHash;
    const title = context?.title || '';
    
    if (supabaseConfig.cacheStrategy === 'hash') {
      pageHash = await HashGenerator.generatePageHash(url, title);
    } else if (supabaseConfig.cacheStrategy === 'url') {
      pageHash = await HashGenerator.generateContentHash(url);
    } else {
      // Hybrid: use both URL and title
      pageHash = await HashGenerator.generatePageHash(url, title);
    }
    
    // Check if we have cached content with this hash
    const cachedContent = await cacheManager.getTranscriptionByHash(pageHash);
    
    if (cachedContent) {
      console.log('Supabase cache hit for', url, 'with hash:', pageHash);
      return cachedContent;
    }
    
    console.log('Supabase cache miss, fetching from Jina for', url);
    
    // Fetch from Jina API with validation
    const content = await fetchFromJina(url);
    
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content received from Jina');
    }
    
    // Save to Supabase with hash
    const ttlHours = Math.max(1, Math.min(8760, supabaseConfig.cacheRetention * 24)); // Convert days to hours, validate range
    await cacheManager.saveTranscription(pageHash, url, content, userId, ttlHours);
    
    return content;
  } catch (error) {
    console.error('Supabase caching error:', error);
    
    // Log specific error types for debugging
    if (error instanceof SupabaseError) {
      console.error('Supabase specific error:', error.message, error.statusCode);
    }
    
    // Fall back to Chrome storage
    return await fetchPageContentWithChromeStorage(url);
  }
}

// Original Chrome storage caching method
async function fetchPageContentWithChromeStorage(url) {
  const cacheKey = `${CACHE_PREFIX}${url}`;
  const cached = await getCachedData(cacheKey);
  
  if (cached) {
    console.log('Chrome storage cache hit for', url);
    return cached;
  }
  
  console.log('Chrome storage cache miss, fetching from Jina for', url);
  
  const content = await fetchFromJina(url);
  await setCachedData(cacheKey, content, CACHE_TTL);
  
  return content;
}

// Core Jina API fetching function
export async function fetchFromJina(url) {
  // Input validation
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided to fetchFromJina');
  }
  
  if (!InputValidator.isValidUrl(url)) {
    throw new Error('Invalid URL format provided to fetchFromJina');
  }
  
  const encodedUrl = encodeURIComponent(url);
  const jinaUrl = `${JINA_BASE_URL}/${encodedUrl}`;
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Universal-Web-Assistant/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Validate content
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content received from Jina API');
    }
    
    return content;
  } catch (error) {
    console.error('Error fetching from Jina:', error);
    throw error;
  }
}

// Get or generate a unique user ID
async function getUserId() {
  try {
    const { userId } = await chrome.storage.local.get(['userId']);
    
    if (userId && typeof userId === 'string' && userId.length > 0) {
      return userId;
    }
    
    // Generate a new user ID with better randomness
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    const newUserId = `user_${randomPart}_${timestamp}`;
    
    await chrome.storage.local.set({ userId: newUserId });
    return newUserId;
  } catch (error) {
    console.error('Error getting/generating user ID:', error);
    
    // Fallback to a simple ID if storage fails
    return `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }
}