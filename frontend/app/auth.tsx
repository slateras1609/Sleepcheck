import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ session_id?: string }>();
  const router = useRouter();
  const { processSessionId, user } = useAuth();

  useEffect(() => {
    async function handleAuth() {
      const sessionId = params.session_id;
      if (sessionId) {
        const success = await processSessionId(sessionId);
        if (success) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/');
        }
      } else {
        // No session_id, go back to login
        router.replace('/');
      }
    }

    handleAuth();
  }, [params.session_id]);

  // If user is already authenticated, redirect
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)/home');
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6C5CE7" />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
});
