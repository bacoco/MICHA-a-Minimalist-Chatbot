# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiCha (Minimalist Chatbot) is an AI-powered Chrome extension that provides contextual help on ANY website. It uses:
- **Jina AI** (`https://r.jina.ai/{url}`) for extracting page content as markdown (with 1-hour caching)
- **Multiple AI Providers** for generating contextual responses (Albert default, OpenAI, Anthropic, Groq, etc.)
- **Chrome Extension Manifest V3** for universal website compatibility

## Key Commands

### Build & Development
```bash
# Build extension for production
npm run build
# Or manually:
cd extension && zip -r ../micha-extension.zip .

# Development workflow:
# 1. Make changes to extension files
# 2. Reload extension in chrome://extensions/
# 3. Test on various websites
# 4. Check console for debug logs (look for [MiCha DEBUG])
```

### Load Extension in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Right-click extension icon → Options → Configure API key

## Architecture & Code Structure

### High-Level Architecture
```
User Interaction → Content Script → Service Worker → External APIs
                        ↓                ↓               ↓
                   DOM Injection    Message Passing   Jina + AI
                        ↓                ↓               ↓
                   UI Rendering    Response/Cache    Content/Chat
```

### Core Components

#### 1. Content Script (`content.js`) - ~1400 lines
- **Widget Injection**: Creates floating chat UI on all websites
- **Session Management**: Persists chat history per URL (24hr retention)
- **Language Detection**: Auto-detects page language and user preference
- **Suggestion System**: 
  - 4 hardcoded generic questions per language
  - 4 AI-generated page-specific questions (cached)
- **Keyboard Shortcuts**: Ctrl+Shift+A to toggle widget
- **State Management**: Handles minimize/maximize with full state preservation

#### 2. Service Worker (`service-worker.js`) - ~1300 lines
- **API Gateway**: Routes requests to appropriate AI provider
- **Caching Layer**: 
  - Jina responses: 1-hour TTL with hash-based keys
  - Chrome storage fallback for Supabase failures
- **Multi-Provider Support**: Handles API differences between providers
- **Security**: Encrypts/decrypts API keys using crypto-utils
- **Prompt Engineering**: Builds context-aware prompts with page content

#### 3. Configuration (`manifest.json`)
- **Permissions**: storage, tabs, contextMenus, activeTab
- **Host Permissions**: All AI provider endpoints
- **Web Accessible Resources**: Logo files for UI display

### Data Flow

1. **User Types Message**:
   ```
   content.js → sendMessage() → chrome.runtime.sendMessage({action: 'assist'})
   → service-worker.js → handleAssistRequest()
   → fetchPageContent() [checks cache] → Jina AI
   → buildPrompt() → generateAIResponse() → Selected AI Provider
   → extractFollowUpQuestions() → Return to content.js
   ```

2. **Suggestion Generation**:
   ```
   Page Load → showInitialSuggestions() → Check cached suggestions
   → If not cached: chrome.runtime.sendMessage({action: 'getSuggestions'})
   → service-worker.js → buildSuggestionsPrompt() → AI Provider
   → Cache suggestions → Display (4 yellow generic + 4 blue specific)
   ```

### Chrome Storage Structure
```javascript
{
  // Sync Storage (small, synced across devices)
  uwa_preferences: {
    enabled: true,
    language: 'fr',
    position: 'bottom-right',
    theme: 'auto',
    fontSize: 'medium',
    shortcuts: true,
    autoHide: false,
    isExpanded: false,
    panelWidth: 400
  },
  uwa_blacklist: ['example.com'],
  modelConfig: {
    provider: 'albert',
    endpoint: 'https://albert.api.etalab.gouv.fr/v1',
    model: 'albert-large',
    apiKey: 'encrypted_key'
  },
  
  // Local Storage (larger, device-specific)
  chatSessions: {
    'https://example.com': {
      messages: [{id, text, type, timestamp, suggestions}],
      lastUpdated: timestamp,
      suggestionsShown: true,
      cachedSuggestions: ['Question 1?', 'Question 2?', ...]
    }
  },
  uwa_cache_https://example.com: {
    data: 'Jina extracted content...',
    expires: timestamp
  }
}
```

### Security & Encryption

- **API Keys**: Encrypted using Web Crypto API (AES-GCM)
- **Key Derivation**: PBKDF2 with salt from extension ID
- **Storage**: Encrypted keys in Chrome sync storage
- **Supabase**: Optional integration with row-level security

### AI Provider Integration

Each provider requires specific request formatting:

```javascript
// Albert (Default - Free)
{
  endpoint: 'https://albert.api.etalab.gouv.fr/v1/chat/completions',
  headers: { Authorization: 'Bearer API_KEY' },
  body: { model: 'albert-large', messages: [...], max_tokens: 500 }
}

// OpenRouter (Auto-selects free models)
{
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  headers: { Authorization: 'Bearer API_KEY', 'HTTP-Referer': 'chrome-extension://...' }
}

// Anthropic (Different format)
{
  endpoint: 'https://api.anthropic.com/v1/messages',
  headers: { 'x-api-key': 'API_KEY', 'anthropic-version': '2023-06-01' },
  body: { model: 'claude-3-haiku', messages: [...], max_tokens: 500 }
}
```

### Critical Implementation Details

#### Language System
- **Supported**: FR, EN, ES, DE, IT, PT, NL
- **Detection Order**: User preference → Page language → Browser language → Default (FR)
- **Dynamic Switching**: Clears cache and regenerates content

#### Performance Optimizations
- **Debouncing**: Input handling and resize events
- **Lazy Loading**: Suggestions only generated when widget opened
- **Cache Strategy**: URL-based for Jina, page-based for suggestions
- **Session Cleanup**: Automatic removal after 24 hours

#### Error Handling
- **Extension Context**: Validates chrome.runtime?.id before API calls
- **Network Failures**: Graceful degradation with user-friendly messages
- **API Key Issues**: Specific error messages per provider
- **Loading States**: Filtered from history to prevent persistence

### Testing Considerations

1. **Multi-Site Testing**: 
   - SPAs (React, Vue)
   - Static sites
   - Sites with strict CSP
   - Sites with iframes

2. **State Persistence**:
   - Minimize/maximize retention
   - Page reload behavior
   - Language switching

3. **Edge Cases**:
   - No API key configured
   - Network failures
   - Large page content (>2MB)
   - Rapid language switching

### Common Debugging

1. **Console Debugging**: Look for `[MiCha DEBUG]` prefixed logs
2. **Storage Inspection**: chrome.storage.local.get() in extension console
3. **Message Passing**: Monitor chrome.runtime.onMessage in service worker
4. **Cache Validation**: Check uwa_cache_* keys in local storage

### Recent Feature Additions

- **Logo Integration**: 3D effect with white shadow on blue gradient
- **Color-Coded Suggestions**: Yellow (generic) vs Blue (page-specific)
- **Session Persistence**: Full chat history across minimize/maximize
- **Loading Message Filtering**: Prevents "Je réfléchis..." from persisting
- **Multi-Provider Support**: Seamless switching between AI models
- **OpenRouter Integration**: Automatic free model selection

### File-Specific Notes

- **crypto-utils.js**: Handles all encryption/decryption operations
- **supabase-utils.js**: Optional Supabase integration with hash-based caching
- **default-config.js**: Contains encrypted default API key (if configured)
- **options-new.js**: Settings page with model configuration UI

## Important Constraints

- **Manifest V3**: No inline scripts, service worker instead of background page
- **CSP Restrictions**: Some sites may block extension functionality
- **Storage Limits**: Chrome sync storage limited to 100KB total
- **API Rate Limits**: Varies by provider (Albert unlimited, others have limits)