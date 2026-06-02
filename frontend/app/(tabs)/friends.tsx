import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SearchResult {
  user_id: string;
  username: string;
  name: string;
  picture?: string;
}

function getInitials(name: string): string {
  return (name || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function FriendsScreen() {
  const { user, sessionToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const response = await fetch(`${BACKEND_URL}/api/friends/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ username: searchQuery }),
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      setSendingRequest(friendId);
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ friend_id: friendId }),
      });
      if (response.ok) {
        Alert.alert('Request Sent', 'Friend request sent successfully!');
        setSearchResults([]);
        setSearchQuery('');
      } else {
        const error = await response.json();
        Alert.alert('Unable to Send', error.detail || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setSendingRequest(null);
    }
  };

  const addByFriendCode = async () => {
    if (!friendCode.trim()) {
      Alert.alert('Enter Code', 'Please enter a friend code');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/add-by-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ friend_code: friendCode.toUpperCase() }),
      });
      if (response.ok) {
        Alert.alert('Request Sent', 'Friend request sent successfully!');
        setFriendCode('');
      } else {
        const error = await response.json();
        Alert.alert('Unable to Add', error.detail || 'Invalid friend code');
      }
    } catch (error) {
      console.error('Error adding by friend code:', error);
      Alert.alert('Error', 'Failed to add friend');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#0F0F1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.title}>Add Friends</Text>
        <Text style={styles.subtitle}>Search by username or use a friend code</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔍</Text>
            <Text style={styles.sectionTitle}>Search Username</Text>
          </View>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIconText}>@</Text>
            <TextInput
              testID="username-search-input"
              style={styles.searchInput}
              placeholder="username"
              placeholderTextColor="#555570"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchUsers}
              autoCapitalize="none"
            />
            <TouchableOpacity
              testID="search-button"
              style={styles.searchButton}
              onPress={searchUsers}
              disabled={searching}
              activeOpacity={0.8}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.searchButtonText}>→</Text>
              )}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((result) => (
                <View
                  key={result.user_id}
                  testID={`search-result-${result.username}`}
                  style={styles.resultCard}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>{getInitials(result.name)}</Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text style={styles.resultUsername}>@{result.username}</Text>
                  </View>
                  <TouchableOpacity
                    testID={`send-request-${result.username}`}
                    style={styles.addButton}
                    onPress={() => sendFriendRequest(result.user_id)}
                    disabled={sendingRequest === result.user_id}
                    activeOpacity={0.8}
                  >
                    {sendingRequest === result.user_id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.addButtonText}>+</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔑</Text>
            <Text style={styles.sectionTitle}>Add by Friend Code</Text>
          </View>
          <TextInput
            testID="friend-code-input"
            style={styles.codeInput}
            placeholder="XXXXXXXX"
            placeholderTextColor="#3A3A55"
            value={friendCode}
            onChangeText={setFriendCode}
            autoCapitalize="characters"
            maxLength={8}
          />
          <TouchableOpacity
            testID="add-by-code-button"
            style={styles.primaryButton}
            onPress={addByFriendCode}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonEmoji}>👥</Text>
            <Text style={styles.primaryButtonText}>Send Friend Request</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔗</Text>
            <Text style={styles.sectionTitle}>Your Friend Code</Text>
          </View>
          <LinearGradient
            colors={['rgba(108, 92, 231, 0.25)', 'rgba(108, 92, 231, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.myCodeContainer}
          >
            <Text testID="my-friend-code" style={styles.myCode}>
              {user?.friend_code}
            </Text>
            <Text style={styles.myCodeSubtext}>Share this code with friends to connect</Text>
          </LinearGradient>
        </View>
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
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#9999B0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15152A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  searchIconText: {
    fontSize: 18,
    color: '#777799',
    marginRight: 8,
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 10,
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  resultsContainer: {
    marginTop: 12,
  },
  resultCard: {
    backgroundColor: '#15152A',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(108, 92, 231, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  resultUsername: {
    fontSize: 13,
    color: '#777799',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  codeInput: {
    backgroundColor: '#15152A',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  myCodeContainer: {
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C5CE7',
  },
  myCode: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 8,
  },
  myCodeSubtext: {
    fontSize: 13,
    color: '#A89BF0',
  },
});
