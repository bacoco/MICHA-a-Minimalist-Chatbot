// Service Worker for Universal Web Assistant
// Modular version with ES6 imports

// Import modules
import { generateAIResponse, buildPrompt } from './ai-handler.js';
import { fetchPageContent } from './content-fetcher.js';
import { setupCacheCleanup } from './cache-manager.js';
import { saveChatHistory } from './chat-history.js';
import { 
  extractFollowUpQuestions, 
  generateSuggestions, 
  getQuestionSectionPattern,
  getLocalizedError 
} from './language-utils.js';

// Import crypto and supabase utilities (old style for now)
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
  
  // Handle open options request
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return false;
  }
});

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
        // Validate decrypted key format
        if (!config.apiKey || !config.apiKey.startsWith('sk-')) {
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
    const extractedQuestions = extractFollowUpQuestions(aiResponse, context?.language || 'fr');
    
    // Remove the questions section from the response to avoid duplication
    let cleanedResponse = aiResponse;
    const questionSectionPattern = getQuestionSectionPattern();
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
        language: context?.language || 'fr'
      }
    };
  } catch (error) {
    console.error('Assist request failed:', error);
    
    // Provide error messages in the user's language
    const language = context?.language || 'fr';
    const localizedError = getLocalizedError(error.message, language);
    
    throw new Error(localizedError);
  }
}

// Set up periodic cache cleanup
setupCacheCleanup();

console.log('Service Worker: Initialization complete');