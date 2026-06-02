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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SearchResult {
  user_id: string;
  username: string;
  name: string;
  picture?: string;
}

export default function FriendsScreen() {
  const { user, sessionToken } = useAuth();
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
        Alert.alert('Success', 'Friend request sent!');
        setSearchResults([]);
        setSearchQuery('');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to send friend request');
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
      Alert.alert('Error', 'Please enter a friend code');
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
        Alert.alert('Success', 'Friend request sent!');
        setFriendCode('');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Invalid friend code');
      }
    } catch (error) {
      console.error('Error adding by friend code:', error);
      Alert.alert('Error', 'Failed to add friend');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0F0F', '#1A1A1A']} style={styles.header}>
        <Text style={styles.title}>Add Friends</Text>
        <Text style={styles.subtitle}>Search by username or use friend code</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search by Username</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter username"
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchUsers}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchUsers}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((result) => (
                <View key={result.user_id} style={styles.resultCard}>
                  <View style={styles.resultAvatar}>
                    <Ionicons name="person" size={24} color="#666666" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text style={styles.resultUsername}>@{result.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => sendFriendRequest(result.user_id)}
                    disabled={sendingRequest === result.user_id}
                  >
                    {sendingRequest === result.user_id ? (
                      <ActivityIndicator size="small" color="#6C5CE7" />
                    ) : (
                      <Ionicons name="person-add" size={24} color="#6C5CE7" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add by Friend Code</Text>
          <View style={styles.codeContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter friend code"
              placeholderTextColor="#666666"
              value={friendCode}
              onChangeText={setFriendCode}
              autoCapitalize="characters"
              maxLength={8}
            />
            <TouchableOpacity style={styles.addCodeButton} onPress={addByFriendCode}>
              <Text style={styles.addCodeButtonText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Friend Code</Text>
          <View style={styles.myCodeContainer}>
            <Text style={styles.myCode}>{user?.friend_code}</Text>
            <Text style={styles.myCodeSubtext}>Share this code with friends</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  resultUsername: {
    fontSize: 14,
    color: '#666666',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 24,
  },
  codeContainer: {
    gap: 12,
  },
  codeInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  addCodeButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addCodeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  myCodeContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  myCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6C5CE7',
    letterSpacing: 4,
    marginBottom: 8,
  },
  myCodeSubtext: {
    fontSize: 14,
    color: '#666666',
  },
});
