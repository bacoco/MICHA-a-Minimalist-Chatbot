# Product Requirements Document (PRD)
## Universal Web Assistant - AI-Powered Contextual Help for Any Website

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
Universal Web Assistant - Browser Extension with AI

### 1.2 Project Objective
Create a universal AI-powered web assistant that works on ANY website to provide real-time contextual help. The solution leverages Jina AI for intelligent page content extraction and Albert LLM for generating contextual responses based on the current webpage content.

### 1.3 Business Context
- **Target Users**: Anyone browsing the web who needs contextual help
- **Problem**: Users often need help understanding complex content, finding information, or navigating websites
- **Solution**: Universal floating assistant powered by Jina AI + Albert LLM that works on any website
- **Impact**: Enhanced browsing experience with instant AI-powered contextual assistance

### 1.4 Success Criteria
- Assistant works on any website without configuration
- Zero interference with existing site functionality
- < 2 second load time for assistant initialization
- Mobile and desktop compatibility
- User can enable/disable per domain
- Adapts responses based on website context

---

## 2. TECHNICAL CONSTRAINTS & CHALLENGES

### 2.1 Primary Challenge: Universal Compatibility
**Issue**: Different websites have varying structures, security policies, and content types
**Impact**: Need adaptive content extraction and injection methods
**Solution**: Smart detection and flexible UI positioning

### 2.2 Dynamic Content Handling
**Constraint**: Modern websites use dynamic loading (React, Vue, Angular)
**Implication**: Must handle content that loads after initial page load
**Solution**: Mutation observers and smart content detection

### 2.3 Performance Considerations
- Must not slow down website performance
- Minimal memory footprint across multiple tabs
- Efficient content extraction without affecting user experience

---

## 3. RECOMMENDED SOLUTION ARCHITECTURES

## 3.1 PRIMARY SOLUTION: Universal Browser Extension

### Architecture Overview
```
User Browser → Chrome Extension → Any Website → Backend API → Jina AI + Albert LLM
```

### Components:
1. **Chrome Extension** (Manifest V3 - works on all sites)
2. **Content Script** (Universal injection with site detection)
3. **Assistant Widget** (Adaptive UI Component)
4. **Backend API** (Context-aware processing with Jina + Albert)
5. **Jina AI Service** (Universal page content extraction)
6. **Albert LLM** (Multi-language AI for contextual responses)

### Technical Specifications:

#### 3.1.1 Extension Structure
```
extension/
├── manifest.json          # Extension configuration
├── content.js            # Page injection script
├── chatbot.css          # Widget styling
├── background.js        # Service worker
├── popup.html           # Extension popup
├── popup.js             # Popup functionality
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

#### 3.1.2 Manifest.json Configuration
```json
{
  "manifest_version": 3,
  "name": "Universal Web Assistant",
  "version": "1.0.0",
  "description": "AI-powered assistant for any website",
  "permissions": [
    "activeTab",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["assistant.css"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Universal Web Assistant"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

#### 3.1.3 Content Script Functionality
```javascript
// Universal injection logic
- Detect website type and language
- Inject assistant HTML/CSS adaptively
- Initialize context-aware chat
- Handle message routing
- Manage widget state per domain
- Smart positioning to avoid content
- Keyboard shortcuts support
```

#### 3.1.4 Assistant Widget Specifications

**Visual Design:**
- Floating button: 56px diameter, adaptive color based on site theme
- Widget size: 350px × 450px (desktop), responsive on mobile
- Position: User-draggable, remembers position per domain
- Z-index: 999999 (above all content)
- Auto-hide on video fullscreen

**Functional Requirements:**
- Expandable/collapsible interface
- Conversation history per domain
- Multi-language typing indicators
- Smart error recovery
- Keyboard shortcuts (Ctrl+Shift+A)
- Export chat as markdown

#### 3.1.5 Backend Integration

**Architecture with Jina + Albert LLM:**
```
User Message → Extension → Backend API → Jina (Page Context) → Albert LLM → Response
```

**API Communication:**
```javascript
// API Endpoint
const API_ENDPOINT = 'https://chat-api.service-public.fr';

// Message structure sent from extension
{
  "message": "User query",
  "context": {
    "url": "current_page_url",
    "domain": "example.com",
    "siteType": "ecommerce|news|educational|developer|general",
    "language": "detected_language",
    "title": "page_title",
    "userAgent": "browser_info"
  },
  "sessionId": "unique_session_identifier",
  "preferences": {
    "responseLength": "concise|detailed",
    "tone": "formal|casual|auto"
  }
}

// Backend will:
// 1. Use Jina to extract page content: https://r.jina.ai/{context.url}
// 2. Send to Albert LLM with page context + user query
// 3. Return contextual response
```

**Backend Processing Flow:**
1. Receive user message, page URL, and detected site type
2. Call Jina API: `https://r.jina.ai/{pageUrl}` to get markdown content
3. Prepare context-aware Albert LLM prompt with:
   - Extracted page content (markdown)
   - User's question
   - Website type and language
   - Instruction to adapt tone and response style
4. Call Albert API with configuration:
   - Endpoint: `https://albert.api.etalab.gouv.fr/v1`
   - Model: `albert-large`
   - Dynamic temperature based on query type
5. Return contextual response with relevant suggestions

## 3.2 ALTERNATIVE SOLUTION: Bookmarklet

### Use Case
For users who want to try the assistant without installing an extension.

### Implementation
- Single JavaScript file that users add to bookmarks
- One-click activation on any Service Public page
- Self-contained (no external dependencies)
- Temporary (resets on page reload)

### Deployment Method
```html
<!-- Bookmarklet link -->
<a href="javascript:(function(){/* minified injection code */})();">
  📱 Assistant Service Public
</a>
```

## 3.3 ENTERPRISE SOLUTION: Proxy Server

### Architecture
```
User → Corporate Proxy → Service Public → Modified Response with Chatbot
```

### Requirements
- Government server infrastructure
- SSL certificates
- Content modification capabilities
- High availability setup

### Use Case
For government internal networks with controlled browsing.

---

## 4. DETAILED IMPLEMENTATION GUIDE

## 4.1 Phase 1: Extension Development

### Step 1: Project Setup
```bash
# Create extension directory
mkdir service-public-assistant
cd service-public-assistant

# Create required files
touch manifest.json content.js chatbot.css background.js popup.html popup.js

# Create icons directory
mkdir icons
```

### Step 2: Core Files Implementation

#### A. Manifest.json
```json
{
  "manifest_version": 3,
  "name": "Assistant Service Public",
  "version": "1.0.0",
  "description": "Assistant IA pour les services publics français",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["https://www.service-public.fr/*"],
  "content_scripts": [{
    "matches": ["https://www.service-public.fr/*"],
    "js": ["content.js"],
    "css": ["chatbot.css"],
    "run_at": "document_end"
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### B. Content.js (Injection Script)
```javascript
(function() {
  'use strict';

  // Prevent multiple injections
  if (window.universalAssistantInjected) return;
  window.universalAssistantInjected = true;

  // Configuration
  const CONFIG = {
    API_ENDPOINT: process.env.API_URL || 'http://localhost:3001/api/assist',
    WIDGET_ID: 'ua-assistant-widget',
    BUTTON_ID: 'ua-assistant-button',
    STORAGE_KEY: 'ua_preferences'
  };

  // Detect website type for context
  const detectWebsiteType = () => {
    const domain = window.location.hostname;
    const path = window.location.pathname;
    
    if (domain.includes('github.com') || domain.includes('gitlab')) return 'developer';
    if (domain.includes('wikipedia.org') || domain.includes('.edu')) return 'educational';
    if (domain.includes('amazon') || domain.includes('ebay') || domain.includes('shop')) return 'ecommerce';
    if (domain.includes('news') || domain.includes('medium.com') || domain.includes('blog')) return 'article';
    if (domain.includes('youtube') || domain.includes('vimeo')) return 'video';
    if (domain.includes('twitter') || domain.includes('facebook') || domain.includes('linkedin')) return 'social';
    return 'general';
  };

  // Get contextual greeting based on site type
  const getGreeting = () => {
    const siteType = detectWebsiteType();
    const greetings = {
      developer: "Hi! I can help you understand this code, documentation, or technical concepts.",
      educational: "Hello! Need help understanding this content or finding specific information?",
      ecommerce: "Hi! I can help you find product details, compare items, or understand policies.",
      article: "Hello! I can summarize this article, explain concepts, or answer questions about it.",
      video: "Hi! I can help explain video content or find specific moments you're looking for.",
      social: "Hello! I can help you understand posts, find information, or navigate this platform.",
      general: "Hi! I'm your AI assistant. Ask me anything about this page!"
    };
    return greetings[siteType] || greetings.general;
  };

  // Detect page language
  const detectLanguage = () => {
    return document.documentElement.lang || navigator.language || 'en';
  };

  // Create assistant HTML structure
  const createAssistantHTML = () => `
    <div id="${CONFIG.WIDGET_ID}" class="ua-assistant-container">
      <div id="${CONFIG.BUTTON_ID}" class="ua-assistant-button" role="button" tabindex="0" title="AI Assistant (Ctrl+Shift+A)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <div class="ua-assistant-widget" id="ua-widget-panel" style="display: none;">
        <div class="ua-header">
          <div class="ua-header-content">
            <span class="ua-title">AI Assistant</span>
            <div class="ua-status">🟢 Ready</div>
          </div>
          <button class="ua-minimize-btn" id="ua-minimize-btn" aria-label="Minimize">_</button>
          <button class="ua-close-btn" id="ua-close-btn" aria-label="Close">×</button>
        </div>
        <div class="ua-messages" id="ua-messages">
          <div class="ua-message ua-bot-message">
            <div class="ua-message-content">
              ${getGreeting()}
            </div>
            <div class="ua-timestamp">${new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        <div class="ua-typing" id="ua-typing" style="display: none;">
          <div class="ua-typing-indicator">
            <span></span><span></span><span></span>
          </div>
          <span>AI is thinking...</span>
        </div>
        <div class="ua-input-area">
          <input type="text" id="ua-input" placeholder="Ask anything about this page..." maxlength="500" />
          <button id="ua-send-btn" aria-label="Send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Initialize assistant
  const initAssistant = () => {
    // Check if site is blacklisted
    const blacklist = JSON.parse(localStorage.getItem('ua_blacklist') || '[]');
    if (blacklist.includes(window.location.hostname)) return;

    // Inject HTML
    const container = document.createElement('div');
    container.innerHTML = createAssistantHTML();
    document.body.appendChild(container);

    // Get DOM elements
    const button = document.getElementById(CONFIG.BUTTON_ID);
    const widget = document.getElementById('ua-widget-panel');
    const closeBtn = document.getElementById('ua-close-btn');
    const minimizeBtn = document.getElementById('ua-minimize-btn');
    const input = document.getElementById('ua-input');
    const sendBtn = document.getElementById('ua-send-btn');
    const messages = document.getElementById('ua-messages');

    // State management
    let isOpen = false;
    let sessionId = generateSessionId();

    // Event handlers
    const toggleWidget = () => {
      isOpen = !isOpen;
      widget.style.display = isOpen ? 'flex' : 'none';
      if (isOpen) {
        input.focus();
        trackEvent('chatbot_opened');
      } else {
        trackEvent('chatbot_closed');
      }
    };

    const closeWidget = () => {
      isOpen = false;
      widget.style.display = 'none';
      trackEvent('chatbot_closed');
    };

    const sendMessage = async () => {
      const message = input.value.trim();
      if (!message) return;

      // Add user message to UI
      addMessage(message, 'user');
      input.value = '';

      // Show typing indicator
      showTyping(true);

      try {
        // Get page context
        const context = getPageContext();
        
        // Send to API
        const response = await fetch(CONFIG.API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            sessionId: sessionId,
            context: context
          })
        });

        if (response.ok) {
          const data = await response.json();
          addMessage(data.message, 'bot');
        } else {
          throw new Error('API Error');
        }
      } catch (error) {
        console.error('Chat API Error:', error);
        addMessage('Désolé, je rencontre des difficultés techniques. Veuillez réessayer dans quelques instants.', 'bot');
      } finally {
        showTyping(false);
      }

      trackEvent('message_sent');
    };

    const addMessage = (content, sender) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `ua-message ua-${sender}-message`;
      messageDiv.innerHTML = `
        <div class="ua-message-content">${content}</div>
        <div class="ua-timestamp">${new Date().toLocaleTimeString()}</div>
      `;
      messages.appendChild(messageDiv);
      messages.scrollTop = messages.scrollHeight;
    };

    const showTyping = (show) => {
      const typing = document.getElementById('ua-typing');
      typing.style.display = show ? 'flex' : 'none';
      if (show) {
        messages.scrollTop = messages.scrollHeight;
      }
    };

    const getPageContext = () => {
      return {
        url: window.location.href,
        domain: window.location.hostname,
        title: document.title,
        siteType: detectWebsiteType(),
        language: detectLanguage(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
    };

    const generateSessionId = () => {
      return 'ua_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    const trackEvent = (eventName) => {
      // Analytics tracking (if required)
      console.log('Event:', eventName);
    };

    // Bind events
    button.addEventListener('click', toggleWidget);
    button.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggleWidget();
    });
    closeBtn.addEventListener('click', closeWidget);
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Keyboard shortcut support
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleWidget();
      }
    });

    // Initialize
    console.log('Universal Web Assistant initialized for', window.location.hostname);
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssistant);
  } else {
    initAssistant();
  }
})();
```

#### C. assistant.css (Styling)
```css
/* Universal Assistant Styles */
.ua-assistant-container {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  z-index: 999999 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
}

/* Make widget draggable */
.ua-assistant-container.dragging {
  cursor: move !important;
}

.ua-assistant-button {
  width: 56px !important;
  height: 56px !important;
  background: #0070f3 !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
  cursor: pointer !important;
  box-shadow: 0 4px 20px rgba(0, 112, 243, 0.3) !important;
  transition: all 0.3s ease !important;
  border: none !important;
  outline: none !important;
}

.ua-assistant-button:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 6px 25px rgba(0, 112, 243, 0.4) !important;
}

.ua-assistant-button:focus {
  outline: 2px solid #0070f3 !important;
  outline-offset: 2px !important;
}

.ua-assistant-widget {
  position: absolute !important;
  bottom: 70px !important;
  right: 0 !important;
  width: 350px !important;
  height: 500px !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid #e1e5e9 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.ua-header {
  background: #0070f3 !important;
  color: white !important;
  padding: 16px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.ua-header-content {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}

.ua-title {
  font-weight: 600 !important;
  font-size: 16px !important;
}

.ua-status {
  font-size: 12px !important;
  opacity: 0.9 !important;
}

.ua-close-btn {
  background: none !important;
  border: none !important;
  color: white !important;
  font-size: 24px !important;
  cursor: pointer !important;
  padding: 0 !important;
  width: 30px !important;
  height: 30px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 4px !important;
}

.ua-close-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.ua-messages {
  flex: 1 !important;
  padding: 16px !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}

.ua-message {
  display: flex !important;
  flex-direction: column !important;
  max-width: 85% !important;
}

.ua-user-message {
  align-self: flex-end !important;
}

.ua-bot-message {
  align-self: flex-start !important;
}

.ua-message-content {
  padding: 12px 16px !important;
  border-radius: 18px !important;
  line-height: 1.4 !important;
  word-wrap: break-word !important;
}

.ua-user-message .ua-message-content {
  background: #0070f3 !important;
  color: white !important;
}

.ua-bot-message .ua-message-content {
  background: #f1f3f4 !important;
  color: #333 !important;
}

.ua-timestamp {
  font-size: 11px !important;
  color: #666 !important;
  margin-top: 4px !important;
  text-align: right !important;
}

.ua-bot-message .ua-timestamp {
  text-align: left !important;
}

.ua-typing {
  padding: 16px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  color: #666 !important;
  font-size: 12px !important;
  border-top: 1px solid #e1e5e9 !important;
}

.ua-typing-indicator {
  display: flex !important;
  gap: 2px !important;
}

.ua-typing-indicator span {
  width: 4px !important;
  height: 4px !important;
  background: #666 !important;
  border-radius: 50% !important;
  animation: ua-typing-animation 1.4s infinite ease-in-out !important;
}

.ua-typing-indicator span:nth-child(1) {
  animation-delay: -0.32s !important;
}

.ua-typing-indicator span:nth-child(2) {
  animation-delay: -0.16s !important;
}

@keyframes ua-typing-animation {
  0%, 80%, 100% {
    transform: scale(0) !important;
  }
  40% {
    transform: scale(1) !important;
  }
}

.ua-input-area {
  padding: 16px !important;
  border-top: 1px solid #e1e5e9 !important;
  display: flex !important;
  gap: 8px !important;
  background: white !important;
}

.ua-input-area input {
  flex: 1 !important;
  padding: 12px 16px !important;
  border: 1px solid #e1e5e9 !important;
  border-radius: 24px !important;
  outline: none !important;
  font-size: 14px !important;
  font-family: inherit !important;
}

.ua-input-area input:focus {
  border-color: #0070f3 !important;
  box-shadow: 0 0 0 3px rgba(0, 112, 243, 0.1) !important;
}

.ua-input-area button {
  background: #0070f3 !important;
  color: white !important;
  border: none !important;
  padding: 12px !important;
  border-radius: 50% !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 44px !important;
  height: 44px !important;
  transition: background-color 0.2s ease !important;
}

.ua-input-area button:hover {
  background: #0051cc !important;
}

.ua-input-area button:disabled {
  background: #ccc !important;
  cursor: not-allowed !important;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .ua-assistant-widget {
    width: calc(100vw - 40px) !important;
    height: 70vh !important;
    max-height: 500px !important;
  }
  
  .ua-assistant-container {
    bottom: 10px !important;
    right: 10px !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .ua-assistant-button {
    border: 2px solid white !important;
  }
  
  .ua-assistant-widget {
    border: 2px solid #000 !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .ua-assistant-button {
    transition: none !important;
  }
  
  .ua-assistant-button:hover {
    transform: none !important;
  }
  
  .ua-typing-indicator span {
    animation: none !important;
  }
}
```

### Step 3: Background Script (Optional)
```javascript
// background.js - Service worker for extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Universal Web Assistant installed');
  
  // Initialize default settings
  chrome.storage.sync.set({
    enabled: true,
    blacklist: [],
    preferences: {
      position: 'bottom-right',
      shortcuts: true,
      autoHide: false
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trackEvent') {
    console.log('Event tracked:', request.event);
  }
  
  if (request.action === 'toggleBlacklist') {
    // Toggle domain in blacklist
    chrome.storage.sync.get(['blacklist'], (result) => {
      const blacklist = result.blacklist || [];
      const domain = request.domain;
      const index = blacklist.indexOf(domain);
      
      if (index > -1) {
        blacklist.splice(index, 1);
      } else {
        blacklist.push(domain);
      }
      
      chrome.storage.sync.set({ blacklist });
      sendResponse({ blacklisted: index === -1 });
    });
    return true;
  }
});
```

### Step 4: Popup Interface
```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 300px;
      padding: 20px;
      font-family: system-ui;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 15px;
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00ff00;
    }
    .current-site {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .toggle {
      display: flex;
      align-items: center;
      margin-top: 8px;
      cursor: pointer;
    }
    .toggle input {
      margin-right: 8px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      padding: 15px 0;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
    }
    .stat-item {
      text-align: center;
    }
    .stat-label {
      display: block;
      font-size: 12px;
      color: #666;
    }
    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #0070f3;
    }
    .settings {
      padding-top: 15px;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #0070f3;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 10px;
    }
    button:hover {
      background: #0051cc;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>Universal Web Assistant</h3>
  </div>
  
  <div class="status">
    <div class="status-indicator"></div>
    <span id="status-text">Extension active</span>
  </div>
  
  <div class="current-site">
    <strong>Current site:</strong> <span id="current-domain">Loading...</span>
    <label class="toggle">
      <input type="checkbox" id="site-toggle" checked>
      <span>Enable on this site</span>
    </label>
  </div>
  
  <div class="stats">
    <div class="stat-item">
      <span class="stat-label">Active sites:</span>
      <span class="stat-value" id="active-sites">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Questions asked:</span>
      <span class="stat-value" id="questions-count">0</span>
    </div>
  </div>
  
  <div class="settings">
    <button id="manageBtn">Manage Sites</button>
    <button id="shortcutsBtn">Keyboard Shortcuts</button>
    <button id="clearBtn">Clear History</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const domain = new URL(tab.url).hostname;
  
  // Update UI with current domain
  document.getElementById('current-domain').textContent = domain;
  
  // Load settings and update UI
  chrome.storage.sync.get(['blacklist', 'stats'], (result) => {
    const blacklist = result.blacklist || [];
    const stats = result.stats || { activeSites: 0, questionsCount: 0 };
    
    // Update toggle based on blacklist
    const siteToggle = document.getElementById('site-toggle');
    siteToggle.checked = !blacklist.includes(domain);
    
    // Update stats
    document.getElementById('active-sites').textContent = stats.activeSites;
    document.getElementById('questions-count').textContent = stats.questionsCount;
  });
  
  // Handle site toggle
  document.getElementById('site-toggle').addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      action: 'toggleBlacklist',
      domain: domain
    }, (response) => {
      // Update status
      const statusText = document.getElementById('status-text');
      statusText.textContent = response.blacklisted ? 'Disabled on this site' : 'Extension active';
    });
  });
  
  // Handle buttons
  document.getElementById('manageBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  });
  
  document.getElementById('shortcutsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
  
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Clear all conversation history?')) {
      chrome.storage.local.clear(() => {
        document.getElementById('questions-count').textContent = '0';
      });
    }
  });
});
```

## 4.2 Phase 2: Testing & Validation

### Step 1: Local Testing
```bash
# Load extension in Chrome
1. Open Chrome -> Extensions (chrome://extensions/)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension directory
5. Navigate to www.service-public.fr
6. Verify chatbot appears and functions
```

### Step 2: Test Cases
```
✓ Extension loads on any website
✓ Assistant button appears in correct position
✓ Widget opens/closes properly with keyboard shortcuts
✓ Messages send and receive with context awareness
✓ Mobile responsiveness works across different sites
✓ No conflicts with various page layouts
✓ Performance impact is minimal on heavy sites
✓ Site blacklist/whitelist functions correctly
✓ Drag and drop widget positioning works
✓ Language detection adapts responses
```

### Step 3: Cross-browser Testing
- Chrome (primary target)
- Firefox (alternative implementation needed)
- Edge (Chromium-based, should work)
- Safari (WebKit, may need adjustments)

## 4.3 Phase 3: Backend Integration with Jina + Albert LLM

### API Architecture
```
Extension → Backend API → Jina (Page Extraction) → Albert LLM → Response
```

### API Endpoint Specification
```javascript
// POST /api/chat
{
  "message": "Comment créer une entreprise ?",
  "sessionId": "sp_1640995200_abc123",
  "context": {
    "url": "https://www.service-public.fr/entreprises",
    "title": "Entreprises - Service Public",
    "section": "entreprises",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// Response
{
  "message": "Pour créer une entreprise, vous devez...",
  "suggestions": [
    "Quelles sont les étapes ?",
    "Quels documents nécessaires ?",
    "Combien de temps ça prend ?"
  ],
  "links": [
    {
      "title": "Guide complet",
      "url": "/entreprises/creation-entreprise"
    }
  ]
}
```

### Backend Implementation (Node.js/Express)
```javascript
// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const config = {
  jina: {
    baseUrl: 'https://r.jina.ai'
  },
  albert: {
    endpoint: process.env.SERVER_URL_ALBERT || 'https://albert.api.etalab.gouv.fr/v1',
    apiKey: process.env.API_KEY_ALBERT,
    model: process.env.MODEL_ALBERT || 'albert-large'
  }
};

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, sessionId } = req.body;
    
    // Step 1: Extract page content using Jina
    const jinaUrl = `${config.jina.baseUrl}/${encodeURIComponent(context.url)}`;
    const pageContent = await extractPageContent(jinaUrl);
    
    // Step 2: Prepare prompt for Albert
    const prompt = buildPrompt(message, pageContent, context);
    
    // Step 3: Call Albert LLM
    const albertResponse = await callAlbertLLM(prompt);
    
    // Step 4: Extract suggestions and links from response
    const { reply, suggestions, links } = processAlbertResponse(albertResponse, pageContent);
    
    // Step 5: Return response
    res.json({
      message: reply,
      suggestions: suggestions,
      links: links,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      message: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Extract page content using Jina
async function extractPageContent(jinaUrl) {
  try {
    const response = await axios.get(jinaUrl, {
      headers: {
        'Accept': 'text/markdown'
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Jina extraction error:', error);
    return null;
  }
}

// Build prompt for Albert
function buildPrompt(userMessage, pageContent, context) {
  const siteType = context.siteType || 'general';
  const language = context.language || 'en';
  
  // Dynamic instructions based on site type
  const siteInstructions = {
    developer: 'Focus on technical accuracy and provide code examples when relevant.',
    educational: 'Explain concepts clearly and provide learning resources.',
    ecommerce: 'Help with product information, comparisons, and shopping guidance.',
    article: 'Summarize key points and provide insights on the content.',
    video: 'Help understand video content and find specific information.',
    social: 'Assist with platform navigation and content understanding.',
    general: 'Provide helpful, contextual assistance based on the page content.'
  };
  
  const prompt = `You are a helpful AI assistant analyzing web content. Adapt your personality and response style based on the website type.

Current page context:
- URL: ${context.url}
- Domain: ${context.domain}
- Type: ${siteType}
- Language: ${language}
- Title: ${context.title}

Page content (extracted by Jina):
${pageContent ? pageContent.substring(0, 4000) : 'Content not available'}

User question: ${userMessage}

Instructions:
1. Answer in the detected language (${language}) unless the user asks in a different language
2. Base your response on the actual page content
3. ${siteInstructions[siteType] || siteInstructions.general}
4. If information isn't on the page, say so politely and suggest where to find it
5. Be concise but thorough
6. Adapt your tone to match the website type (professional for business, casual for social, etc.)

Response:`;

  return prompt;
}

// Call Albert LLM
async function callAlbertLLM(prompt) {
  try {
    const response = await axios.post(
      `${config.albert.endpoint}/chat/completions`,
      {
        model: config.albert.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${config.albert.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Albert LLM error:', error);
    throw error;
  }
}

// Process Albert response to extract suggestions and links
function processAlbertResponse(albertResponse, pageContent) {
  // Extract main reply
  const reply = albertResponse;
  
  // Generate smart suggestions based on response
  const suggestions = generateSuggestions(albertResponse);
  
  // Extract relevant links from page content
  const links = extractRelevantLinks(pageContent, albertResponse);
  
  return { reply, suggestions, links };
}

// Generate follow-up suggestions based on context
function generateSuggestions(response, siteType) {
  const suggestions = [];
  
  // Site-specific suggestions
  const siteTypeSuggestions = {
    developer: [
      'Show me code examples',
      'What are the best practices?',
      'Are there any alternatives?'
    ],
    educational: [
      'Can you explain this in simpler terms?',
      'What are the key concepts?',
      'Do you have more examples?'
    ],
    ecommerce: [
      'Compare with similar products',
      'What are the specifications?',
      'Check availability and shipping'
    ],
    article: [
      'Summarize the main points',
      'What is the author\'s perspective?',
      'Related articles on this topic?'
    ],
    general: [
      'Tell me more about this',
      'Where can I find more information?',
      'What should I do next?'
    ]
  };
  
  // Add site-specific suggestions
  const defaultSuggestions = siteTypeSuggestions[siteType] || siteTypeSuggestions.general;
  suggestions.push(...defaultSuggestions);
  
  // Add context-based suggestions
  if (response.toLowerCase().includes('step') || response.toLowerCase().includes('process')) {
    suggestions.push('What\'s the next step?');
  }
  
  if (response.toLowerCase().includes('error') || response.toLowerCase().includes('problem')) {
    suggestions.push('How do I fix this?');
  }
  
  return suggestions.slice(0, 3);
}

// Extract relevant links from page content
function extractRelevantLinks(pageContent, response) {
  const links = [];
  
  if (!pageContent) return links;
  
  // Simple link extraction - can be enhanced
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(pageContent)) !== null) {
    const title = match[1];
    const url = match[2];
    
    // Check if link is relevant to the response
    if (response.toLowerCase().includes(title.toLowerCase()) || 
        title.toLowerCase().includes('guide') ||
        title.toLowerCase().includes('formulaire')) {
      links.push({ title, url });
    }
  }
  
  return links.slice(0, 3);
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Chat API server running on port ${PORT}`);
  console.log(`Using Albert LLM at: ${config.albert.endpoint}`);
});
```

### Environment Configuration (.env)
```env
# Server Configuration
PORT=3001

# Albert LLM Configuration (from French government)
SERVER_URL_ALBERT=https://albert.api.etalab.gouv.fr/v1
API_KEY_ALBERT=your_albert_api_key_here  # Request from Etalab
MODEL_ALBERT=albert-large
USED_ALBERT=true

# Other settings
NODE_ENV=production

# Note: Albert API keys must be requested from the French government's Etalab
# See: https://albert.api.etalab.gouv.fr for access request
```

### Backend Requirements
- Node.js with Express framework
- Integration with Jina AI for page extraction
- Albert LLM for French language processing
- Session management
- Rate limiting for API protection
- Analytics tracking
- Error logging and monitoring

## 4.4 Phase 4: Deployment

### Chrome Web Store Deployment
```
1. Create Chrome Developer account ($5 fee)
2. Prepare store listing:
   - App name: "Assistant Service Public"
   - Description: Government chatbot assistant
   - Screenshots: Extension in action
   - Category: Productivity
   - Privacy policy: Required
3. Upload extension package
4. Submit for review (1-3 days)
5. Publish to public or private groups
```

### Enterprise Deployment (Alternative)
```
1. Package extension as .crx file
2. Host on government servers
3. Deploy via Group Policy (Windows)
4. Install via MDM (Mobile Device Management)
5. Custom update server for versions
```

---

## 5. ALTERNATIVE IMPLEMENTATIONS

## 5.1 Bookmarklet Solution

### Implementation
```javascript
// Minified bookmarklet code
javascript:(function(){if(window.spChatbot)return;var d=document,s=d.createElement('style'),c=d.createElement('div');s.innerHTML='/* CSS here */';c.innerHTML='/* HTML here */';d.head.appendChild(s);d.body.appendChild(c);window.spChatbot=true;})();
```

### Deployment
- Distribute via internal websites
- Email instructions to users
- No installation required
- Works on any browser
- Temporary (resets on reload)

## 5.2 Proxy Server Solution

### Architecture
```
User Request → Proxy Server → Service Public → Modified Response
```

### Implementation Requirements
- Nginx/Apache proxy setup
- Content modification scripts
- SSL certificate management
- Load balancing for scale
- Cache management

### Configuration Example (Nginx)
```nginx
server {
    listen 443 ssl;
    server_name serviceassist.gouv.fr;
    
    location / {
        proxy_pass https://www.service-public.fr;
        proxy_set_header Host www.service-public.fr;
        
        # Modify response to inject chatbot
        sub_filter '</body>' '<script src="/chatbot.js"></script></body>';
        sub_filter_once on;
    }
    
    location /chatbot.js {
        alias /var/www/chatbot/chatbot.js;
    }
}
```

---

## 6. SECURITY & COMPLIANCE

### 6.1 Data Protection (GDPR)
- No personal data collection without consent
- Session data encryption
- Right to deletion implementation
- Privacy policy compliance
- Cookie consent management

### 6.2 Security Measures
- Content Security Policy headers
- XSS protection
- Secure API communication (HTTPS only)
- Input sanitization
- Rate limiting to prevent abuse

### 6.3 Government Standards
- Accessibility compliance (WCAG 2.1 AA)
- French language support
- Government branding guidelines
- Performance requirements
- Browser compatibility matrix

---

## 7. ANALYTICS & MONITORING

### 7.1 Key Metrics
- Extension installation rate
- Chatbot usage frequency
- User satisfaction scores
- Error rates and performance
- Most common questions

### 7.2 Implementation
```javascript
// Analytics tracking
const trackEvent = (eventName, properties) => {
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: eventName,
      properties: properties,
      timestamp: new Date().toISOString(),
      sessionId: sessionId
    })
  });
};

// Usage examples
trackEvent('chatbot_opened', { page: window.location.pathname });
trackEvent('message_sent', { messageLength: message.length });
trackEvent('suggestion_clicked', { suggestion: suggestionText });
```

---

## 8. MAINTENANCE & UPDATES

### 8.1 Version Control
- Semantic versioning (1.0.0, 1.1.0, etc.)
- Automated testing pipeline
- Staged deployment process
- Rollback procedures

### 8.2 Update Distribution
- Chrome Web Store automatic updates
- Enterprise deployment via MDM
- Notification system for major updates
- Backwards compatibility maintenance

### 8.3 Support Procedures
- User feedback collection
- Bug reporting system
- Documentation maintenance
- Training materials updates

---

## 9. BUDGET & TIMELINE

### 9.1 Development Timeline
```
Week 1-2: Extension core development
Week 3: Backend API with Jina + Albert integration
Week 4: Testing & bug fixes (especially French language responses)
Week 5: Chrome Web Store submission
Week 6: Deployment & monitoring setup
Total: 6 weeks for MVP
```

### 9.2 Resource Requirements
- 1 Front-end developer (extension)
- 1 Back-end developer (API)
- 1 DevOps engineer (deployment)
- 1 UX designer (interface)
- 1 Project manager
- 1 QA tester

### 9.3 Estimated Costs
- Development: 6 weeks × team cost
- Chrome Developer account: $5
- Server infrastructure: Monthly hosting
- SSL certificates: Annual cost
- Maintenance: Ongoing monthly cost

---

## 10. RISK MITIGATION

### 10.1 Technical Risks
- **Service Public blocks extensions**: Monitor for changes, have proxy backup
- **Browser updates break functionality**: Regular testing and updates
- **Performance impact**: Optimize code, monitor metrics
- **Security vulnerabilities**: Regular security audits

### 10.2 Business Risks
- **User adoption low**: Training and promotion campaigns
- **Support burden high**: Comprehensive documentation and FAQ
- **Compliance issues**: Legal review and approval process
- **Government policy changes**: Flexible architecture for adaptations

---

## 11. SUCCESS METRICS

### 11.1 Adoption Metrics
- Number of active installations
- Daily/monthly active users
- User retention rates
- Page coverage percentage

### 11.2 Engagement Metrics
- Messages per session
- Session duration
- User satisfaction ratings
- Problem resolution rates

### 11.3 Technical Metrics
- Load time performance
- Error rates and uptime
- API response times
- Cross-browser compatibility

---

## 12. CONCLUSION

This PRD provides a comprehensive roadmap for implementing a chatbot assistant across all Service Public pages. The solution uniquely combines:

1. **Browser Extension** for seamless integration without backend access
2. **Jina AI** for intelligent extraction of page content to markdown format
3. **Albert LLM** - the French government's own language model for accurate, context-aware responses in French

This architecture ensures:
- **Contextual Understanding**: Jina extracts the exact page content users are viewing
- **Accurate Responses**: Albert LLM provides responses based on actual page content
- **Government Compliance**: Using France's own Albert LLM ensures data sovereignty
- **Scalability**: The stateless architecture can handle high user volumes

The phased implementation approach ensures controlled deployment with proper testing and validation at each stage. Alternative solutions provide fallback options for different deployment scenarios and user requirements.

Success depends on proper execution of the technical implementation, thorough testing, and strong collaboration between development, security, and government stakeholders.

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: Quarterly

**Contacts**:
- Technical Lead: [Name]
- Project Manager: [Name]  
- Government Liaison: [Name]