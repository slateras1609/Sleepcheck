import React, { createContext, useState, useContext, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  username: string;
  friend_code: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      let token: string | null = null;
      
      if (Platform.OS === 'web') {
        token = localStorage.getItem('session_token');
      } else {
        token = await SecureStore.getItemAsync('session_token');
      }

      if (token) {
        // Verify token with backend
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setSessionToken(token);
        } else {
          // Invalid token, clear it
          if (Platform.OS === 'web') {
            localStorage.removeItem('session_token');
          } else {
            await SecureStore.deleteItemAsync('session_token');
          }
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      let redirectUrl: string;
      
      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin + '/';
      } else {
        redirectUrl = Linking.createURL('auth');
      }

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await processAuthCallback(result.url);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const processAuthCallback = async (url: string) => {
    try {
      const { queryParams, path } = Linking.parse(url);
      let sessionId = queryParams?.session_id as string;

      // Also check hash for session_id (web)
      if (!sessionId && Platform.OS === 'web') {
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        sessionId = hashParams.get('session_id') || '';
      }

      if (sessionId) {
        // Exchange session_id for session_token
        const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store session token
          if (Platform.OS === 'web') {
            localStorage.setItem('session_token', data.session_token);
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            await SecureStore.setItemAsync('session_token', data.session_token);
          }

          setSessionToken(data.session_token);
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Error processing auth callback:', error);
    }
  };

  // Handle web redirects
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      const search = window.location.search;
      
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const searchParams = new URLSearchParams(search);
      
      const sessionId = hashParams.get('session_id') || searchParams.get('session_id');
      
      if (sessionId) {
        processAuthCallback(window.location.href);
      }
    }
  }, []);

  const signOut = async () => {
    try {
      if (sessionToken) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        });
      }

      if (Platform.OS === 'web') {
        localStorage.removeItem('session_token');
      } else {
        await SecureStore.deleteItemAsync('session_token');
      }

      setUser(null);
      setSessionToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, sessionToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
