# MiCha Mobile

Mobile application version of MiCha - Minimalist Chatbot for iOS and Android.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- React Native development environment set up
- Xcode 14+ (for iOS)
- Android Studio (for Android)

### Installation

```bash
# Navigate to React Native project
cd mobile/react-native

# Install dependencies
npm install

# iOS: Install CocoaPods
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📱 Features

### Core Features
- **Universal Share Extension**: Share any content from other apps
- **Built-in Browser**: Browse with MiCha assistance overlay
- **Camera/Image Support**: Extract and chat about text from images
- **Multi-language**: Support for 7 languages
- **Offline Mode**: Basic functionality without internet
- **Voice Input**: Speak your questions

### Platform-Specific
- **iOS**: Siri Shortcuts, Widget, Live Text API
- **Android**: Quick Settings Tile, Floating Window, App Links

## 🏗️ Architecture

```
mobile/
├── shared/              # Shared business logic
│   ├── api/            # AI providers & Jina service
│   ├── services/       # Storage, cache, analytics
│   ├── models/         # Data models
│   └── utils/          # Common utilities
├── react-native/       # React Native implementation
│   ├── src/
│   ├── ios/           # iOS native code
│   └── android/       # Android native code
├── ios/               # Native iOS app (alternative)
└── android/           # Native Android app (alternative)
```

## 🔧 Development

### Key Commands

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Clean build
npm run clean

# Build for production
npm run build:ios
npm run build:android
```

### Debugging

1. **React Native Debugger**: Use Flipper or React Native Debugger
2. **Console Logs**: Check Metro bundler terminal
3. **Native Logs**: 
   - iOS: Xcode console
   - Android: `adb logcat`

## 📲 Share Extension

### iOS Setup
1. Add App Group in Xcode capabilities
2. Configure Info.plist for share extension
3. Implement ShareViewController

### Android Setup
1. Add intent filters in AndroidManifest.xml
2. Create ShareActivity
3. Handle ACTION_SEND intents

## 🎨 UI/UX Guidelines

- **Colors**: 
  - Primary: #1E4D7B (MiCha Blue)
  - Generic Questions: #FFF8E1 (Yellow)
  - Specific Questions: #F0F4FF (Blue)
- **Typography**: System fonts with clear hierarchy
- **Spacing**: 8-point grid system
- **Animations**: Smooth, purposeful transitions

## 🚀 Deployment

### iOS
1. Update version in Info.plist
2. Archive in Xcode
3. Upload to App Store Connect
4. Submit for review

### Android
1. Update versionCode in build.gradle
2. Generate signed AAB: `cd android && ./gradlew bundleRelease`
3. Upload to Google Play Console
4. Submit for review

## 📊 Analytics

Key metrics tracked:
- App launches
- Share extension usage
- Message interactions
- Language preferences
- Provider usage
- Error rates

## 🔒 Security

- API keys stored in platform Keychain/Keystore
- All network requests over HTTPS
- No user data collected without consent
- Local storage encrypted

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (Detox)
npm run e2e:ios
npm run e2e:android
```

## 📚 Documentation

- [Mobile Development Guide](./mobile.md) - Comprehensive technical documentation
- [API Documentation](./docs/api.md) - API integration details
- [UI Components](./docs/components.md) - Component library reference

## 🤝 Contributing

1. Create feature branch from `mobile`
2. Follow the coding standards
3. Add tests for new features
4. Update documentation
5. Submit PR with clear description

## 📄 License

MIT License - See main project LICENSE file