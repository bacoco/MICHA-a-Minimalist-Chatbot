// Supabase utilities for Universal Web Assistant
// Hash-based caching system for Jina transcriptions and chat history

// Input validation utilities
class InputValidator {
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  static sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>"']/g, '');
  }
  
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  static isValidHash(hash) {
    return /^[a-f0-9]{64}$/i.test(hash);
  }
}

// Enhanced error handling
class SupabaseError extends Error {
  constructor(message, statusCode = null, details = null) {
    super(message);
    this.name = 'SupabaseError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Supabase client class
class SupabaseClient {
  constructor(url, key) {
    if (!InputValidator.isValidUrl(url)) {
      throw new SupabaseError('Invalid Supabase URL provided');
    }
    if (!key || typeof key !== 'string') {
      throw new SupabaseError('Invalid Supabase key provided');
    }
    
    this.url = url.replace(/\/$/, ''); // Remove trailing slash
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };
    this.userId = null;
  }
  
  // Set user context for RLS policies
  async setUserContext(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new SupabaseError('Invalid user ID provided');
    }
    
    this.userId = InputValidator.sanitizeString(userId);
    
    try {
      // Set user context in database session
      const response = await fetch(`${this.url}/rest/v1/rpc/set_user_context`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ user_id: this.userId })
      });
      
      if (!response.ok) {
        // If RPC doesn't exist, we'll handle it in the policies
        console.warn('Unable to set user context via RPC, using headers instead');
      }
    } catch (error) {
      console.warn('Failed to set user context:', error);
    }
    
    // Also add to headers for backup
    this.headers['x-user-id'] = this.userId;
  }

  async query(table, options = {}) {
    // Input validation
    if (!table || typeof table !== 'string') {
      throw new SupabaseError('Invalid table name provided');
    }
    
    const tableName = InputValidator.sanitizeString(table);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new SupabaseError('Invalid table name format');
    }
    
    const { select = '*', filter = {}, limit, insert, update, delete: deleteId } = options;
    let url = `${this.url}/rest/v1/${tableName}`;
    
    try {
      if (insert) {
        return await this._handleInsert(url, insert);
      }
      
      if (update && deleteId) {
        return await this._handleUpdate(url, update, deleteId);
      }
      
      if (deleteId) {
        return await this._handleDelete(url, deleteId);
      }
      
      // Handle SELECT queries
      return await this._handleSelect(url, select, filter, limit);
      
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      
      console.error('Supabase query error:', error);
      throw new SupabaseError(
        `Database operation failed: ${error.message}`,
        error.statusCode || 500,
        error
      );
    }
  }
  
  async _handleInsert(url, data) {
    if (!data || typeof data !== 'object') {
      throw new SupabaseError('Invalid data for insert operation');
    }
    
    // Add user context if available
    if (this.userId) {
      data = { ...data, user_id: this.userId };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new SupabaseError(
        `Insert failed: ${response.statusText}`,
        response.status,
        errorText
      );
    }
    
    return await response.json();
  }
  
  async _handleUpdate(url, data, id) {
    if (!data || typeof data !== 'object') {
      throw new SupabaseError('Invalid data for update operation');
    }
    
    if (!id || typeof id !== 'string') {
      throw new SupabaseError('Invalid ID for update operation');
    }
    
    const sanitizedId = InputValidator.sanitizeString(id);
    const updateUrl = `${url}?id=eq.${encodeURIComponent(sanitizedId)}`;
    
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new SupabaseError(
        `Update failed: ${response.statusText}`,
        response.status,
        errorText
      );
    }
    
    return await response.json();
  }
  
  async _handleDelete(url, id) {
    if (!id || typeof id !== 'string') {
      throw new SupabaseError('Invalid ID for delete operation');
    }
    
    const sanitizedId = InputValidator.sanitizeString(id);
    const deleteUrl = `${url}?id=eq.${encodeURIComponent(sanitizedId)}`;
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: this.headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new SupabaseError(
        `Delete failed: ${response.statusText}`,
        response.status,
        errorText
      );
    }
    
    return response.ok;
  }
  
  async _handleSelect(url, select, filter, limit) {
    const params = new URLSearchParams();
    
    // Validate and sanitize select parameter
    if (select && typeof select === 'string') {
      const sanitizedSelect = InputValidator.sanitizeString(select);
      if (sanitizedSelect) {
        params.append('select', sanitizedSelect);
      }
    }
    
    // Add filters with proper validation
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && key && typeof key === 'string') {
          const sanitizedKey = InputValidator.sanitizeString(key);
          const sanitizedValue = InputValidator.sanitizeString(String(value));
          
          if (sanitizedKey && sanitizedValue) {
            params.append(sanitizedKey, `eq.${sanitizedValue}`);
          }
        }
      });
    }
    
    // Add limit with validation
    if (limit && typeof limit === 'number' && limit > 0 && limit <= 1000) {
      params.append('limit', limit.toString());
    }
    
    const finalUrl = `${url}?${params.toString()}`;
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: this.headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new SupabaseError(
        `Select failed: ${response.statusText}`,
        response.status,
        errorText
      );
    }
    
    return await response.json();
  }
}

// Hash generation utilities
class HashGenerator {
  static async generatePageHash(url, title = '', lastModified = null) {
    // Input validation
    if (!url || typeof url !== 'string') {
      throw new SupabaseError('Invalid URL provided for hash generation');
    }
    
    if (!InputValidator.isValidUrl(url)) {
      throw new SupabaseError('Invalid URL format for hash generation');
    }
    
    // Create a consistent hash based on URL and metadata
    const data = JSON.stringify({
      url: InputValidator.sanitizeString(url),
      title: InputValidator.sanitizeString(title || ''),
      lastModified: lastModified || Date.now()
    });
    
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      throw new SupabaseError('Failed to generate page hash', null, error);
    }
  }
  
  static async generateContentHash(content) {
    // Input validation
    if (!content || typeof content !== 'string') {
      throw new SupabaseError('Invalid content provided for hash generation');
    }
    
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      throw new SupabaseError('Failed to generate content hash', null, error);
    }
  }
}

// Supabase cache manager
class SupabaseCacheManager {
  constructor(supabaseClient) {
    if (!supabaseClient || !(supabaseClient instanceof SupabaseClient)) {
      throw new SupabaseError('Invalid Supabase client provided');
    }
    this.client = supabaseClient;
  }
  
  async getTranscriptionByHash(hash) {
    // Input validation
    if (!hash || typeof hash !== 'string') {
      throw new SupabaseError('Invalid hash provided');
    }
    
    if (!InputValidator.isValidHash(hash)) {
      throw new SupabaseError('Invalid hash format');
    }
    
    try {
      const result = await this.client.query('jina_transcriptions', {
        select: 'id,content,cached_until',
        filter: { page_hash: hash },
        limit: 1
      });
      
      if (result && result.length > 0) {
        const transcription = result[0];
        
        // Validate transcription data
        if (!transcription.cached_until || !transcription.content) {
          console.warn('Invalid transcription data found, removing');
          await this._safeDelete(transcription.id);
          return null;
        }
        
        // Check if cache is still valid (not expired)
        const cacheExpiry = new Date(transcription.cached_until);
        if (cacheExpiry > new Date()) {
          return transcription.content;
        }
        
        // Cache expired, remove old entry
        await this._safeDelete(transcription.id);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching transcription from Supabase:', error);
      if (error instanceof SupabaseError) {
        throw error;
      }
      return null;
    }
  }
  
  async _safeDelete(id) {
    try {
      await this.client.query('jina_transcriptions', {
        delete: id
      });
    } catch (error) {
      console.warn('Failed to delete expired transcription:', error);
    }
  }
  
  async saveTranscription(hash, url, content, userId, ttlHours = 24) {
    // Input validation
    if (!hash || !InputValidator.isValidHash(hash)) {
      throw new SupabaseError('Invalid hash provided');
    }
    
    if (!url || !InputValidator.isValidUrl(url)) {
      throw new SupabaseError('Invalid URL provided');
    }
    
    if (!content || typeof content !== 'string') {
      throw new SupabaseError('Invalid content provided');
    }
    
    if (!userId || typeof userId !== 'string') {
      throw new SupabaseError('Invalid user ID provided');
    }
    
    if (typeof ttlHours !== 'number' || ttlHours <= 0 || ttlHours > 8760) { // Max 1 year
      throw new SupabaseError('Invalid TTL hours provided');
    }
    
    try {
      const cachedUntil = new Date();
      cachedUntil.setHours(cachedUntil.getHours() + ttlHours);
      
      const transcription = {
        page_hash: hash,
        url: InputValidator.sanitizeString(url),
        content: content,
        user_id: InputValidator.sanitizeString(userId),
        cached_until: cachedUntil.toISOString(),
        created_at: new Date().toISOString()
      };
      
      await this.client.query('jina_transcriptions', {
        insert: transcription
      });
      
      return true;
    } catch (error) {
      console.error('Error saving transcription to Supabase:', error);
      if (error instanceof SupabaseError) {
        throw error;
      }
      return false;
    }
  }
  
  async getChatHistory(sessionId) {
    // Input validation
    if (!sessionId || typeof sessionId !== 'string') {
      throw new SupabaseError('Invalid session ID provided');
    }
    
    if (!InputValidator.isValidUUID(sessionId)) {
      throw new SupabaseError('Invalid session ID format');
    }
    
    try {
      const result = await this.client.query('chat_messages', {
        select: 'id,role,message,context,created_at',
        filter: { session_id: sessionId },
        limit: 100 // Reasonable limit
      });
      
      return result || [];
    } catch (error) {
      console.error('Error fetching chat history from Supabase:', error);
      if (error instanceof SupabaseError) {
        throw error;
      }
      return [];
    }
  }
  
  async saveChatMessage(sessionId, role, message, context = null) {
    // Input validation
    if (!sessionId || !InputValidator.isValidUUID(sessionId)) {
      throw new SupabaseError('Invalid session ID provided');
    }
    
    if (!role || !['user', 'assistant'].includes(role)) {
      throw new SupabaseError('Invalid role provided');
    }
    
    if (!message || typeof message !== 'string') {
      throw new SupabaseError('Invalid message provided');
    }
    
    if (message.length > 10000) { // Reasonable limit
      throw new SupabaseError('Message too long');
    }
    
    try {
      const chatMessage = {
        session_id: sessionId,
        role: role,
        message: InputValidator.sanitizeString(message),
        context: context ? JSON.stringify(context) : null,
        created_at: new Date().toISOString()
      };
      
      await this.client.query('chat_messages', {
        insert: chatMessage
      });
      
      return true;
    } catch (error) {
      console.error('Error saving chat message to Supabase:', error);
      if (error instanceof SupabaseError) {
        throw error;
      }
      return false;
    }
  }
  
  async createChatSession(userId, url, siteType, language, domain, title) {
    // Input validation
    if (!userId || typeof userId !== 'string') {
      throw new SupabaseError('Invalid user ID provided');
    }
    
    if (!url || !InputValidator.isValidUrl(url)) {
      throw new SupabaseError('Invalid URL provided');
    }
    
    if (!siteType || typeof siteType !== 'string') {
      throw new SupabaseError('Invalid site type provided');
    }
    
    if (!language || typeof language !== 'string') {
      throw new SupabaseError('Invalid language provided');
    }
    
    if (!domain || typeof domain !== 'string') {
      throw new SupabaseError('Invalid domain provided');
    }
    
    try {
      const pageHash = await HashGenerator.generatePageHash(url, title);
      
      const session = {
        user_id: InputValidator.sanitizeString(userId),
        page_hash: pageHash,
        url: InputValidator.sanitizeString(url),
        site_type: InputValidator.sanitizeString(siteType),
        language: InputValidator.sanitizeString(language),
        domain: InputValidator.sanitizeString(domain),
        title: InputValidator.sanitizeString(title || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await this.client.query('chat_sessions', {
        insert: session
      });
      
      return result && result.length > 0 ? result[0].id : null;
    } catch (error) {
      console.error('Error creating chat session in Supabase:', error);
      if (error instanceof SupabaseError) {
        throw error;
      }
      return null;
    }
  }
}

// Export functions for use in service worker
if (typeof window !== 'undefined') {
  window.SupabaseClient = SupabaseClient;
  window.HashGenerator = HashGenerator;
  window.SupabaseCacheManager = SupabaseCacheManager;
  window.SupabaseError = SupabaseError;
  window.InputValidator = InputValidator;
}