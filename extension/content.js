// Universal Web Assistant - Content Script
(() => {
  // Constants
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
    // Check document language
    const docLang = document.documentElement.lang;
    if (docLang) return docLang.split('-')[0];
    
    // Check for French indicators
    const domain = window.location.hostname.toLowerCase();
    if (domain.endsWith('.fr') || domain.includes('france')) return 'fr';
    
    // Fallback to browser language
    return navigator.language.split('-')[0] || 'en';
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
      
      // Show initial suggestions if no messages yet
      const messages = widget.querySelector('.uwa-messages');
      if (messages.children.length === 0) {
        showInitialSuggestions();
      }
    } else {
      panel.style.display = 'none';
      widget.classList.remove('expanded');
    }
  }
  
  // Send message to service worker
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
      // Send message to service worker
      const response = await chrome.runtime.sendMessage({
        action: 'assist',
        data: {
          message,
          url: window.location.href,
          context: {
            siteType: detectWebsiteType(),
            language: detectLanguage(),
            domain: window.location.hostname,
            title: document.title
          }
        }
      });
      
      // Remove loading message
      removeMessage(loadingId);
      
      if (!response.success) {
        const errorMessage = response.error === 'API key not configured. Please set it in extension options.' 
          ? '⚠️ API key not configured!\n\n1. Right-click the extension icon\n2. Select "Options"\n3. Get your free API key from albert.api.etalab.gouv.fr\n4. Save it in the extension settings\n\nThis takes just 2 minutes!'
          : 'Sorry, I encountered an error. Please try again.';
        addMessage(errorMessage, 'assistant');
      } else {
        const data = response.data;
        
        // Process the response to ensure it's properly formatted
        let assistantResponse = data.response;
        
        // If the response looks like it should be a bullet list but isn't formatted
        if (assistantResponse.includes(' - ') && !assistantResponse.includes('\n')) {
          // Convert inline bullet points to proper list
          assistantResponse = assistantResponse.replace(/ - /g, '\n- ');
        }
        
        addMessage(assistantResponse, 'assistant');
        
        // Add suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          addSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      removeMessage(loadingId);
      console.error('Error communicating with service worker:', error);
      addMessage('Failed to connect to the assistant. Please reload the extension.', 'assistant');
    }
  }
  
  // Add message to chat
  function addMessage(text, sender, isLoading = false) {
    const messages = widget.querySelector('.uwa-messages');
    const messageEl = document.createElement('div');
    const messageId = `msg-${Date.now()}`;
    
    messageEl.id = messageId;
    messageEl.className = `uwa-message ${sender}${isLoading ? ' loading' : ''}`;
    
    // Format message content
    if (sender === 'assistant' && !isLoading) {
      messageEl.innerHTML = formatAssistantMessage(text);
    } else {
      messageEl.textContent = text;
    }
    
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
  
  // Show initial suggestions based on site type
  function showInitialSuggestions() {
    const siteType = detectWebsiteType();
    
    // Welcome message - French only
    const welcome = 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider avec cette page?';
    addMessage(welcome, 'assistant');
    
    // Context-aware suggestions - French only
    const suggestionSets = {
      developer: ['Expliquer ce code', 'Comment déboguer ceci?', 'Quelles sont les meilleures pratiques?', 'Analyser la complexité'],
      educational: ['Résumer ce sujet', 'Expliquer simplement', 'Quels sont les concepts clés?', 'Donner des exemples'],
      ecommerce: ['Comparer les produits similaires', 'Est-ce une bonne affaire?', 'Que disent les avis?', 'Analyser le rapport qualité-prix'],
      article: ['Résumer cet article', 'Points principaux?', 'Vérifier cette affirmation', 'Quelle est la thèse principale?'],
      video: ['Résumer cette vidéo', 'Moments clés?', 'Vidéos similaires?', 'Quel est le message principal?'],
      social: ['Qu\'est-ce qui est tendance?', 'Résumer les commentaires', 'Discussions connexes?', 'Analyser le sentiment général'],
      general: ['Résumer cette page', 'Points clés en bullet points', 'De quoi s\'agit-il?', 'Expliquer le contexte']
    };
    
    const suggestions = suggestionSets[siteType] || suggestionSets.general;
    addSuggestions(suggestions);
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
  
  // Format assistant messages with bullet points and links
  function formatAssistantMessage(text) {
    // Convert markdown-style links to HTML
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Convert bullet points that start with - or * into proper lists
    const lines = text.split('\n');
    let inList = false;
    let formattedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isBullet = line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ');
      
      if (isBullet && !inList) {
        formattedLines.push('<ul>');
        inList = true;
      } else if (!isBullet && inList && line === '') {
        formattedLines.push('</ul>');
        inList = false;
      }
      
      if (isBullet) {
        const content = line.substring(2).trim();
        formattedLines.push(`<li>${content}</li>`);
      } else if (line !== '' || !inList) {
        if (inList && line !== '') {
          formattedLines.push('</ul>');
          inList = false;
        }
        formattedLines.push(line);
      }
    }
    
    if (inList) {
      formattedLines.push('</ul>');
    }
    
    // Join lines and convert double line breaks to paragraphs
    let html = formattedLines.join('\n');
    html = html.replace(/\n\n+/g, '<br><br>');
    html = html.replace(/\n/g, ' ');
    
    // Convert **bold** and *italic*
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    return html;
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