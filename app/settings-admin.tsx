import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

export default function SettingsScreen() {
  const router = useRouter();
  
  // User state and authentication
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState('9405d1cbfa1ddd723e48404cd67b1814f8375de7');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com';

  // Fetch user profile and settings
  const fetchUserProfile = async () => {
    try {
      console.log('👤 Fetching user profile...');
      
      if (!authToken) {
        console.log('🔐 No auth token available');
        setLoading(false);
        return;
      }

      // Try multiple user profile endpoints
      const endpoints = [
        '/api/user/profile/',
        '/api/user/',
        '/api/auth/user/',
        '/api/me/'
      ];

      let success = false;
      let userData = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ User profile fetched from ${endpoint}:`, data);
            userData = data;
            success = true;
            break;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
        }
      }

      if (success) {
        // Process user data based on different response structures
        const processedUser = {
          id: userData.id || userData.user_id || 1,
          username: userData.username || userData.email || 'User',
          email: userData.email || '',
          firstName: userData.first_name || userData.firstName || '',
          lastName: userData.last_name || userData.lastName || '',
          phone: userData.phone || userData.phone_number || '',
          userType: userData.user_type || userData.role || 'client',
          createdAt: userData.created_at || userData.date_joined || '',
        };
        
        setUser(processedUser);
        
        // Fetch user settings
		await fetchUserSettings(processedUser.id);
      } else {
        console.log('ℹ️ Using default user data');
        setUser({
          id: 1,
          username: 'user',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: 'client'
        });
      }

    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch user settings
  const fetchUserSettings = async (userId) => {
    try {
      const endpoints = [
        `/api/user/${userId}/settings/`,
        '/api/user/settings/',
        '/api/settings/'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const settings = await response.json();
            console.log('⚙️ User settings:', settings);
            
            // Update settings based on backend response
            if (settings.push_notifications !== undefined) {
              setNotifications(settings.push_notifications);
            }
            if (settings.email_updates !== undefined) {
              setEmailUpdates(settings.email_updates);
            }
            break;
          }
        } catch (error) {
          console.log(`💥 Settings endpoint ${endpoint} error:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Update settings on backend
  const updateSetting = async (settingKey, value) => {
    try {
      console.log(`🔄 Updating ${settingKey} to:`, value);
      
      const endpoints = [
        '/api/user/settings/',
        '/api/settings/'
      ];

      const settingData = {
        [settingKey]: value,
        user_id: user?.id
      };

      let success = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingData),
          });

          if (response.ok) {
            console.log(`✅ ${settingKey} updated successfully via ${endpoint}`);
            success = true;
            break;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} update error:`, error.message);
        }
      }

      if (!success) {
        console.log('ℹ️ Settings endpoint not available, storing locally');
        // Settings are stored in local state already
      }
    } catch (error) {
      console.error(`Error updating ${settingKey}:`, error);
      Alert.alert('Error', `Failed to update ${settingKey}`);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = (value) => {
    setNotifications(value);
    updateSetting('push_notifications', value);
  };

  // Handle email updates toggle
  const handleEmailUpdatesToggle = (value) => {
    setEmailUpdates(value);
    updateSetting('email_updates', value);
  };

  // Edit Profile
  const handleEditProfile = () => {
    console.log('📝 Edit Profile pressed');
    router.push('/edit-profile');
  };

  // Payment Methods
  const handlePaymentMethods = () => {
    console.log('💳 Payment Methods pressed');
    router.push('/payment-methods');
  };

  // Change Password
  const handleChangePassword = () => {
    console.log('🔒 Change Password pressed');
    router.push('/change-password');
  };

  // Help Center
  const handleHelpCenter = () => {
    console.log('❓ Help Center pressed');
    router.push('/help-center');
  };

  // Contact Support
  const handleContactSupport = () => {
    console.log('📞 Contact Support pressed');
    
    // You can implement different contact methods
    Alert.alert(
      'Contact Support',
      'How would you like to contact support?',
      [
        {
          text: 'Email',
          onPress: () => {
            // Implement email functionality
            console.log('Send email to support');
          }
        },
        {
          text: 'Call',
          onPress: () => {
            // Implement call functionality
            console.log('Call support');
          }
        },
        {
          text: 'Live Chat',
          onPress: () => {
            router.push('/support-chat');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // Terms & Privacy
  const handleTermsPrivacy = () => {
    console.log('📄 Terms & Privacy pressed');
    router.push('/terms-privacy');
  };

  // Logout function
  const handleLogout = () => {
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
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      setLoading(true);
      console.log('🚪 Logging out...');

      // Call logout endpoint on backend
      const endpoints = [
        '/api/auth/logout/',
        '/api/user/logout/',
        '/api/logout/'
      ];

      let backendLogoutSuccess = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            console.log(`✅ Backend logout successful via ${endpoint}`);
            backendLogoutSuccess = true;
            break;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} logout error:`, error.message);
        }
      }

      if (!backendLogoutSuccess) {
        console.log('ℹ️ Backend logout endpoint not available, proceeding with client-side logout');
      }

      // Clear local authentication state
      setAuthToken(null);
      setUser(null);
      
      // Clear any stored tokens (you might be using AsyncStorage or similar)
      // await AsyncStorage.removeItem('authToken');
      // await AsyncStorage.removeItem('userData');

      console.log('✅ Logout completed');
      
      // Navigate to login screen
      router.replace('/login');

    } catch (error) {
      console.error('💥 Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing settings...');
    setRefreshing(true);
    fetchUserProfile();
  };

  useEffect(() => {
    console.log('🎬 SettingsScreen mounted');
    fetchUserProfile();
  }, []);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.title}>Settings</Text>
        {user && (
          <Text style={styles.subtitle}>
            {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
          </Text>
        )}
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
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.item} onPress={handleEditProfile}>
            <Text style={styles.itemText}>Edit Profile</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={handlePaymentMethods}>
            <Text style={styles.itemText}>Payment Methods</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={handleChangePassword}>
            <Text style={styles.itemText}>Change Password</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.item}>
            <Text style={styles.itemText}>Push Notifications</Text>
            <Switch 
              value={notifications} 
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={notifications ? '#2563EB' : '#9CA3AF'}
            />
          </View>
          <View style={styles.item}>
            <Text style={styles.itemText}>Email Updates</Text>
            <Switch 
              value={emailUpdates} 
              onValueChange={handleEmailUpdatesToggle}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={emailUpdates ? '#2563EB' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.item} onPress={handleHelpCenter}>
            <Text style={styles.itemText}>Help Center</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={handleContactSupport}>
            <Text style={styles.itemText}>Contact Support</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={handleTermsPrivacy}>
            <Text style={styles.itemText}>Terms & Privacy</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.logoutText}>Log Out</Text>
          )}
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>Version {appVersion}</Text>
        <Text style={styles.userId}>User ID: {user?.id || 'N/A'}</Text>
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
    flex: 1 
  },
  section: { 
    backgroundColor: '#fff', 
    marginTop: 20, 
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#6B7280', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    textTransform: 'uppercase' 
  },
  item: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  itemText: { 
    fontSize: 16, 
    color: '#111827' 
  },
  arrow: { 
    fontSize: 20, 
    color: '#9CA3AF' 
  },
  logoutBtn: { 
    backgroundColor: '#DC2626', 
    margin: 20, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  version: { 
    fontSize: 12, 
    color: '#9CA3AF', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  userId: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 40
  },
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
});