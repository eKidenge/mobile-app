import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';

// Web-compatible storage (for fallback)
const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        const SecureStore = await import('expo-secure-store');
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  async removeItem(key) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const { 
    user: authUser, 
    token, 
    logout, 
    isAuthenticated,
    professional: authProfessional,
    loading: authLoading 
  } = useAuth();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    sessionsCompleted: 0,
    totalSpent: 0,
    averageRating: 0
  });
  const [error, setError] = useState(null);

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com';

  useEffect(() => {
    initializeAuth();
  }, [authUser, token, isAuthenticated]);

  const initializeAuth = async () => {
    try {
      console.log('🔐 ProfileScreen: Initializing authentication...');
      console.log('📊 Auth Context State:', {
        isAuthenticated,
        hasUser: !!authUser,
        hasToken: !!token,
        authLoading
      });

      if (isAuthenticated && token && authUser) {
        console.log('✅ Using authenticated user from AuthContext');
        await fetchUserProfile(token);
      } else {
        console.log('❌ Not authenticated in AuthContext, checking storage...');
        // Fallback to storage check
        const storedToken = await Storage.getItem('authToken');
        if (storedToken && storedToken !== 'none' && storedToken !== 'undefined') {
          console.log('🔄 Using stored token as fallback');
          await fetchUserProfile(storedToken);
        } else {
          console.log('❌ No authentication available');
          setLoading(false);
          setError('Please log in to access your profile');
          setTimeout(() => {
            Alert.alert(
              'Authentication Required', 
              'Please log in to view your profile', 
              [
                { 
                  text: 'OK', 
                  onPress: () => router.replace('/login') 
                }
              ]
            );
          }, 1000);
        }
      }
    } catch (error) {
      console.error('💥 Error initializing auth:', error);
      setLoading(false);
      setError(`Authentication error: ${error.message}`);
    }
  };

  const fetchUserProfile = async (userToken) => {
    try {
      console.log('👤 Fetching user profile from database...');
      console.log('🔑 Using token:', userToken ? `${userToken.substring(0, 20)}...` : 'No token');
      
      setLoading(true);
      setError(null);

      if (!userToken) {
        throw new Error('No authentication token available');
      }

      // If we have user data from AuthContext, use it directly
      if (authUser && isAuthenticated) {
        console.log('✅ Using user data from AuthContext:', authUser);
        const processedUser = processUserData(authUser);
        setUser(processedUser);
        
        // Fetch additional stats
        await fetchUserStatsAndSessions(userToken, processedUser.id);
        return;
      }

      // Otherwise fetch from API endpoints
      const endpoints = [
        '/api/user/profile/',
        '/api/auth/user/',
        '/api/user/',
        '/api/me/'
      ];

      let userData = null;
      let profileError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${API_BASE_URL}${endpoint}`);
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${userToken}`,
              'Content-Type': 'application/json',
            },
          });

          console.log(`📡 Response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Success from ${endpoint}:`, data);
            userData = data;
            break;
          } else if (response.status === 401) {
            console.log('❌ Token invalid (401)');
            await handleInvalidToken();
            return;
          } else if (response.status === 404) {
            console.log(`❌ Endpoint not found: ${endpoint}`);
            profileError = `Profile endpoint not found: ${endpoint}`;
            continue;
          } else {
            const errorText = await response.text();
            console.log(`❌ HTTP ${response.status}:`, errorText);
            profileError = `Server error: ${response.status}`;
          }
        } catch (error) {
          console.log(`💥 Network error for ${endpoint}:`, error.message);
          profileError = `Network error: ${error.message}`;
        }
      }

      if (userData) {
        const processedUser = processUserData(userData);
        console.log('🎯 Processed user data:', processedUser);
        setUser(processedUser);
        
        // Fetch user stats and sessions
        await fetchUserStatsAndSessions(userToken, processedUser.id);
      } else {
        throw new Error(profileError || 'Unable to fetch user profile from any endpoint');
      }

    } catch (error) {
      console.error('💥 Error in fetchUserProfile:', error);
      setError(error.message);
      
      Alert.alert(
        'Profile Error', 
        'Unable to load your profile. Please try again.',
        [{ text: 'Retry', onPress: () => fetchUserProfile(userToken) }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processUserData = (userData) => {
    console.log('🔄 Processing raw user data:', userData);
    
    // Handle different response structures from your API
    const rawUser = userData.user || userData;
    
    // Map your API fields to app structure
    const processedUser = {
      id: rawUser.id || rawUser.user_id || rawUser.pk || 0,
      name: rawUser.name || 
            `${rawUser.first_name || ''} ${rawUser.last_name || ''}`.trim() || 
            rawUser.username || 
            rawUser.email?.split('@')[0] || 
            'User',
      email: rawUser.email || '',
      phone: rawUser.phone || rawUser.phone_number || rawUser.contact_number || '',
      username: rawUser.username || rawUser.email?.split('@')[0] || '',
      firstName: rawUser.first_name || rawUser.firstName || '',
      lastName: rawUser.last_name || rawUser.lastName || '',
      userType: rawUser.user_type || rawUser.role || rawUser.account_type || 'client',
      joinDate: rawUser.date_joined || rawUser.created_at || rawUser.join_date || rawUser.date_joined || new Date().toISOString(),
      bio: rawUser.bio || rawUser.about || rawUser.description || '',
      avatar: rawUser.avatar || rawUser.profile_picture || rawUser.image || null,
      isVerified: Boolean(rawUser.is_verified || rawUser.verified || rawUser.email_verified || false),
      address: rawUser.address || rawUser.location || '',
      dateOfBirth: rawUser.date_of_birth || rawUser.dob || null,
      // Professional data if available
      professional: authProfessional || rawUser.professional || null
    };

    console.log('✅ Final processed user:', processedUser);
    return processedUser;
  };

  const fetchUserStatsAndSessions = async (userToken, userId) => {
    try {
      console.log('📊 Fetching user stats and sessions...');
      
      // Fetch user sessions to calculate stats
      const sessionEndpoints = [
        `/api/sessions/`,
        `/api/user/sessions/`,
        `/api/session-history/`
      ];

      let sessionsData = null;

      for (const endpoint of sessionEndpoints) {
        try {
          console.log(`🔍 Trying sessions endpoint: ${endpoint}`);
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${userToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            sessionsData = await response.json();
            console.log('✅ Sessions data received');
            break;
          }
        } catch (error) {
          console.log(`💥 Sessions endpoint error:`, error.message);
        }
      }

      if (sessionsData) {
        // Extract sessions array from different response structures
        let sessionsArray = [];
        if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
          sessionsArray = sessionsData.sessions;
        } else if (sessionsData.results && Array.isArray(sessionsData.results)) {
          sessionsArray = sessionsData.results;
        } else if (Array.isArray(sessionsData)) {
          sessionsArray = sessionsData;
        }

        console.log(`📊 Found ${sessionsArray.length} sessions`);

        // Calculate stats from sessions
        const completedSessions = sessionsArray.filter(session => 
          session.status === 'completed' || session.status === 'ended'
        );

        const totalSpent = completedSessions.reduce((sum, session) => {
          const amount = session.cost || session.amount || session.price || session.total_amount || 0;
          return sum + parseFloat(amount);
        }, 0);

        // Calculate average rating if available
        const ratedSessions = completedSessions.filter(session => 
          session.rating || session.user_rating
        );
        
        const averageRating = ratedSessions.length > 0 
          ? ratedSessions.reduce((sum, session) => 
              sum + parseFloat(session.rating || session.user_rating || 0), 0) / ratedSessions.length
          : 0;

        const calculatedStats = {
          sessionsCompleted: completedSessions.length,
          totalSpent: totalSpent,
          averageRating: parseFloat(averageRating.toFixed(1))
        };

        console.log('📈 Calculated stats from sessions:', calculatedStats);
        setStats(calculatedStats);
      } else {
        console.log('⚠️ No sessions data available, using default stats');
        // Set default stats if no sessions data
        setStats({
          sessionsCompleted: 0,
          totalSpent: 0,
          averageRating: 0
        });
      }

    } catch (error) {
      console.error('Error in fetchUserStatsAndSessions:', error);
      // Set default stats on error
      setStats({
        sessionsCompleted: 0,
        totalSpent: 0,
        averageRating: 0
      });
    }
  };

  const handleInvalidToken = async () => {
    console.log('🔐 Token is invalid, clearing storage...');
    
    await Storage.removeItem('authToken');
    
    Alert.alert(
      'Session Expired', 
      'Your session has expired. Please log in again.',
      [
        { 
          text: 'OK', 
          onPress: () => router.replace('/login') 
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use AuthContext logout which handles everything
              await logout();
              
              // Redirect to login
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing profile...');
    setRefreshing(true);
    setError(null);
    if (token) {
      fetchUserProfile(token);
    } else {
      initializeAuth();
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatJoinDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const formatCurrency = (amount) => {
    return `KSH ${parseFloat(amount).toLocaleString()}`;
  };

  const formatRating = (rating) => {
    return parseFloat(rating).toFixed(1);
  };

  // Show loading if auth is still loading or profile is loading
  if (authLoading || (loading && !refreshing)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            {authLoading ? 'Checking authentication...' : 'Loading your profile...'}
          </Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
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
        {error && !user && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {user ? (
          <>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(user.name)}
                </Text>
                {user.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
              <Text style={styles.userType}>{user.userType}</Text>
              <Text style={styles.joinDate}>
                Member since {formatJoinDate(user.joinDate)}
              </Text>
              {user.bio ? (
                <Text style={styles.userBio}>{user.bio}</Text>
              ) : (
                <TouchableOpacity 
                  style={styles.addBioButton}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Text style={styles.addBioText}>+ Add Bio</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Stats Section */}
            <View style={styles.statsSection}>
              <Text style={styles.statsTitle}>Your Activity</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.sessionsCompleted}</Text>
                  <Text style={styles.statLabel}>Sessions Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{formatCurrency(stats.totalSpent)}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{formatRating(stats.averageRating)}</Text>
                  <Text style={styles.statLabel}>Average Rating</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/edit-profile')}
              >
                <Text style={styles.menuIcon}>👤</Text>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Edit Profile</Text>
                  <Text style={styles.menuSubtext}>Update your personal information</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.menuIcon}>⚙️</Text>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Settings</Text>
                  <Text style={styles.menuSubtext}>Preferences and notifications</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/payment-methods')}
              >
                <Text style={styles.menuIcon}>💳</Text>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Payment Methods</Text>
                  <Text style={styles.menuSubtext}>Manage your payment options</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/help-center')}
              >
                <Text style={styles.menuIcon}>❓</Text>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Help & Support</Text>
                  <Text style={styles.menuSubtext}>Get help and contact support</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Unable to load profile data</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryButtonLarge}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Debug Info - Remove in production */}
        {__DEV__ && user && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>User ID: {user.id}</Text>
            <Text style={styles.debugText}>User Type: {user.userType}</Text>
            <Text style={styles.debugText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
            {error && <Text style={styles.debugError}>Error: {error}</Text>}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827'
  },
  retryText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600'
  },
  scroll: {
    flex: 1,
    padding: 20
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8
  },
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative'
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff'
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  userPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  userType: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 8
  },
  joinDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12
  },
  userBio: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic'
  },
  addBioButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6
  },
  addBioText: {
    fontSize: 12,
    color: '#6B7280'
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24
  },
  menuContent: {
    flex: 1
  },
  menuText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 2
  },
  menuSubtext: {
    fontSize: 12,
    color: '#6B7280'
  },
  menuArrow: {
    fontSize: 20,
    color: '#9CA3AF'
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  retryButtonLarge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  debugInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  debugText: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 2
  },
  debugError: {
    fontSize: 10,
    color: '#DC2626',
	fontFamily: 'monospace',
    marginTop: 4,
    fontWeight: 'bold'
  }
});