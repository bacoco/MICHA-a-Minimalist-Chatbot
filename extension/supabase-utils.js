// Supabase utilities for Universal Web Assistant
// Hash-based caching system for Jina transcriptions and chat history

// Supabase client class
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };
  }

  async query(table, options = {}) {
    const { select = '*', filter = {}, limit, insert, update, delete: deleteId } = options;
    
    let url = `${this.url}/rest/v1/${table}`;
    
    try {
      if (insert) {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(insert)
        });
        
        if (!response.ok) {
          throw new Error(`Supabase INSERT error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
      
      if (update && deleteId) {
        const response = await fetch(`${url}?id=eq.${deleteId}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify(update)
        });
        
        if (!response.ok) {
          throw new Error(`Supabase UPDATE error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
      
      if (deleteId) {
        const response = await fetch(`${url}?id=eq.${deleteId}`, {
          method: 'DELETE',
          headers: this.headers
        });
        
        if (!response.ok) {
          throw new Error(`Supabase DELETE error: ${response.status} ${response.statusText}`);
        }
        
        return response.ok;
      }
      
      // Build query string for SELECT
      const params = new URLSearchParams();
      params.append('select', select);
      
      // Add filters
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, `eq.${value}`);
        }
      });
      
      if (limit) {
        params.append('limit', limit);
      }
      
      url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`Supabase SELECT error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }
}

// Hash generation utilities
class HashGenerator {
  static async generatePageHash(url, title = '', lastModified = null) {
    // Create a consistent hash based on URL and metadata
    const data = JSON.stringify({
      url: url,
      title: title || '',
      lastModified: lastModified || Date.now()
    });
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
  
  static async generateContentHash(content) {
    // Generate hash from actual content
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
}

// Supabase cache manager
class SupabaseCacheManager {
  constructor(supabaseClient) {
    this.client = supabaseClient;
  }
  
  async getTranscriptionByHash(hash) {
    try {
      const result = await this.client.query('jina_transcriptions', {
        select: '*',
        filter: { page_hash: hash }
      });
      
      if (result && result.length > 0) {
        const transcription = result[0];
        
        // Check if cache is still valid (not expired)
        const cacheExpiry = new Date(transcription.cached_until);
        if (cacheExpiry > new Date()) {
          return transcription.content;
        }
        
        // Cache expired, remove old entry
        await this.client.query('jina_transcriptions', {
          delete: transcription.id
        });
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching transcription from Supabase:', error);
      return null;
    }
  }
  
  async saveTranscription(hash, url, content, userId, ttlHours = 24) {
    try {
      const cachedUntil = new Date();
      cachedUntil.setHours(cachedUntil.getHours() + ttlHours);
      
      const transcription = {
        page_hash: hash,
        url: url,
        content: content,
        user_id: userId,
        cached_until: cachedUntil.toISOString(),
        created_at: new Date().toISOString()
      };
      
      await this.client.query('jina_transcriptions', {
        insert: transcription
      });
      
      return true;
    } catch (error) {
      console.error('Error saving transcription to Supabase:', error);
      return false;
    }
  }
  
  async getChatHistory(sessionId) {
    try {
      const result = await this.client.query('chat_messages', {
        select: '*',
        filter: { session_id: sessionId }
      });
      
      return result || [];
    } catch (error) {
      console.error('Error fetching chat history from Supabase:', error);
      return [];
    }
  }
  
  async saveChatMessage(sessionId, role, message, context = null) {
    try {
      const chatMessage = {
        session_id: sessionId,
        role: role,
        message: message,
        context: context ? JSON.stringify(context) : null,
        created_at: new Date().toISOString()
      };
      
      await this.client.query('chat_messages', {
        insert: chatMessage
      });
      
      return true;
    } catch (error) {
      console.error('Error saving chat message to Supabase:', error);
      return false;
    }
  }
  
  async createChatSession(userId, url, siteType, language, domain, title) {
    try {
      const pageHash = await HashGenerator.generatePageHash(url, title);
      
      const session = {
        user_id: userId,
        page_hash: pageHash,
        url: url,
        site_type: siteType,
        language: language,
        domain: domain,
        title: title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await this.client.query('chat_sessions', {
        insert: session
      });
      
      return result && result.length > 0 ? result[0].id : null;
    } catch (error) {
      console.error('Error creating chat session in Supabase:', error);
      return null;
    }
  }
}

// Export functions for use in service worker
if (typeof window !== 'undefined') {
  window.SupabaseClient = SupabaseClient;
  window.HashGenerator = HashGenerator;
  window.SupabaseCacheManager = SupabaseCacheManager;
}