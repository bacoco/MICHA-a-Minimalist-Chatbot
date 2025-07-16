// Universal Web Assistant - Content Script
(() => {
  // Constants
  const WIDGET_ID = 'universal-assistant-widget';
  const STORAGE_KEY = 'universalAssistantSettings';
  
  // State
  let widget = null;
  let isExpanded = false;
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let settings = {
    enabled: true,
    position: 'bottom-right',
    theme: 'auto',
    shortcuts: true,
    panelWidth: 380,
    panelHeight: window.innerHeight,
    fontSize: 'medium',
    panelMode: true,  // Always use panel mode
    isExpanded: false,  // Add expanded state to persisted settings
    language: 'fr'  // Default language
  };
  
  // Language translations
  const TRANSLATIONS = {
    en: {
      welcome: 'Hello! I\'m your AI assistant. How can I help you with this page?',
      loading: 'Processing page, thinking...',
      placeholder: 'Ask me anything about this page...',
      error: {
        apiKey: '⚠️ API key not configured!\n\n1. Right-click the extension icon\n2. Select "Options"\n3. Get your free API key from albert.api.etalab.gouv.fr\n4. Save it in the extension settings\n\nThis takes just 2 minutes!',
        decrypt: '🔒 Error decrypting API key. Please reconfigure your API key in settings.',
        network: '🌐 Network error. Please check your internet connection.',
        generic: '❌ Error: {error}\n\nPlease check the console for details.'
      },
      suggestions: {
        developer: ['Explain this code', 'How to debug this?', 'What are the best practices?', 'Analyze complexity'],
        educational: ['Summarize this topic', 'Explain simply', 'What are the key concepts?', 'Give examples'],
        ecommerce: ['Compare similar products', 'Is this a good deal?', 'What do reviews say?', 'Analyze value for money'],
        article: ['Summarize this article', 'Main points?', 'Verify this claim', 'What\'s the thesis?'],
        video: ['Summarize this video', 'Key moments?', 'Similar videos?', 'What\'s the main message?'],
        social: ['What\'s trending?', 'Summarize comments', 'Related discussions?', 'Analyze overall sentiment'],
        general: ['Summarize this page', 'Key points in bullets', 'What is this about?', 'Explain the context']
      }
    },
    fr: {
      welcome: 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider avec cette page?',
      loading: 'Conversion de la page, Je réfléchis...',
      placeholder: 'Posez-moi une question sur cette page...',
      error: {
        apiKey: '⚠️ Clé API non configurée!\n\n1. Clic droit sur l\'icône de l\'extension\n2. Sélectionnez "Options"\n3. Obtenez votre clé API gratuite sur albert.api.etalab.gouv.fr\n4. Enregistrez-la dans les paramètres\n\nCela ne prend que 2 minutes!',
        decrypt: '🔒 Erreur de déchiffrement de la clé API. Veuillez reconfigurer votre clé API dans les paramètres.',
        network: '🌐 Erreur réseau. Veuillez vérifier votre connexion internet.',
        generic: '❌ Erreur: {error}\n\nVeuillez consulter la console pour plus de détails.'
      },
      suggestions: {
        developer: ['Expliquer ce code', 'Comment déboguer ceci?', 'Quelles sont les meilleures pratiques?', 'Analyser la complexité'],
        educational: ['Résumer ce sujet', 'Expliquer simplement', 'Quels sont les concepts clés?', 'Donner des exemples'],
        ecommerce: ['Comparer les produits similaires', 'Est-ce une bonne affaire?', 'Que disent les avis?', 'Analyser le rapport qualité-prix'],
        article: ['Résumer cet article', 'Points principaux?', 'Vérifier cette affirmation', 'Quelle est la thèse principale?'],
        video: ['Résumer cette vidéo', 'Moments clés?', 'Vidéos similaires?', 'Quel est le message principal?'],
        social: ['Qu\'est-ce qui est tendance?', 'Résumer les commentaires', 'Discussions connexes?', 'Analyser le sentiment général'],
        general: ['Résumer cette page', 'Points clés en bullet points', 'De quoi s\'agit-il?', 'Expliquer le contexte']
      }
    },
    es: {
      welcome: '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudarte con esta página?',
      loading: 'Procesando página, pensando...',
      placeholder: 'Pregúntame cualquier cosa sobre esta página...',
      error: {
        apiKey: '⚠️ ¡Clave API no configurada!\n\n1. Haz clic derecho en el icono de la extensión\n2. Selecciona "Opciones"\n3. Obtén tu clave API gratuita en albert.api.etalab.gouv.fr\n4. Guárdala en la configuración\n\n¡Solo toma 2 minutos!',
        decrypt: '🔒 Error al descifrar la clave API. Por favor, reconfigura tu clave API en la configuración.',
        network: '🌐 Error de red. Por favor, verifica tu conexión a internet.',
        generic: '❌ Error: {error}\n\nPor favor, consulta la consola para más detalles.'
      },
      suggestions: {
        developer: ['Explicar este código', '¿Cómo depurar esto?', '¿Cuáles son las mejores prácticas?', 'Analizar complejidad'],
        educational: ['Resumir este tema', 'Explicar simplemente', '¿Cuáles son los conceptos clave?', 'Dar ejemplos'],
        ecommerce: ['Comparar productos similares', '¿Es una buena oferta?', '¿Qué dicen las reseñas?', 'Analizar relación calidad-precio'],
        article: ['Resumir este artículo', '¿Puntos principales?', 'Verificar esta afirmación', '¿Cuál es la tesis?'],
        video: ['Resumir este video', '¿Momentos clave?', '¿Videos similares?', '¿Cuál es el mensaje principal?'],
        social: ['¿Qué es tendencia?', 'Resumir comentarios', '¿Discusiones relacionadas?', 'Analizar sentimiento general'],
        general: ['Resumir esta página', 'Puntos clave en viñetas', '¿De qué trata esto?', 'Explicar el contexto']
      }
    },
    de: {
      welcome: 'Hallo! Ich bin Ihr KI-Assistent. Wie kann ich Ihnen bei dieser Seite helfen?',
      loading: 'Seite wird verarbeitet, denke nach...',
      placeholder: 'Fragen Sie mich alles über diese Seite...',
      error: {
        apiKey: '⚠️ API-Schlüssel nicht konfiguriert!\n\n1. Rechtsklick auf das Erweiterungssymbol\n2. "Optionen" auswählen\n3. Kostenlosen API-Schlüssel von albert.api.etalab.gouv.fr erhalten\n4. In den Einstellungen speichern\n\nDauert nur 2 Minuten!',
        decrypt: '🔒 Fehler beim Entschlüsseln des API-Schlüssels. Bitte konfigurieren Sie Ihren API-Schlüssel neu.',
        network: '🌐 Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
        generic: '❌ Fehler: {error}\n\nBitte prüfen Sie die Konsole für Details.'
      },
      suggestions: {
        developer: ['Code erklären', 'Wie debuggen?', 'Best Practices?', 'Komplexität analysieren'],
        educational: ['Thema zusammenfassen', 'Einfach erklären', 'Schlüsselkonzepte?', 'Beispiele geben'],
        ecommerce: ['Ähnliche Produkte vergleichen', 'Gutes Angebot?', 'Was sagen Bewertungen?', 'Preis-Leistung analysieren'],
        article: ['Artikel zusammenfassen', 'Hauptpunkte?', 'Behauptung prüfen', 'Was ist die These?'],
        video: ['Video zusammenfassen', 'Schlüsselmomente?', 'Ähnliche Videos?', 'Hauptbotschaft?'],
        social: ['Was ist im Trend?', 'Kommentare zusammenfassen', 'Verwandte Diskussionen?', 'Stimmung analysieren'],
        general: ['Seite zusammenfassen', 'Wichtige Punkte', 'Worum geht es?', 'Kontext erklären']
      }
    }
  };

  // Get translation for current language
  function getTranslation(key, language = settings.language) {
    const lang = TRANSLATIONS[language] || TRANSLATIONS.en;
    const keys = key.split('.');
    let value = lang;
    
    for (const k of keys) {
      value = value[k];
      if (!value) return TRANSLATIONS.en[keys[0]][keys[1]] || key;
    }
    
    return value;
  }

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
  
  
  // Create widget HTML
  function createWidgetHTML() {
    // Always use panel mode
    return `
      <div id="${WIDGET_ID}" class="uwa-widget ${settings.position} panel-mode" data-theme="${settings.theme}" data-font-size="${settings.fontSize || 'medium'}">
        <button class="uwa-panel-tab" aria-label="Open chat panel">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 3h12v14H4z" stroke="currentColor" stroke-width="2"/>
            <path d="M8 10h4M8 7h4M8 13h4" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <div class="uwa-panel" style="display: none; width: ${settings.panelWidth}px;">
          <div class="uwa-header">
            <h3>Universal Assistant</h3>
            <div class="uwa-header-controls">
              <button class="uwa-minimize" aria-label="Minimize assistant">_</button>
              <button class="uwa-close" aria-label="Close assistant">×</button>
            </div>
          </div>
          <div class="uwa-messages"></div>
          <div class="uwa-input-container">
            <input type="text" class="uwa-input" placeholder="${getTranslation('placeholder')}" />
            <button class="uwa-send" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 10l15-8v16L2 10z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="uwa-resize-handle"></div>
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
    
    // Apply saved expanded state
    const panelTab = widget.querySelector('.uwa-panel-tab');
    if (settings.isExpanded) {
      isExpanded = true;
      const panel = widget.querySelector('.uwa-panel');
      panel.style.display = 'flex';
      widget.classList.add('expanded');
      
      // Apply panel dimensions
      panel.style.width = settings.panelWidth + 'px';
      // Hide panel tab when expanded
      panelTab.style.display = 'none';
      
      // Show initial suggestions if no messages yet
      const messages = widget.querySelector('.uwa-messages');
      if (messages.children.length === 0) {
        showInitialSuggestions();
      }
    } else {
      // Show panel tab when minimized
      panelTab.style.display = 'flex';
    }
    
    // Always apply webpage transformation for panel mode
    document.documentElement.classList.add('uwa-panel-active');
    if (settings.isExpanded) {
      document.documentElement.style.setProperty('--uwa-panel-width', settings.panelWidth + 'px');
    } else {
      document.documentElement.style.setProperty('--uwa-panel-width', '0px');
    }
  }
  
  // Attach event listeners
  function attachEventListeners() {
    const panelTab = widget.querySelector('.uwa-panel-tab');
    const close = widget.querySelector('.uwa-close');
    const minimize = widget.querySelector('.uwa-minimize');
    const input = widget.querySelector('.uwa-input');
    const send = widget.querySelector('.uwa-send');
    const resizeHandle = widget.querySelector('.uwa-resize-handle');
    const panel = widget.querySelector('.uwa-panel');
    
    panelTab.addEventListener('click', toggleWidget);
    close.addEventListener('click', toggleWidget);
    minimize.addEventListener('click', minimizeWidget);
    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    // Resize functionality
    resizeHandle.addEventListener('mousedown', startResize);
    
    // Keyboard shortcuts
    if (settings.shortcuts) {
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          toggleWidget();
        } else if (e.key === 'Escape' && isExpanded) {
          e.preventDefault();
          minimizeWidget();
        }
      });
    }
  }
  
  // Toggle widget visibility
  function toggleWidget() {
    const panel = widget.querySelector('.uwa-panel');
    const panelTab = widget.querySelector('.uwa-panel-tab');
    isExpanded = !isExpanded;
    settings.isExpanded = isExpanded;  // Update settings
    
    // Save the expanded state
    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    
    if (isExpanded) {
      panel.style.display = 'flex';
      widget.classList.add('expanded');
      
      // Apply panel dimensions
      panel.style.width = settings.panelWidth + 'px';
      // Update webpage offset when opening
      document.documentElement.style.setProperty('--uwa-panel-width', settings.panelWidth + 'px');
      // Hide panel tab when expanded
      panelTab.style.display = 'none';
      
      widget.querySelector('.uwa-input').focus();
      
      // Show initial suggestions if no messages yet
      const messages = widget.querySelector('.uwa-messages');
      if (messages.children.length === 0) {
        showInitialSuggestions();
      }
    } else {
      panel.style.display = 'none';
      widget.classList.remove('expanded');
      
      // Remove webpage offset when closing
      document.documentElement.style.setProperty('--uwa-panel-width', '0px');
      // Show panel tab when minimized
      panelTab.style.display = 'flex';
    }
  }
  
  // Minimize widget
  function minimizeWidget() {
    const panel = widget.querySelector('.uwa-panel');
    const panelTab = widget.querySelector('.uwa-panel-tab');
    panel.style.display = 'none';
    widget.classList.remove('expanded');
    isExpanded = false;
    settings.isExpanded = false;  // Update settings
    
    // Save the minimized state
    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    
    // Remove webpage offset when minimizing
    document.documentElement.style.setProperty('--uwa-panel-width', '0px');
    // Show panel tab when minimized
    panelTab.style.display = 'flex';
  }
  
  
  // Start resizing
  function startResize(e) {
    e.preventDefault();
    isResizing = true;
    
    const panel = widget.querySelector('.uwa-panel');
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(window.getComputedStyle(panel).width, 10);
    startHeight = parseInt(window.getComputedStyle(panel).height, 10);
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    
    // Add resizing class for visual feedback
    panel.classList.add('resizing');
  }
  
  // Do resize
  function doResize(e) {
    if (!isResizing) return;
    
    const panel = widget.querySelector('.uwa-panel');
    
    // In panel mode, resize both width and height from bottom-right corner
    let newWidth = startWidth - (e.clientX - startX);
    let newHeight = startHeight - (e.clientY - startY);
    
    // Apply constraints for panel mode
    newWidth = Math.max(300, Math.min(800, newWidth));
    newHeight = Math.max(400, Math.min(window.innerHeight, newHeight));
    
    // Apply new dimensions
    panel.style.width = newWidth + 'px';
    panel.style.height = newHeight + 'px';
    
    // Update the webpage offset
    document.documentElement.style.setProperty('--uwa-panel-width', newWidth + 'px');
    
    // Save to settings
    settings.panelWidth = newWidth;
    settings.panelHeight = newHeight;
  }
  
  // Stop resizing
  function stopResize() {
    if (!isResizing) return;
    
    isResizing = false;
    const panel = widget.querySelector('.uwa-panel');
    panel.classList.remove('resizing');
    
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Save dimensions to storage
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        const updatedSettings = { ...result[STORAGE_KEY], ...settings };
        chrome.storage.sync.set({ [STORAGE_KEY]: updatedSettings });
      });
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
    
    // Show loading message in user's language
    const loadingId = addMessage(getTranslation('loading'), 'assistant', true);
    
    try {
      // Send message to service worker
      const response = await chrome.runtime.sendMessage({
        action: 'assist',
        data: {
          message,
          url: window.location.href,
          context: {
            siteType: detectWebsiteType(),
            language: settings.language,
            domain: window.location.hostname,
            title: document.title
          }
        }
      });
      
      // Remove loading message
      removeMessage(loadingId);
      
      if (!response.success) {
        console.error('Chat error:', response.error);
        if (response.details) {
          console.error('Error details:', response.details);
        }
        
        let errorMessage;
        if (response.error === 'API key not configured. Please set it in extension options.') {
          errorMessage = getTranslation('error.apiKey');
        } else if (response.error && response.error.includes('decrypt')) {
          errorMessage = getTranslation('error.decrypt');
        } else if (response.error && response.error.includes('Network')) {
          errorMessage = getTranslation('error.network');
        } else {
          errorMessage = getTranslation('error.generic').replace('{error}', response.error || 'Unknown error occurred');
        }
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
      console.error('Error stack:', error.stack);
      
      let errorMsg = 'Failed to connect to the assistant. ';
      if (error.message && error.message.includes('Extension context invalidated')) {
        errorMsg += 'Please reload the page or reinstall the extension.';
      } else {
        errorMsg += 'Please check the console for details.';
      }
      addMessage(errorMsg, 'assistant');
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
    
    // Welcome message in user's language
    const welcome = getTranslation('welcome');
    addMessage(welcome, 'assistant');
    
    // Context-aware suggestions in user's language
    const suggestions = getTranslation(`suggestions.${siteType}`) || getTranslation('suggestions.general');
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
          // Update isExpanded from saved settings
          isExpanded = settings.isExpanded || false;
          // Ensure language is set
          if (!settings.language) {
            settings.language = 'fr'; // Default to French
          }
        }
        resolve();
      });
    });
  }
  
  // Save settings to storage
  async function saveSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.warn('Chrome storage API not available');
      return;
    }
    
    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
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
    
    console.log('Universal Assistant: Initializing...');
    
    // Load settings
    await loadSettings();
    
    console.log('Universal Assistant: Settings loaded', settings);
    
    // Check if enabled and not blacklisted
    const blacklisted = await isBlacklisted();
    
    console.log('Universal Assistant: Enabled:', settings.enabled, 'Blacklisted:', blacklisted);
    
    if (settings.enabled && !blacklisted) {
      injectWidget();
      console.log('Universal Assistant: Widget injected');
      
      // Send init message with context
      if (chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'pageLoad',
          context: {
            url: window.location.href,
            siteType: detectWebsiteType(),
            language: settings.language
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
  
  // Handle window resize for panel mode
  window.addEventListener('resize', () => {
    if (widget && isExpanded) {
      const panel = widget.querySelector('.uwa-panel');
      if (panel) {
        // In panel mode, height is always 100vh via CSS
        // Only need to update width offset
        document.documentElement.style.setProperty('--uwa-panel-width', settings.panelWidth + 'px');
      }
    }
  });
})();
