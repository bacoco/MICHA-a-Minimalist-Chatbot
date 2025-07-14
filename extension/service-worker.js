// Service Worker for Universal Web Assistant
// Fixed version with proper error handling

// Wrap everything in try-catch to prevent registration failures
try {
  console.log('Service Worker: Starting initialization...');

  // Configuration
  const CONFIG = {
    JINA_BASE_URL: 'https://r.jina.ai',
    ALBERT_API_URL: 'https://albert.api.etalab.gouv.fr/v1',
    CACHE_PREFIX: 'uwa_cache_',
    CACHE_TTL: 3600000, // 1 hour in milliseconds
    MAX_TOKENS: 500
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

  // Main assist handler
  async function handleAssistRequest({ message, url, context }) {
    try {
      // Get API key from storage
      const { apiKey } = await chrome.storage.sync.get(['apiKey']);
      if (!apiKey) {
        throw new Error('API key not configured. Please set it in extension options.');
      }
      
      // Fetch page content using Jina
      let pageContent = null;
      try {
        pageContent = await fetchPageContent(url);
      } catch (error) {
        console.error('Jina extraction failed:', error);
      }
      
      // Build prompt
      const prompt = buildPrompt(message, pageContent, context);
      
      // Generate response using Albert
      const aiResponse = await generateAlbertResponse(prompt, context, apiKey);
      
      // Generate suggestions
      const suggestions = generateSuggestions(context);
      
      return {
        response: aiResponse,
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

  // Fetch page content using Jina AI
  async function fetchPageContent(url) {
    const cacheKey = `${CONFIG.CACHE_PREFIX}${url}`;
    const cached = await getCachedData(cacheKey);
    
    if (cached) {
      console.log('Cache hit for', url);
      return cached;
    }
    
    console.log('Fetching content from Jina for', url);
    
    const encodedUrl = encodeURIComponent(url);
    const jinaUrl = `${CONFIG.JINA_BASE_URL}/${encodedUrl}`;
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Universal-Web-Assistant/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status}`);
    }
    
    const content = await response.text();
    await setCachedData(cacheKey, content, CONFIG.CACHE_TTL);
    
    return content;
  }

  // Generate response using Albert LLM
  async function generateAlbertResponse(prompt, context, apiKey) {
    const requestBody = {
      model: 'albert-large',
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
    
    const response = await fetch(`${CONFIG.ALBERT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Albert API error: ${error}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Build context-aware prompt
  function buildPrompt(userMessage, pageContent, context) {
    const { siteType = 'general', language = 'en', title = '' } = context || {};
    
    const languageInstruction = language !== 'en' 
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
    
    const siteContext = siteContexts[siteType] || siteContexts.general;
    
    let prompt = `You are a helpful AI assistant integrated into a web browser. ${languageInstruction}

Context: ${siteContext}
Page Title: ${title}

User Message: "${userMessage}"`;

    if (pageContent) {
      const truncatedContent = pageContent.substring(0, 3000);
      prompt += `\n\nPage Content Summary:\n${truncatedContent}${pageContent.length > 3000 ? '...' : ''}`;
    }
    
    prompt += '\n\nProvide a helpful, concise response.';
    
    return prompt;
  }

  // Get system prompt
  function getSystemPrompt(context) {
    const { language = 'en' } = context || {};
    
    let systemPrompt = 'You are a helpful AI assistant in a browser extension.';
    
    if (language === 'fr') {
      systemPrompt = 'Vous êtes un assistant IA utile dans une extension de navigateur.';
    }
    
    return systemPrompt;
  }

  // Generate suggestions
  function generateSuggestions(context) {
    const { siteType = 'general' } = context || {};
    
    const suggestionSets = {
      developer: ['Explain this code', 'How do I debug this?', 'Best practices?'],
      educational: ['Summarize this topic', 'Explain simply', 'Key concepts?'],
      ecommerce: ['Compare products', 'Is this a good deal?', 'Reviews summary?'],
      article: ['Summarize article', 'Main points?', 'Fact check?'],
      video: ['Summarize video', 'Key timestamps?', 'Similar videos?'],
      social: ['What is trending?', 'Summarize comments', 'Related posts?'],
      general: ['Summarize page', 'What is this about?', 'Key information?']
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