import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ALBERT_API_URL = process.env.SERVER_URL_ALBERT || 'https://albert.api.etalab.gouv.fr/v1';
const API_KEY = process.env.API_KEY_ALBERT;
const MODEL = process.env.MODEL_ALBERT || 'albert-large';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '500');

/**
 * Generate response using Albert LLM
 * @param {string} prompt - The prompt to send to Albert
 * @param {object} context - Additional context (language, site type, etc)
 * @returns {Promise<string>} - The generated response
 */
export async function generateResponse(prompt, context = {}) {
  try {
    if (!API_KEY) {
      throw new Error('Albert API key not configured. Please set API_KEY_ALBERT in .env file');
    }
    
    console.log('Generating response with Albert...');
    
    // Prepare the request
    const requestBody = {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(context)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      top_p: 0.9
    };
    
    // Make API request to Albert
    const response = await axios.post(
      `${ALBERT_API_URL}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    // Extract the response
    if (response.data && response.data.choices && response.data.choices[0]) {
      const message = response.data.choices[0].message.content;
      console.log('Albert response received');
      return message;
    } else {
      throw new Error('Invalid response format from Albert API');
    }
    
  } catch (error) {
    console.error('Albert API error:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        throw new Error('Invalid Albert API key. Please check your configuration.');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (status === 503) {
        throw new Error('Albert service is temporarily unavailable.');
      } else {
        throw new Error(`Albert API error: ${errorData?.error?.message || 'Unknown error'}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request to Albert timed out. Please try again.');
    } else {
      throw new Error('Failed to connect to Albert API');
    }
  }
}

/**
 * Get system prompt based on context
 * @param {object} context - Context object with siteType, language, etc
 * @returns {string} - System prompt
 */
function getSystemPrompt(context) {
  const { language = 'en', siteType = 'general' } = context;
  
  // Base system prompt
  let systemPrompt = `You are a helpful AI assistant integrated into a web browser extension called Universal Web Assistant. 
You help users understand and interact with web pages more effectively.
You should be concise, accurate, and helpful.`;

  // Language-specific instructions
  if (language === 'fr') {
    systemPrompt = `Vous êtes un assistant IA utile intégré dans une extension de navigateur web appelée Universal Web Assistant.
Vous aidez les utilisateurs à comprendre et interagir avec les pages web plus efficacement.
Vous devez être concis, précis et utile.`;
  }
  
  // Site-type specific instructions
  const siteInstructions = {
    developer: '\nFocus on technical explanations, code examples, and programming best practices.',
    educational: '\nHelp with learning, provide clear explanations, and support educational goals.',
    ecommerce: '\nAssist with product information, comparisons, and shopping decisions.',
    article: '\nHelp summarize content, identify key points, and provide insights.',
    video: '\nAssist with video content understanding and navigation.',
    social: '\nHelp with content discovery and understanding social media posts.',
    general: '\nProvide helpful information based on the page content.'
  };
  
  systemPrompt += siteInstructions[siteType] || siteInstructions.general;
  
  // Add response formatting instructions
  systemPrompt += '\n\nKeep responses concise (under 200 words) unless more detail is specifically requested.';
  
  return systemPrompt;
}

/**
 * Format response for better readability
 * @param {string} response - Raw response from Albert
 * @returns {string} - Formatted response
 */
export function formatResponse(response) {
  if (!response) return '';
  
  // Ensure response ends with proper punctuation
  const trimmed = response.trim();
  if (trimmed && !trimmed.match(/[.!?]$/)) {
    return trimmed + '.';
  }
  
  return trimmed;
}

/**
 * Generate a fallback response when Albert is unavailable
 * @param {string} message - User message
 * @param {object} context - Context object
 * @returns {string} - Fallback response
 */
export function getFallbackResponse(message, context) {
  const { language = 'en' } = context;
  
  const fallbacks = {
    en: "I'm currently unable to process your request. Please try again in a moment.",
    fr: "Je ne peux pas traiter votre demande pour le moment. Veuillez réessayer dans un instant."
  };
  
  return fallbacks[language] || fallbacks.en;
}