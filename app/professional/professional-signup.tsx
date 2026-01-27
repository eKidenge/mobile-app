import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

interface Category {
  id: number;
  name: string;
  description: string;
  base_price: number;
}

interface ProfessionalFormData {
  name: string;
  email: string;
  phone: string;
  category_id: string;
  category_name: string;
  specialization: string;
  experience: string;
  license_number: string;
  bio: string;
  rate: string;
  password: string;
  confirm_password: string;
  username: string;
}

interface UploadedDocument {
  name: string;
  uri: string;
  type: string;
}

export default function ProfessionalSignupScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [formData, setFormData] = useState<ProfessionalFormData>({
    name: '',
    email: '',
    phone: '',
    category_id: '',
    category_name: '',
    specialization: '',
    experience: '',
    license_number: '',
    bio: '',
    rate: '50',
    password: '',
    confirm_password: '',
    username: ''
  });

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const response = await fetch('https://teleconnect-krga.onrender.com/api/categories/');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched categories:', data);
        // Handle different response formats
        if (data.categories) {
          setCategories(data.categories);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
      } else {
        console.warn('Failed to fetch categories, using fallback');
        // Use fallback categories
        setCategories([
          { id: 1, name: 'Legal', description: 'Legal advice and consultation', base_price: 100 },
          { id: 2, name: 'Medical', description: 'Medical consultation and advice', base_price: 150 },
          { id: 3, name: 'Mental Health', description: 'Counseling and psychological support', base_price: 120 },
          { id: 4, name: 'Career', description: 'Career guidance and coaching', base_price: 80 },
          { id: 5, name: 'Financial', description: 'Financial planning and advice', base_price: 200 },
          { id: 6, name: 'Tech Support', description: 'Technology support and consulting', base_price: 90 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Use fallback categories on error
      setCategories([
        { id: 1, name: 'Legal', description: 'Legal advice and consultation', base_price: 100 },
        { id: 2, name: 'Medical', description: 'Medical consultation and advice', base_price: 150 },
        { id: 3, name: 'Mental Health', description: 'Counseling and psychological support', base_price: 120 },
        { id: 4, name: 'Career', description: 'Career guidance and coaching', base_price: 80 },
      ]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Generate username from email when email changes
  useEffect(() => {
    if (formData.email && !formData.username) {
      const username = formData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      setFormData(prev => ({ ...prev, username }));
    }
  }, [formData.email]);

  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        const newDocument: UploadedDocument = {
          name: file.name || 'document',
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
        };
        
        setUploadedDocuments(prev => [...prev, newDocument]);
        Alert.alert('Success', 'Document uploaded successfully');
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirm_password) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!formData.category_id) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    if (!formData.specialization.trim()) {
      Alert.alert('Error', 'Please enter your specialization');
      return false;
    }
    if (!formData.experience.trim() || isNaN(parseInt(formData.experience)) || parseInt(formData.experience) < 0) {
      Alert.alert('Error', 'Please enter valid years of experience');
      return false;
    }
    if (!formData.license_number.trim()) {
      Alert.alert('Error', 'Please enter your license number');
      return false;
    }
    if (!formData.rate || isNaN(parseFloat(formData.rate)) || parseFloat(formData.rate) <= 0) {
      Alert.alert('Error', 'Please enter a valid rate per minute');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      console.log('🚀 Starting professional registration...');

      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // ========== STRATEGY: Try multiple payload formats ==========
      console.log('=== Attempting registration with different payloads ===');
      
      const payloadOptions = [
        // Option 1: Full payload with user_type (what backend says it needs)
        {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          password2: formData.confirm_password,
          first_name: firstName,
          last_name: lastName,
          phone: formData.phone.trim(),
          user_type: 'professional', // Required by backend
        },
        
        // Option 2: Minimal with user_type
        {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          user_type: 'professional',
        },
        
        // Option 3: With password2 but different field names
        {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          password_confirmation: formData.confirm_password,
          user_type: 'professional',
        },
        
        // Option 4: Try uppercase
        {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          password2: formData.confirm_password,
          user_type: 'PROFESSIONAL',
        },
        
        // Option 5: Try with role instead of user_type
        {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          password2: formData.confirm_password,
          role: 'professional',
        }
      ];

      let registerResponse = null;
      let registerData = null;
      let successfulPayload = null;

      // Try each payload
      for (let i = 0; i < payloadOptions.length; i++) {
        console.log(`\n=== Trying option ${i + 1} ===`);
        console.log('Payload:', payloadOptions[i]);
        
        try {
          registerResponse = await fetch('https://teleconnect-krga.onrender.com/api/register/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadOptions[i]),
          });

          const responseText = await registerResponse.text();
          console.log(`Response status: ${registerResponse.status}`);
          console.log('Response text:', responseText);

          if (registerResponse.ok) {
            try {
              registerData = JSON.parse(responseText);
              successfulPayload = payloadOptions[i];
              console.log(`✅ Success with option ${i + 1}!`);
              console.log('Response data:', registerData);
              break;
            } catch (parseError) {
              console.log(`⚠️ Could not parse response as JSON:`, parseError);
              // Even if parse fails, if status is 200, registration might have worked
              if (registerResponse.status >= 200 && registerResponse.status < 300) {
                console.log('✅ Registration likely successful despite parse error');
                registerData = { success: true, message: 'Registration successful' };
                successfulPayload = payloadOptions[i];
                break;
              }
            }
          } else {
            // Check if it's the duplicate key error (which means user was created)
            if (responseText.includes('duplicate key') || 
                responseText.includes('user_id') || 
                responseText.includes('already exists')) {
              
              console.log('⚠️ Duplicate key error - user was created!');
              console.log('This indicates the User was created successfully, but UserProfile failed.');
              
              // User was created, we can proceed
              registerData = { 
                success: true, 
                message: 'User created (duplicate key error on profile)',
                user_created: true 
              };
              successfulPayload = payloadOptions[i];
              break;
            }
            
            console.log(`❌ Option ${i + 1} failed`);
          }
        } catch (networkError) {
          console.log(`⚠️ Network error:`, networkError.message);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if we got a successful registration
      if (!registerData || !registerData.success) {
        throw new Error('Registration failed with all payload options');
      }

      console.log('✅ Registration step complete');
      console.log('Register data:', registerData);
      console.log('Successful payload:', successfulPayload);

      // Wait for signals to process
      console.log('⏳ Waiting for backend signals (5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // ========== ATTEMPT LOGIN ==========
      console.log('\n🔐 Attempting login...');
      
      let loginAttempts = 0;
      let loginData = null;
      let token = null;
      
      while (loginAttempts < 3 && !token) {
        loginAttempts++;
        console.log(`Login attempt ${loginAttempts}...`);
        
        try {
          const loginResponse = await fetch('https://teleconnect-krga.onrender.com/api/login/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: formData.username.trim(),
              password: formData.password
            }),
          });

          const loginText = await loginResponse.text();
          console.log('Login response:', loginText);

          if (loginResponse.ok) {
            loginData = JSON.parse(loginText);
            token = loginData.access || loginData.token || loginData.access_token;
            
            if (token) {
              console.log('✅ Login successful! Token received');
              break;
            }
          }
        } catch (loginError) {
          console.log(`Login attempt ${loginAttempts} failed:`, loginError.message);
        }
        
        if (loginAttempts < 3) {
          console.log('Waiting 2 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!token) {
        console.warn('⚠️ Could not login automatically');
        showSuccessAlert(
          'Registration Successful! 🎉',
          'Your account has been created. Please log in with your credentials to access your dashboard.',
          true
        );
        return;
      }

      // ========== ATTEMPT TO UPDATE USER PROFILE ==========
      console.log('🔄 Attempting to update/set professional data...');
      
      try {
        // First, check if we can get the current user
        const userResponse = await fetch('https://teleconnect-krga.onrender.com/api/user/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('Current user data:', userData);
          
          // Try to update via PATCH if endpoint exists
          const updateEndpoints = [
            '/api/user/profile/',
            '/api/user/',
            '/api/profile/',
            '/api/professional/profile/'
          ];
          
          for (const endpoint of updateEndpoints) {
            try {
              const updateResponse = await fetch(`https://teleconnect-krga.onrender.com${endpoint}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_type: 'professional',
                  specialization: formData.specialization.trim(),
                  license_number: formData.license_number.trim(),
                  experience: parseInt(formData.experience),
                  bio: formData.bio.trim(),
                  rate: parseFloat(formData.rate),
                  category_id: parseInt(formData.category_id) || null,
                })
              });
              
              if (updateResponse.ok) {
                console.log(`✅ Updated via ${endpoint}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (profileError) {
        console.log('Profile update attempt failed:', profileError.message);
        // This is okay - we'll continue
      }

      // ========== PREPARE AUTH DATA ==========
      const authData = {
        token: token,
        user: {
          id: loginData?.user_id || registerData?.user_id,
          username: formData.username.trim(),
          email: formData.email.trim(),
          first_name: firstName,
          last_name: lastName,
          user_type: 'professional', // Force for auth context
          phone: formData.phone.trim()
        },
        professional: {
          name: formData.name.trim(),
          specialization: formData.specialization.trim(),
          category_id: parseInt(formData.category_id),
          category_name: formData.category_name,
          status: 'pending',
          rate: parseFloat(formData.rate),
          experience: parseInt(formData.experience),
          license_number: formData.license_number.trim(),
          bio: formData.bio.trim()
        },
        _debug: {
          registerData,
          loginData,
          successfulPayload
        }
      };

      console.log('📋 Prepared auth data:', authData);

      // ========== UPDATE AUTH CONTEXT ==========
      if (login) {
        try {
          await login(authData);
          console.log('✅ Auth context updated');
          
          Alert.alert(
            'Registration Successful! 🎉',
            'Your professional account has been created and is pending admin approval.\n\nYou can now access your dashboard.',
            [
              {
                text: 'Go to Dashboard',
                onPress: () => {
                  router.replace('/professional/professional-pending');
                }
              }
            ],
            { cancelable: false }
          );
          
        } catch (authError) {
          console.error('❌ Auth context error:', authError);
          showSuccessAlert(
            'Registration Successful!',
            'Your account has been created. Please log in to access your dashboard.',
            true
          );
        }
      } else {
        showSuccessAlert(
          'Registration Successful!',
          'Your account has been created. Please log in to access your dashboard.',
          true
        );
      }

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = 'Registration failed. ';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // User-friendly error messages
        if (errorMessage.includes('already exists')) {
          errorMessage = 'Username or email already exists. Please use different credentials.';
        } else if (errorMessage.includes('password')) {
          errorMessage = 'Password requirements not met.';
        } else if (errorMessage.includes('email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (errorMessage.includes('phone')) {
          errorMessage = 'Please enter a valid phone number.';
        } else if (errorMessage.includes('user_type')) {
          errorMessage = 'Registration error. Please try again or contact support.';
        }
        
        // Clean error message
        errorMessage = errorMessage
          .replace(/\[.*?\]/g, '')
          .replace(/\{.*?\}/g, '')
          .replace(/\\n/g, ' ')
          .trim();
      }
      
      Alert.alert(
        'Registration Failed',
        errorMessage,
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to show success alert
  const showSuccessAlert = (title: string, message: string, goToLogin: boolean = false) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: goToLogin ? 'Go to Login' : 'OK',
          onPress: () => {
            if (goToLogin) {
              router.replace('../../login');
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  const selectCategory = (category: Category) => {
    setFormData({
      ...formData,
      category_id: category.id.toString(),
      category_name: category.name
    });
    setShowCategoryModal(false);
  };

  // Render category item
  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        formData.category_id === item.id.toString() && styles.categoryItemSelected
      ]}
      onPress={() => selectCategory(item)}
    >
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryDescription}>{item.description}</Text>
        <Text style={styles.categoryPrice}>Base Rate: KSH {item.base_price}/min</Text>
      </View>
      {formData.category_id === item.id.toString() && (
        <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
      )}
    </TouchableOpacity>
  );

  // Render empty categories component
  const renderEmptyCategories = () => (
    <View style={styles.emptyCategories}>
      <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
      <Text style={styles.emptyText}>No categories available</Text>
      <TouchableOpacity onPress={fetchCategories} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Professional Registration</Text>
        </View>

        <ScrollView 
          style={styles.scroll} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.introSection}>
              <Ionicons name="person-circle-outline" size={48} color="#2563EB" />
              <Text style={styles.subtitle}>
                DIRECTCONNECT TECHNOLOGIES
              </Text>
              <Text style={styles.introText}>
                "Skip the search, get the answer."
              </Text>
            </View>

            {/* Account Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="person-outline" size={18} color="#2563EB" /> Account Information
              </Text>
              
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                editable={!loading}
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                value={formData.username}
                onChangeText={(text) => setFormData({...formData, username: text})}
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="0712345678"
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                keyboardType="phone-pad"
                editable={!loading}
              />

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
                
                <View style={styles.column}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    value={formData.confirm_password}
                    onChangeText={(text) => setFormData({...formData, confirm_password: text})}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* Professional Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="briefcase-outline" size={18} color="#2563EB" /> Professional Information
              </Text>

              <Text style={styles.label}>Professional Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of your professional background and expertise..."
                value={formData.bio}
                onChangeText={(text) => setFormData({...formData, bio: text})}
                multiline
                numberOfLines={4}
                editable={!loading}
              />

              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryModal(true)}
                disabled={loading}
              >
                <Text style={formData.category_name ? styles.categorySelectedText : styles.categoryPlaceholderText}>
                  {formData.category_name || 'Select your professional category'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.label}>Specialization *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Family Law, Pediatrics, Career Counseling"
                value={formData.specialization}
                onChangeText={(text) => setFormData({...formData, specialization: text})}
                editable={!loading}
              />

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Experience (Years) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 5"
                    value={formData.experience}
                    onChangeText={(text) => setFormData({...formData, experience: text})}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
                
                <View style={styles.column}>
                  <Text style={styles.label}>Rate (KSH/min) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 50"
                    value={formData.rate}
                    onChangeText={(text) => setFormData({...formData, rate: text})}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
              </View>

              <Text style={styles.label}>License Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your professional license/certification number"
                value={formData.license_number}
                onChangeText={(text) => setFormData({...formData, license_number: text})}
                editable={!loading}
              />
            </View>

            {/* Document Upload - Now Optional */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="document-attach-outline" size={18} color="#2563EB" /> Document Verification (Optional)
              </Text>
              
              <View style={styles.uploadInfo}>
                <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
                <Text style={styles.uploadInfoText}>
                  Upload your professional license, certification, or any supporting documents (PDF, JPG, PNG)
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.uploadBtn} 
                onPress={handleDocumentUpload}
                disabled={loading}
              >
                <Ionicons name="cloud-upload-outline" size={24} color="#2563EB" />
                <View style={styles.uploadBtnText}>
                  <Text style={styles.uploadText}>Upload Documents (Optional)</Text>
                  <Text style={styles.uploadSubtext}>Tap to select files</Text>
                </View>
              </TouchableOpacity>

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <View style={styles.documentsList}>
                  <Text style={styles.documentsTitle}>
                    Uploaded Documents ({uploadedDocuments.length})
                  </Text>
                  {uploadedDocuments.map((doc, index) => (
                    <View key={index} style={styles.documentItem}>
                      <View style={styles.documentInfo}>
                        <Ionicons name="document-text" size={20} color="#4B5563" />
                        <View style={styles.documentDetails}>
                          <Text style={styles.documentName} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Text style={styles.documentType}>
                            {doc.type || 'Document'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => removeDocument(index)}
                        disabled={loading}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Creating Account...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitText}>Create Professional Account</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => router.push('../../login')}
              disabled={loading}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Category Selection Modal */}
        <Modal
          visible={showCategoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity 
                  onPress={() => setShowCategoryModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Choose your primary professional category
                </Text>
                
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderCategoryItem}
                  ListEmptyComponent={renderEmptyCategories}
                  style={styles.categoryList}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827',
    flex: 1
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20
  },
  form: { 
    padding: 16 
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }
    })
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 8, 
    marginTop: 16 
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  input: { 
    backgroundColor: '#F9FAFB', 
    borderRadius: 8, 
    padding: 14, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },
  categorySelector: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  categorySelectedText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  categoryPlaceholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  uploadInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#2563EB',
    marginLeft: 8,
    lineHeight: 20,
  },
  uploadBtn: { 
    backgroundColor: '#F9FAFB', 
    padding: 20, 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    alignItems: 'center',
    marginTop: 8,
  },
  uploadText: { 
    fontSize: 16, 
    color: '#111827', 
    fontWeight: '600',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  documentsList: {
    marginTop: 16,
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  documentItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  documentType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  submitBtn: { 
    backgroundColor: '#2563EB', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    marginLeft: 8,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#2563EB',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0px -10px 30px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalDescription: {
    fontSize: 14,
	color: '#6B7280',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  categoryPrice: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  emptyCategories: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});