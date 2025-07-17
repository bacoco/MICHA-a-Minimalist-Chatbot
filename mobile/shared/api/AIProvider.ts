/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProviderConfig {
  provider: string;
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  suggestions?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class AIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Generate a response from the AI provider
   */
  abstract generateResponse(
    messages: Message[],
    context?: Record<string, any>
  ): Promise<AIResponse>;

  /**
   * Generate suggestions for the current page/content
   */
  abstract generateSuggestions(
    content: string,
    language: string,
    siteType?: string
  ): Promise<string[]>;

  /**
   * Validate the API key and configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get the display name of the provider
   */
  abstract getDisplayName(): string;

  /**
   * Check if the provider supports a specific feature
   */
  supportsFeature(feature: string): boolean {
    // Override in subclasses for specific features
    return false;
  }
}

/**
 * Provider factory
 */
export class AIProviderFactory {
  private static providers: Map<string, typeof AIProvider> = new Map();

  static registerProvider(name: string, provider: typeof AIProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  static createProvider(config: AIProviderConfig): AIProvider {
    const ProviderClass = this.providers.get(config.provider.toLowerCase());
    if (!ProviderClass) {
      throw new Error(`Unknown AI provider: ${config.provider}`);
    }
    return new (ProviderClass as any)(config);
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}