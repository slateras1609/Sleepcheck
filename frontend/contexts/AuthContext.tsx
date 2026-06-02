import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
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
  processSessionId: (sessionId: string) => Promise<boolean>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('session_token');
  }
  return await SecureStore.getItemAsync('session_token');
}

async function setStoredToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('session_token', token);
  } else {
    await SecureStore.setItemAsync('session_token', token);
  }
}

async function removeStoredToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem('session_token');
  } else {
    await SecureStore.deleteItemAsync('session_token');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const processedSessionIds = useRef<Set<string>>(new Set());

  const processSessionId = async (sessionId: string): Promise<boolean> => {
    // Avoid processing same session_id twice
    if (processedSessionIds.current.has(sessionId)) {
      console.log('Session ID already processed:', sessionId);
      return !!user;
    }
    processedSessionIds.current.add(sessionId);

    try {
      console.log('Processing session_id:', sessionId);
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        await setStoredToken(data.session_token);
        setSessionToken(data.session_token);
        setUser(data.user);

        // Clean URL on web
        if (Platform.OS === 'web') {
          window.history.replaceState(null, '', window.location.pathname);
        }
        return true;
      } else {
        console.error('Failed to exchange session_id:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error processing session_id:', error);
      return false;
    }
  };

  const checkExistingSession = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setSessionToken(token);
        } else {
          await removeStoredToken();
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parse session_id from a URL string (handles both query params and hash)
  const extractSessionId = (urlStr: string): string | null => {
    try {
      // Try parsing with Linking.parse first
      const parsed = Linking.parse(urlStr);
      if (parsed.queryParams?.session_id) {
        return parsed.queryParams.session_id as string;
      }

      // Try hash fragment
      const hashMatch = urlStr.match(/[#&]session_id=([^&]+)/);
      if (hashMatch) {
        return decodeURIComponent(hashMatch[1]);
      }

      // Try query string
      const queryMatch = urlStr.match(/[?&]session_id=([^&]+)/);
      if (queryMatch) {
        return decodeURIComponent(queryMatch[1]);
      }
    } catch (e) {
      console.error('Error extracting session_id:', e);
    }
    return null;
  };

  // Handle deep links on mobile
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Handle cold start (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        const sessionId = extractSessionId(url);
        if (sessionId) {
          processSessionId(sessionId);
        }
      }
    });

    // Handle hot links (app already open)
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link received:', event.url);
      const sessionId = extractSessionId(event.url);
      if (sessionId) {
        processSessionId(sessionId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle web redirects
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const hash = window.location.hash;
    const search = window.location.search;

    const sessionId =
      extractSessionId(window.location.href) ||
      new URLSearchParams(hash.replace('#', '')).get('session_id') ||
      new URLSearchParams(search).get('session_id');

    if (sessionId) {
      processSessionId(sessionId);
    }
  }, []);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const signIn = async () => {
    try {
      let redirectUrl: string;

      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin + '/';
      } else {
        redirectUrl = Linking.createURL('auth');
      }

      console.log('Redirect URL:', redirectUrl);

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        console.log('Auth result:', result);

        if (result.type === 'success' && result.url) {
          const sessionId = extractSessionId(result.url);
          if (sessionId) {
            await processSessionId(sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (sessionToken) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      }

      await removeStoredToken();
      setUser(null);
      setSessionToken(null);
      processedSessionIds.current.clear();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut, sessionToken, processSessionId }}
    >
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
