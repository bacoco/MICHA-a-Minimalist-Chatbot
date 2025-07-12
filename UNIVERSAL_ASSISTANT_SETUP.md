# Universal Web Assistant Setup Guide

This guide helps you set up the Universal Web Assistant - an AI-powered browser extension that works on any website to provide contextual help using Jina AI and Albert LLM.

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/universal-web-assistant.git
cd universal-web-assistant
```

### 2. Install Extension

#### For Development:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension/` folder from this project
5. The assistant icon should appear in your browser toolbar

#### For Users:
- Install from Chrome Web Store (coming soon)
- Or download the `.crx` file from releases

### 3. Set Up Backend

#### Install Dependencies:
```bash
cd backend
npm install
```

#### Configure Environment:
Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3001

# Albert LLM Configuration
SERVER_URL_ALBERT=https://albert.api.etalab.gouv.fr/v1
API_KEY_ALBERT=your_albert_api_key_here  # Get from https://albert.api.etalab.gouv.fr
MODEL_ALBERT=albert-large
USED_ALBERT=true

# Optional: Analytics
ENABLE_ANALYTICS=false

# Environment
NODE_ENV=production
```

#### Start the Server:
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

## 📋 Configuration Options

### Extension Settings

The extension stores user preferences in Chrome storage:

```javascript
{
  enabled: true,                    // Global on/off switch
  blacklist: ['example.com'],       // Sites where assistant is disabled
  preferences: {
    position: 'bottom-right',       // Widget position
    shortcuts: true,                // Enable keyboard shortcuts
    autoHide: false,               // Auto-hide on video sites
    theme: 'auto'                  // light, dark, or auto
  }
}
```

### Backend Configuration

#### API Endpoints:
- `POST /api/assist` - Main chat endpoint
- `GET /api/health` - Health check
- `GET /api/stats` - Usage statistics

#### Environment Variables:
- `PORT` - Server port (default: 3001)
- `API_KEY_ALBERT` - Your Albert LLM API key
- `MODEL_ALBERT` - Albert model to use (default: albert-large)
- `CACHE_TTL` - Jina cache time in seconds (default: 3600)
- `MAX_TOKENS` - Max response tokens (default: 500)

## 🎯 Usage

### Basic Usage:
1. Navigate to any website
2. Click the assistant icon or press `Ctrl+Shift+A`
3. Ask questions about the page content
4. Get AI-powered contextual help

### Features:
- **Smart Context Detection**: Automatically detects website type (news, e-commerce, developer, etc.)
- **Multi-language Support**: Responds in the page's language
- **Keyboard Shortcuts**: 
  - `Ctrl+Shift+A` - Toggle assistant
  - `Esc` - Close assistant
  - `Enter` - Send message
- **Site Management**: Enable/disable per domain
- **Drag & Drop**: Position the widget anywhere
- **Export Conversations**: Save chats as markdown

## 🔧 Development

### Project Structure:
```
universal-web-assistant/
├── extension/              # Chrome extension files
│   ├── manifest.json      # Extension configuration
│   ├── content.js         # Content script
│   ├── assistant.css      # Widget styles
│   ├── background.js      # Service worker
│   └── popup.html         # Extension popup
├── backend/               # Node.js backend
│   ├── server.js         # Express server
│   ├── package.json      # Dependencies
│   └── .env.example      # Environment template
└── docs/                 # Documentation
    └── API.md           # API documentation
```

### Testing:
```bash
# Run backend tests
cd backend && npm test

# Test extension manually
1. Load unpacked extension
2. Visit test sites
3. Verify functionality
```

### Building for Production:
```bash
# Build extension
cd extension
zip -r universal-assistant.zip .

# Build backend
cd backend
npm run build
```

## 🔍 How It Works

1. **Content Injection**: Extension injects assistant widget on all pages
2. **Context Detection**: Analyzes page URL and content type
3. **User Query**: User asks question about page
4. **Jina Extraction**: Backend fetches page content via Jina AI
5. **Albert Processing**: Sends content + query to Albert LLM
6. **Contextual Response**: Returns AI-generated answer

## 🛡️ Privacy & Security

- **No Data Collection**: The assistant doesn't collect personal data
- **Local Storage Only**: Preferences stored locally in browser
- **Secure Communication**: All API calls use HTTPS
- **Open Source**: Full transparency of code

## 🐛 Troubleshooting

### Extension Not Appearing:
- Check if site is blacklisted in popup
- Verify extension is enabled
- Try refreshing the page

### No Responses:
- Check backend is running
- Verify API key is valid
- Check browser console for errors

### Performance Issues:
- Clear conversation history
- Check network connection
- Reduce max tokens in config

## 📚 API Documentation

### Chat Endpoint
```http
POST /api/assist
Content-Type: application/json

{
  "message": "What is this page about?",
  "url": "https://example.com/article",
  "context": {
    "siteType": "article",
    "language": "en",
    "title": "Page Title"
  }
}

Response:
{
  "response": "This page is about...",
  "suggestions": ["Tell me more", "Summarize key points", "Related topics"]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Jina AI** for page content extraction
- **Albert LLM** by Etalab for French government AI
- Chrome Extension APIs
- Open source community

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Support**: Create an issue on GitHub