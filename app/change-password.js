import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [authToken] = useState('9405d1cbfa1ddd723e48404cd67b1814f8375de7');
  const API_BASE_URL = 'https://teleconnect-krga.onrender.com';

  const handleChangePassword = async () => {
    try {
      // Validation
      if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
        Alert.alert('Validation Error', 'Please fill in all fields');
        return;
      }

      if (passwords.newPassword.length < 6) {
        Alert.alert('Validation Error', 'New password must be at least 6 characters long');
        return;
      }

      if (passwords.newPassword !== passwords.confirmPassword) {
        Alert.alert('Validation Error', 'New passwords do not match');
        return;
      }

      if (passwords.newPassword === passwords.currentPassword) {
        Alert.alert('Validation Error', 'New password must be different from current password');
        return;
      }

      setLoading(true);
      console.log('🔐 Changing password...');

      const passwordData = {
        current_password: passwords.currentPassword,
        new_password: passwords.newPassword,
        confirm_password: passwords.confirmPassword
      };

      const endpoints = [
        '/api/auth/change-password/',
        '/api/user/change-password/',
        '/api/change-password/'
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
            body: JSON.stringify(passwordData),
          });

          if (response.ok) {
            console.log(`✅ Password changed via ${endpoint}`);
            success = true;
            break;
          } else if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Current password is incorrect');
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          if (error.message.includes('Current password')) {
            throw error;
          }
        }
      }

      if (success) {
        Alert.alert(
          'Success',
          'Your password has been changed successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        throw new Error('All password change endpoints failed');
      }

    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.description}>
            For security reasons, please enter your current password and then your new password twice.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={passwords.currentPassword}
              onChangeText={(text) => setPasswords({...passwords, currentPassword: text})}
              placeholder="Enter your current password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={passwords.newPassword}
              onChangeText={(text) => setPasswords({...passwords, newPassword: text})}
              placeholder="Enter new password (min. 6 characters)"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={passwords.confirmPassword}
              onChangeText={(text) => setPasswords({...passwords, confirmPassword: text})}
              placeholder="Confirm your new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirement}>• At least 6 characters long</Text>
            <Text style={styles.requirement}>• Should not match current password</Text>
          </View>

          <TouchableOpacity 
            style={[styles.changeButton, loading && styles.changeButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.changeButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827'
  },
  scroll: {
    flex: 1,
    padding: 20
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  passwordRequirements: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  requirement: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  changeButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  changeButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600'
  }
});