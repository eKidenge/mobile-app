import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProfessional } from '../../contexts/ProfessionalContext';

interface IncomingRequest {
  id: string;
  client_name: string;
  category: string;
  mode: 'chat' | 'audio' | 'video';
  created_at: string;
  client_id: string;
  session_id?: string;
}

export default function IncomingScreen() {
  const router = useRouter();
  const { professional, updateOnlineStatus } = useProfessional();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [polling, setPolling] = useState(true);

  // Set professional online when component mounts
  useEffect(() => {
    const setOnline = async () => {
      await updateOnlineStatus(true);
      setIsOnline(true);
    };
    
    setOnline();

    return () => {
      // Set offline when component unmounts
      updateOnlineStatus(false);
    };
  }, []);

  const fetchIncomingRequests = async () => {
    if (!professional?.id || !isOnline) return;
    
    try {
      const response = await fetch(`https://teleconnect-krga.onrender.com/professionals/${professional.id}/incoming-requests/`);
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        console.error('Failed to fetch requests:', response.status);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      // For demo purposes, add mock data
      if (requests.length === 0) {
        setRequests([
          {
            id: 'req-1',
            client_name: 'John Client',
            category: professional?.category || 'Medical Help',
            mode: 'chat',
            created_at: new Date().toISOString(),
            client_id: 'client-123'
          }
        ]);
      }
    }
  };

  useEffect(() => {
    if (!polling) return;

    // Initial fetch
    fetchIncomingRequests();

    // Poll every 3 seconds
    const interval = setInterval(fetchIncomingRequests, 3000);

    return () => clearInterval(interval);
  }, [professional?.id, isOnline, polling]);

  const handleAcceptRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://teleconnect-krga.onrender.com/sessions/${requestId}/accept/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professional_id: professional?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Stop polling when session starts
        setPolling(false);
        
        // Navigate to professional session screen
        router.push({
          pathname: '/professional-session',
          params: { 
            sessionId: data.session_id || requestId,
            clientId: data.client_id || 'client-123',
            mode: data.mode || 'chat'
          }
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to accept request');
      }
    } catch (error) {
      // For demo, navigate even if API fails
      setPolling(false);
      router.push({
        pathname: '/professional-session',
        params: { 
          sessionId: requestId,
          clientId: 'client-123',
          mode: 'chat'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await fetch(`https://teleconnect-krga.onrender.com/sessions/${requestId}/decline/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professional_id: professional?.id,
        }),
      });

      // Remove from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error declining request:', error);
      // Remove from local state even if API fails
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await updateOnlineStatus(newStatus);
    
    if (newStatus) {
      setPolling(true);
    } else {
      setPolling(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'chat': return '💬';
      case 'audio': return '📞';
      case 'video': return '📹';
      default: return '❓';
    }
  };

  if (!professional) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading professional profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Online Status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Waiting for Requests</Text>
          <Text style={styles.subtitle}>
            {isOnline ? 
              'Checking for new clients every 3 seconds...' : 
              'You are offline - switch to online to receive requests'
            }
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.onlineToggle, isOnline ? styles.online : styles.offline]}
          onPress={toggleOnlineStatus}
        >
          <Text style={styles.onlineToggleText}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.requestsContainer}>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {isOnline ? 'No incoming requests' : 'You are offline'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isOnline ? 
                'You\'ll be notified when a client needs help' : 
                'Switch to online to receive client requests'
              }
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.clientName}>{request.client_name}</Text>
                <Text style={styles.modeBadge}>
                  {getModeIcon(request.mode)} {request.mode.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.category}>Category: {request.category}</Text>
              <Text style={styles.time}>
                Requested: {new Date(request.created_at).toLocaleTimeString()}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  onPress={() => handleDeclineRequest(request.id)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={() => handleAcceptRequest(request.id)}
                  disabled={loading || !isOnline}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Accepting...' : 'Accept'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchIncomingRequests}
          disabled={!isOnline}
        >
          <Text style={styles.refreshText}>🔄 Refresh Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => router.push('/professional-dashboard')}
        >
          <Text style={styles.dashboardText}>📊 Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    maxWidth: '70%',
  },
  onlineToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#f44336',
  },
  onlineToggleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  requestsContainer: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modeBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    gap: 12,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dashboardButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dashboardText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});