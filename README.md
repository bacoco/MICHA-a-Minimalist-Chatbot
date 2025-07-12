# 🌐 Universal Web Assistant

> AI-powered browser extension that provides contextual help on ANY website using Jina AI + Albert LLM

![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

## ✨ What is it?

Universal Web Assistant is a Chrome extension that adds an AI assistant to every website you visit. It understands the content of the page you're viewing and can answer questions, provide summaries, explain concepts, and help you navigate - all powered by cutting-edge AI technology.

### 🎯 Key Features

- **Works Everywhere**: Functions on any website without configuration
- **Smart Context**: Automatically adapts to different types of sites (news, shopping, docs, etc.)
- **Multi-language**: Responds in the language of the page
- **Privacy First**: No data collection, all preferences stored locally
- **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+A`
- **Site Control**: Enable/disable per domain as needed

## 🚀 Quick Start Guide (5 minutes)

### Prerequisites
- Node.js 18+ installed
- Chrome browser
- Albert API key (free from [albert.api.etalab.gouv.fr](https://albert.api.etalab.gouv.fr))

### Step 1: Clone & Setup Backend
```bash
# Clone the repository
git clone https://github.com/bacoco/Chat_service_public.git
cd chat-service-public

# Install dependencies
npm install
cd backend
npm install

# Configure API key
cp .env.example .env
# Edit .env and add your Albert API key:
# API_KEY_ALBERT=your_key_here
```

### Step 2: Start the Backend
```bash
# From the backend directory
npm run dev
# Backend will start on http://localhost:3001
```

### Step 3: Install Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `extension` folder from the project
5. The extension icon will appear in your toolbar!

### Step 4: Test It Out!
1. Visit any website (e.g., Wikipedia, GitHub, Amazon)
2. Click the extension icon or press `Ctrl+Shift+A`
3. Ask questions like:
   - "Summarize this page"
   - "What are the main points?"
   - "Explain this in simple terms"

## 📋 Detailed Setup Instructions

### Getting an Albert API Key
1. Visit [albert.api.etalab.gouv.fr](https://albert.api.etalab.gouv.fr)
2. Click "S'inscrire" (Sign up)
3. Create an account (free)
4. Go to "API Keys" section
5. Generate a new key
6. Copy it to your `.env` file

### Environment Configuration
Create a `.env` file in the `backend` directory:
```env
PORT=3001
SERVER_URL_ALBERT=https://albert.api.etalab.gouv.fr/v1
API_KEY_ALBERT=your_actual_key_here
MODEL_ALBERT=albert-large
CACHE_TTL=3600
MAX_TOKENS=500
```

### Extension Settings
- **Position**: Choose where the chat bubble appears (bottom-right by default)
- **Theme**: Light, Dark, or Auto (follows system)
- **Blacklist**: Block specific domains via the extension popup
- **Shortcuts**: Toggle keyboard shortcuts on/off

## 🎮 How to Use

### Basic Usage
1. **Activate**: Click the bubble icon or press `Ctrl+Shift+A`
2. **Ask**: Type your question about the current page
3. **Get Help**: Receive AI-powered answers instantly

### Example Use Cases

#### On News Sites
- "Summarize this article in 3 points"
- "What's the main controversy here?"
- "Fact-check this claim"

#### On Shopping Sites
- "Compare this with similar products"
- "What do reviews say about durability?"
- "Is this a good price?"

#### On Documentation
- "Explain this concept simply"
- "Show me code examples"
- "What are the prerequisites?"

#### On GitHub
- "What does this project do?"
- "How do I install it?"
- "What are the main features?"

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│   Extension  │────▶│   Backend   │
│             │     │              │     │             │
│  Any Site   │     │  Content.js  │     │  Express    │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                                    ▼                         ▼
                              ┌──────────┐            ┌─────────────┐
                              │ Jina AI  │            │ Albert LLM  │
                              │          │            │             │
                              │ Extract  │            │  Generate   │
                              └──────────┘            └─────────────┘
```

## 🛠️ Development

### Project Structure
```
chat-service-public/
├── backend/               # Express API server
│   ├── server.js         # Main server file
│   ├── services/         # Jina & Albert integrations
│   ├── utils/            # Caching utilities
│   └── middleware/       # Logging & error handling
├── extension/            # Chrome extension
│   ├── manifest.json     # Extension config
│   ├── content.js        # Main injection script
│   ├── background.js     # Service worker
│   ├── popup.html/js     # Settings UI
│   └── styles.css        # Widget styling
└── package.json          # Workspace config
```

### Running in Development
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Extension development
# Make changes to extension files
# Reload extension in chrome://extensions/
```

### Building for Production
```bash
# Build extension ZIP
cd extension
zip -r ../universal-assistant.zip .

# Backend is ready to deploy as-is
```

## 🐛 Troubleshooting

### Extension Not Appearing
- Check if site is blacklisted in popup settings
- Reload the page after installing
- Check console for errors (F12)

### No AI Responses
- Verify backend is running (`http://localhost:3001/health`)
- Check Albert API key is valid
- Look for errors in backend console

### Widget Positioning Issues
- Some sites override CSS - try different position in settings
- Refresh page after changing position

### Performance Issues
- Backend caches Jina responses for 1 hour
- Heavy pages may take time to process
- Try disabling on resource-intensive sites

## 🔐 Privacy & Security

- **No tracking**: Zero analytics or user tracking
- **Local storage**: All preferences stored locally
- **No data collection**: We don't store your conversations
- **Open source**: Audit the code yourself

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔮 Roadmap

- [ ] Firefox extension support
- [ ] Voice input/output
- [ ] Custom AI model selection
- [ ] Conversation export feature
- [ ] Team/Enterprise features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Jina AI** for amazing content extraction
- **Albert LLM** for French language AI capabilities
- All contributors and testers

---

<p align="center">
  Made with ❤️ for a better web browsing experience
</p>

<p align="center">
  <a href="https://github.com/bacoco/Chat_service_public/issues">Report Bug</a>
  ·
  <a href="https://github.com/bacoco/Chat_service_public/issues">Request Feature</a>
  ·
  <a href="https://github.com/bacoco/Chat_service_public/discussions">Discussions</a>
</p>