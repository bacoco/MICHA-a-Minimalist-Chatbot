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

## 🚀 Getting Started

### Option 1: Quick Install (Coming Soon)
- Install from [Chrome Web Store](#)

### Option 2: Developer Setup
```bash
# Clone the repo
git clone https://github.com/bacoco/universal-web-assistant.git
cd universal-web-assistant

# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the 'extension' folder

# Start backend (for full functionality)
cd backend
npm install
npm start
```

## 🎮 How to Use

1. **Click the icon** in your browser or press `Ctrl+Shift+A`
2. **Ask anything** about the current page
3. **Get instant help** powered by AI

### Example Questions:
- "Summarize this article"
- "What are the main points?"
- "Explain this code"
- "Compare these products"
- "What's the price?"

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

## 🛠️ Technology Stack

- **Frontend**: Chrome Extension (Manifest V3)
- **Backend**: Node.js + Express
- **Content Extraction**: [Jina AI](https://jina.ai)
- **AI Model**: [Albert LLM](https://albert.api.etalab.gouv.fr) (French Government AI)
- **Languages**: JavaScript, CSS, HTML

## 📖 Documentation

- [Setup Guide](UNIVERSAL_ASSISTANT_SETUP.md) - Detailed installation instructions
- [PRD Document](PRD-Universal-Web-Assistant.md) - Full product specifications
- [API Reference](#) - Backend API documentation

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Known Issues

- Some sites with strict CSP may block the widget
- Heavy pages might slow initial load
- Video sites in fullscreen need manual toggle

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
  <a href="https://github.com/bacoco/universal-web-assistant/issues">Report Bug</a>
  ·
  <a href="https://github.com/bacoco/universal-web-assistant/issues">Request Feature</a>
  ·
  <a href="https://github.com/bacoco/universal-web-assistant/discussions">Discussions</a>
</p>