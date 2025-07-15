// Service Worker for Universal Web Assistant
// Fixed version with proper error handling

// Import default config and crypto utils
importScripts('default-config.js', 'crypto-utils.js', 'supabase-utils.js');

// Wrap everything in try-catch to prevent registration failures
try {
  console.log('Service Worker: Starting initialization...');

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
      handleAssistRequest(request.data)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });

  // Extract follow-up questions from AI response
  function extractFollowUpQuestions(aiResponse) {
    const questions = [];
    
    // Look for the questions section in the response
    const questionPatterns = [
      /Questions suggérées\s*:\s*([\s\S]*?)$/i,
      /Questions you might want to ask:\s*([\s\S]*?)$/i,
      /Questions? (?:à poser|possibles?):\s*([\s\S]*?)$/i
    ];
    
    for (const pattern of questionPatterns) {
      const match = aiResponse.match(pattern);
      if (match) {
        const questionsText = match[1];
        console.log('Found questions text:', questionsText);
        
        // Split by numbers followed by period and match until question mark
        const questionMatches = questionsText.match(/\d+\.\s*[^?]+\?/g);
        if (questionMatches) {
          questionMatches.forEach(q => {
            // Remove the number and period, trim whitespace
            const cleanQuestion = q.replace(/^\d+\.\s*/, '').trim();
            if (cleanQuestion.length > 0) {
              questions.push(cleanQuestion);
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
    try {
      // Get model configuration from storage
      const { modelConfig, apiKey } = await chrome.storage.sync.get(['modelConfig', 'apiKey']);
      
      // Use modelConfig if available, otherwise fall back to legacy apiKey
      let config = modelConfig || {
        provider: CONFIG.DEFAULT_PROVIDER,
        endpoint: CONFIG.DEFAULT_ENDPOINT,
        model: CONFIG.DEFAULT_MODEL,
        apiKey: apiKey
      };
      
      // Decrypt API key if encrypted
      if (config.apiKey) {
        try {
          config.apiKey = decrypt(config.apiKey);
        } catch (error) {
          console.warn('Failed to decrypt API key, using as-is for backward compatibility');
        }
      }
      
      if (!config.apiKey) {
        // Use default encrypted API key if none configured
        if (DEFAULT_CONFIG && DEFAULT_CONFIG.encryptedApiKey) {
          console.log('Using default API key');
          config.apiKey = decrypt(DEFAULT_CONFIG.encryptedApiKey);
          config.provider = DEFAULT_CONFIG.provider;
          config.endpoint = DEFAULT_CONFIG.endpoint;
          config.model = DEFAULT_CONFIG.model;
        } else {
          throw new Error('API key not configured. Please set it in extension options.');
        }
      }
      
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
      const extractedQuestions = extractFollowUpQuestions(aiResponse);
      
      // Remove the questions section from the response to avoid duplication
      let cleanedResponse = aiResponse;
      const questionSectionPattern = /\n*(?:Questions suggérées|Questions you might want to ask|Questions? (?:à poser|possibles?))\s*:\s*[\s\S]*$/i;
      cleanedResponse = cleanedResponse.replace(questionSectionPattern, '').trim();
      
      console.log('Original response length:', aiResponse.length);
      console.log('Cleaned response length:', cleanedResponse.length);
      console.log('Questions found:', extractedQuestions.length);
      
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
          language: context?.language || 'en'
        }
      };
    } catch (error) {
      console.error('Assist request failed:', error);
      throw error;
    }
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
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Universal-Web-Assistant/1.0'
        },
        timeout: 30000 // 30 second timeout
      });
      
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
    const { provider, endpoint, model, apiKey } = config;
    
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
          max_tokens: CONFIG.MAX_TOKENS,
          temperature: 0.7
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
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
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
    const { siteType = 'general', language = 'en', title = '' } = context || {};
    
    const languageInstruction = (language === 'fr' || language === 'fr-FR' || language.startsWith('fr'))
      ? 'Répondez en français.' 
      : language !== 'en' 
      ? `Please respond in ${language} language.` 
      : '';
    
    const siteContexts = {
      developer: 'This is a developer/programming website. Focus on technical aspects.',
      educational: 'This is an educational website. Help with learning.',
      ecommerce: 'This is an e-commerce website. Assist with shopping.',
      article: 'This is an article or blog. Help with understanding content.',
      video: 'This is a video platform. Assist with video content.',
      social: 'This is a social media platform. Help with content discovery.',
      general: 'Help the user with their query about this webpage.'
    };
    
    const siteContextsFr = {
      developer: 'Ceci est un site de développement/programmation. Concentrez-vous sur les aspects techniques.',
      educational: 'Ceci est un site éducatif. Aidez à l\'apprentissage.',
      ecommerce: 'Ceci est un site e-commerce. Assistez pour les achats.',
      article: 'Ceci est un article ou blog. Aidez à comprendre le contenu.',
      video: 'Ceci est une plateforme vidéo. Assistez avec le contenu vidéo.',
      social: 'Ceci est un réseau social. Aidez à découvrir le contenu.',
      general: 'Aidez l\'utilisateur avec sa question sur cette page web.'
    };
    
    const isFrenchLanguage = language === 'fr' || language === 'fr-FR' || language.startsWith('fr');
    const contextMap = isFrenchLanguage ? siteContextsFr : siteContexts;
    const siteContext = contextMap[siteType] || contextMap.general;
    
    let prompt = `You are a helpful AI assistant integrated into a web browser. ${languageInstruction}

Context: ${siteContext}
Page Title: ${title}

User Message: "${userMessage}"`;

    if (pageContent) {
      const truncatedContent = pageContent.substring(0, 3000);
      prompt += `\n\nPage Content Summary:\n${truncatedContent}${pageContent.length > 3000 ? '...' : ''}`;
    }
    
    prompt += '\n\nProvide a helpful, concise response.';
    
    // Add instruction for follow-up questions in French
    if (isFrenchLanguage) {
      prompt += `\n\nIMPORTANT: À la fin de votre réponse, ajoutez une section "Questions suggérées:" et proposez exactement 4 nouvelles questions pertinentes que l'utilisateur pourrait poser. Ces questions doivent:
- Être directement liées au contenu de la page
- Être en rapport avec la question de l'utilisateur
- Permettre d'approfondir différents aspects du sujet
- Être formulées en français
Format: Liste numérotée de 1 à 4.`;
    }
    
    return prompt;
  }

  // Get system prompt
  function getSystemPrompt(context) {
    const { language = 'en' } = context || {};
    
    let systemPrompt = 'You are a helpful AI assistant in a browser extension.';
    
    if (language === 'fr' || language === 'fr-FR') {
      systemPrompt = 'Vous êtes un assistant IA utile dans une extension de navigateur. Répondez toujours en français. Vous aidez les utilisateurs à comprendre et analyser le contenu des pages web qu\'ils visitent.';
    }
    
    return systemPrompt;
  }

  // Generate suggestions - French only
  function generateSuggestions(context) {
    const { siteType = 'general' } = context || {};
    
    const suggestionSets = {
      developer: ['Expliquer ce code', 'Comment déboguer?', 'Meilleures pratiques?'],
      educational: ['Résumer ce sujet', 'Expliquer simplement', 'Concepts clés?'],
      ecommerce: ['Comparer les produits', 'Bonne affaire?', 'Résumé des avis?'],
      article: ['Résumer l\'article', 'Points principaux?', 'Vérifier les faits?'],
      video: ['Résumer la vidéo', 'Moments clés?', 'Vidéos similaires?'],
      social: ['Tendances actuelles?', 'Résumer commentaires', 'Posts connexes?'],
      general: ['Résumer la page', 'De quoi s\'agit-il?', 'Informations clés?']
    };
    
    return suggestionSets[siteType] || suggestionSets.general;
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