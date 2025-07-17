/**
 * Secure Storage Service for sensitive data
 * Uses platform-specific secure storage (Keychain/Keystore)
 */

export interface SecureStorageInterface {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageOptions {
  encrypted?: boolean;
  accessible?: string; // iOS Keychain accessibility
}

export class StorageService {
  private secureStorage: SecureStorageInterface;
  private regularStorage: any; // AsyncStorage or similar
  private keyPrefix = 'micha_';

  constructor(secureStorage: SecureStorageInterface, regularStorage: any) {
    this.secureStorage = secureStorage;
    this.regularStorage = regularStorage;
  }

  /**
   * Store API key securely
   */
  async setAPIKey(provider: string, apiKey: string): Promise<void> {
    const key = `${this.keyPrefix}api_${provider}`;
    await this.secureStorage.setItem(key, apiKey);
  }

  /**
   * Get API key
   */
  async getAPIKey(provider: string): Promise<string | null> {
    const key = `${this.keyPrefix}api_${provider}`;
    return this.secureStorage.getItem(key);
  }

  /**
   * Remove API key
   */
  async removeAPIKey(provider: string): Promise<void> {
    const key = `${this.keyPrefix}api_${provider}`;
    await this.secureStorage.removeItem(key);
  }

  /**
   * Store user preferences
   */
  async setPreferences(preferences: UserPreferences): Promise<void> {
    const key = `${this.keyPrefix}preferences`;
    await this.regularStorage.setItem(key, JSON.stringify(preferences));
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences | null> {
    const key = `${this.keyPrefix}preferences`;
    try {
      const stored = await this.regularStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse preferences:', error);
      return null;
    }
  }

  /**
   * Store chat session
   */
  async saveChatSession(sessionId: string, session: ChatSession): Promise<void> {
    const key = `${this.keyPrefix}session_${sessionId}`;
    await this.regularStorage.setItem(key, JSON.stringify(session));
  }

  /**
   * Get chat session
   */
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const key = `${this.keyPrefix}session_${sessionId}`;
    try {
      const stored = await this.regularStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse chat session:', error);
      return null;
    }
  }

  /**
   * Get all chat sessions
   */
  async getAllChatSessions(): Promise<ChatSession[]> {
    try {
      const allKeys = await this.regularStorage.getAllKeys();
      const sessionKeys = allKeys.filter((key: string) => 
        key.startsWith(`${this.keyPrefix}session_`)
      );

      const sessions: ChatSession[] = [];
      for (const key of sessionKeys) {
        const stored = await this.regularStorage.getItem(key);
        if (stored) {
          try {
            sessions.push(JSON.parse(stored));
          } catch (error) {
            console.error(`Failed to parse session ${key}:`, error);
          }
        }
      }

      // Sort by last updated
      return sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }

  /**
   * Delete chat session
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    const key = `${this.keyPrefix}session_${sessionId}`;
    await this.regularStorage.removeItem(key);
  }

  /**
   * Clean up old sessions (older than days specified)
   */
  async cleanupOldSessions(daysToKeep: number = 7): Promise<number> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const sessions = await this.getAllChatSessions();
    let deletedCount = 0;

    for (const session of sessions) {
      if (session.lastUpdated < cutoffTime) {
        await this.deleteChatSession(session.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{
    totalSessions: number;
    totalSize: number;
    oldestSession?: Date;
    newestSession?: Date;
  }> {
    const sessions = await this.getAllChatSessions();
    let totalSize = 0;
    let oldest: number | undefined;
    let newest: number | undefined;

    for (const session of sessions) {
      totalSize += JSON.stringify(session).length;
      if (!oldest || session.created < oldest) {
        oldest = session.created;
      }
      if (!newest || session.lastUpdated > newest) {
        newest = session.lastUpdated;
      }
    }

    return {
      totalSessions: sessions.length,
      totalSize,
      oldestSession: oldest ? new Date(oldest) : undefined,
      newestSession: newest ? new Date(newest) : undefined,
    };
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    // Clear regular storage
    try {
      const allKeys = await this.regularStorage.getAllKeys();
      const ourKeys = allKeys.filter((key: string) => key.startsWith(this.keyPrefix));
      await this.regularStorage.multiRemove(ourKeys);
    } catch (error) {
      console.error('Failed to clear regular storage:', error);
    }

    // Note: We don't clear secure storage entirely as it may contain other app data
    // Users must explicitly remove API keys
  }
}

// Type definitions
export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  provider: string;
  model: string;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  autoHideWidget: boolean;
}

export interface ChatSession {
  id: string;
  url?: string;
  title?: string;
  messages: ChatMessage[];
  created: number;
  lastUpdated: number;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}