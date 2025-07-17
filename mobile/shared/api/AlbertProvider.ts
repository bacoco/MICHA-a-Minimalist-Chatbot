/**
 * Albert AI Provider Implementation
 * Free French Government AI - Default provider for MiCha
 */

import { AIProvider, AIProviderConfig, AIResponse, Message } from './AIProvider';

export class AlbertProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      endpoint: config.endpoint || 'https://albert.api.etalab.gouv.fr/v1',
      model: config.model || 'albert-large',
    });
  }

  async generateResponse(
    messages: Message[],
    context?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          max_tokens: this.config.maxTokens || 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Albert API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Extract suggestions from the response
      const suggestions = this.extractSuggestions(content, context?.language || 'fr');

      return {
        content: this.cleanResponse(content, suggestions),
        suggestions,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('Albert provider error:', error);
      throw error;
    }
  }

  async generateSuggestions(
    content: string,
    language: string,
    siteType?: string
  ): Promise<string[]> {
    const languageMap: Record<string, string> = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
    };

    const targetLanguage = languageMap[language] || languageMap['fr'];

    const prompt = `You are a helpful AI assistant. Generate exactly 4 specific questions about the actual content of this webpage.

Page Type: ${siteType || 'general'}

Requirements:
- Generate EXACTLY 4 questions that are SPECIFIC to this page's content
- DO NOT generate generic questions (the user already has those)
- Focus on the actual topic/content of the page
- DO NOT ask about cookies, website features, navigation, or technical aspects
- Each question should be 5-10 words maximum
- Questions must be in ${targetLanguage}
- Format: One question per line, no numbering, no bullets

Page Content:
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Generate exactly 4 specific questions about this page in ${targetLanguage}:`;

    const messages: Message[] = [
      { role: 'system', content: 'You are a helpful assistant that generates relevant questions about web content.' },
      { role: 'user', content: prompt }
    ];

    const response = await this.generateResponse(messages, { language });
    
    // Parse suggestions from response
    const lines = response.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+[.)]/) && !line.startsWith('-') && !line.startsWith('*'))
      .slice(0, 4);

    // Ensure questions end with question mark
    return lines.map(line => line.endsWith('?') ? line : `${line}?`);
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getDisplayName(): string {
    return 'Albert (French Government AI)';
  }

  supportsFeature(feature: string): boolean {
    const supportedFeatures = ['chat', 'suggestions', 'multilingual'];
    return supportedFeatures.includes(feature);
  }

  private extractSuggestions(content: string, language: string): string[] {
    const suggestionPatterns = [
      // English
      /Suggested questions?\s*:\s*([\s\S]*?)$/i,
      /Questions you might want to ask:\s*([\s\S]*?)$/i,
      // French
      /Questions suggérées\s*:\s*([\s\S]*?)$/i,
      /Questions? (?:à poser|possibles?):\s*([\s\S]*?)$/i,
      // Spanish
      /Preguntas sugeridas\s*:\s*([\s\S]*?)$/i,
      // German
      /Vorgeschlagene Fragen\s*:\s*([\s\S]*?)$/i,
      // Italian
      /Domande suggerite\s*:\s*([\s\S]*?)$/i,
      // Portuguese
      /Perguntas sugeridas\s*:\s*([\s\S]*?)$/i,
      // Dutch
      /Voorgestelde vragen\s*:\s*([\s\S]*?)$/i,
    ];

    for (const pattern of suggestionPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const questions = match[1]
          .split('\n')
          .map(q => q.trim())
          .filter(q => q.length > 0)
          .filter(q => !q.match(/^\d+[.)]/) && !q.startsWith('-') && !q.startsWith('*'))
          .slice(0, 4);
        
        if (questions.length > 0) {
          return questions;
        }
      }
    }

    return [];
  }

  private cleanResponse(content: string, suggestions: string[]): string {
    // Remove the suggestions section from the response
    const questionSectionPattern = /\n*(?:Suggested questions?|Questions suggérées|Preguntas sugeridas|Vorgeschlagene Fragen|Domande suggerite|Perguntas sugeridas|Voorgestelde vragen|Questions you might want to ask|Questions? (?:à poser|possibles?))\s*:\s*[\s\S]*$/i;
    return content.replace(questionSectionPattern, '').trim();
  }
}

// Register the provider
import { AIProviderFactory } from './AIProvider';
AIProviderFactory.registerProvider('albert', AlbertProvider);