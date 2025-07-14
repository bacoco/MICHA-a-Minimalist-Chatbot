// Universal Web Assistant - Content Script
(() => {
  // Constants
  const BACKEND_URL = 'http://localhost:3001/api/assist';
  const WIDGET_ID = 'universal-assistant-widget';
  const STORAGE_KEY = 'universalAssistantSettings';
  
  // State
  let widget = null;
  let isExpanded = false;
  let settings = {
    enabled: true,
    position: 'bottom-right',
    theme: 'auto',
    shortcuts: true
  };
  
  // Website type detection
  function detectWebsiteType() {
    const domain = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    
    const patterns = {
      developer: ['github.com', 'gitlab.com', 'stackoverflow.com', 'bitbucket.org', 'codepen.io'],
      educational: ['wikipedia.org', '.edu', 'coursera.org', 'edx.org', 'khanacademy.org'],
      ecommerce: ['amazon', 'ebay', 'shopify', 'etsy', 'alibaba', 'shop', 'store'],
      article: ['medium.com', 'blog', 'news', 'article', 'post'],
      video: ['youtube.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv'],
      social: ['twitter.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'reddit.com']
    };
    
    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => domain.includes(keyword) || path.includes(keyword))) {
        return type;
      }
    }
    
    return 'general';
  }
  
  // Language detection
  function detectLanguage() {
    return document.documentElement.lang || navigator.language.split('-')[0] || 'en';
  }
  
  // Create widget HTML
  function createWidgetHTML() {
    return `
      <div id="${WIDGET_ID}" class="uwa-widget ${settings.position}" data-theme="${settings.theme}">
        <button class="uwa-toggle" aria-label="Toggle Universal Assistant">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </button>
        <div class="uwa-panel" style="display: none;">
          <div class="uwa-header">
            <h3>Universal Assistant</h3>
            <button class="uwa-close" aria-label="Close assistant">×</button>
          </div>
          <div class="uwa-messages"></div>
          <div class="uwa-input-container">
            <input type="text" class="uwa-input" placeholder="Ask me anything about this page..." />
            <button class="uwa-send" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 10l15-8v16L2 10z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // Inject widget into page
  function injectWidget() {
    if (document.getElementById(WIDGET_ID)) return;
    
    const container = document.createElement('div');
    container.innerHTML = createWidgetHTML();
    document.body.appendChild(container.firstElementChild);
    
    widget = document.getElementById(WIDGET_ID);
    attachEventListeners();
  }
  
  // Attach event listeners
  function attachEventListeners() {
    const toggle = widget.querySelector('.uwa-toggle');
    const close = widget.querySelector('.uwa-close');
    const input = widget.querySelector('.uwa-input');
    const send = widget.querySelector('.uwa-send');
    
    toggle.addEventListener('click', toggleWidget);
    close.addEventListener('click', toggleWidget);
    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    // Keyboard shortcut
    if (settings.shortcuts) {
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          toggleWidget();
        }
      });
    }
  }
  
  // Toggle widget visibility
  function toggleWidget() {
    const panel = widget.querySelector('.uwa-panel');
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      panel.style.display = 'flex';
      widget.classList.add('expanded');
      widget.querySelector('.uwa-input').focus();
    } else {
      panel.style.display = 'none';
      widget.classList.remove('expanded');
    }
  }
  
  // Send message to backend
  async function sendMessage() {
    const input = widget.querySelector('.uwa-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    input.value = '';
    
    // Show loading
    const loadingId = addMessage('Thinking...', 'assistant', true);
    
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          url: window.location.href,
          context: {
            siteType: detectWebsiteType(),
            language: detectLanguage(),
            domain: window.location.hostname,
            title: document.title
          }
        })
      });
      
      const data = await response.json();
      
      // Remove loading message
      removeMessage(loadingId);
      
      if (data.error) {
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      } else {
        addMessage(data.response, 'assistant');
        
        // Add suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          addSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      removeMessage(loadingId);
      addMessage('Failed to connect to the assistant. Please check your connection.', 'assistant');
    }
  }
  
  // Add message to chat
  function addMessage(text, sender, isLoading = false) {
    const messages = widget.querySelector('.uwa-messages');
    const messageEl = document.createElement('div');
    const messageId = `msg-${Date.now()}`;
    
    messageEl.id = messageId;
    messageEl.className = `uwa-message ${sender}${isLoading ? ' loading' : ''}`;
    messageEl.textContent = text;
    
    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;
    
    return messageId;
  }
  
  // Remove message
  function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) message.remove();
  }
  
  // Add suggestions
  function addSuggestions(suggestions) {
    const messages = widget.querySelector('.uwa-messages');
    const suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'uwa-suggestions';
    
    suggestions.forEach(suggestion => {
      const button = document.createElement('button');
      button.className = 'uwa-suggestion';
      button.textContent = suggestion;
      button.addEventListener('click', () => {
        widget.querySelector('.uwa-input').value = suggestion;
        sendMessage();
      });
      suggestionsEl.appendChild(button);
    });
    
    messages.appendChild(suggestionsEl);
    messages.scrollTop = messages.scrollHeight;
  }
  
  // Load settings from storage
  async function loadSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.warn('Chrome storage API not available');
      return;
    }
    
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        if (result[STORAGE_KEY]) {
          settings = { ...settings, ...result[STORAGE_KEY] };
        }
        resolve();
      });
    });
  }
  
  // Check if site is blacklisted
  async function isBlacklisted() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return false;
    }
    
    return new Promise((resolve) => {
      chrome.storage.sync.get('blacklist', (result) => {
        const blacklist = result.blacklist || [];
        const domain = window.location.hostname;
        resolve(blacklist.includes(domain));
      });
    });
  }
  
  // Initialize
  async function init() {
    // Skip if already initialized
    if (widget) return;
    
    // Load settings
    await loadSettings();
    
    // Check if enabled and not blacklisted
    const blacklisted = await isBlacklisted();
    
    if (settings.enabled && !blacklisted) {
      injectWidget();
      
      // Send init message with context
      if (chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'pageLoad',
          context: {
            url: window.location.href,
            siteType: detectWebsiteType(),
            language: detectLanguage()
          }
        }).catch(() => {
          // Extension context invalidated, ignore
        });
      }
    }
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Listen for settings changes
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[STORAGE_KEY]) {
        settings = { ...settings, ...changes[STORAGE_KEY].newValue };
        
        // Re-initialize if needed
        if (settings.enabled && !widget) {
          init();
        } else if (!settings.enabled && widget) {
          widget.remove();
          widget = null;
        }
      }
    });
  }
})();