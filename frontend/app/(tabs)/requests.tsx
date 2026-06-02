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
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
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
      const response = await fetch(
        `${BACKEND_URL}/api/friends/accept/${requestId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Friend request accepted!');
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
      const response = await fetch(
        `${BACKEND_URL}/api/friends/reject/${requestId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Friend request rejected');
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
      <LinearGradient colors={['#0F0F0F', '#1A1A1A']} style={styles.header}>
        <Text style={styles.title}>Friend Requests</Text>
        <Text style={styles.subtitle}>
          {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
        </Text>
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
        {loading ? (
          <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 32 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={64} color="#444444" />
            <Text style={styles.emptyStateText}>No pending requests</Text>
            <Text style={styles.emptyStateSubtext}>
              Friend requests will appear here
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.request_id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestAvatar}>
                  <Ionicons name="person" size={24} color="#666666" />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.from_name}</Text>
                  <Text style={styles.requestUsername}>@{request.from_username}</Text>
                  <Text style={styles.requestTime}>
                    {formatDistanceToNow(new Date(request.created_at), {
                      addSuffix: true,
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => acceptRequest(request.request_id)}
                  disabled={processing === request.request_id}
                >
                  {processing === request.request_id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => rejectRequest(request.request_id)}
                  disabled={processing === request.request_id}
                >
                  <Ionicons name="close" size={20} color="#666666" />
                  <Text style={[styles.actionButtonText, { color: '#666666' }]}>
                    Reject
                  </Text>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
  requestCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  requestUsername: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#444444',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#6C5CE7',
  },
  rejectButton: {
    backgroundColor: '#2A2A2A',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
