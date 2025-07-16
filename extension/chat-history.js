// Chat History Module for Universal Web Assistant
// Handles chat session management and history storage

// Note: These globals are from crypto-utils.js and supabase-utils.js loaded in service worker
/* global decrypt, InputValidator, SupabaseError, SupabaseClient, SupabaseCacheManager, HashGenerator */

// Save chat history to Supabase
export async function saveChatHistory(userMessage, aiResponse, url, context) {
  try {
    // Input validation
    if (!userMessage || !aiResponse || !url) {
      console.warn('Invalid parameters for chat history save');
      return;
    }
    
    if (!InputValidator.isValidUrl(url)) {
      console.warn('Invalid URL for chat history save');
      return;
    }
    
    // Get Supabase configuration
    const { supabaseConfig } = await chrome.storage.sync.get(['supabaseConfig']);
    
    // Only save if Supabase is enabled and chat history is enabled
    if (!supabaseConfig || !supabaseConfig.enabled || !supabaseConfig.enableChatHistory) {
      return;
    }
    
    if (!supabaseConfig.url || !supabaseConfig.key) {
      console.warn('Supabase not configured, skipping chat history save');
      return;
    }
    
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
    
    const client = new SupabaseClient(decryptedConfig.url, decryptedConfig.key);
    
    // Set user context for RLS policies
    const userId = await getUserId();
    await client.setUserContext(userId);
    
    const cacheManager = new SupabaseCacheManager(client);
    
    // Get or create chat session
    const sessionId = await getOrCreateChatSession(
      cacheManager, 
      userId, 
      url, 
      context?.siteType || 'general', 
      context?.language || 'en', 
      context?.domain || new URL(url).hostname, 
      context?.title || ''
    );
    
    if (sessionId) {
      // Save user message
      await cacheManager.saveChatMessage(sessionId, 'user', userMessage, context);
      
      // Save AI response
      await cacheManager.saveChatMessage(sessionId, 'assistant', aiResponse, context);
    }
    
  } catch (error) {
    console.error('Error saving chat history:', error);
    
    // Log specific error types for debugging
    if (error instanceof SupabaseError) {
      console.error('Supabase specific error in chat history:', error.message, error.statusCode);
    }
  }
}

// Get or create chat session
export async function getOrCreateChatSession(cacheManager, userId, url, siteType, language, domain, title) {
  try {
    // Input validation
    if (!userId || !url || !siteType || !language || !domain) {
      throw new SupabaseError('Missing required parameters for chat session');
    }
    
    if (!InputValidator.isValidUrl(url)) {
      throw new SupabaseError('Invalid URL provided');
    }
    
    // Generate page hash to identify the session
    const pageHash = await HashGenerator.generatePageHash(url, title || '');
    
    // Check if we already have a session for this page
    const existingSessions = await cacheManager.client.query('chat_sessions', {
      select: 'id',
      filter: { user_id: userId, page_hash: pageHash },
      limit: 1
    });
    
    if (existingSessions && existingSessions.length > 0) {
      return existingSessions[0].id;
    }
    
    // Create new session
    const sessionId = await cacheManager.createChatSession(
      userId, 
      url, 
      siteType, 
      language, 
      domain, 
      title || ''
    );
    
    return sessionId;
    
  } catch (error) {
    console.error('Error managing chat session:', error);
    
    // Log specific error types for debugging
    if (error instanceof SupabaseError) {
      console.error('Supabase specific error in chat session:', error.message, error.statusCode);
    }
    
    return null;
  }
}

// Get or generate a unique user ID
export async function getUserId() {
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