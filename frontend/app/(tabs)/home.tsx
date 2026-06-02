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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [currentStatus, setCurrentStatus] = useState<string>('awake');
  const [friends, setFriends] = useState<FriendStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user && sessionToken) {
      fetchFriendsStatus();
    }
  }, [user, sessionToken]);

  useEffect(() => {
    if (socket) {
      socket.on('status_update', (data) => {
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
        headers: { Authorization: `Bearer ${sessionToken}` },
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
      setUpdating(newStatus);
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
      setUpdating(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    const isSleeping = status === 'sleeping';
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: isSleeping ? 'rgba(108, 92, 231, 0.18)' : 'rgba(255, 165, 0, 0.18)' },
        ]}
      >
        <View
          style={[styles.statusDot, { backgroundColor: isSleeping ? '#6C5CE7' : '#FFA500' }]}
        />
        <Text style={[styles.statusText, { color: isSleeping ? '#A89BF0' : '#FFB84D' }]}>
          {isSleeping ? 'Sleeping' : 'Awake'}
        </Text>
      </View>
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
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
        <Text style={styles.subtitle}>How are you feeling?</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C5CE7"
            colors={['#6C5CE7']}
          />
        }
      >
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Your Status</Text>

          <TouchableOpacity
            testID="sleep-button"
            style={[
              styles.statusButton,
              styles.sleepButton,
              currentStatus === 'sleeping' && styles.activeSleepButton,
            ]}
            onPress={() => updateStatus('sleeping')}
            disabled={updating !== null}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                currentStatus === 'sleeping'
                  ? ['rgba(108, 92, 231, 0.25)', 'rgba(108, 92, 231, 0.05)']
                  : ['rgba(108, 92, 231, 0.08)', 'rgba(108, 92, 231, 0.02)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <View style={styles.buttonIconWrap}>
                {updating === 'sleeping' ? (
                  <ActivityIndicator color="#6C5CE7" size="large" />
                ) : (
                  <Text style={styles.buttonEmoji}>🌙</Text>
                )}
              </View>
              <Text style={styles.statusButtonText}>I&apos;m Going To Sleep</Text>
              <Text style={styles.statusButtonSubtext}>Tap to mark yourself as sleeping</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            testID="awake-button"
            style={[
              styles.statusButton,
              styles.awakeButton,
              currentStatus === 'awake' && styles.activeAwakeButton,
            ]}
            onPress={() => updateStatus('awake')}
            disabled={updating !== null}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                currentStatus === 'awake'
                  ? ['rgba(255, 165, 0, 0.22)', 'rgba(255, 165, 0, 0.04)']
                  : ['rgba(255, 165, 0, 0.08)', 'rgba(255, 165, 0, 0.02)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <View style={styles.buttonIconWrap}>
                {updating === 'awake' ? (
                  <ActivityIndicator color="#FFA500" size="large" />
                ) : (
                  <Text style={styles.buttonEmoji}>☀️</Text>
                )}
              </View>
              <Text style={styles.statusButtonText}>I&apos;m Awake</Text>
              <Text style={styles.statusButtonSubtext}>Tap to mark yourself as awake</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.friendsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends Activity</Text>
            {friends.length > 0 && (
              <Text style={styles.friendCount}>{friends.length}</Text>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 32 }} />
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={48} color="#444466" />
              </View>
              <Text style={styles.emptyStateText}>No friends yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add friends to see their sleep status here
              </Text>
            </View>
          ) : (
            friends.map((friend) => {
              const isSleeping = friend.status === 'sleeping';
              return (
                <View
                  key={friend.user_id}
                  testID={`friend-card-${friend.username}`}
                  style={styles.friendCard}
                >
                  <View
                    style={[
                      styles.friendAvatar,
                      {
                        backgroundColor: isSleeping
                          ? 'rgba(108, 92, 231, 0.15)'
                          : 'rgba(255, 165, 0, 0.15)',
                      },
                    ]}
                  >
                    <Text style={styles.friendAvatarEmoji}>{isSleeping ? '🌙' : '☀️'}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendUsername}>@{friend.username}</Text>
                    <Text style={styles.lastUpdate}>
                      {formatDistanceToNow(new Date(friend.last_update), { addSuffix: true })}
                    </Text>
                  </View>
                  <View style={styles.friendStatus}>{renderStatusBadge(friend.status)}</View>
                </View>
              );
            })
          )}
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
  greeting: {
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
  },
  statusSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  friendCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C5CE7',
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusButton: {
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  sleepButton: {
    borderColor: 'rgba(108, 92, 231, 0.2)',
    backgroundColor: '#15152A',
  },
  activeSleepButton: {
    borderColor: '#6C5CE7',
  },
  awakeButton: {
    borderColor: 'rgba(255, 165, 0, 0.2)',
    backgroundColor: '#1E1A14',
  },
  activeAwakeButton: {
    borderColor: '#FFA500',
  },
  buttonGradient: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  buttonIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonEmoji: {
    fontSize: 38,
    lineHeight: 44,
    textAlign: 'center',
  },
  friendAvatarEmoji: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statusButtonSubtext: {
    color: '#8B8BA3',
    fontSize: 13,
  },
  friendsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 17,
    color: '#9999B0',
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#555570',
    textAlign: 'center',
  },
  friendCard: {
    backgroundColor: '#15152A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: '#777799',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 11,
    color: '#555570',
  },
  friendStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
