import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface FriendStatus {
  user_id: string;
  username: string;
  name: string;
  picture?: string;
  status: string;
  last_update: string;
}

export default function HomeScreen() {
  const { user, sessionToken } = useAuth();
  const { socket } = useSocket();
  const [currentStatus, setCurrentStatus] = useState<string>('awake');
  const [friends, setFriends] = useState<FriendStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && sessionToken) {
      fetchFriendsStatus();
    }
  }, [user, sessionToken]);

  useEffect(() => {
    if (socket) {
      socket.on('status_update', (data) => {
        console.log('Status update received:', data);
        // Update friend status in real-time
        setFriends((prev) =>
          prev.map((friend) =>
            friend.user_id === data.user_id
              ? { ...friend, status: data.status, last_update: data.last_update }
              : friend
          )
        );
      });

      return () => {
        socket.off('status_update');
      };
    }
  }, [socket]);

  const fetchFriendsStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/status/friends`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Error fetching friends status:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFriendsStatus();
    setRefreshing(false);
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`${BACKEND_URL}/api/status/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setCurrentStatus(newStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const renderStatusIcon = (status: string) => {
    if (status === 'sleeping') {
      return <Ionicons name="moon" size={24} color="#6C5CE7" />;
    }
    return <Ionicons name="sunny" size={24} color="#FFA500" />;
  };

  const renderStatusBadge = (status: string) => {
    const isSleeping = status === 'sleeping';
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: isSleeping ? 'rgba(108, 92, 231, 0.2)' : 'rgba(255, 165, 0, 0.2)' },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isSleeping ? '#6C5CE7' : '#FFA500' },
          ]}
        />
        <Text
          style={[
            styles.statusText,
            { color: isSleeping ? '#6C5CE7' : '#FFA500' },
          ]}
        >
          {isSleeping ? 'Sleeping' : 'Awake'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F0F0F', '#1A1A1A']}
        style={styles.header}
      >
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
        <Text style={styles.subtitle}>How are you feeling?</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C5CE7"
          />
        }
      >
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Your Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                currentStatus === 'sleeping' && styles.activeStatusButton,
              ]}
              onPress={() => updateStatus('sleeping')}
              disabled={updating}
            >
              {updating && currentStatus !== 'sleeping' ? (
                <ActivityIndicator color="#6C5CE7" />
              ) : (
                <>
                  <Ionicons name="moon" size={32} color="#6C5CE7" />
                  <Text style={styles.statusButtonText}>I'm Going To Sleep</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                currentStatus === 'awake' && styles.activeStatusButton,
              ]}
              onPress={() => updateStatus('awake')}
              disabled={updating}
            >
              {updating && currentStatus !== 'awake' ? (
                <ActivityIndicator color="#FFA500" />
              ) : (
                <>
                  <Ionicons name="sunny" size={32} color="#FFA500" />
                  <Text style={styles.statusButtonText}>I'm Awake</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.friendsSection}>
          <Text style={styles.sectionTitle}>Friends Activity</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 32 }} />
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#444444" />
              <Text style={styles.emptyStateText}>No friends yet</Text>
              <Text style={styles.emptyStateSubtext}>Add friends to see their status</Text>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.user_id} style={styles.friendCard}>
                <View style={styles.friendAvatar}>
                  <Ionicons name="person" size={24} color="#666666" />
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendUsername}>@{friend.username}</Text>
                  <Text style={styles.lastUpdate}>
                    {formatDistanceToNow(new Date(friend.last_update), { addSuffix: true })}
                  </Text>
                </View>
                <View style={styles.friendStatus}>
                  {renderStatusIcon(friend.status)}
                  {renderStatusBadge(friend.status)}
                </View>
              </View>
            ))
          )}
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
  greeting: {
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
  },
  statusSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statusButtons: {
    gap: 16,
  },
  statusButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2A2A2A',
    minHeight: 120,
  },
  activeStatusButton: {
    borderColor: '#6C5CE7',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  friendsSection: {
    padding: 24,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#444444',
    marginTop: 8,
  },
  friendCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#444444',
  },
  friendStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
