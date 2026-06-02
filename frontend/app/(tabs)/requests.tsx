import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface FriendRequest {
  request_id: string;
  from_user_id: string;
  from_username: string;
  from_name: string;
  from_picture?: string;
  created_at: string;
}

export default function RequestsScreen() {
  const { sessionToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const acceptRequest = async (requestId: string) => {
    try {
      setProcessing(requestId);
      const response = await fetch(`${BACKEND_URL}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      } else {
        Alert.alert('Error', 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setProcessing(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      setProcessing(requestId);
      const response = await fetch(`${BACKEND_URL}/api/friends/reject/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      } else {
        Alert.alert('Error', 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setProcessing(null);
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Friend Requests</Text>
            <Text style={styles.subtitle}>
              {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
            </Text>
          </View>
          {requests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C5CE7"
            colors={['#6C5CE7']}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 48 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="mail-outline" size={48} color="#444466" />
            </View>
            <Text style={styles.emptyStateText}>No pending requests</Text>
            <Text style={styles.emptyStateSubtext}>
              Friend requests will appear here when received
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View
              key={request.request_id}
              testID={`request-${request.from_username}`}
              style={styles.requestCard}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestAvatar}>
                  <Ionicons name="person" size={24} color="#A89BF0" />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.from_name}</Text>
                  <Text style={styles.requestUsername}>@{request.from_username}</Text>
                  <Text style={styles.requestTime}>
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </Text>
                </View>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  testID={`accept-${request.from_username}`}
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => acceptRequest(request.request_id)}
                  disabled={processing === request.request_id}
                  activeOpacity={0.85}
                >
                  {processing === request.request_id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  testID={`reject-${request.from_username}`}
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => rejectRequest(request.request_id)}
                  disabled={processing === request.request_id}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={18} color="#9999B0" />
                  <Text style={styles.rejectButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9999B0',
  },
  badge: {
    backgroundColor: '#6C5CE7',
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
    paddingHorizontal: 40,
  },
  requestCard: {
    backgroundColor: '#15152A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  requestUsername: {
    fontSize: 13,
    color: '#777799',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 11,
    color: '#555570',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#6C5CE7',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rejectButtonText: {
    color: '#9999B0',
    fontSize: 14,
    fontWeight: '600',
  },
});
