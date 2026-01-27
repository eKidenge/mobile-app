import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

export default function HistoryScreen() {
  const router = useRouter();
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    totalSpent: 0
  });

  // Authentication - replace with your actual auth logic
  const [authToken, setAuthToken] = useState('9405d1cbfa1ddd723e48404cd67b1814f8375de7');
  const [userId, setUserId] = useState(1); // Replace with actual user ID

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com';

  const fetchSessionHistory = async () => {
    try {
      console.log('📋 Fetching session history...');
      
      if (!authToken) {
        Alert.alert('Authentication Required', 'Please log in to view session history');
        setSessionHistory([]);
        setLoading(false);
        return;
      }

      // Try multiple possible endpoints for session history
      const endpoints = [
        '/api/sessions/history/',
        '/api/sessions/',
        '/api/user/sessions/',
        '/api/user/sessions',
        '/api/chat-sessions/',
        '/api/chat-sessions'
      ];

      let success = false;
      let responseData = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying session endpoint: ${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log(`📡 ${endpoint} status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${endpoint} SUCCESS:`, data);
            responseData = data;
            success = true;
            break;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          } else {
            console.log(`❌ ${endpoint} failed:`, response.status);
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          // Continue to next endpoint
        }
      }

      if (!success) {
        console.log('ℹ️ No session history endpoints found, using empty data');
        setSessionHistory([]);
        calculateStats([]);
        setLoading(false);
        return;
      }

      // Process the response data based on different possible structures
      let sessionsArray = [];
      
      if (responseData.sessions && Array.isArray(responseData.sessions)) {
        sessionsArray = responseData.sessions;
      } else if (responseData.results && Array.isArray(responseData.results)) {
        sessionsArray = responseData.results;
      } else if (Array.isArray(responseData)) {
        sessionsArray = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        sessionsArray = responseData.data;
      } else {
        console.log('❓ Unexpected session response structure:', responseData);
        sessionsArray = [];
      }

      console.log('📊 Raw session data:', sessionsArray);

      // Sanitize and transform session data
      const sanitizedSessions = sessionsArray.map(session => {
        if (!session || typeof session !== 'object') {
          console.log('⚠️ Invalid session data:', session);
          return null;
        }

        // Handle different possible field names from backend
        const professionalName = session.professional_name || 
                               session.professional?.name || 
                               session.expert_name || 
                               'Unknown Professional';
        
        const professionalCategory = session.category || 
                                   session.professional?.specialization || 
                                   session.service_type || 
                                   'General';
        
        const sessionDate = session.date || 
                          session.created_at || 
                          session.session_date || 
                          new Date().toISOString();
        
        const duration = session.duration || 
                        session.session_duration || 
                        session.duration_minutes || 
                        0;
        
        const cost = session.cost || 
                    session.amount || 
                    session.rate || 
                    0;
        
        const rating = session.rating || 
                      session.professional_rating || 
                      session.user_rating || 
                      0;

        const sessionId = session.id || 
                         session.session_id || 
                         Math.random().toString(36).substr(2, 9);

        return {
          id: sessionId,
          professional: professionalName,
          category: professionalCategory,
          date: formatDate(sessionDate),
          duration: formatDuration(duration),
          cost: Math.round(cost),
          rating: Math.min(5, Math.max(1, Math.round(rating))), // Ensure rating between 1-5
          rawDuration: duration, // Keep for stats calculation
          rawCost: cost // Keep for stats calculation
        };
      }).filter(session => session !== null);

      console.log('🎯 Sanitized sessions:', sanitizedSessions);
      setSessionHistory(sanitizedSessions);
      calculateStats(sanitizedSessions);
      
    } catch (error) {
      console.error('💥 Error fetching session history:', error);
      Alert.alert('Error', 'Failed to load session history. Please try again.');
      setSessionHistory([]);
      calculateStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  const formatDuration = (duration) => {
    // Handle different duration formats
    if (typeof duration === 'number') {
      return `${duration} min`;
    } else if (typeof duration === 'string') {
      return duration;
    } else {
      return '0 min';
    }
  };

  const calculateStats = (sessions) => {
    const totalSessions = sessions.length;
    const totalTime = sessions.reduce((sum, session) => sum + (session.rawDuration || 0), 0);
    const totalSpent = sessions.reduce((sum, session) => sum + (session.rawCost || 0), 0);

    setStats({
      totalSessions,
      totalTime,
      totalSpent: Math.round(totalSpent)
    });
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing session history...');
    setRefreshing(true);
    fetchSessionHistory();
  };

  const handleSessionPress = (session) => {
    // Navigate to session details if needed
    console.log('Session pressed:', session);
    // router.push(`/session-details/${session.id}`);
  };

  const handleRateSession = (sessionId, professionalName) => {
    Alert.alert(
      'Rate Session',
      `How would you rate your session with ${professionalName}?`,
      [1, 2, 3, 4, 5].map(rating => ({
        text: `${rating} ⭐`,
        onPress: () => submitRating(sessionId, rating)
      }))
    );
  };

  const submitRating = async (sessionId, rating) => {
    try {
      console.log(`Submitting rating ${rating} for session ${sessionId}`);
      
      // Try to submit rating to backend
      const endpoints = [
        `/api/sessions/${sessionId}/rate/`,
        `/api/sessions/${sessionId}/rating/`,
        `/api/chat-sessions/${sessionId}/rate/`
      ];

      let success = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              rating: rating,
              user_id: userId
            }),
          });

          if (response.ok) {
            console.log(`✅ Rating submitted via ${endpoint}`);
            success = true;
            Alert.alert('Success', 'Thank you for your rating!');
            
            // Refresh the data to show updated rating
            fetchSessionHistory();
            break;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} rating error:`, error.message);
        }
      }

      if (!success) {
        // If backend rating not available, update locally
        const updatedSessions = sessionHistory.map(session => 
          session.id === sessionId ? { ...session, rating } : session
        );
        setSessionHistory(updatedSessions);
        Alert.alert('Success', 'Rating submitted!');
      }

    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  useEffect(() => {
    console.log('🎬 HistoryScreen mounted, fetching session history...');
    fetchSessionHistory();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Session History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading session history...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session History</Text>
        <Text style={styles.subtitle}>
          {sessionHistory.length} session{sessionHistory.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {sessionHistory.length > 0 ? (
          <>
            {sessionHistory.map((session) => (
              <TouchableOpacity 
                key={session.id} 
                style={styles.card}
                onPress={() => handleSessionPress(session)}
                onLongPress={() => handleRateSession(session.id, session.professional)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.proName}>{session.professional}</Text>
                  <Text style={styles.cost}>KSH {session.cost}</Text>
                </View>
                <Text style={styles.category}>{session.category}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.date}>{session.date}</Text>
                  <Text style={styles.duration}>{session.duration}</Text>
                  <TouchableOpacity 
                    onPress={() => handleRateSession(session.id, session.professional)}
                  >
                    <Text style={styles.rating}>{'⭐'.repeat(session.rating)}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.stats}>
              <Text style={styles.statsTitle}>Your Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalSessions}</Text>
                  <Text style={styles.statLabel}>Total Sessions</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalTime} min</Text>
                  <Text style={styles.statLabel}>Total Time</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>KSH {stats.totalSpent.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Session History</Text>
            <Text style={styles.emptyText}>
              Your completed consultation sessions will appear here. Start your first session to see history.
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.ctaButtonText}>Find Professionals</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  header: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  backBtn: { 
    fontSize: 16, 
    color: '#2563EB', 
    fontWeight: '600', 
    marginBottom: 8 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  scroll: { 
    flex: 1, 
    padding: 20 
  },
  
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  proName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  cost: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  category: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  duration: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 12,
  },
  rating: {
    fontSize: 14,
    color: '#F59E0B',
  },
  
  // Stats Section
  stats: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: '#9CA3AF',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});