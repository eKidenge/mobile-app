import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function LogoutScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [status, setStatus] = useState('logging_out');

  const performLogout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      setStatus('logging_out');

      // Use the AuthContext logout function
      await logout();
      
      setStatus('success');
      
      // Wait a moment to show success message, then redirect
      setTimeout(() => {
        console.log('✅ Logout completed, redirecting to login...');
        // Use replace to clear navigation stack and go to login
        router.replace('/login');
      }, 1500);

    } catch (error) {
      console.error('💥 Logout error:', error);
      setStatus('error');
      
      // Even if there's an error, redirect to login
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
    }
  };

  useEffect(() => {
    performLogout();
  }, []);

  const getStatusMessage = () => {
    switch (status) {
      case 'logging_out':
        return {
          title: 'Logging Out...',
          message: 'Please wait while we securely sign you out',
          icon: '🔒'
        };
      case 'success':
        return {
          title: 'Logged Out Successfully',
          message: 'You have been securely signed out',
          icon: '✅'
        };
      case 'error':
        return {
          title: 'Logout Complete',
          message: 'You have been signed out',
          icon: 'ℹ️'
        };
      default:
        return {
          title: 'Logging Out...',
          message: 'Please wait',
          icon: '⏳'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{statusInfo.icon}</Text>
        <Text style={styles.title}>{statusInfo.title}</Text>
        <Text style={styles.message}>{statusInfo.message}</Text>
        
        {status === 'logging_out' && (
          <ActivityIndicator size="large" color="#2563EB" style={styles.spinner} />
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Redirecting to login screen...
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  footer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});