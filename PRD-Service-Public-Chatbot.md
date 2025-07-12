# Product Requirements Document (PRD)
## Service Public Chatbot Integration Project

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
Service Public Assistant - Chatbot Integration

### 1.2 Project Objective
Integrate an AI-powered chatbot assistant across all pages of the Service Public website (www.service-public.fr) to provide real-time assistance to French citizens accessing government services. The solution leverages Jina AI for intelligent page content extraction and Albert LLM (French government's language model) for contextual responses.

### 1.3 Business Context
- **Client**: French Government / Service Public
- **Problem**: Citizens need contextual assistance while navigating government services
- **Solution**: Floating chatbot powered by Jina AI + Albert LLM accessible on every Service Public page
- **Impact**: Improved citizen experience with context-aware responses and reduced support burden

### 1.4 Success Criteria
- Chatbot appears on 100% of Service Public pages
- Zero interference with existing site functionality
- < 2 second load time for chatbot initialization
- Mobile and desktop compatibility
- Secure communication with chat backend

---

## 2. TECHNICAL CONSTRAINTS & CHALLENGES

### 2.1 Primary Challenge: CORS Restrictions
**Issue**: Service Public implements X-Frame-Options headers preventing iframe embedding
**Impact**: Direct proxy/iframe approach is not feasible
**Solution**: Client-side injection methods required

### 2.2 No Backend Access
**Constraint**: No access to Service Public's server-side code
**Implication**: All solutions must be client-side or external

### 2.3 Government Security Requirements
- Must comply with French government security standards
- No data leakage to third parties
- Secure communication protocols only

---

## 3. RECOMMENDED SOLUTION ARCHITECTURES

## 3.1 PRIMARY SOLUTION: Browser Extension

### Architecture Overview
```
User Browser → Chrome Extension → Service Public Pages → Chat Backend API → Jina AI + Albert LLM
```

### Components:
1. **Chrome Extension** (Manifest V3)
2. **Content Script** (Injection logic)
3. **Chat Widget** (UI Component)
4. **Backend API** (Chat processing with Jina + Albert integration)
5. **Jina AI Service** (Page content extraction to markdown)
6. **Albert LLM** (French government's AI for contextual responses)

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
  "name": "Assistant Service Public",
  "version": "1.0.0",
  "description": "Assistant IA pour Service Public",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://www.service-public.fr/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.service-public.fr/*"],
      "js": ["content.js"],
      "css": ["chatbot.css"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Assistant Service Public"
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
// Core injection logic
- Detect Service Public pages
- Inject chatbot HTML/CSS
- Initialize chat functionality
- Handle message routing
- Manage widget state
- Context detection (current page/service)
```

#### 3.1.4 Chat Widget Specifications

**Visual Design:**
- Floating button: 56px diameter, French government blue (#0070f3)
- Widget size: 350px × 450px (desktop), responsive on mobile
- Position: Fixed bottom-right (20px margins)
- Z-index: 999999 (above all content)

**Functional Requirements:**
- Expandable/collapsible interface
- Message history preservation
- Typing indicators
- Error handling
- Offline message queuing

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
    "section": "detected_service_category",
    "userAgent": "browser_info"
  },
  "sessionId": "unique_session_identifier"
}

// Backend will:
// 1. Use Jina to extract page content: https://r.jina.ai/{context.url}
// 2. Send to Albert LLM with page context + user query
// 3. Return contextual response
```

**Backend Processing Flow:**
1. Receive user message and page URL
2. Call Jina API: `https://r.jina.ai/{pageUrl}` to get markdown content
3. Prepare Albert LLM prompt with:
   - Extracted page content (markdown)
   - User's question
   - Instruction to answer based on page context
4. Call Albert API with configuration:
   - Endpoint: `https://albert.api.etalab.gouv.fr/v1`
   - Model: `albert-large`
   - Include API key from environment
5. Return Albert's response to user

## 3.2 ALTERNATIVE SOLUTION: Bookmarklet

### Use Case
For users who cannot install extensions or as a fallback option.

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
  if (window.servicePublicChatbotInjected) return;
  window.servicePublicChatbotInjected = true;

  // Configuration
  const CONFIG = {
    API_ENDPOINT: 'https://chat-api.service-public.fr/api/chat',
    WIDGET_ID: 'sp-chatbot-widget',
    BUTTON_ID: 'sp-chatbot-button'
  };

  // Create chatbot HTML structure
  const createChatbotHTML = () => `
    <div id="${CONFIG.WIDGET_ID}" class="sp-chatbot-container">
      <div id="${CONFIG.BUTTON_ID}" class="sp-chatbot-button" role="button" tabindex="0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div class="sp-chatbot-widget" id="sp-widget-panel" style="display: none;">
        <div class="sp-header">
          <div class="sp-header-content">
            <span class="sp-title">Assistant Service Public</span>
            <div class="sp-status">🟢 En ligne</div>
          </div>
          <button class="sp-close-btn" id="sp-close-btn" aria-label="Fermer">×</button>
        </div>
        <div class="sp-messages" id="sp-messages">
          <div class="sp-message sp-bot-message">
            <div class="sp-message-content">
              Bonjour ! Je suis votre assistant Service Public. Comment puis-je vous aider aujourd'hui ?
            </div>
            <div class="sp-timestamp">${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</div>
          </div>
        </div>
        <div class="sp-typing" id="sp-typing" style="display: none;">
          <div class="sp-typing-indicator">
            <span></span><span></span><span></span>
          </div>
          <span>Assistant écrit...</span>
        </div>
        <div class="sp-input-area">
          <input type="text" id="sp-input" placeholder="Tapez votre question..." maxlength="500" />
          <button id="sp-send-btn" aria-label="Envoyer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Initialize chatbot
  const initChatbot = () => {
    // Inject HTML
    const container = document.createElement('div');
    container.innerHTML = createChatbotHTML();
    document.body.appendChild(container);

    // Get DOM elements
    const button = document.getElementById(CONFIG.BUTTON_ID);
    const widget = document.getElementById('sp-widget-panel');
    const closeBtn = document.getElementById('sp-close-btn');
    const input = document.getElementById('sp-input');
    const sendBtn = document.getElementById('sp-send-btn');
    const messages = document.getElementById('sp-messages');

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
      messageDiv.className = `sp-message sp-${sender}-message`;
      messageDiv.innerHTML = `
        <div class="sp-message-content">${content}</div>
        <div class="sp-timestamp">${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</div>
      `;
      messages.appendChild(messageDiv);
      messages.scrollTop = messages.scrollHeight;
    };

    const showTyping = (show) => {
      const typing = document.getElementById('sp-typing');
      typing.style.display = show ? 'flex' : 'none';
      if (show) {
        messages.scrollTop = messages.scrollHeight;
      }
    };

    const getPageContext = () => {
      return {
        url: window.location.href,
        title: document.title,
        section: detectServiceSection(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
    };

    const detectServiceSection = () => {
      const url = window.location.pathname;
      if (url.includes('/particuliers')) return 'particuliers';
      if (url.includes('/entreprises')) return 'entreprises';
      if (url.includes('/associations')) return 'associations';
      return 'general';
    };

    const generateSessionId = () => {
      return 'sp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

    // Initialize
    console.log('Service Public Chatbot initialized');
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
```

#### C. Chatbot.css (Styling)
```css
/* Service Public Chatbot Styles */
.sp-chatbot-container {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  z-index: 999999 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
}

.sp-chatbot-button {
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

.sp-chatbot-button:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 6px 25px rgba(0, 112, 243, 0.4) !important;
}

.sp-chatbot-button:focus {
  outline: 2px solid #0070f3 !important;
  outline-offset: 2px !important;
}

.sp-chatbot-widget {
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

.sp-header {
  background: #0070f3 !important;
  color: white !important;
  padding: 16px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.sp-header-content {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}

.sp-title {
  font-weight: 600 !important;
  font-size: 16px !important;
}

.sp-status {
  font-size: 12px !important;
  opacity: 0.9 !important;
}

.sp-close-btn {
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

.sp-close-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.sp-messages {
  flex: 1 !important;
  padding: 16px !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}

.sp-message {
  display: flex !important;
  flex-direction: column !important;
  max-width: 85% !important;
}

.sp-user-message {
  align-self: flex-end !important;
}

.sp-bot-message {
  align-self: flex-start !important;
}

.sp-message-content {
  padding: 12px 16px !important;
  border-radius: 18px !important;
  line-height: 1.4 !important;
  word-wrap: break-word !important;
}

.sp-user-message .sp-message-content {
  background: #0070f3 !important;
  color: white !important;
}

.sp-bot-message .sp-message-content {
  background: #f1f3f4 !important;
  color: #333 !important;
}

.sp-timestamp {
  font-size: 11px !important;
  color: #666 !important;
  margin-top: 4px !important;
  text-align: right !important;
}

.sp-bot-message .sp-timestamp {
  text-align: left !important;
}

.sp-typing {
  padding: 16px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  color: #666 !important;
  font-size: 12px !important;
  border-top: 1px solid #e1e5e9 !important;
}

.sp-typing-indicator {
  display: flex !important;
  gap: 2px !important;
}

.sp-typing-indicator span {
  width: 4px !important;
  height: 4px !important;
  background: #666 !important;
  border-radius: 50% !important;
  animation: sp-typing-animation 1.4s infinite ease-in-out !important;
}

.sp-typing-indicator span:nth-child(1) {
  animation-delay: -0.32s !important;
}

.sp-typing-indicator span:nth-child(2) {
  animation-delay: -0.16s !important;
}

@keyframes sp-typing-animation {
  0%, 80%, 100% {
    transform: scale(0) !important;
  }
  40% {
    transform: scale(1) !important;
  }
}

.sp-input-area {
  padding: 16px !important;
  border-top: 1px solid #e1e5e9 !important;
  display: flex !important;
  gap: 8px !important;
  background: white !important;
}

.sp-input-area input {
  flex: 1 !important;
  padding: 12px 16px !important;
  border: 1px solid #e1e5e9 !important;
  border-radius: 24px !important;
  outline: none !important;
  font-size: 14px !important;
  font-family: inherit !important;
}

.sp-input-area input:focus {
  border-color: #0070f3 !important;
  box-shadow: 0 0 0 3px rgba(0, 112, 243, 0.1) !important;
}

.sp-input-area button {
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

.sp-input-area button:hover {
  background: #0051cc !important;
}

.sp-input-area button:disabled {
  background: #ccc !important;
  cursor: not-allowed !important;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .sp-chatbot-widget {
    width: calc(100vw - 40px) !important;
    height: 70vh !important;
    max-height: 500px !important;
  }
  
  .sp-chatbot-container {
    bottom: 10px !important;
    right: 10px !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .sp-chatbot-button {
    border: 2px solid white !important;
  }
  
  .sp-chatbot-widget {
    border: 2px solid #000 !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .sp-chatbot-button {
    transition: none !important;
  }
  
  .sp-chatbot-button:hover {
    transform: none !important;
  }
  
  .sp-typing-indicator span {
    animation: none !important;
  }
}
```

### Step 3: Background Script (Optional)
```javascript
// background.js - Service worker for extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Service Public Assistant installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trackEvent') {
    // Handle analytics or logging
    console.log('Event tracked:', request.event);
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
    .settings {
      border-top: 1px solid #eee;
      padding-top: 15px;
      margin-top: 15px;
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
    <h3>Assistant Service Public</h3>
  </div>
  
  <div class="status">
    <div class="status-indicator"></div>
    <span>Extension active</span>
  </div>
  
  <p>L'assistant apparaît automatiquement sur les pages Service Public.</p>
  
  <div class="settings">
    <button id="testBtn">Tester sur Service Public</button>
    <button id="settingsBtn">Paramètres</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
document.getElementById('testBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.service-public.fr' });
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  // Open settings page or show configuration options
  console.log('Settings clicked');
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
✓ Extension loads on Service Public pages
✓ Chatbot button appears in correct position
✓ Widget opens/closes properly
✓ Messages send and receive
✓ Mobile responsiveness works
✓ No conflicts with existing page content
✓ Performance impact is minimal
✓ Error handling works correctly
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
  const prompt = `Tu es un assistant pour le site Service Public français. Tu dois aider les citoyens à naviguer et comprendre les services gouvernementaux.

Context de la page actuelle:
URL: ${context.url}
Section: ${context.section}

Contenu de la page (extrait par Jina):
${pageContent ? pageContent.substring(0, 3000) : 'Contenu non disponible'}

Question de l'utilisateur: ${userMessage}

Instructions:
1. Réponds en français de manière claire et concise
2. Base ta réponse sur le contenu de la page actuelle
3. Si l'information n'est pas sur la page, indique-le poliment
4. Suggère des liens pertinents si nécessaire
5. Reste professionnel et factuel

Réponse:`;

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

// Generate follow-up suggestions
function generateSuggestions(response) {
  // Basic implementation - can be enhanced with NLP
  const suggestions = [];
  
  if (response.includes('entreprise')) {
    suggestions.push('Quelles sont les étapes détaillées ?');
    suggestions.push('Quels documents sont nécessaires ?');
  }
  
  if (response.includes('délai') || response.includes('temps')) {
    suggestions.push('Combien de temps cela prend-il ?');
  }
  
  if (response.includes('coût') || response.includes('prix')) {
    suggestions.push('Quels sont les coûts associés ?');
  }
  
  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push('Puis-je avoir plus de détails ?');
    suggestions.push('Où trouver cette information ?');
    suggestions.push('Qui contacter pour de l'aide ?');
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