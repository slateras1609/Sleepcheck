import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#0F0F1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.title}>Profile</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
      >
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['rgba(108, 92, 231, 0.25)', 'rgba(108, 92, 231, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Ionicons name="person" size={44} color="#A89BF0" />
          </LinearGradient>
          <Text testID="profile-name" style={styles.name}>
            {user?.name}
          </Text>
          <Text testID="profile-username" style={styles.username}>
            @{user?.username}
          </Text>
          <View style={styles.emailContainer}>
            <Ionicons name="mail-outline" size={13} color="#777799" />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="share-social-outline" size={18} color="#A89BF0" />
            <Text style={styles.sectionTitle}>Your Friend Code</Text>
          </View>
          <LinearGradient
            colors={['rgba(108, 92, 231, 0.25)', 'rgba(108, 92, 231, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.friendCodeCard}
          >
            <Text testID="profile-friend-code" style={styles.friendCode}>
              {user?.friend_code}
            </Text>
            <Text style={styles.friendCodeSubtext}>
              Share this code with friends to connect
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color="#A89BF0" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <TouchableOpacity
            testID="sign-out-button"
            style={styles.menuItem}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="log-out-outline" size={22} color="#FF6B6B" />
            </View>
            <Text style={styles.menuItemText}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color="#444466" />
          </TouchableOpacity>
        </View>

        <Text style={styles.appName}>SleepCheck v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B14',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#15152A',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(108, 92, 231, 0.4)',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 15,
    color: '#A89BF0',
    marginBottom: 12,
    fontWeight: '600',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  email: {
    fontSize: 13,
    color: '#777799',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  friendCodeCard: {
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C5CE7',
  },
  friendCode: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 8,
  },
  friendCodeSubtext: {
    fontSize: 13,
    color: '#A89BF0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15152A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  appName: {
    textAlign: 'center',
    color: '#444466',
    fontSize: 12,
    marginTop: 8,
  },
});
