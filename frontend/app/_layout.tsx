import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { useEffect } from 'react';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-warm icon assets to fix Android Expo Go icon loading issue
        const iconAssets = [
          require('../assets/images/icon.png'),
          require('../assets/images/adaptive-icon.png'),
        ];
        await Asset.loadAsync(iconAssets);
      } catch (e) {
        console.warn(e);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SocketProvider>
    </AuthProvider>
  );
}
