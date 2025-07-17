# MiCha Mobile Application

This document provides comprehensive guidance for developing and maintaining the MiCha mobile applications.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- For iOS: Xcode 14+, macOS 13+
- For Android: Android Studio, JDK 11+
- React Native CLI: `npm install -g react-native-cli`

### Setup

```bash
# Clone and setup
cd mobile/react-native
npm install

# iOS setup
cd ios && pod install && cd ..

# Run iOS
npx react-native run-ios

# Run Android
npx react-native run-android
```

## 📱 Architecture Overview

### High-Level Architecture
```
User Interaction → Native UI → Share Extension → Content Processing
                      ↓             ↓                    ↓
                 Chat Interface  App Groups      Jina AI + OCR
                      ↓             ↓                    ↓
                 Local Storage  API Service       AI Providers
```

### Core Components

#### 1. Share Extension
- **iOS**: Action Extension in Swift
- **Android**: Intent Filter for ACTION_SEND
- **Handles**: URLs, Text, Images, Files

#### 2. Content Processing
```javascript
// Shared content processor
async function processSharedContent(content) {
  switch (content.type) {
    case 'url':
      return await fetchPageContent(content.data);
    case 'image':
      return await extractTextFromImage(content.data);
    case 'text':
      return content.data;
    case 'file':
      return await processDocument(content.data);
  }
}
```

#### 3. AI Service Layer
Reuses the extension's AI provider logic:
- Multiple provider support (Albert, OpenAI, Anthropic, etc.)
- Automatic retry and fallback
- Response caching

## 🛠️ Development Guide

### Project Structure
```
mobile/
├── shared/                     # Shared business logic
│   ├── api/
│   │   ├── AIProvider.ts      # Base AI provider interface
│   │   ├── AlbertProvider.ts  # Albert implementation
│   │   ├── JinaService.ts     # Page content extraction
│   │   └── OCRService.ts      # Image text extraction
│   ├── services/
│   │   ├── StorageService.ts  # Encrypted storage
│   │   ├── CacheService.ts    # Response caching
│   │   └── AnalyticsService.ts
│   ├── models/
│   │   ├── Message.ts
│   │   ├── Session.ts
│   │   └── Settings.ts
│   └── utils/
│       ├── crypto.ts          # Encryption utilities
│       └── languages.ts       # Language detection
├── react-native/              # React Native app
│   ├── src/
│   │   ├── screens/          # App screens
│   │   ├── components/       # Reusable components
│   │   ├── navigation/       # Navigation setup
│   │   └── hooks/           # Custom hooks
│   ├── ios/                 # iOS specific code
│   └── android/            # Android specific code
├── ios/                    # Native iOS app (alternative)
└── android/               # Native Android app (alternative)
```

### Key Features Implementation

#### 1. Share Extension (iOS)
```swift
// ShareViewController.swift
class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        if let item = extensionContext?.inputItems.first as? NSExtensionItem {
            processSharedItem(item)
        }
    }
    
    func processSharedItem(_ item: NSExtensionItem) {
        // Extract URL, text, or image
        // Send to main app via App Groups
        // Launch MiCha with content
    }
}
```

#### 2. Share Extension (Android)
```kotlin
// ShareActivity.kt
class ShareActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        when (intent?.action) {
            Intent.ACTION_SEND -> handleSendAction()
            Intent.ACTION_VIEW -> handleViewAction()
        }
    }
    
    private fun handleSendAction() {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        val sharedImage = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        // Process and launch MiCha
    }
}
```

#### 3. Chat Interface
```typescript
// ChatScreen.tsx
export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  useEffect(() => {
    // Load generic suggestions immediately
    setSuggestions(getGenericSuggestions(language));
    
    // Load AI suggestions
    loadAISuggestions();
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader />
      <MessageList messages={messages} />
      <SuggestionBar suggestions={suggestions} />
      <InputBar onSend={handleSend} />
    </SafeAreaView>
  );
};
```

#### 4. Built-in Browser
```typescript
// BrowserScreen.tsx
export const BrowserScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const webViewRef = useRef<WebView>(null);
  
  const injectMiChaButton = `
    const button = document.createElement('div');
    button.id = 'micha-float-button';
    button.innerHTML = '💬';
    button.style.cssText = 'position:fixed;bottom:20px;right:20px;...';
    button.onclick = () => window.ReactNativeWebView.postMessage('open-chat');
    document.body.appendChild(button);
  `;
  
  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      injectedJavaScript={injectMiChaButton}
      onMessage={handleWebViewMessage}
    />
  );
};
```

## 🔧 API Integration

### Jina AI Integration
```typescript
// JinaService.ts
export class JinaService {
  private readonly baseUrl = 'https://r.jina.ai';
  
  async extractContent(url: string): Promise<string> {
    const cached = await this.cache.get(url);
    if (cached) return cached;
    
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(url)}`);
    const content = await response.text();
    
    await this.cache.set(url, content, 3600); // 1 hour
    return content;
  }
}
```

### OCR Service
```typescript
// OCRService.ts
import MLKit from '@react-native-ml-kit/text-recognition';

export class OCRService {
  async extractTextFromImage(imageUri: string): Promise<string> {
    try {
      const result = await MLKit.recognizeText(imageUri);
      return result.blocks.map(block => block.text).join('\n');
    } catch (error) {
      console.error('OCR failed:', error);
      throw error;
    }
  }
}
```

## 🎨 UI Components

### Message Bubble
```typescript
// MessageBubble.tsx
export const MessageBubble: React.FC<{message: Message}> = ({message}) => {
  const isAI = message.sender === 'ai';
  
  return (
    <View style={[
      styles.bubble,
      isAI ? styles.aiBubble : styles.userBubble
    ]}>
      <Text style={styles.messageText}>{message.text}</Text>
      {message.timestamp && (
        <Text style={styles.timestamp}>
          {formatTime(message.timestamp)}
        </Text>
      )}
    </View>
  );
};
```

### Suggestion Pills
```typescript
// SuggestionPill.tsx
export const SuggestionPill: React.FC<{
  suggestion: string;
  isGeneric: boolean;
  onPress: () => void;
}> = ({suggestion, isGeneric, onPress}) => {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        isGeneric ? styles.genericPill : styles.specificPill
      ]}
      onPress={onPress}
    >
      <Text style={styles.pillText}>{suggestion}</Text>
    </TouchableOpacity>
  );
};
```

## 📦 State Management

### Redux Store Structure
```typescript
// store/index.ts
export interface RootState {
  chat: {
    sessions: Record<string, ChatSession>;
    activeSessionId: string | null;
  };
  settings: {
    language: string;
    provider: AIProvider;
    theme: 'light' | 'dark' | 'auto';
  };
  cache: {
    suggestions: Record<string, Suggestion[]>;
    jinaContent: Record<string, CachedContent>;
  };
}
```

## 🔒 Security

### API Key Storage
```typescript
// Secure storage for API keys
import * as Keychain from 'react-native-keychain';

export class SecureStorage {
  async setAPIKey(provider: string, key: string): Promise<void> {
    await Keychain.setInternetCredentials(
      `micha-${provider}`,
      'apikey',
      key
    );
  }
  
  async getAPIKey(provider: string): Promise<string | null> {
    const creds = await Keychain.getInternetCredentials(`micha-${provider}`);
    return creds ? creds.password : null;
  }
}
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test ChatScreen.test.tsx
```

### E2E Tests
```bash
# iOS
npx detox test --configuration ios.sim.debug

# Android
npx detox test --configuration android.emu.debug
```

## 📱 Platform-Specific Features

### iOS
- **Live Text API**: Extract text from camera
- **Shortcuts Integration**: Siri shortcuts for quick actions
- **Widget**: Today widget for quick translations

### Android
- **App Links**: Deep linking support
- **Quick Settings Tile**: Toggle MiCha from notification shade
- **Floating Window**: Picture-in-picture chat mode

## 🚀 Deployment

### iOS
1. Update version in Info.plist
2. Archive in Xcode
3. Upload to App Store Connect
4. Submit for review

### Android
1. Update versionCode and versionName
2. Generate signed APK/AAB
3. Upload to Google Play Console
4. Submit for review

## 📊 Analytics Events

Track these key events:
- `app_opened`
- `share_extension_used`
- `message_sent`
- `suggestion_clicked`
- `language_changed`
- `provider_changed`
- `browser_opened`
- `image_processed`

## 🐛 Troubleshooting

### Common Issues

1. **Share extension not appearing**
   - iOS: Check App Groups configuration
   - Android: Verify intent filters in manifest

2. **API requests failing**
   - Check network permissions
   - Verify API keys are stored correctly
   - Check certificate pinning for production

3. **Performance issues**
   - Enable Hermes on Android
   - Use React.memo for expensive components
   - Implement virtualized lists for chat history

## 📚 Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [iOS App Extensions](https://developer.apple.com/app-extensions/)
- [Android Intents](https://developer.android.com/guide/components/intents-filters)
- [ML Kit Documentation](https://developers.google.com/ml-kit)

## 🤝 Contributing

1. Create feature branch from `mobile`
2. Follow existing code style
3. Add tests for new features
4. Update documentation
5. Submit PR with description

## 📄 License

MIT License - Same as the main MiCha project