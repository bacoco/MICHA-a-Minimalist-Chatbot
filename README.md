# 🌐 Universal Web Assistant

> Serverless AI-powered Chrome extension that provides contextual help on ANY website using Jina AI + Albert LLM

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
- Chrome browser
- Albert API key (free from [albert.api.etalab.gouv.fr](https://albert.api.etalab.gouv.fr))

### Step 1: Clone & Install Extension
```bash
# Clone the repository
git clone https://github.com/bacoco/Universal_Web_Assistant.git
cd Universal_Web_Assistant
```

### Step 2: Install Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `extension` folder from the project
5. The extension icon will appear in your toolbar!

### Step 3: Configure API Key
1. Right-click the extension icon in Chrome toolbar
2. Select "Options"
3. Enter your Albert API key
4. Click "Save"

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

### Extension Configuration
The Albert API key is stored securely in Chrome's sync storage. Configure it through:
1. Right-click extension icon → Options
2. Enter your Albert API key
3. Save settings

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

## 🏗️ Architecture (Serverless)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Browser   │────▶│   Extension  │────▶│  Service Worker  │
│             │     │              │     │                  │
│  Any Site   │     │  Content.js  │     │ (Background JS)  │
└─────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │                             │
                                    ▼                             ▼
                              ┌──────────┐                 ┌─────────────┐
                              │ Jina AI  │                 │ Albert LLM  │
                              │          │                 │             │
                              │ Extract  │                 │  Generate   │
                              └──────────┘                 └─────────────┘
```

No backend server needed! The extension directly calls external APIs.

## 🛠️ Development

### Project Structure
```
Universal_Web_Assistant/
├── extension/                # Chrome extension (serverless)
│   ├── manifest.json        # Extension config
│   ├── content.js          # Main injection script
│   ├── service-worker.js   # Background script (API calls)
│   ├── popup.html/js       # Settings UI
│   ├── options.html/js     # API key configuration
│   ├── styles.css          # Widget styling
│   ├── crypto-utils.js     # Encryption utilities
│   └── supabase-utils.js   # Database utilities
├── build-extension.js      # Build script
├── CLAUDE.md              # AI assistant guidance
└── README.md              # Documentation
```

### Running in Development
```bash
# Load extension in Chrome
# Make changes to extension files
# Click reload button in chrome://extensions/
```

### Building with Default API Key (for maintainers)
If you have access to the `.env` file with the Albert API key:
```bash
# Build extension with encrypted default key
node build-extension.js

# This generates extension/default-config.js with encrypted API key
# Users can still override with their own key in settings
```

### Building for Production
```bash
# Build extension with default config (if available)
node build-extension.js

# Create extension ZIP for distribution
cd extension
zip -r universal-assistant.zip .
```

## 🐛 Troubleshooting

### Extension Not Appearing
- Check if site is blacklisted in popup settings
- Reload the page after installing
- Check console for errors (F12)

### No AI Responses
- Check Albert API key is configured in extension options
- Verify API key is valid at albert.api.etalab.gouv.fr
- Check console for errors (F12 → Console tab)

### Widget Positioning Issues
- Some sites override CSS - try different position in settings
- Refresh page after changing position

### Performance Issues
- Service worker caches Jina responses for 1 hour
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
  <a href="https://github.com/bacoco/Universal_Web_Assistant/issues">Report Bug</a>
  ·
  <a href="https://github.com/bacoco/Universal_Web_Assistant/issues">Request Feature</a>
  ·
  <a href="https://github.com/bacoco/Universal_Web_Assistant/discussions">Discussions</a>
</p>