# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiCha (Minimalist Chatbot) is an AI-powered Chrome extension that provides contextual help on ANY website. It uses:
- **Jina AI** (`https://r.jina.ai/{url}`) for extracting page content as markdown (with 1-hour caching)
- **Multiple AI Providers** for generating contextual responses (Albert default, OpenAI, Anthropic, Groq, etc.)
- **Chrome Extension Manifest V3** for universal website compatibility

## Key Development Commands

### Extension Development
```bash
# Build extension for production
cd extension
zip -r micha-extension.zip .

# Load unpacked extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder
```

## Architecture & Code Structure

### High-Level Architecture
The system follows a serverless architecture:
1. **Browser Extension** → Injects UI on all websites, detects context
2. **Service Worker** → Directly calls Jina + AI APIs, handles caching
3. **External Services** → Jina AI for content extraction, Multiple AI providers for responses

### Key Implementation Details

#### Website Type Detection (content.js)
The extension automatically detects website types to provide contextual responses:
- `developer`: GitHub, GitLab domains
- `educational`: Wikipedia, .edu domains  
- `ecommerce`: Amazon, eBay, shops
- `article`: News sites, Medium, blogs
- `video`: YouTube, Vimeo
- `social`: Twitter, Facebook, LinkedIn
- `general`: Everything else

#### API Flow (service-worker.js)
1. Content script sends: `{ message, url, context: { siteType, language, domain } }`
2. Service worker fetches page content via Jina: `GET https://r.jina.ai/{encodedUrl}`
3. Service worker builds context-aware prompt for selected AI provider
4. AI returns response adapted to site type and language
5. Service worker extracts follow-up questions from AI response

#### Chrome Storage Structure
```javascript
{
  enabled: true,
  blacklist: ['example.com'],  // Sites where assistant is disabled
  preferences: {
    position: 'bottom-right',
    shortcuts: true,
    autoHide: false,
    theme: 'auto',
    language: 'fr',  // User's preferred language
    isExpanded: false,
    panelWidth: 400,
    fontSize: 'medium'
  },
  modelConfig: {
    provider: 'albert',  // or 'openai', 'anthropic', 'groq', etc.
    endpoint: 'https://albert.api.etalab.gouv.fr/v1',
    model: 'albert-large',
    apiKey: 'encrypted_key_here'
  },
  chatSessions: {
    'https://example.com': {
      messages: [...],
      lastUpdated: timestamp,
      suggestionsShown: true,
      cachedSuggestions: [...]  // AI suggestions cached per page
    }
  }
}
```

### Critical Files to Understand

1. **extension/content.js**: Main injection script
   - Handles website type detection
   - Manages UI injection and positioning
   - Implements keyboard shortcuts (Ctrl+Shift+A)
   - Manages chat session persistence
   - Handles language switching
   - Caches AI suggestions per page

2. **extension/service-worker.js**: Background service worker
   - Calls Jina AI for page content extraction (with caching)
   - Supports multiple AI providers (Albert, OpenAI, Anthropic, Groq, etc.)
   - Implements caching for Jina responses (1hr TTL)
   - Extracts follow-up questions from AI responses
   - Handles API key encryption/decryption

3. **extension/manifest.json**: Extension configuration
   - Uses `<all_urls>` for universal compatibility
   - Service worker for background tasks
   - Storage API for preferences
   - Web accessible resources for logo

## Environment Configuration

The extension supports multiple AI providers. Free models are automatically proposed, but users must obtain an API key (even for free services).

### 🆓 Free AI Providers

#### Default: Albert (French Government AI)
- **Completely FREE** - No credit card required
- Get API key: https://albert.api.etalab.gouv.fr
- Right-click extension icon → Options → Enter API key
- Optimized for French and European languages

#### Groq (Free Tier)
- **FREE tier** with generous rate limits
- Get API key: https://console.groq.com
- Models: `mixtral-8x7b-32768`, `llama2-70b-4096`
- Ultra-fast inference speeds

#### Hugging Face (Free Tier)
- **FREE tier** for community models
- Get API key: https://huggingface.co/settings/tokens
- Access to open source models like Mistral, Llama, etc.

#### OpenRouter
- **Automatic free model selection**
- Get API key: https://openrouter.ai/keys
- Smart routing to available free models
- Optional pay-as-you-go for premium models

### 💳 Paid AI Providers
Configure in the Model Configuration section:
- **OpenAI**: GPT-3.5/GPT-4 models (requires payment)
- **Anthropic**: Claude models (requires payment)
- **Custom**: Any OpenAI-compatible endpoint

## Important Features

### Multilingual Support
- **7 Languages**: French, English, Spanish, German, Italian, Portuguese, Dutch
- Dynamic language detection from page
- User can chat in their language regardless of page language
- Suggestions generated in user's preferred language

### Visual Design
- **MiCha branding** with blue theme (#1E4D7B)
- Logo with 3D effect and white shadow
- Color-coded suggestions:
  - Yellow: Generic questions (4 hardcoded per language)
  - Blue: Page-specific questions (4 AI-generated)

### Performance Optimizations
- Jina responses cached for 1 hour
- AI suggestions cached per page URL
- Session persistence across minimize/maximize
- Automatic cleanup of old sessions (24hr)

### Session Management
- Chat history persists when minimizing widget
- Suggestions don't regenerate on same page
- Language change clears cache and regenerates content
- Loading messages filtered out from history

## Testing Considerations

- Test on diverse websites (SPA, static, different CSP policies)
- Verify keyboard shortcuts work across different sites
- Ensure widget doesn't interfere with site functionality
- Test language detection and multi-language responses
- Verify chat persistence when minimizing/maximizing
- Test suggestion caching behavior
- Verify logo displays correctly

## Common Issues & Solutions

1. **Widget not appearing**: Check if domain is blacklisted in Chrome storage
2. **No responses**: Verify API key is configured in extension options
3. **CSP blocks**: Some sites with strict Content Security Policy may block the widget
4. **Chat persistence**: Sessions saved per URL, cleared after 24 hours
5. **Double questions**: AI generates exactly 4 specific questions, no duplicates
6. **Loading messages stuck**: Filtered out from chat history restoration

## Recent Updates

- Renamed from "Universal Web Assistant" to "MiCha - Minimalist Chatbot"
- Added logo with 3D effect in chat header
- Fixed chat persistence issues
- Implemented suggestion caching to prevent duplicates
- Added color coding for generic vs specific questions
- Fixed loading message persistence bug
- Support for multiple AI providers