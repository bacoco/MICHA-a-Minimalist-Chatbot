// MiCha - Minimalist Chatbot Content Script
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
  let suggestionsLoading = false;
  let initialSuggestionsShown = false;
  let widgetInitialized = false; // Prevent re-initialization
  let currentPageSuggestions = null; // Cache AI suggestions for current page
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
  
  // Session management for chat persistence
  const pageUrl = window.location.href.split('#')[0].split('?')[0]; // Clean URL without hash/query
  let chatHistory = [];
  let sessionData = {
    suggestionsShown: false,
    messages: [],
    lastUpdated: Date.now()
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
        article: ['Résumer cet article', 'Points principaux?', 'Points clés?', 'Quelle est la conclusion?'],
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
    },
    it: {
      welcome: 'Ciao! Sono il tuo assistente IA. Come posso aiutarti con questa pagina?',
      loading: 'Elaborazione pagina, sto pensando...',
      placeholder: 'Chiedimi qualsiasi cosa su questa pagina...',
      error: {
        apiKey: '⚠️ Chiave API non configurata!\n\n1. Clic destro sull\'icona dell\'estensione\n2. Seleziona "Opzioni"\n3. Ottieni la tua chiave API gratuita su albert.api.etalab.gouv.fr\n4. Salvala nelle impostazioni\n\nCi vogliono solo 2 minuti!',
        decrypt: '🔒 Errore nel decifrare la chiave API. Riconfigura la chiave API nelle impostazioni.',
        network: '🌐 Errore di rete. Controlla la tua connessione internet.',
        generic: '❌ Errore: {error}\n\nControlla la console per i dettagli.'
      },
      suggestions: {
        developer: ['Spiega questo codice', 'Come fare debug?', 'Best practice?', 'Analizza complessità'],
        educational: ['Riassumi argomento', 'Spiega semplicemente', 'Concetti chiave?', 'Esempi?'],
        ecommerce: ['Confronta prodotti', 'Buon affare?', 'Cosa dicono le recensioni?', 'Analisi valore'],
        article: ['Riassumi articolo', 'Punti principali?', 'Punti chiave?', 'Conclusione?'],
        video: ['Riassumi video', 'Momenti chiave?', 'Video simili?', 'Messaggio principale?'],
        social: ['Cosa è di tendenza?', 'Riassumi commenti', 'Post correlati?', 'Sentimento generale'],
        general: ['Riassumi pagina', 'Punti chiave', 'Di cosa si tratta?', 'Spiega il contesto']
      }
    },
    pt: {
      welcome: 'Olá! Sou seu assistente de IA. Como posso ajudá-lo com esta página?',
      loading: 'Processando página, pensando...',
      placeholder: 'Pergunte-me qualquer coisa sobre esta página...',
      error: {
        apiKey: '⚠️ Chave API não configurada!\n\n1. Clique direito no ícone da extensão\n2. Selecione "Opções"\n3. Obtenha sua chave API gratuita em albert.api.etalab.gouv.fr\n4. Salve nas configurações\n\nLeva apenas 2 minutos!',
        decrypt: '🔒 Erro ao descriptografar chave API. Reconfigure sua chave API nas configurações.',
        network: '🌐 Erro de rede. Verifique sua conexão com a internet.',
        generic: '❌ Erro: {error}\n\nVerifique o console para detalhes.'
      },
      suggestions: {
        developer: ['Explicar código', 'Como debugar?', 'Boas práticas?', 'Analisar complexidade'],
        educational: ['Resumir tópico', 'Explicar simplesmente', 'Conceitos-chave?', 'Exemplos?'],
        ecommerce: ['Comparar produtos', 'Bom negócio?', 'O que dizem as avaliações?', 'Análise de valor'],
        article: ['Resumir artigo', 'Pontos principais?', 'Pontos-chave?', 'Conclusão?'],
        video: ['Resumir vídeo', 'Momentos-chave?', 'Vídeos similares?', 'Mensagem principal?'],
        social: ['O que está em alta?', 'Resumir comentários', 'Posts relacionados?', 'Sentimento geral'],
        general: ['Resumir página', 'Pontos-chave', 'Sobre o que é?', 'Explicar contexto']
      }
    },
    nl: {
      welcome: 'Hallo! Ik ben je AI-assistent. Hoe kan ik je helpen met deze pagina?',
      loading: 'Pagina verwerken, aan het denken...',
      placeholder: 'Vraag me alles over deze pagina...',
      error: {
        apiKey: '⚠️ API-sleutel niet geconfigureerd!\n\n1. Rechtsklik op het extensie-icoon\n2. Selecteer "Opties"\n3. Krijg je gratis API-sleutel op albert.api.etalab.gouv.fr\n4. Sla op in instellingen\n\nDuurt slechts 2 minuten!',
        decrypt: '🔒 Fout bij ontsleutelen API-sleutel. Configureer je API-sleutel opnieuw in instellingen.',
        network: '🌐 Netwerkfout. Controleer je internetverbinding.',
        generic: '❌ Fout: {error}\n\nControleer de console voor details.'
      },
      suggestions: {
        developer: ['Leg code uit', 'Hoe debuggen?', 'Best practices?', 'Analyseer complexiteit'],
        educational: ['Vat onderwerp samen', 'Leg simpel uit', 'Kernconcepten?', 'Voorbeelden?'],
        ecommerce: ['Vergelijk producten', 'Goede deal?', 'Wat zeggen reviews?', 'Waarde analyse'],
        article: ['Vat artikel samen', 'Hoofdpunten?', 'Kernpunten?', 'Conclusie?'],
        video: ['Vat video samen', 'Belangrijke momenten?', 'Vergelijkbare video\'s?', 'Hoofdboodschap?'],
        social: ['Wat is trending?', 'Vat reacties samen', 'Gerelateerde posts?', 'Algemeen sentiment'],
        general: ['Vat pagina samen', 'Kernpunten', 'Waar gaat dit over?', 'Leg context uit']
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
  
  
  // Session management functions
  function saveChatSession() {
    // Check if chrome runtime is still valid
    if (!chrome.runtime?.id) {
      console.warn('[MiCha DEBUG] Extension context invalidated, cannot save session');
      return;
    }
    
    sessionData.messages = chatHistory;
    sessionData.lastUpdated = Date.now();
    sessionData.suggestionsShown = initialSuggestionsShown;
    sessionData.cachedSuggestions = currentPageSuggestions;
    
    console.log('[MiCha DEBUG] Saving chat session:', {
      pageUrl: pageUrl,
      messagesCount: chatHistory.length,
      suggestionsShown: initialSuggestionsShown,
      cachedSuggestions: currentPageSuggestions
    });
    
    try {
      chrome.storage.local.get(['chatSessions'], (result) => {
        // Double-check runtime is still valid after async call
        if (!chrome.runtime?.id) {
          console.warn('[MiCha DEBUG] Extension context invalidated during save');
          return;
        }
        
        if (chrome.runtime.lastError) {
          console.error('[MiCha DEBUG] Storage error:', chrome.runtime.lastError);
          return;
        }
        
        const sessions = result.chatSessions || {};
        sessions[pageUrl] = sessionData;
        
        // Clean up old sessions (older than 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        Object.keys(sessions).forEach(url => {
          if (sessions[url].lastUpdated < oneDayAgo) {
            delete sessions[url];
          }
        });
        
        chrome.storage.local.set({ chatSessions: sessions }, () => {
          if (chrome.runtime.lastError) {
            console.error('[MiCha DEBUG] Failed to save session:', chrome.runtime.lastError);
          } else {
            console.log('[MiCha DEBUG] Chat session saved successfully');
          }
        });
      });
    } catch (error) {
      console.error('[MiCha DEBUG] Error saving session:', error);
    }
  }
  
  function restoreChatSession(messagesContainer) {
    return new Promise((resolve) => {
      // Check if chrome runtime is still valid
      if (!chrome.runtime?.id) {
        console.warn('[MiCha DEBUG] Extension context invalidated, cannot restore session');
        resolve(false);
        return;
      }
      
      console.log('[MiCha DEBUG] Restoring chat session for:', pageUrl);
      console.log('[MiCha DEBUG] Current chatHistory length before restore:', chatHistory.length);
      
      // If we already have chat history in memory, don't overwrite it
      if (chatHistory.length > 0) {
        console.log('[MiCha DEBUG] Chat history already in memory, skipping storage load');
        resolve(true);
        return;
      }
      
      try {
        chrome.storage.local.get(['chatSessions'], (result) => {
          // Double-check runtime is still valid after async call
          if (!chrome.runtime?.id) {
            console.warn('[MiCha DEBUG] Extension context invalidated during restore');
            resolve(false);
            return;
          }
          
          if (chrome.runtime.lastError) {
            console.error('[MiCha DEBUG] Storage error:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          
          if (result.chatSessions && result.chatSessions[pageUrl]) {
            console.log('[MiCha DEBUG] Found saved session:', result.chatSessions[pageUrl]);
            sessionData = result.chatSessions[pageUrl];
            chatHistory = sessionData.messages || [];
            initialSuggestionsShown = sessionData.suggestionsShown || false;
            currentPageSuggestions = sessionData.cachedSuggestions || null;
            
            console.log('[MiCha DEBUG] Restoring messages count:', chatHistory.length);
            console.log('[MiCha DEBUG] Initial suggestions shown:', initialSuggestionsShown);
            
            // Restore messages to UI
            messagesContainer.innerHTML = '';
            let lastAIMessageWithSuggestions = null;
            
            chatHistory.forEach((msg, index) => {
              const messageEl = document.createElement('div');
              messageEl.className = `uwa-message ${msg.type === 'ai' ? 'assistant' : 'user'}`;
              messageEl.id = msg.id || `msg-restored-${index}`;
              
              // Format message content
              if (msg.type === 'ai') {
                messageEl.innerHTML = formatAssistantMessage(msg.text);
                // Track last AI message with suggestions
                if (msg.suggestions && msg.suggestions.length > 0) {
                  lastAIMessageWithSuggestions = msg.suggestions;
                }
              } else {
                messageEl.textContent = msg.text;
              }
              
              messagesContainer.appendChild(messageEl);
            });
            
            // Add suggestions after the last AI message if they exist
            if (lastAIMessageWithSuggestions) {
              addSuggestions(lastAIMessageWithSuggestions, true); // Skip save since we're restoring
            }
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            resolve(true); // Session restored
          } else {
            console.log('[MiCha DEBUG] No saved session found for:', pageUrl);
            resolve(false); // No session found
          }
        });
      } catch (error) {
        console.error('[MiCha DEBUG] Error restoring session:', error);
        resolve(false);
      }
    });
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
            <h3>MiCha</h3>
            <div class="uwa-header-controls">
              <button class="uwa-minimize" aria-label="Minimize assistant">_</button>
              <button class="uwa-settings" aria-label="Open settings">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.0003 12.5C11.381 12.5 12.5003 11.3807 12.5003 10C12.5003 8.61929 11.381 7.5 10.0003 7.5C8.61957 7.5 7.50028 8.61929 7.50028 10C7.50028 11.3807 8.61957 12.5 10.0003 12.5Z" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M10 1L10 3M10 17L10 19M19 10L17 10M3 10L1 10M17.0711 2.92893L15.6569 4.34315M4.34315 15.6569L2.92893 17.0711M17.0711 17.0711L15.6569 15.6569M4.34315 4.34315L2.92893 2.92893" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
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
      
      // Restore chat session if widget starts expanded
      const messages = widget.querySelector('.uwa-messages');
      
      // Check if we already have messages from initial load
      if (chatHistory.length > 0) {
        console.log('[MiCha DEBUG] Using pre-loaded chat history');
        messages.innerHTML = '';
        let lastAIMessageWithSuggestions = null;
        
        chatHistory.forEach((msg, index) => {
          const messageEl = document.createElement('div');
          messageEl.className = `uwa-message ${msg.type === 'ai' ? 'assistant' : 'user'}`;
          messageEl.id = msg.id || `msg-restored-${index}`;
          
          if (msg.type === 'ai') {
            messageEl.innerHTML = formatAssistantMessage(msg.text);
            if (msg.suggestions && msg.suggestions.length > 0) {
              lastAIMessageWithSuggestions = msg.suggestions;
            }
          } else {
            messageEl.textContent = msg.text;
          }
          
          messages.appendChild(messageEl);
        });
        
        if (lastAIMessageWithSuggestions) {
          addSuggestions(lastAIMessageWithSuggestions, true);
        }
        
        messages.scrollTop = messages.scrollHeight;
      } else if (!initialSuggestionsShown) {
        // Only show initial suggestions if no history and not already shown
        console.log('[MiCha DEBUG] No chat history, showing initial suggestions');
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
    const settings = widget.querySelector('.uwa-settings');
    const minimize = widget.querySelector('.uwa-minimize');
    const input = widget.querySelector('.uwa-input');
    const send = widget.querySelector('.uwa-send');
    const resizeHandle = widget.querySelector('.uwa-resize-handle');
    const panel = widget.querySelector('.uwa-panel');
    
    panelTab.addEventListener('click', toggleWidget);
    settings.addEventListener('click', openSettings);
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
    const messages = widget.querySelector('.uwa-messages');
    
    console.log('[MiCha DEBUG] toggleWidget - messages before toggle:', messages.children.length);
    console.log('[MiCha DEBUG] toggleWidget - isExpanded:', isExpanded);
    console.log('[MiCha DEBUG] toggleWidget - initialSuggestionsShown:', initialSuggestionsShown);
    console.log('[MiCha DEBUG] toggleWidget - pageUrl:', pageUrl);
    console.log('[MiCha DEBUG] toggleWidget - chatHistory length:', chatHistory.length);
    
    
    isExpanded = !isExpanded;
    settings.isExpanded = isExpanded;  // Update settings
    
    // Save the expanded state
    if (chrome.runtime?.id) {
      chrome.storage.sync.set({ [STORAGE_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('[MiCha DEBUG] Failed to save expanded state:', chrome.runtime.lastError);
        }
      });
    } else {
      console.warn('[MiCha DEBUG] Cannot save expanded state - context invalidated');
    }
    
    if (isExpanded) {
      panel.style.display = 'flex';
      widget.classList.add('expanded');
      
      // Apply panel dimensions
      panel.style.width = settings.panelWidth + 'px';
      // Update webpage offset when opening
      document.documentElement.style.setProperty('--uwa-panel-width', settings.panelWidth + 'px');
      // Hide panel tab when expanded
      panelTab.style.display = 'none';
      
      // Check if we already have messages in memory
      if (chatHistory.length > 0) {
        console.log('[MiCha DEBUG] Restoring from in-memory chat history');
        console.log('[MiCha DEBUG] chatHistory contents:', JSON.stringify(chatHistory));
        // Clear and restore messages
        messages.innerHTML = '';
        let lastAIMessageWithSuggestions = null;
        
        chatHistory.forEach((msg, index) => {
          const messageEl = document.createElement('div');
          messageEl.className = `uwa-message ${msg.type === 'ai' ? 'assistant' : 'user'}`;
          messageEl.id = msg.id || `msg-restored-${index}`;
          
          if (msg.type === 'ai') {
            messageEl.innerHTML = formatAssistantMessage(msg.text);
            if (msg.suggestions && msg.suggestions.length > 0) {
              lastAIMessageWithSuggestions = msg.suggestions;
            }
          } else {
            messageEl.textContent = msg.text;
          }
          
          messages.appendChild(messageEl);
        });
        
        if (lastAIMessageWithSuggestions) {
          addSuggestions(lastAIMessageWithSuggestions, true);
        }
        
        messages.scrollTop = messages.scrollHeight;
      } else {
        // Try to restore from storage
        restoreChatSession(messages).then((sessionRestored) => {
          console.log('[MiCha DEBUG] Session restored from storage:', sessionRestored);
          
          // Only show initial suggestions if no session was restored
          if (!sessionRestored && !initialSuggestionsShown) {
            console.log('[MiCha DEBUG] No session found, showing initial suggestions');
            showInitialSuggestions();
          }
        });
      }
      
      widget.querySelector('.uwa-input').focus();
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
    const messages = widget.querySelector('.uwa-messages');
    
    // Save current chat state before minimizing
    console.log('[MiCha DEBUG] Minimizing widget - saving current state');
    console.log('[MiCha DEBUG] Current chatHistory length before minimize:', chatHistory.length);
    saveChatSession();
    
    panel.style.display = 'none';
    widget.classList.remove('expanded');
    isExpanded = false;
    settings.isExpanded = false;  // Update settings
    
    // Save the minimized state
    if (chrome.runtime?.id) {
      chrome.storage.sync.set({ [STORAGE_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('[MiCha DEBUG] Failed to save minimized state:', chrome.runtime.lastError);
        }
      });
    } else {
      console.warn('[MiCha DEBUG] Cannot save minimized state - context invalidated');
    }
    
    // Remove webpage offset when minimizing
    document.documentElement.style.setProperty('--uwa-panel-width', '0px');
    // Show panel tab when minimized
    panelTab.style.display = 'flex';
    
  }
  
  // Open settings
  function openSettings() {
    // Check if runtime is still valid
    if (!chrome.runtime?.id) {
      console.warn('[MiCha DEBUG] Cannot open settings - context invalidated');
      return;
    }
    
    // Send message to service worker to open options page
    try {
      chrome.runtime.sendMessage({ action: 'openOptions' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[MiCha DEBUG] Failed to open settings:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('[MiCha DEBUG] Error opening settings:', error);
    }
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
    if (chrome.storage && chrome.storage.sync && chrome.runtime?.id) {
      try {
        chrome.storage.sync.get(STORAGE_KEY, (result) => {
          if (!chrome.runtime?.id) {
            console.warn('[MiCha DEBUG] Context invalidated during dimension save');
            return;
          }
          
          if (chrome.runtime.lastError) {
            console.error('[MiCha DEBUG] Error getting settings for dimension save:', chrome.runtime.lastError);
            return;
          }
          
          const updatedSettings = { ...result[STORAGE_KEY], ...settings };
          chrome.storage.sync.set({ [STORAGE_KEY]: updatedSettings }, () => {
            if (chrome.runtime.lastError) {
              console.error('[MiCha DEBUG] Failed to save dimensions:', chrome.runtime.lastError);
            }
          });
        });
      } catch (error) {
        console.error('[MiCha DEBUG] Error saving dimensions:', error);
      }
    }
  }
  
  // Send message to service worker
  async function sendMessage() {
    const input = widget.querySelector('.uwa-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Remove any existing suggestions when sending a new message
    const existingSuggestions = widget.querySelector('.uwa-suggestions');
    if (existingSuggestions) {
      existingSuggestions.remove();
    }
    
    // Add user message to chat
    addMessage(message, 'user');
    input.value = '';
    
    // Show loading message in user's language
    const loadingId = addMessage(getTranslation('loading'), 'assistant', true);
    
    try {
      // Check if runtime is still valid before sending message
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }
      
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
        
        // Save the assistant message with suggestions
        addMessage(assistantResponse, 'assistant', false, data.suggestions);
        
        // Add suggestions to UI if available
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
  function addMessage(text, sender, isLoading = false, suggestions = null) {
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
    
    // Save to chat history (but not loading messages)
    if (!isLoading) {
      const messageData = {
        id: messageId,
        text: text,
        type: sender === 'assistant' ? 'ai' : 'user',
        timestamp: Date.now()
      };
      
      if (suggestions) {
        messageData.suggestions = suggestions;
      }
      
      chatHistory.push(messageData);
      console.log('[MiCha DEBUG] Added message to chatHistory. New length:', chatHistory.length);
      saveChatSession();
    }
    
    return messageId;
  }
  
  // Remove message
  function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) message.remove();
  }
  
  // Add suggestions
  function addSuggestions(suggestions, skipSave = false, isGeneric = false) {
    console.log('[MiCha DEBUG] Adding suggestions:', suggestions, 'isGeneric:', isGeneric);
    const messages = widget.querySelector('.uwa-messages');
    
    // Check if we're adding to existing suggestions or creating new
    let existingSuggestions = messages.querySelector('.uwa-suggestions');
    let suggestionsEl;
    
    if (existingSuggestions && !isGeneric) {
      // We're adding site-specific suggestions to existing generic ones
      suggestionsEl = existingSuggestions;
    } else {
      // Remove any existing suggestions and create new
      if (existingSuggestions) {
        existingSuggestions.remove();
      }
      suggestionsEl = document.createElement('div');
      suggestionsEl.className = 'uwa-suggestions';
    }
    
    suggestions.forEach((suggestion) => {
      const button = document.createElement('button');
      // Apply class based on isGeneric parameter
      button.className = isGeneric ? 'uwa-suggestion generic' : 'uwa-suggestion site-specific';
      button.textContent = suggestion;
      button.addEventListener('click', () => {
        console.log('[MiCha DEBUG] Suggestion clicked:', suggestion);
        widget.querySelector('.uwa-input').value = suggestion;
        sendMessage();
      });
      suggestionsEl.appendChild(button);
    });
    
    // Only append if we created a new container
    if (!existingSuggestions || isGeneric) {
      messages.appendChild(suggestionsEl);
    }
    messages.scrollTop = messages.scrollHeight;
    
    // When restoring from saved session, we don't want to save again
    if (!skipSave) {
      // Update the last AI message in chat history with these suggestions
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].type === 'ai') {
          chatHistory[i].suggestions = suggestions;
          saveChatSession();
          break;
        }
      }
    }
  }
  
  // Show initial suggestions based on site type
  async function showInitialSuggestions() {
    console.log('[MiCha DEBUG] showInitialSuggestions called');
    console.trace(); // This will show us where it's being called from
    
    // Prevent if already shown
    if (initialSuggestionsShown) {
      console.log('[MiCha DEBUG] Already shown, returning');
      return;
    }
    
    // Prevent duplicate calls
    if (suggestionsLoading) {
      console.log('[MiCha DEBUG] Already loading, returning');
      return;
    }
    
    const messages = widget.querySelector('.uwa-messages');
    console.log('[MiCha DEBUG] Messages count:', messages.children.length);
    console.log('[MiCha DEBUG] Messages innerHTML:', messages.innerHTML);
    console.log('[MiCha DEBUG] chatHistory length:', chatHistory.length);
    
    // Check if suggestions already exist
    const existingSuggestions = widget.querySelector('.uwa-suggestions');
    if (existingSuggestions) {
      console.log('[MiCha DEBUG] Suggestions exist, returning');
      return;
    }
    
    // Check chatHistory instead of DOM to avoid issues when widget is minimized
    if (chatHistory.length > 0) {
      console.log('[MiCha DEBUG] Chat history exists, not showing initial suggestions');
      return;
    }
    
    suggestionsLoading = true;
    initialSuggestionsShown = true;
    sessionData.suggestionsShown = true;
    saveChatSession();
    
    // Welcome message in user's language
    const welcome = getTranslation('welcome');
    addMessage(welcome, 'assistant');
    
    // Generic questions by language (show immediately)
    const genericQuestions = {
      fr: [
        "Qu'est-ce que résume cette page?",
        "Quels sont les points clés?",
        "Quels sont les principaux sujets?",
        "Expliquez simplement cette page?"
      ],
      en: [
        "What does this page contain?",
        "What are the key points?",
        "What are the main topics?",
        "Explain this page simply?"
      ],
      es: [
        "¿Qué contiene esta página?",
        "¿Cuáles son los puntos clave?",
        "¿Cuáles son los temas principales?",
        "¿Explica esta página simplemente?"
      ],
      de: [
        "Was enthält diese Seite?",
        "Was sind die wichtigsten Punkte?",
        "Was sind die Hauptthemen?",
        "Diese Seite einfach erklären?"
      ],
      it: [
        "Cosa contiene questa pagina?",
        "Quali sono i punti chiave?",
        "Quali sono gli argomenti principali?",
        "Spiega questa pagina semplicemente?"
      ],
      pt: [
        "O que contém esta página?",
        "Quais são os pontos-chave?",
        "Quais são os tópicos principais?",
        "Explique esta página simplesmente?"
      ],
      nl: [
        "Wat bevat deze pagina?",
        "Wat zijn de belangrijkste punten?",
        "Wat zijn de hoofdonderwerpen?",
        "Leg deze pagina eenvoudig uit?"
      ]
    };
    
    // Show generic questions immediately
    const currentGenericQuestions = genericQuestions[settings.language] || genericQuestions.en;
    addSuggestions(currentGenericQuestions, true, true); // skipSave=true, isGeneric=true
    
    // Check if we have cached AI suggestions for this page
    if (currentPageSuggestions && currentPageSuggestions.length > 0) {
      console.log('[MiCha DEBUG] Using cached AI suggestions:', currentPageSuggestions);
      addSuggestions(currentPageSuggestions, true); // Use cached suggestions
      return; // Exit early, no need to fetch again
    }
    
    // Show loading state for page-specific suggestions
    const loadingEl = document.createElement('div');
    loadingEl.className = 'uwa-suggestions-loading';
    
    // Loading text in user's language
    const loadingTexts = {
      en: 'Loading page-specific suggestions...',
      fr: 'Chargement des suggestions spécifiques...',
      es: 'Cargando sugerencias específicas...',
      de: 'Lade seitenspezifische Vorschläge...',
      it: 'Caricamento suggerimenti specifici...',
      pt: 'Carregando sugestões específicas...',
      nl: 'Pagina-specifieke suggesties laden...'
    };
    const loadingText = loadingTexts[settings.language] || loadingTexts.en;
    loadingEl.innerHTML = `<span>⏳</span> ${loadingText}`;
    messages.appendChild(loadingEl);
    
    try {
      // Check if runtime is still valid before requesting suggestions
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }
      
      // Request contextual suggestions from service worker
      const response = await chrome.runtime.sendMessage({
        action: 'getSuggestions',
        data: {
          url: window.location.href,
          context: {
            siteType: detectWebsiteType(),
            language: settings.language,
            domain: window.location.hostname,
            title: document.title
          }
        }
      });
      
      // Remove loading state
      loadingEl.remove();
      
      if (response.success && response.suggestions && response.suggestions.length > 0) {
        // Cache the AI suggestions
        currentPageSuggestions = response.suggestions;
        
        // Update the welcome message with suggestions before adding them to UI
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].type === 'ai') {
          chatHistory[chatHistory.length - 1].suggestions = response.suggestions;
          saveChatSession();
        }
        addSuggestions(response.suggestions, true); // Skip save since we already saved above
      }
      // No fallback - just let user type if it fails
    } catch (error) {
      console.error('[MiCha] Failed to get initial suggestions:', error);
      // Remove loading state
      loadingEl.remove();
      // No fallback suggestions - user can just type
    } finally {
      // Reset loading flag
      suggestionsLoading = false;
    }
  }
  
  
  // Load settings from storage
  async function loadSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) {
      console.warn('Chrome storage API not available or context invalidated');
      return;
    }
    
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(STORAGE_KEY, (result) => {
          if (!chrome.runtime?.id) {
            console.warn('[MiCha DEBUG] Context invalidated during settings load');
            resolve();
            return;
          }
          
          if (chrome.runtime.lastError) {
            console.error('[MiCha DEBUG] Error loading settings:', chrome.runtime.lastError);
            resolve();
            return;
          }
          
          if (result[STORAGE_KEY]) {
            settings = { ...settings, ...result[STORAGE_KEY] };
            // Update isExpanded from saved settings
            isExpanded = settings.isExpanded || false;
            // Ensure language is set
            if (!settings.language) {
              settings.language = 'fr'; // Default to French
            }
          }
          
          // Also load chat sessions for current page
          chrome.storage.local.get(['chatSessions'], (sessionResult) => {
            if (!chrome.runtime?.id) {
              console.warn('[MiCha DEBUG] Context invalidated during session load');
              resolve();
              return;
            }
            
            if (chrome.runtime.lastError) {
              console.error('[MiCha DEBUG] Error loading sessions:', chrome.runtime.lastError);
              resolve();
              return;
            }
            
            if (sessionResult.chatSessions && sessionResult.chatSessions[pageUrl]) {
              console.log('[MiCha DEBUG] Found saved session during settings load:', sessionResult.chatSessions[pageUrl]);
              sessionData = sessionResult.chatSessions[pageUrl];
              chatHistory = sessionData.messages || [];
              initialSuggestionsShown = sessionData.suggestionsShown || false;
              currentPageSuggestions = sessionData.cachedSuggestions || null;
            }
            resolve();
          });
        });
      } catch (error) {
        console.error('[MiCha DEBUG] Error in loadSettings:', error);
        resolve();
      }
    });
  }
  
  // Save settings to storage
  async function saveSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) {
      console.warn('Chrome storage API not available or context invalidated');
      return;
    }
    
    try {
      chrome.storage.sync.set({ [STORAGE_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('[MiCha DEBUG] Failed to save settings:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('[MiCha DEBUG] Error saving settings:', error);
    }
  }
  
  // Check if site is blacklisted
  async function isBlacklisted() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) {
      return false;
    }
    
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get('blacklist', (result) => {
          if (!chrome.runtime?.id) {
            console.warn('[MiCha DEBUG] Context invalidated during blacklist check');
            resolve(false);
            return;
          }
          
          if (chrome.runtime.lastError) {
            console.error('[MiCha DEBUG] Error checking blacklist:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          
          const blacklist = result.blacklist || [];
          const domain = window.location.hostname;
          resolve(blacklist.includes(domain));
        });
      } catch (error) {
        console.error('[MiCha DEBUG] Error in isBlacklisted:', error);
        resolve(false);
      }
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
    
    console.log('MiCha: Initializing...');
    
    // Load settings
    await loadSettings();
    
    console.log('MiCha: Settings loaded', settings);
    
    // Check if enabled and not blacklisted
    const blacklisted = await isBlacklisted();
    
    console.log('MiCha: Enabled:', settings.enabled, 'Blacklisted:', blacklisted);
    
    if (settings.enabled && !blacklisted) {
      injectWidget();
      console.log('MiCha: Widget injected');
      
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
  if (chrome.storage && chrome.storage.onChanged && chrome.runtime?.id) {
    chrome.storage.onChanged.addListener((changes) => {
      // Check if context is still valid
      if (!chrome.runtime?.id) {
        console.warn('[MiCha DEBUG] Context invalidated in storage change listener');
        return;
      }
      
      if (changes[STORAGE_KEY]) {
        settings = { ...settings, ...changes[STORAGE_KEY].newValue };
        
        // Update language if changed
        if (widget && settings.language) {
          // Update the placeholder text
          const input = widget.querySelector('.uwa-input');
          if (input) {
            input.placeholder = getTranslation('placeholder');
          }
          
          // Clear all messages and show new welcome in new language
          const messages = widget.querySelector('.uwa-messages');
          if (messages) {
            messages.innerHTML = ''; // Clear all existing messages
            suggestionsLoading = false; // Reset flag when clearing messages
            initialSuggestionsShown = false; // Reset so new language suggestions can show
            
            // Clear session data for this page when language changes
            chatHistory = [];
            sessionData = {
              suggestionsShown: false,
              messages: [],
              lastUpdated: Date.now()
            };
            saveChatSession();
            
            showInitialSuggestions(); // Show new welcome and suggestions in new language
          }
        }
        
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
