// Service Worker for Universal Web Assistant
// Handles all API calls and message passing

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
chrome.runtime.onInstalled.addListener(async () => {
  // Set default settings
  const settings = await chrome.storage.sync.get('universalAssistantSettings');
  if (!settings.universalAssistantSettings) {
    await chrome.storage.sync.set({
      universalAssistantSettings: DEFAULT_SETTINGS.preferences,
      blacklist: DEFAULT_SETTINGS.blacklist
    });
  }
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'toggleAssistant',
    title: 'Toggle Universal Assistant',
    contexts: ['all']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toggleAssistant') {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
  }
});

// Handle tab updates (for dynamic SPAs)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Notify content script of URL change
    chrome.tabs.sendMessage(tabId, { 
      type: 'urlChanged', 
      url: tab.url 
    }).catch(() => {
      // Content script not loaded yet, ignore
    });
  }
});

// Message handler for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'pageLoad':
      // Log page load for analytics (if needed)
      console.log('Universal Assistant loaded on:', request.context.url);
      break;
      
    case 'getSettings':
      chrome.storage.sync.get(['universalAssistantSettings', 'blacklist'], (result) => {
        sendResponse({
          settings: result.universalAssistantSettings || DEFAULT_SETTINGS.preferences,
          blacklist: result.blacklist || []
        });
      });
      return true; // Keep channel open for async response
      
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
      // Log errors for debugging
      console.error('Universal Assistant Error:', request.error);
      break;
  }
  
  // Handle API requests
  if (request.action === 'assist') {
    handleAssistRequest(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiKey', 'settings'], (data) => {
      sendResponse(data);
    });
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
      // Continue without page content
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
  // Check cache first
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
  
  // Cache the result
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
    developer: 'This is a developer/programming website. Focus on technical aspects and code-related help.',
    educational: 'This is an educational website. Help with learning and understanding concepts.',
    ecommerce: 'This is an e-commerce website. Assist with product information and shopping decisions.',
    article: 'This is an article or blog. Help with understanding and summarizing content.',
    video: 'This is a video platform. Assist with video content and navigation.',
    social: 'This is a social media platform. Help with content discovery and interaction.',
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
  
  prompt += '\n\nProvide a helpful, concise response that is relevant to the page context. Use bullet points for better readability when appropriate.';
  
  return prompt;
}

// Get system prompt based on context
function getSystemPrompt(context) {
  const { language = 'en', siteType = 'general' } = context;
  
  let systemPrompt = `You are a helpful AI assistant integrated into a web browser extension called Universal Web Assistant. 
You help users understand and interact with web pages more effectively.
You should be concise, accurate, and helpful.`;

  if (language === 'fr') {
    systemPrompt = `Vous êtes un assistant IA utile intégré dans une extension de navigateur web appelée Universal Web Assistant.
Vous aidez les utilisateurs à comprendre et interagir avec les pages web plus efficacement.
Vous devez être concis, précis et utile.`;
  }
  
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
  systemPrompt += '\n\nKeep responses concise (under 200 words) unless more detail is specifically requested.';
  
  return systemPrompt;
}

// Generate smart suggestions
function generateSuggestions(context) {
  const { siteType = 'general', language = 'en' } = context || {};
  
  const suggestionSets = {
    developer: [
      'Explain this code',
      'How do I debug this?',
      'What are the best practices here?'
    ],
    educational: [
      'Summarize this topic',
      'Explain in simple terms',
      'What are the key concepts?'
    ],
    ecommerce: [
      'Compare similar products',
      'Is this a good deal?',
      'What are the reviews saying?'
    ],
    article: [
      'Summarize this article',
      'What are the main points?',
      'Fact-check this claim'
    ],
    video: [
      'Summarize this video',
      'Key timestamps?',
      'Similar videos?'
    ],
    social: [
      'What is trending?',
      'Summarize comments',
      'Related discussions?'
    ],
    general: [
      'Summarize this page',
      'What is this about?',
      'Key information?'
    ]
  };
  
  const suggestions = suggestionSets[siteType] || suggestionSets.general;
  
  if (language === 'fr') {
    const frenchSuggestions = {
      'Summarize this page': 'Résumer cette page',
      'What is this about?': 'De quoi s\'agit-il?',
      'Key information?': 'Informations clés?'
    };
    return suggestions.map(s => frenchSuggestions[s] || s);
  }
  
  return suggestions.slice(0, 3);
}

// Cache helpers using chrome.storage.local
async function getCachedData(key) {
  const result = await chrome.storage.local.get([key]);
  const cached = result[key];
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  // Clean up expired data
  if (cached) {
    await chrome.storage.local.remove([key]);
  }
  
  return null;
}

async function setCachedData(key, data, ttl) {
  const expires = Date.now() + ttl;
  await chrome.storage.local.set({
    [key]: { data, expires }
  });
}

// Clean up old cache entries periodically
chrome.alarms.create('cleanupCache', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupCache') {
    cleanupExpiredCache();
  }
});

async function cleanupExpiredCache() {
  const items = await chrome.storage.local.get(null);
  const now = Date.now();
  const keysToRemove = [];
  
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith(CONFIG.CACHE_PREFIX) && value.expires && value.expires < now) {
      keysToRemove.push(key);
    }
  }
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
  }
}