// Service Worker for Universal Web Assistant
// Fixed version with proper error handling

// Import crypto utils and supabase utils
importScripts('crypto-utils.js', 'supabase-utils.js');

// Initialize DEFAULT_CONFIG
let DEFAULT_CONFIG;

// Try to import default config if it exists
try {
  importScripts('default-config.js');
  console.log('Successfully loaded default-config.js');
} catch (error) {
  console.log('No default-config.js found, using fallback configuration');
  // Define fallback configuration
  DEFAULT_CONFIG = {
    provider: 'albert',
    endpoint: 'https://albert.api.etalab.gouv.fr/v1',
    model: 'albert-large',
    encryptedApiKey: null,
    enabledByDefault: true,
    cacheEnabled: true,
    cacheTTL: 3600000, // 1 hour in milliseconds
    features: {
      supabaseCache: true,
      chatHistory: true,
      contextualHelp: true,
      keyboardShortcuts: true
    }
  };
}

// Wrap everything in try-catch to prevent registration failures
try {
  console.log('Service Worker: Starting initialization...');
  console.log('DEFAULT_CONFIG loaded:', !!DEFAULT_CONFIG, DEFAULT_CONFIG ? 'with provider: ' + DEFAULT_CONFIG.provider : '');

  // Configuration
  const CONFIG = {
    JINA_BASE_URL: 'https://r.jina.ai',
    CACHE_PREFIX: 'uwa_cache_',
    CACHE_TTL: 3600000, // 1 hour in milliseconds
    MAX_TOKENS: 500,
    DEFAULT_PROVIDER: 'albert',
    DEFAULT_ENDPOINT: 'https://albert.api.etalab.gouv.fr/v1',
    DEFAULT_MODEL: 'albert-large'
  };

  // Default settings
  const DEFAULT_SETTINGS = {
    enabled: true,
    blacklist: [],
    preferences: {
      position: 'bottom-right',
      shortcuts: true,
      autoHide: false,
      theme: 'auto'
    }
  };

  // Initialize extension on install
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Extension installed:', details.reason);
    
    try {
      // Set default settings
      const settings = await chrome.storage.sync.get('universalAssistantSettings');
      if (!settings.universalAssistantSettings) {
        await chrome.storage.sync.set({
          universalAssistantSettings: DEFAULT_SETTINGS.preferences,
          blacklist: DEFAULT_SETTINGS.blacklist
        });
        console.log('Default settings saved');
      }
      
      // Create context menu after a delay to ensure APIs are ready
      setTimeout(() => {
        if (chrome.contextMenus && chrome.contextMenus.create) {
          chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
              id: 'toggleAssistant',
              title: 'Toggle Universal Assistant',
              contexts: ['all']
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn('Context menu creation warning:', chrome.runtime.lastError.message);
              } else {
                console.log('Context menu created successfully');
              }
            });
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Installation setup error:', error);
    }
  });

  // Handle context menu clicks
  if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'toggleAssistant' && tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'toggle' }, () => {
          if (chrome.runtime.lastError) {
            console.log('Tab not ready for toggle message');
          }
        });
      }
    });
  }

  // Handle tab updates (for dynamic SPAs)
  if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab && tab.url) {
        chrome.tabs.sendMessage(tabId, { 
          type: 'urlChanged', 
          url: tab.url 
        }, () => {
          if (chrome.runtime.lastError) {
            // Content script not loaded yet, ignore
          }
        });
      }
    });
  }

  // Message handler
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.type || request.action);
    
    // Handle different message types
    if (request.type) {
      switch (request.type) {
        case 'pageLoad':
          console.log('Page loaded:', request.context?.url);
          break;
          
        case 'getSettings':
          chrome.storage.sync.get(['universalAssistantSettings', 'blacklist'], (result) => {
            sendResponse({
              settings: result.universalAssistantSettings || DEFAULT_SETTINGS.preferences,
              blacklist: result.blacklist || []
            });
          });
          return true;
          
        case 'updateBlacklist':
          chrome.storage.sync.get('blacklist', (result) => {
            const blacklist = result.blacklist || [];
            const domain = request.domain;
            
            if (request.action === 'add' && !blacklist.includes(domain)) {
              blacklist.push(domain);
            } else if (request.action === 'remove') {
              const index = blacklist.indexOf(domain);
              if (index > -1) blacklist.splice(index, 1);
            }
            
            chrome.storage.sync.set({ blacklist }, () => {
              sendResponse({ success: true, blacklist });
            });
          });
          return true;
          
        case 'error':
          console.error('Content script error:', request.error);
          break;
      }
    }
    
    // Handle API requests
    if (request.action === 'assist') {
      console.log('Service Worker: Handling assist request', request.data);
      handleAssistRequest(request.data)
        .then(response => {
          console.log('Service Worker: Assist request successful');
          sendResponse({ success: true, data: response });
        })
        .catch(error => {
          console.error('Service Worker: Assist request failed', error);
          console.error('Error stack:', error.stack);
          const errorMessage = error.message || 'Unknown error occurred';
          sendResponse({ 
            success: false, 
            error: errorMessage,
            details: error.stack || error.toString()
          });
        });
      return true;
    }
    
    // Handle get suggestions request
    if (request.action === 'getSuggestions') {
      console.log('Service Worker: Handling getSuggestions request', request.data);
      handleGetSuggestionsRequest(request.data)
        .then(suggestions => {
          console.log('Service Worker: Got suggestions:', suggestions);
          sendResponse({ success: true, suggestions });
        })
        .catch(error => {
          console.error('Service Worker: Get suggestions failed', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    // Handle open options request
    if (request.action === 'openOptions') {
      chrome.runtime.openOptionsPage();
      return false;
    }
  });

  // Extract follow-up questions from AI response
  function extractFollowUpQuestions(aiResponse, language = 'fr') {
    const questions = [];
    
    // Look for the questions section in the response - support multiple languages
    const questionPatterns = [
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
      /Voorgestelde vragen\s*:\s*([\s\S]*?)$/i
    ];
    
    for (const pattern of questionPatterns) {
      const match = aiResponse.match(pattern);
      if (match) {
        const questionsText = match[1];
        console.log('Found questions text:', questionsText);
        
        // Split by numbers followed by period and match until question mark
        // Also handle brackets if the LLM includes them
        const questionMatches = questionsText.match(/\d+\.\s*(?:\[)?([^\n\]]+?)(?:\])?(\?)/g);
        if (questionMatches) {
          questionMatches.forEach(q => {
            // Remove the number, period, and any brackets, keep the question mark
            const cleanQuestion = q
              .replace(/^\d+\.\s*/, '') // Remove number and period
              .replace(/^\[/, '') // Remove opening bracket if present
              .replace(/\](\?)$/, '?') // Remove closing bracket but keep question mark
              .trim();
            if (cleanQuestion.length > 0 && cleanQuestion.includes('?')) {
              questions.push(cleanQuestion);
            }
          });
        } else {
          // Fallback: try to match lines that start with numbers
          const lines = questionsText.split('\n');
          lines.forEach(line => {
            const match = line.match(/^\d+\.\s*(?:\[)?(.+?)(?:\])?$/);
            if (match) {
              let question = match[1].trim();
              // Add question mark if missing
              if (!question.endsWith('?')) {
                question += '?';
              }
              if (question.length > 0) {
                questions.push(question);
              }
            }
          });
        }
        break;
      }
    }
    
    console.log('Extracted questions:', questions);
    // Return up to 4 questions
    return questions.slice(0, 4);
  }

  // Main assist handler
  async function handleAssistRequest({ message, url, context }) {
    console.log('handleAssistRequest called with:', { message, url, context });
    console.log('DEFAULT_CONFIG available:', !!DEFAULT_CONFIG);
    
    try {
      // Get model configuration from storage
      const { modelConfig, apiKey } = await chrome.storage.sync.get(['modelConfig', 'apiKey']);
      console.log('Retrieved config from storage:', { 
        hasModelConfig: !!modelConfig, 
        hasApiKey: !!apiKey,
        provider: modelConfig?.provider,
        modelConfigDetails: modelConfig
      });
      
      // Use modelConfig if available, otherwise fall back to default config
      let config;
      if (modelConfig && modelConfig.provider) {
        console.log('Using stored modelConfig');
        config = { ...modelConfig };
      } else if (apiKey) {
        console.log('Using legacy apiKey with default provider');
        config = {
          provider: CONFIG.DEFAULT_PROVIDER,
          endpoint: CONFIG.DEFAULT_ENDPOINT,
          model: CONFIG.DEFAULT_MODEL,
          apiKey: apiKey
        };
      } else {
        console.log('No stored config, will use default');
        config = {
          provider: CONFIG.DEFAULT_PROVIDER,
          endpoint: CONFIG.DEFAULT_ENDPOINT,
          model: CONFIG.DEFAULT_MODEL,
          apiKey: null
        };
      }
      
      // Decrypt API key if encrypted
      if (config.apiKey && config.apiKey !== '') {
        try {
          const originalKey = config.apiKey;
          config.apiKey = decrypt(config.apiKey);
          console.log('Successfully decrypted user API key');
          // Validate decrypted key format - check it's not empty and has reasonable length
          if (!config.apiKey || config.apiKey.length < 10) {
            console.warn('Decrypted API key has invalid format, clearing it');
            config.apiKey = null;
          }
        } catch (error) {
          console.warn('Failed to decrypt API key, clearing it', error);
          config.apiKey = null;
        }
      }
      
      if (!config.apiKey) {
        console.log('No user API key configured, checking for default config...');
        console.log('DEFAULT_CONFIG exists:', !!DEFAULT_CONFIG);
        console.log('DEFAULT_CONFIG.encryptedApiKey exists:', !!(DEFAULT_CONFIG && DEFAULT_CONFIG.encryptedApiKey));
        
        // Use default encrypted API key if none configured
        if (DEFAULT_CONFIG && DEFAULT_CONFIG.encryptedApiKey) {
          console.log('Using default Albert config from .env');
          try {
            config.apiKey = decrypt(DEFAULT_CONFIG.encryptedApiKey);
            config.provider = DEFAULT_CONFIG.provider || 'albert';
            config.endpoint = DEFAULT_CONFIG.endpoint || 'https://albert.api.etalab.gouv.fr/v1';
            config.model = DEFAULT_CONFIG.model || 'albert-large';
            console.log('Successfully decrypted and configured Albert as default');
          } catch (error) {
            console.error('Failed to decrypt default API key:', error);
            throw new Error('Failed to decrypt default API key. Please configure your own API key.');
          }
        } else {
          console.error('No API key available and no default config found');
          throw new Error('API key not configured. Please set it in extension options.');
        }
      }
      
      console.log('Final config:', {
        provider: config.provider,
        endpoint: config.endpoint,
        model: config.model,
        hasApiKey: !!config.apiKey
      });
      
      // Fetch page content using Jina with hash-based caching
      let pageContent = null;
      try {
        pageContent = await fetchPageContent(url, context);
      } catch (error) {
        console.error('Jina extraction failed:', error);
      }
      
      // Build prompt
      const prompt = buildPrompt(message, pageContent, context);
      
      // Generate response using AI
      const aiResponse = await generateAIResponse(prompt, context, config);
      
      // Extract follow-up questions from the AI response
      console.log('AI Response (last 500 chars):', aiResponse.slice(-500));
      const extractedQuestions = extractFollowUpQuestions(aiResponse, context?.language || 'fr');
      
      // Remove the questions section from the response to avoid duplication
      let cleanedResponse = aiResponse;
      const questionSectionPattern = /\n*(?:Suggested questions?|Questions suggérées|Preguntas sugeridas|Vorgeschlagene Fragen|Domande suggerite|Perguntas sugeridas|Voorgestelde vragen|Questions you might want to ask|Questions? (?:à poser|possibles?))\s*:\s*[\s\S]*$/i;
      cleanedResponse = cleanedResponse.replace(questionSectionPattern, '').trim();
      
      console.log('Original response length:', aiResponse.length);
      console.log('Cleaned response length:', cleanedResponse.length);
      console.log('Questions found:', extractedQuestions.length);
      console.log('Extracted questions:', extractedQuestions);
      
      // Use extracted questions if available, otherwise fall back to default suggestions
      const suggestions = extractedQuestions.length > 0 
        ? extractedQuestions 
        : generateSuggestions(context);
      
      // Save chat history if Supabase is enabled
      try {
        await saveChatHistory(message, cleanedResponse, url, context);
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
      
      return {
        response: cleanedResponse,
        suggestions,
        context: {
          siteType: context?.siteType || 'general',
          language: context?.language || 'fr'
        }
      };
    } catch (error) {
      console.error('Assist request failed:', error);
      
      // Provide error messages in the user's language
      const language = context?.language || 'fr';
      let localizedError = error.message;
      
      const errorMessages = {
        en: {
          'API key not configured': 'API key not configured. Please set it in extension options.',
          'Invalid API key': 'Invalid API key. Please check your configuration.',
          'Rate limit exceeded': 'Rate limit exceeded. Please try again later.',
          'Service temporarily unavailable': 'Service temporarily unavailable. Please try again later.',
          'Network error': 'Network error. Check your internet connection.',
          'Failed to fetch': 'Unable to contact server. Check your connection.'
        },
        fr: {
          'API key not configured': 'Clé API non configurée. Veuillez la configurer dans les options de l\'extension.',
          'Invalid API key': 'Clé API invalide. Veuillez vérifier votre configuration.',
          'Rate limit exceeded': 'Limite de requêtes dépassée. Veuillez réessayer plus tard.',
          'Service temporarily unavailable': 'Service temporairement indisponible. Veuillez réessayer plus tard.',
          'Network error': 'Erreur réseau. Vérifiez votre connexion internet.',
          'Failed to fetch': 'Impossible de contacter le serveur. Vérifiez votre connexion.'
        },
        es: {
          'API key not configured': 'Clave API no configurada. Por favor, configúrela en las opciones de la extensión.',
          'Invalid API key': 'Clave API inválida. Por favor, verifique su configuración.',
          'Rate limit exceeded': 'Límite de solicitudes excedido. Intente de nuevo más tarde.',
          'Service temporarily unavailable': 'Servicio temporalmente no disponible. Intente de nuevo más tarde.',
          'Network error': 'Error de red. Verifique su conexión a internet.',
          'Failed to fetch': 'No se puede contactar el servidor. Verifique su conexión.'
        },
        de: {
          'API key not configured': 'API-Schlüssel nicht konfiguriert. Bitte in den Erweiterungsoptionen festlegen.',
          'Invalid API key': 'Ungültiger API-Schlüssel. Bitte überprüfen Sie Ihre Konfiguration.',
          'Rate limit exceeded': 'Anfragelimit überschritten. Bitte versuchen Sie es später erneut.',
          'Service temporarily unavailable': 'Service vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
          'Network error': 'Netzwerkfehler. Überprüfen Sie Ihre Internetverbindung.',
          'Failed to fetch': 'Server konnte nicht kontaktiert werden. Überprüfen Sie Ihre Verbindung.'
        }
      };
      
      const langMessages = errorMessages[language] || errorMessages.en;
      
      for (const [key, value] of Object.entries(langMessages)) {
        if (error.message.includes(key)) {
          localizedError = value;
          break;
        }
      }
      
      throw new Error(localizedError);
    }
  }

  // Handle get suggestions request
  async function handleGetSuggestionsRequest({ url, context }) {
    console.log('handleGetSuggestionsRequest called with:', { url, context });
    
    try {
      // Get model configuration
      const { modelConfig, apiKey } = await chrome.storage.sync.get(['modelConfig', 'apiKey']);
      
      // Configure API settings (same as handleAssistRequest)
      let config;
      if (modelConfig && modelConfig.provider) {
        config = { ...modelConfig };
      } else if (apiKey) {
        config = {
          provider: CONFIG.DEFAULT_PROVIDER,
          endpoint: CONFIG.DEFAULT_ENDPOINT,
          model: CONFIG.DEFAULT_MODEL,
          apiKey: apiKey
        };
      } else {
        config = {
          provider: CONFIG.DEFAULT_PROVIDER,
          endpoint: CONFIG.DEFAULT_ENDPOINT,
          model: CONFIG.DEFAULT_MODEL,
          apiKey: null
        };
      }
      
      // Decrypt API key if needed
      if (config.apiKey && config.apiKey !== '') {
        try {
          config.apiKey = decrypt(config.apiKey);
          if (!config.apiKey || config.apiKey.length < 10) {
            config.apiKey = null;
          }
        } catch (error) {
          config.apiKey = null;
        }
      }
      
      // Use default if no API key
      if (!config.apiKey && DEFAULT_CONFIG && DEFAULT_CONFIG.encryptedApiKey) {
        try {
          config.apiKey = decrypt(DEFAULT_CONFIG.encryptedApiKey);
          config.provider = DEFAULT_CONFIG.provider || 'albert';
          config.endpoint = DEFAULT_CONFIG.endpoint || 'https://albert.api.etalab.gouv.fr/v1';
          config.model = DEFAULT_CONFIG.model || 'albert-large';
        } catch (error) {
          throw new Error('Failed to decrypt default API key');
        }
      }
      
      if (!config.apiKey) {
        throw new Error('API key not configured');
      }
      
      // Fetch page content (with caching)
      let pageContent = null;
      try {
        pageContent = await fetchPageContent(url, context);
      } catch (error) {
        console.error('Failed to fetch page content for suggestions:', error);
      }
      
      // Build a special prompt for generating suggestions
      const prompt = buildSuggestionsPrompt(pageContent, context);
      
      // Generate suggestions using AI
      const aiResponse = await generateAIResponse(prompt, context, config);
      
      // Extract suggestions from response
      const suggestions = extractSuggestionsFromResponse(aiResponse);
      
      return suggestions;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      throw error;
    }
  }
  
  // Build prompt specifically for generating suggestions
  function buildSuggestionsPrompt(pageContent, context) {
    const { siteType = 'general', language = 'fr', title = '' } = context || {};
    
    const languageMap = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch'
    };
    const targetLanguage = languageMap[language] || languageMap['fr'];
    
    let prompt = `You are a helpful AI assistant. Generate exactly 4 specific questions about the actual content of this webpage.

Page Title: ${title}
Page Type: ${siteType}

Requirements:
- Generate EXACTLY 4 questions that are SPECIFIC to this page's content
- DO NOT generate generic questions (the user already has those)
- Focus on the actual topic/content of the page
- DO NOT ask about cookies, website features, navigation, or technical aspects
- Each question should be 5-10 words maximum
- Questions must be in ${targetLanguage}
- Format: One question per line, no numbering, no bullets

`;

    if (pageContent) {
      const truncatedContent = pageContent.substring(0, 2000);
      prompt += `Page Content:\n${truncatedContent}${pageContent.length > 2000 ? '...' : ''}\n\n`;
    }
    
    prompt += `Generate exactly 4 specific questions about this page in ${targetLanguage}:`;
    
    return prompt;
  }
  
  // Extract suggestions from AI response
  function extractSuggestionsFromResponse(aiResponse) {
    // Split by newlines and filter out empty lines
    const lines = aiResponse.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+[.)]/) && !line.startsWith('-') && !line.startsWith('*')); // Remove numbered/bulleted items
    
    // Take up to 4 suggestions (AI now generates exactly 4 specific questions)
    const suggestions = lines.slice(0, 4);
    
    // Ensure questions end with question mark
    return suggestions.map(suggestion => {
      if (!suggestion.endsWith('?')) {
        return suggestion + '?';
      }
      return suggestion;
    });
  }

  // Fetch page content using Jina AI with hash-based Supabase caching
  async function fetchPageContent(url, context = {}) {
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
    const cacheKey = `${CONFIG.CACHE_PREFIX}${url}`;
    const cached = await getCachedData(cacheKey);
    
    if (cached) {
      console.log('Chrome storage cache hit for', url);
      return cached;
    }
    
    console.log('Chrome storage cache miss, fetching from Jina for', url);
    
    const content = await fetchFromJina(url);
    await setCachedData(cacheKey, content, CONFIG.CACHE_TTL);
    
    return content;
  }
  
  // Core Jina API fetching function
  async function fetchFromJina(url) {
    // Input validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided to fetchFromJina');
    }
    
    if (!InputValidator.isValidUrl(url)) {
      throw new Error('Invalid URL format provided to fetchFromJina');
    }
    
    const encodedUrl = encodeURIComponent(url);
    const jinaUrl = `${CONFIG.JINA_BASE_URL}/${encodedUrl}`;
    
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
  
  // Save chat history to Supabase
  async function saveChatHistory(userMessage, aiResponse, url, context) {
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
  async function getOrCreateChatSession(cacheManager, userId, url, siteType, language, domain, title) {
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

  // Generate response using AI
  async function generateAIResponse(prompt, context, config) {
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
        headers['anthropic-version'] = '2024-01-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        apiUrl = `${endpoint}/messages`;
        requestBody = {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: CONFIG.MAX_TOKENS,
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
          max_tokens: CONFIG.MAX_TOKENS,
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
          max_tokens: CONFIG.MAX_TOKENS,
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
          max_tokens: CONFIG.MAX_TOKENS,
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
          max_tokens: CONFIG.MAX_TOKENS,
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
  function buildPrompt(userMessage, pageContent, context) {
    const { siteType = 'general', language = 'fr', title = '' } = context || {};
    
    // Simple language instruction
    const languageMap = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch'
    };
    const targetLanguage = languageMap[language] || languageMap['fr'];
    
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
    
    // Specific instruction for follow-up questions with exact format
    const questionHeaderMap = {
      en: 'Suggested questions:',
      fr: 'Questions suggérées :',
      es: 'Preguntas sugeridas:',
      de: 'Vorgeschlagene Fragen:',
      it: 'Domande suggerite:',
      pt: 'Perguntas sugeridas:',
      nl: 'Voorgestelde vragen:'
    };
    const questionHeader = questionHeaderMap[language] || questionHeaderMap.fr;
    
    prompt += `\n\nAt the very end of your response, add exactly this line:
${questionHeader}
1. [First contextual question based on the content?]
2. [Second contextual question based on the content?]
3. [Third contextual question based on the content?]
4. [Fourth contextual question based on the content?]

Make each question 5-7 words, contextual to the page content, and in ${targetLanguage}.`;
    
    return prompt;
  }

  // Get system prompt
  function getSystemPrompt(context) {
    const { language = 'fr' } = context || {};
    
    const languageMap = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch'
    };
    const targetLanguage = languageMap[language] || languageMap['fr'];
    
    return `You are a helpful AI assistant. Always respond in ${targetLanguage} only.`;
  }

  // Generate suggestions based on language
  function generateSuggestions(context) {
    const { siteType = 'general', language = 'fr' } = context || {};
    
    // Simplified suggestions for service worker fallback
    const allSuggestions = {
      en: {
        general: ['Summarize this page', 'What is this about?', 'Key information?']
      },
      fr: {
        general: ['Résumer la page', 'De quoi s\'agit-il?', 'Informations clés?']
      },
      es: {
        general: ['Resumir la página', '¿De qué trata esto?', '¿Información clave?']
      },
      de: {
        general: ['Seite zusammenfassen', 'Worum geht es?', 'Wichtige Informationen?']
      }
    };
    
    const langSuggestions = allSuggestions[language] || allSuggestions.en;
    return langSuggestions.general;
  }

  // Cache helpers
  async function getCachedData(key) {
    try {
      const result = await chrome.storage.local.get([key]);
      const cached = result[key];
      
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
      
      if (cached) {
        await chrome.storage.local.remove([key]);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    
    return null;
  }

  async function setCachedData(key, data, ttl) {
    try {
      const expires = Date.now() + ttl;
      await chrome.storage.local.set({
        [key]: { data, expires }
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Set up periodic cache cleanup
  if (chrome.alarms) {
    chrome.alarms.create('cleanupCache', { periodInMinutes: 60 }, () => {
      if (chrome.runtime.lastError) {
        console.log('Alarm setup info:', chrome.runtime.lastError.message);
      }
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'cleanupCache') {
        cleanupExpiredCache().catch(console.error);
      }
    });
  }

  async function cleanupExpiredCache() {
    try {
      const items = await chrome.storage.local.get(null);
      const now = Date.now();
      const keysToRemove = [];
      
      for (const [key, value] of Object.entries(items)) {
        if (key.startsWith(CONFIG.CACHE_PREFIX) && value && value.expires && value.expires < now) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  console.log('Service Worker: Initialization complete');

} catch (error) {
  console.error('Service Worker: Fatal error during initialization', error);
}