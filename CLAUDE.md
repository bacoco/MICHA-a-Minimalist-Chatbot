# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Universal Web Assistant is an AI-powered Chrome extension that provides contextual help on ANY website. It uses:
- **Jina AI** (`https://r.jina.ai/{url}`) for extracting page content as markdown
- **Albert LLM** (French government AI) for generating contextual responses
- **Chrome Extension Manifest V3** for universal website compatibility

## Key Development Commands

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Extension Development
```bash
# Build extension for production
cd extension
zip -r universal-assistant.zip .

# Load unpacked extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder
```

## Architecture & Code Structure

### High-Level Architecture
The system follows a three-tier architecture:
1. **Browser Extension** → Injects UI on all websites, detects context
2. **Backend API** → Orchestrates Jina + Albert, handles caching
3. **External Services** → Jina AI for content extraction, Albert LLM for responses

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

#### API Flow (backend/server.js)
1. Extension sends: `{ message, url, context: { siteType, language, domain } }`
2. Backend fetches page content via Jina: `GET https://r.jina.ai/{encodedUrl}`
3. Backend builds context-aware prompt for Albert with page content
4. Albert returns response adapted to site type and language
5. Backend generates smart suggestions based on response

#### Chrome Storage Structure
```javascript
{
  enabled: true,
  blacklist: ['example.com'],  // Sites where assistant is disabled
  preferences: {
    position: 'bottom-right',
    shortcuts: true,
    autoHide: false,
    theme: 'auto'
  }
}
```

### Critical Files to Understand

1. **extension/content.js**: Main injection script
   - Handles website type detection
   - Manages UI injection and positioning
   - Implements keyboard shortcuts (Ctrl+Shift+A)
   - Communicates with backend API

2. **backend/server.js**: Express API server
   - `/api/assist` endpoint orchestrates Jina + Albert
   - Implements caching for Jina responses (1hr TTL)
   - Handles context-aware prompt building

3. **extension/manifest.json**: Extension configuration
   - Uses `<all_urls>` for universal compatibility
   - Service worker for background tasks
   - Storage API for preferences

## Environment Configuration

Backend requires `.env` file:
```env
PORT=3001
SERVER_URL_ALBERT=https://albert.api.etalab.gouv.fr/v1
API_KEY_ALBERT=your_key_here  # Get from https://albert.api.etalab.gouv.fr
MODEL_ALBERT=albert-large
CACHE_TTL=3600
MAX_TOKENS=500
```

## Important Context-Aware Features

1. **Dynamic Greetings**: Different greeting messages based on site type
2. **Language Detection**: Uses `document.documentElement.lang` and responds in detected language
3. **Smart Suggestions**: Generates different follow-up questions based on site type
4. **Blacklist Management**: Users can disable assistant per domain via popup

## Testing Considerations

- Test on diverse websites (SPA, static, different CSP policies)
- Verify keyboard shortcuts work across different sites
- Ensure widget doesn't interfere with site functionality
- Test language detection and multi-language responses
- Verify performance with heavy pages

## Common Issues & Solutions

1. **Widget not appearing**: Check if domain is blacklisted in Chrome storage
2. **No responses**: Verify backend is running and Albert API key is valid
3. **CSP blocks**: Some sites with strict Content Security Policy may block the widget
4. **Performance**: Implement Jina response caching to reduce API calls