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
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const router = useRouter();
  
  // User state
  const [user, setUser] = useState(null);
  const [authToken] = useState('9405d1cbfa1ddd723e48404cd67b1814f8375de7');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [buttonStates, setButtonStates] = useState({});

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com';

  // Fetch user profile
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
          id: userData.id || userData.user_id || 'USR-001',
          username: userData.username || userData.email || 'User',
          email: userData.email || '',
          firstName: userData.first_name || userData.firstName || '',
          lastName: userData.last_name || userData.lastName || '',
          phone: userData.phone || userData.phone_number || '',
          userType: userData.user_type || userData.role || 'client',
          createdAt: userData.created_at || userData.date_joined || '',
        };
        
        setUser(processedUser);
        await fetchUserSettings(processedUser.id);
      } else {
        console.log('ℹ️ Using default user data');
        setUser({
          id: 'USR-001',
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
      }
    } catch (error) {
      console.error(`Error updating ${settingKey}:`, error);
      Alert.alert('Error', `Failed to update ${settingKey}`);
    }
  };

  // Handle button press with hover effect
  const handleButtonPress = (buttonName, callback) => {
    // Set pressed state for visual feedback
    setButtonStates(prev => ({ ...prev, [buttonName]: true }));
    
    // Reset after 200ms
    setTimeout(() => {
      setButtonStates(prev => ({ ...prev, [buttonName]: false }));
    }, 200);
    
    // Execute the callback
    callback();
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

  // Navigation handlers
  const handleEditProfile = () => {
    console.log('📝 Edit Profile pressed');
    router.push('/edit-profile');
  };

  const handleChangePassword = () => {
    console.log('🔒 Change Password pressed');
    router.push('/change-password');
  };

  const handleHelpCenter = () => {
    console.log('❓ Help Center pressed');
    router.push('/help-center');
  };

  const handleContactSupport = () => {
    console.log('📞 Contact Support pressed');
    Alert.alert(
      'Contact Support',
      'How would you like to contact support?',
      [
        {
          text: 'Email',
          onPress: () => console.log('Send email to support'),
        },
        {
          text: 'Call',
          onPress: () => console.log('Call support'),
        },
        {
          text: 'Live Chat',
          onPress: () => router.push('/support-chat'),
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

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
        console.log('ℹ️ Backend logout endpoint not available');
      }

      // Clear local state
      setUser(null);
      console.log('✅ Logout completed');
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
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>Managing your preferences</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your settings...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Settings</Text>
        <Text style={styles.heroSubtitle}>
          Manage your account preferences and settings
        </Text>
        {user && (
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>
              {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
            </Text>
            <Text style={styles.userId}>ID: {user.id}</Text>
          </View>
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
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <TouchableOpacity 
            style={[
              styles.menuItem,
              buttonStates.editProfile && styles.menuItemPressed
            ]}
            onPress={() => handleButtonPress('editProfile', handleEditProfile)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Edit Profile</Text>
                <Text style={styles.menuItemSubtitle}>Update your personal information</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.menuItem,
              buttonStates.changePassword && styles.menuItemPressed
            ]}
            onPress={() => handleButtonPress('changePassword', handleChangePassword)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>🔒</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Change Password</Text>
                <Text style={styles.menuItemSubtitle}>Update your security credentials</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>🔔</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Push Notifications</Text>
                <Text style={styles.menuItemSubtitle}>Receive app notifications</Text>
              </View>
            </View>
            <Switch 
              value={notifications} 
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={notifications ? '#2563EB' : '#9CA3AF'}
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>📧</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Email Updates</Text>
                <Text style={styles.menuItemSubtitle}>Get updates via email</Text>
              </View>
            </View>
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
          <Text style={styles.sectionTitle}>Support & Information</Text>
          
          <TouchableOpacity 
            style={[
              styles.menuItem,
              buttonStates.helpCenter && styles.menuItemPressed
            ]}
            onPress={() => handleButtonPress('helpCenter', handleHelpCenter)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>❓</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Help Center</Text>
                <Text style={styles.menuItemSubtitle}>Find answers to common questions</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.menuItem,
              buttonStates.contactSupport && styles.menuItemPressed
            ]}
            onPress={() => handleButtonPress('contactSupport', handleContactSupport)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>📞</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Contact Support</Text>
                <Text style={styles.menuItemSubtitle}>Get help from our team</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.menuItem,
              buttonStates.termsPrivacy && styles.menuItemPressed
            ]}
            onPress={() => handleButtonPress('termsPrivacy', handleTermsPrivacy)}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemIcon}>📄</Text>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Terms & Privacy</Text>
                <Text style={styles.menuItemSubtitle}>Legal and privacy information</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[
            styles.logoutButton,
            buttonStates.logout && styles.logoutButtonPressed
          ]}
          onPress={() => handleButtonPress('logout', handleLogout)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>DirectConnect v1.0.0</Text>
          <Text style={styles.copyright}>© 2024 All rights reserved</Text>
        </View>
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
  heroSection: { 
    padding: 24, 
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  heroTitle: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
	},
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  userBadge: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  userBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  scroll: { 
    flex: 1,
    paddingHorizontal: 16,
  },
  section: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#6B7280', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 72,
  },
  menuItemPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  arrow: { 
    fontSize: 20, 
    color: '#9CA3AF',
    fontWeight: '300',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: '#DC2626', 
    margin: 20, 
    marginTop: 32,
    padding: 18,
    borderRadius: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  logoutButtonPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.2,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});