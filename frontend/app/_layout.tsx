import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Suppress known harmless warnings in Expo Go SDK 54
LogBox.ignoreLogs([
  'Font file for ionicons is empty',
  'ExpoFontLoader.loadAsync',
  'Possible Unhandled Promise Rejection',
  'Setting a timer for a long period',
]);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

// Global handler for unhandled promise rejections to prevent yellow box errors
if (typeof globalThis !== 'undefined') {
  // @ts-ignore - process is available in react-native
  const tracking = require('promise/setimmediate/rejection-tracking');
  if (tracking && tracking.enable) {
    tracking.enable({
      allRejections: false,
      onUnhandled: (id: number, error: any) => {
        console.warn(`Unhandled promise rejection (id ${id}):`, error);
      },
      onHandled: () => {},
    });
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-warm icon assets only (Ionicons font auto-loads via vector-icons internally)
        const iconAssets = [
          require('../assets/images/icon.png'),
          require('../assets/images/adaptive-icon.png'),
        ];
        await Asset.loadAsync(iconAssets);
      } catch (e) {
        console.warn('Error loading resources:', e);
      } finally {
        setAppIsReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // ignore
        }
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <SocketProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
