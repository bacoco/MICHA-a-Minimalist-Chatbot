// Supabase client for Universal Web Assistant
// Handles all database operations for chat history and Jina transcriptions

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.baseHeaders = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.baseHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase request failed: ${response.status} ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // Create a new chat session
  async createChatSession(userId, url, context) {
    const session = {
      user_id: userId,
      url: url,
      site_type: context.siteType || 'general',
      language: context.language || 'en',
      domain: context.domain || new URL(url).hostname,
      title: context.title || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await this.request('chat_sessions', {
      method: 'POST',
      body: JSON.stringify(session)
    });

    return result[0];
  }

  // Get existing chat session or create new one
  async getOrCreateChatSession(userId, url, context) {
    try {
      // Try to find existing session for this URL and user
      const existingSessions = await this.request(
        `chat_sessions?user_id=eq.${userId}&url=eq.${encodeURIComponent(url)}&order=created_at.desc&limit=1`
      );

      if (existingSessions && existingSessions.length > 0) {
        // Update the existing session's updated_at timestamp
        await this.request(`chat_sessions?id=eq.${existingSessions[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            updated_at: new Date().toISOString()
          })
        });
        return existingSessions[0];
      }

      // Create new session if none exists
      return await this.createChatSession(userId, url, context);
    } catch (error) {
      console.error('Failed to get or create chat session:', error);
      throw error;
    }
  }

  // Save a chat message
  async saveChatMessage(sessionId, role, message, context = {}) {
    const chatMessage = {
      session_id: sessionId,
      role: role,
      message: message,
      context: context,
      created_at: new Date().toISOString()
    };

    const result = await this.request('chat_messages', {
      method: 'POST',
      body: JSON.stringify(chatMessage)
    });

    return result[0];
  }

  // Save a complete chat interaction (user message + assistant response)
  async saveChatInteraction(userId, url, context, userMessage, assistantResponse) {
    try {
      // Get or create session
      const session = await this.getOrCreateChatSession(userId, url, context);

      // Save user message
      await this.saveChatMessage(session.id, 'user', userMessage, context);

      // Save assistant response
      await this.saveChatMessage(session.id, 'assistant', assistantResponse, context);

      return session;
    } catch (error) {
      console.error('Failed to save chat interaction:', error);
      throw error;
    }
  }

  // Save or update Jina transcription
  async saveJinaTranscription(userId, url, content, ttl = 3600000) {
    try {
      const cachedUntil = new Date(Date.now() + ttl).toISOString();
      
      // Check if transcription already exists
      const existing = await this.request(
        `jina_transcriptions?user_id=eq.${userId}&url=eq.${encodeURIComponent(url)}`
      );

      if (existing && existing.length > 0) {
        // Update existing transcription
        await this.request(`jina_transcriptions?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            content: content,
            cached_until: cachedUntil,
            created_at: new Date().toISOString()
          })
        });
        return existing[0];
      } else {
        // Create new transcription
        const transcription = {
          url: url,
          content: content,
          user_id: userId,
          cached_until: cachedUntil,
          created_at: new Date().toISOString()
        };

        const result = await this.request('jina_transcriptions', {
          method: 'POST',
          body: JSON.stringify(transcription)
        });

        return result[0];
      }
    } catch (error) {
      console.error('Failed to save Jina transcription:', error);
      throw error;
    }
  }

  // Get cached Jina transcription
  async getCachedJinaTranscription(userId, url) {
    try {
      const result = await this.request(
        `jina_transcriptions?user_id=eq.${userId}&url=eq.${encodeURIComponent(url)}&cached_until=gt.${new Date().toISOString()}`
      );

      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get cached Jina transcription:', error);
      return null;
    }
  }

  // Get chat history for a specific session
  async getChatHistory(sessionId, limit = 50) {
    try {
      const result = await this.request(
        `chat_messages?session_id=eq.${sessionId}&order=created_at.asc&limit=${limit}`
      );

      return result || [];
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  // Get recent chat sessions for a user
  async getRecentChatSessions(userId, limit = 10) {
    try {
      const result = await this.request(
        `chat_sessions?user_id=eq.${userId}&order=updated_at.desc&limit=${limit}`
      );

      return result || [];
    } catch (error) {
      console.error('Failed to get recent chat sessions:', error);
      return [];
    }
  }

  // Clean up expired data based on retention policy
  async cleanupExpiredData(userId, retentionDays) {
    try {
      if (retentionDays === 0) {
        // Never delete if retention is 0
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffIso = cutoffDate.toISOString();

      // Delete old chat sessions (cascade will delete messages)
      await this.request(
        `chat_sessions?user_id=eq.${userId}&created_at=lt.${cutoffIso}`,
        {
          method: 'DELETE'
        }
      );

      // Delete old Jina transcriptions
      await this.request(
        `jina_transcriptions?user_id=eq.${userId}&created_at=lt.${cutoffIso}`,
        {
          method: 'DELETE'
        }
      );

      console.log(`Cleaned up data older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  // Delete all user data
  async deleteAllUserData(userId) {
    try {
      // Delete all chat sessions (cascade will delete messages)
      await this.request(
        `chat_sessions?user_id=eq.${userId}`,
        {
          method: 'DELETE'
        }
      );

      // Delete all Jina transcriptions
      await this.request(
        `jina_transcriptions?user_id=eq.${userId}`,
        {
          method: 'DELETE'
        }
      );

      console.log('All user data deleted successfully');
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  // Health check for Supabase connection
  async healthCheck() {
    try {
      const response = await fetch(`${this.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseClient;
} else {
  window.SupabaseClient = SupabaseClient;
}