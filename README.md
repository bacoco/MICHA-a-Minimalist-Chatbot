# 🌐 Universal Web Assistant

> Serverless AI-powered Chrome extension that provides contextual help on ANY website using Jina AI + Multiple AI Models (OpenRouter, Groq, Hugging Face, Albert, OpenAI, Anthropic, Custom)

![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.1.0-orange)

## ✨ What is it?

Universal Web Assistant is a Chrome extension that adds an AI assistant to every website you visit. It understands the content of the page you're viewing and can answer questions, provide summaries, explain concepts, and help you navigate - all powered by your choice of AI providers including OpenRouter, Groq, Hugging Face, Albert (French government AI), OpenAI, Anthropic, or custom endpoints.

### 🎯 Key Features

- **Works Everywhere**: Functions on any website without configuration
- **Multi-Model Support**: Choose from 6+ AI providers including free options (OpenRouter, Groq, Hugging Face, Albert) and premium models (OpenAI, Anthropic)
- **Smart Context**: Automatically adapts to different types of sites (news, shopping, docs, etc.)
- **Multi-language**: Responds in the language of the page
- **Privacy First**: No data collection, all preferences stored locally
- **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+A`
- **Site Control**: Enable/disable per domain as needed

### 🆕 Latest Improvements

- **Instant Start**: Pre-configured with Albert AI - works immediately after installation
- **Dynamic Model Loading**: OpenRouter models with `:free` suffix load automatically
- **French-First Interface**: Loading messages in French ("Conversion de la page, Je réfléchis...")
- **Persistent Chat**: Conversations continue across page navigation
- **Smart Provider Switching**: API key clears when changing providers for security
- **Language-Neutral UI**: Removed English status messages for better internationalization

## 🤖 Supported AI Models

The extension supports multiple AI providers to give you flexibility in choosing the model that best fits your needs:

### 🆓 Free AI Providers

#### 🌐 OpenRouter (Recommended - Free Models Available)
- **Provider**: OpenRouter aggregator platform
- **Cost**: Free tier available (10 requests/minute)
- **Best for**: Access to multiple cutting-edge models with dynamic loading
- **Models**: Automatically loads all available free models with `:free` suffix
- **Get API Key**: [openrouter.ai](https://openrouter.ai) (required)

#### ⚡ Groq (Free - High Speed)
- **Provider**: Groq inference engine
- **Cost**: Free (30 requests/minute)
- **Best for**: Ultra-fast inference, real-time responses
- **Models**: Llama 3.1 8B/70B, Mixtral 8x7B, Gemma 7B
- **Get API Key**: [console.groq.com](https://console.groq.com)

#### 🤗 Hugging Face (Free - Open Source)
- **Provider**: Hugging Face
- **Cost**: Free (1000 requests/hour)
- **Best for**: Open-source models, research applications
- **Models**: Mistral 7B, Zephyr 7B, CodeLlama 7B
- **Get API Key**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

#### 🇫🇷 Albert (Free - French Government) - Default Provider
- **Provider**: French Government AI
- **Cost**: Completely free
- **Best for**: General assistance, French language support, privacy-conscious users
- **Models**: albert-large (default), albert-base, albert-light
- **Get API Key**: [albert.api.etalab.gouv.fr](https://albert.api.etalab.gouv.fr)
- **Note**: Extension comes pre-configured with Albert for immediate use

### 💰 Premium AI Providers

#### 🧠 OpenAI (ChatGPT)
- **Provider**: OpenAI
- **Cost**: Pay-per-use
- **Best for**: Advanced reasoning, creative tasks, code generation
- **Models**: GPT-4-turbo-preview, GPT-4, GPT-3.5-turbo
- **Get API Key**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

#### 🎭 Anthropic (Claude)
- **Provider**: Anthropic
- **Cost**: Pay-per-use
- **Best for**: Nuanced responses, analysis, safety-focused interactions
- **Models**: Claude-3-opus, Claude-3-sonnet, Claude-3-haiku
- **Get API Key**: [console.anthropic.com](https://console.anthropic.com)

### 🔧 Custom Endpoint
- **Provider**: Your own or third-party
- **Cost**: Depends on provider
- **Best for**: Self-hosted models, specialized endpoints
- **Requirements**: OpenAI-compatible API format

## 🚀 Quick Start Guide (5 minutes)

### Prerequisites
- Chrome browser
- API key from your chosen AI provider:
  - **OpenRouter**: Free models available at [openrouter.ai](https://openrouter.ai) (optional API key for premium models)
  - **Groq**: Free from [console.groq.com](https://console.groq.com)
  - **Hugging Face**: Free from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
  - **Albert**: Free from [albert.api.etalab.gouv.fr](https://albert.api.etalab.gouv.fr)
  - **OpenAI**: From [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - **Anthropic**: From [console.anthropic.com](https://console.anthropic.com)
  - **Custom**: From your provider

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

### Step 3: Configure AI Provider
1. Right-click the extension icon in Chrome toolbar
2. Select "Options"
3. Choose your AI provider (OpenRouter, Groq, Hugging Face, Albert, OpenAI, Anthropic, or Custom)
4. Enter your API key (or leave blank for OpenRouter free models)
5. Select your preferred model
6. Click "Save"

### Step 4: Test It Out!
1. Visit any website (e.g., Wikipedia, GitHub, Amazon)
2. Click the extension icon or press `Ctrl+Shift+A`
3. Ask questions like:
   - "Summarize this page"
   - "What are the main points?"
   - "Explain this in simple terms"

## 📋 Detailed Setup Instructions

### Getting API Keys for Different Providers

#### OpenRouter API Key (Free Models Available - Recommended)
1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up for an account (free)
3. Go to "API Keys" section
4. Create a new key (optional for free models)
5. Copy it for use in extension settings
6. Note: No API key required for free models

#### Groq API Key (Free - High Speed)
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for an account (free)
3. Go to "API Keys" section
4. Create a new key
5. Copy it for use in extension settings
6. Note: 30 requests/minute on free tier

#### Hugging Face API Key (Free - Open Source)
1. Visit [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Sign up or log in to your Hugging Face account
3. Click "New token"
4. Select "Read" permissions
5. Copy the generated token
6. Note: 1000 requests/hour on free tier

#### Albert API Key (Free - French Government)
1. Visit [albert.api.etalab.gouv.fr](https://albert.api.etalab.gouv.fr)
2. Click "S'inscrire" (Sign up)
3. Create an account (free)
4. Go to "API Keys" section
5. Generate a new key
6. Copy it for use in extension settings

#### OpenAI API Key
1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the generated key
5. Note: Pay-per-use pricing applies

#### Anthropic API Key
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in to your Anthropic account
3. Go to "API Keys" section
4. Create a new key
5. Copy the generated key
6. Note: Pay-per-use pricing applies

### Extension Configuration
API keys are stored securely in Chrome's sync storage. Configure through:
1. Right-click extension icon → Options
2. Select your AI provider from the dropdown
3. Enter your API key
4. Optionally test the connection
5. Save settings

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
                              │ Jina AI  │                 │  AI Model   │
                              │          │                 │             │
                              │ Extract  │                 │ Albert/GPT  │
                              └──────────┘                 │ /Claude/etc │
                                                           └─────────────┘
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
- Check API key is configured in extension options
- Verify API key is valid for your chosen provider
- Test connection using the "Test Connection" button in settings
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

- [x] Multi-model AI support (OpenRouter, Groq, Hugging Face, Albert, OpenAI, Anthropic, Custom)
- [x] Dynamic model loading for OpenRouter
- [x] Default configuration with Albert AI
- [x] French-first interface with internationalization
- [ ] Firefox extension support
- [ ] Voice input/output
- [ ] Conversation export feature
- [ ] Team/Enterprise features
- [ ] Additional AI providers (Gemini, etc.)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Jina AI** for amazing content extraction
- **OpenRouter** for free access to multiple AI models
- **Groq** for ultra-fast inference capabilities
- **Hugging Face** for open-source AI models
- **Albert LLM** for free French language AI capabilities
- **OpenAI** for GPT models
- **Anthropic** for Claude models
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