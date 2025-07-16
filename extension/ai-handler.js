// AI Handler Module for Universal Web Assistant
// Handles all AI provider interactions and prompt generation

// AI provider configurations
export const AI_PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    format: 'openai'
  },
  groq: {
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    format: 'openai'
  },
  huggingface: {
    name: 'Hugging Face',
    endpoint: 'https://api-inference.huggingface.co/models',
    format: 'huggingface'
  },
  albert: {
    name: 'Albert',
    endpoint: 'https://albert.api.etalab.gouv.fr/v1',
    format: 'openai'
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    format: 'openai'
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    format: 'anthropic'
  },
  custom: {
    name: 'Custom',
    endpoint: '',
    format: 'openai'
  }
};

const MAX_TOKENS = 500;

// Generate response using AI
export async function generateAIResponse(prompt, context, config) {
  console.log('generateAIResponse context:', JSON.stringify(context, null, 2));
  console.log('generateAIResponse config:', JSON.stringify(config, null, 2));
  const { provider, endpoint, model, apiKey } = config;
  console.log('Destructured values:', { provider, endpoint, model, hasApiKey: !!apiKey, apiKeyLength: apiKey?.length });
  
  let requestBody;
  let apiUrl;
  let headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Build request based on provider
  switch (provider) {
    case 'anthropic':
      // Anthropic API format
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      apiUrl = `${endpoint}/messages`;
      requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7
      };
      break;
      
    case 'openrouter':
      // OpenRouter API format (OpenAI-compatible)
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = chrome.runtime.getURL('');
      headers['X-Title'] = 'Universal Web Assistant';
      apiUrl = `${endpoint}/chat/completions`;
      requestBody = {
        model: model,
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
      break;
      
    case 'groq':
      // Groq API format (OpenAI-compatible)
      headers['Authorization'] = `Bearer ${apiKey}`;
      apiUrl = `${endpoint}/chat/completions`;
      requestBody = {
        model: model,
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
      break;
      
    case 'huggingface':
      // Hugging Face Inference API format
      headers['Authorization'] = `Bearer ${apiKey}`;
      apiUrl = `${endpoint}/chat/completions`;
      requestBody = {
        model: model,
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
      break;
      
    case 'openai':
    case 'albert':
    case 'custom':
    default:
      // OpenAI-compatible format (including Albert)
      headers['Authorization'] = `Bearer ${apiKey}`;
      apiUrl = `${endpoint}/chat/completions`;
      requestBody = {
        model: model,
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
      break;
  }
  
  console.log('Making API request to:', apiUrl);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('API error response:', error);
    console.error('Response headers:', response.headers);
    
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your configuration.');
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (response.status === 503) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }
    throw new Error(`${provider} API error: ${error}`);
  }
  
  const data = await response.json();
  
  // Extract content based on provider response format
  if (provider === 'anthropic') {
    return data.content[0].text;
  } else {
    // OpenAI-compatible format
    return data.choices[0].message.content;
  }
}

// Build context-aware prompt
export function buildPrompt(userMessage, pageContent, context) {
  const { siteType = 'general', language = 'fr', title = '' } = context || {};
  
  // Simple language instruction
  const languageMap = {
    en: 'English',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    pl: 'Polish',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic'
  };
  const targetLanguage = languageMap[language] || 'French';
  
  // Site contexts in multiple languages
  const siteContextsByLanguage = {
    en: {
      developer: 'This is a developer/programming website. Focus on technical aspects.',
      educational: 'This is an educational website. Help with learning.',
      ecommerce: 'This is an e-commerce website. Assist with shopping.',
      article: 'This is an article or blog. Help with understanding content.',
      video: 'This is a video platform. Assist with video content.',
      social: 'This is a social media platform. Help with content discovery.',
      general: 'Help the user with their query about this webpage.'
    },
    fr: {
      developer: 'Ceci est un site de développement/programmation. Concentrez-vous sur les aspects techniques.',
      educational: 'Ceci est un site éducatif. Aidez à l\'apprentissage.',
      ecommerce: 'Ceci est un site e-commerce. Assistez pour les achats.',
      article: 'Ceci est un article ou blog. Aidez à comprendre le contenu.',
      video: 'Ceci est une plateforme vidéo. Assistez avec le contenu vidéo.',
      social: 'Ceci est un réseau social. Aidez à découvrir le contenu.',
      general: 'Aidez l\'utilisateur avec sa question sur cette page web.'
    },
    es: {
      developer: 'Este es un sitio web de desarrollo/programación. Enfócate en aspectos técnicos.',
      educational: 'Este es un sitio web educativo. Ayuda con el aprendizaje.',
      ecommerce: 'Este es un sitio web de comercio electrónico. Asiste con las compras.',
      article: 'Este es un artículo o blog. Ayuda a entender el contenido.',
      video: 'Esta es una plataforma de video. Asiste con el contenido del video.',
      social: 'Esta es una plataforma de redes sociales. Ayuda con el descubrimiento de contenido.',
      general: 'Ayuda al usuario con su consulta sobre esta página web.'
    },
    de: {
      developer: 'Dies ist eine Entwickler-/Programmierwebsite. Konzentrieren Sie sich auf technische Aspekte.',
      educational: 'Dies ist eine Bildungswebsite. Helfen Sie beim Lernen.',
      ecommerce: 'Dies ist eine E-Commerce-Website. Unterstützen Sie beim Einkaufen.',
      article: 'Dies ist ein Artikel oder Blog. Helfen Sie beim Verstehen des Inhalts.',
      video: 'Dies ist eine Videoplattform. Unterstützen Sie bei Videoinhalten.',
      social: 'Dies ist eine Social-Media-Plattform. Helfen Sie bei der Inhaltsentdeckung.',
      general: 'Helfen Sie dem Benutzer bei seiner Anfrage zu dieser Webseite.'
    }
  };
  
  // Use site context in user's language
  const langContexts = siteContextsByLanguage[language] || siteContextsByLanguage.en;
  const siteContext = langContexts[siteType] || langContexts.general;
  
  let prompt = `You are a helpful AI assistant integrated into a web browser. Respond ONLY in ${targetLanguage}.

Context: ${siteContext}
Page Title: ${title}

User Message: "${userMessage}"`;

  if (pageContent) {
    const truncatedContent = pageContent.substring(0, 3000);
    prompt += `\n\nPage Content Summary:\n${truncatedContent}${pageContent.length > 3000 ? '...' : ''}`;
  }
  
  prompt += `\n\nProvide a helpful, concise response in ${targetLanguage}.`;
  
  // Simple instruction for follow-up questions
  prompt += `\n\nAt the end, add 4 short follow-up questions (5-7 words each) in ${targetLanguage}.`;
  
  return prompt;
}

// Get system prompt
export function getSystemPrompt(context) {
  const { language = 'fr' } = context || {};
  
  const languageMap = {
    en: 'English',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    pl: 'Polish',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic'
  };
  const targetLanguage = languageMap[language] || 'French';
  
  return `You are a helpful AI assistant. Always respond in ${targetLanguage} only.`;
}