import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsPrivacyScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('terms');

  const termsContent = `
Last Updated: October 2024

Please read these Terms and Conditions carefully before using our consultation services.

1. Acceptance of Terms
By accessing and using ConsultApp, you accept and agree to be bound by the terms and provision of this agreement.

2. Consultation Services
- Our platform connects users with qualified professionals
- All professionals are verified but we recommend you do your own due diligence
- Sessions are charged per minute as displayed
- Payments are processed securely through our platform

3. User Responsibilities
- Provide accurate information
- Maintain the confidentiality of your account
- Use the service in compliance with all applicable laws
- Respect the professionals and other users

4. Payment and Billing
- You agree to pay all fees associated with your use of the service
- Fees are displayed before starting each session
- Refunds are subject to our refund policy

5. Intellectual Property
All content on this platform is our property and protected by copyright laws.

6. Limitation of Liability
We are not liable for any damages resulting from the use of our service.
  `;

  const privacyContent = `
Last Updated: October 2024

Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.

1. Information We Collect
- Personal identification information
- Consultation history and preferences
- Payment information
- Device and usage data

2. How We Use Your Information
- To provide and maintain our service
- To notify you about changes to our service
- To provide customer support
- To gather analysis or valuable information

3. Data Security
We implement appropriate security measures to protect your personal information.

4. Data Sharing
We do not sell, trade, or rent your personal identification information to others.

5. Your Rights
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Object to processing of your data

6. Cookies
We use cookies to improve your experience on our platform.

7. Changes to This Policy
We may update our Privacy Policy from time to time.
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Privacy</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
          onPress={() => setActiveTab('privacy')}
        >
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.contentText}>
            {activeTab === 'terms' ? termsContent : privacyContent}
          </Text>
          
          <View style={styles.agreement}>
            <Text style={styles.agreementTitle}>Your Agreement</Text>
            <Text style={styles.agreementText}>
              By using our application, you acknowledge that you have read and understood these {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'} and agree to be bound by them.
            </Text>
          </View>

          <View style={styles.contact}>
            <Text style={styles.contactTitle}>Questions?</Text>
            <Text style={styles.contactText}>
              If you have any questions about our {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}, please contact us at legal@consultapp.com
            </Text>
          </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  activeTabText: {
    color: '#2563EB'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 20
  },
  contentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 24
  },
  agreement: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  agreementText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  contact: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20
  }
});