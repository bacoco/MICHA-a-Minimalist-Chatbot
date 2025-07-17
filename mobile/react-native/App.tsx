/**
 * MiCha Mobile Application
 * Root component
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import SplashScreen from 'react-native-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NotificationService } from './src/services/NotificationService';
import { ShareIntentHandler } from './src/components/ShareIntentHandler';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LoadingScreen } from './src/screens/LoadingScreen';

// Import URL polyfill for React Native
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

const App: React.FC = () => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize services
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notification service
      await NotificationService.initialize();

      // Hide splash screen
      SplashScreen.hide();
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <SafeAreaProvider>
                <StatusBar
                  barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                  backgroundColor="transparent"
                  translucent
                />
                <NavigationContainer>
                  <ShareIntentHandler>
                    <AppNavigator />
                  </ShareIntentHandler>
                </NavigationContainer>
              </SafeAreaProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;