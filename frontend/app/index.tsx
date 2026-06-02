import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/home');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#0F0F0F', '#1A1A1A', '#0F0F0F']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="moon" size={80} color="#6C5CE7" />
        </View>
        
        <Text style={styles.title}>SleepCheck</Text>
        <Text style={styles.subtitle}>Track your sleep status with friends</Text>

        <TouchableOpacity
          style={styles.signInButton}
          onPress={signIn}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={24} color="#FFFFFF" style={styles.googleIcon} />
          <Text style={styles.signInText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.description}>
          Let your friends know when you're sleeping or awake in real-time
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 48,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: 280,
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    maxWidth: 280,
  },
});
