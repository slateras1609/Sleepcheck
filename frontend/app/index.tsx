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
    <LinearGradient colors={['#0B0B14', '#15152A', '#0B0B14']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconOuter}>
          <LinearGradient
            colors={['rgba(108, 92, 231, 0.25)', 'rgba(108, 92, 231, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Ionicons name="moon" size={64} color="#A89BF0" />
          </LinearGradient>
          <View style={styles.starDot1} />
          <View style={styles.starDot2} />
          <View style={styles.starDot3} />
        </View>

        <Text style={styles.title}>SleepCheck</Text>
        <Text style={styles.subtitle}>Share sleep with friends</Text>

        <TouchableOpacity
          testID="google-signin-button"
          style={styles.signInButton}
          onPress={signIn}
          activeOpacity={0.85}
        >
          <Ionicons
            name="logo-google"
            size={22}
            color="#FFFFFF"
            style={styles.googleIcon}
          />
          <Text style={styles.signInText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.description}>
          Let your friends know when you&apos;re sleeping or awake in real-time
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  iconOuter: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.25)',
  },
  starDot1: {
    position: 'absolute',
    top: 10,
    right: 18,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
  },
  starDot2: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A89BF0',
    opacity: 0.8,
  },
  starDot3: {
    position: 'absolute',
    top: 40,
    left: 22,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#9999B0',
    marginBottom: 56,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 17,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 28,
    minWidth: 280,
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  googleIcon: {
    marginRight: 12,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: '#666688',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
