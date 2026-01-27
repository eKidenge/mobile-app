import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HelpCenterScreen() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "How do I book a consultation?",
      answer: "To book a consultation:\n\n1. Go to the Search tab\n2. Find a professional you'd like to consult with\n3. Click 'Start Chat' to begin a session\n4. The professional will respond and you can begin your consultation"
    },
    {
      id: 2,
      question: "How are payments processed?",
      answer: "Payments are processed securely through our platform. You can add payment methods in the Settings tab. We accept major credit cards and M-Pesa. You're only charged when you start a session with a professional."
    },
    {
      id: 3,
      question: "What if I need to cancel a session?",
      answer: "You can cancel a session at any time before it begins. If you've already been charged, refunds are processed within 3-5 business days depending on your payment method."
    },
    {
      id: 4,
      question: "How do I become a professional on the platform?",
      answer: "To join as a professional:\n\n1. Go to your profile\n2. Select 'Become a Professional'\n3. Complete the application form\n4. Submit your credentials for verification\n5. Our team will review your application within 2-3 business days"
    },
    {
      id: 5,
      question: "Is my data and conversations private?",
      answer: "Yes, all your conversations are encrypted and private. We adhere to strict data protection regulations and never share your personal information with third parties without your consent."
    }
  ];

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const contactSupport = () => {
    Linking.openURL('mailto:support@consultapp.com?subject=Support Request&body=Hello, I need help with...');
  };

  const callSupport = () => {
    Linking.openURL('tel:+254700000000');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={contactSupport}
            >
              <Text style={styles.quickActionIcon}>📧</Text>
              <Text style={styles.quickActionText}>Email Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={callSupport}
            >
              <Text style={styles.quickActionIcon}>📞</Text>
              <Text style={styles.quickActionText}>Call Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/support-chat')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Live Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleSection(faq.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqIcon}>
                  {expandedSection === faq.id ? '−' : '+'}
                </Text>
              </View>
              {expandedSection === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactItem}>
              <Text style={styles.contactLabel}>Email: </Text>
              support@consultapp.com
            </Text>
            <Text style={styles.contactItem}>
              <Text style={styles.contactLabel}>Phone: </Text>
              +254 700 000 000
            </Text>
            <Text style={styles.contactItem}>
              <Text style={styles.contactLabel}>Hours: </Text>
              Mon-Fri, 8:00 AM - 6:00 PM EAT
            </Text>
            <Text style={styles.contactItem}>
              <Text style={styles.contactLabel}>Emergency: </Text>
              Available 24/7 for urgent matters
            </Text>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.appInfo}>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version: </Text>
              1.0.0
            </Text>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Updated: </Text>
              October 2024
            </Text>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Support: </Text>
              support@consultapp.com
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
  scroll: {
    flex: 1,
    padding: 20
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginHorizontal: 4
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center'
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 16
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12
  },
  faqIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB'
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 12,
    paddingLeft: 8
  },
  contactInfo: {
    gap: 12
  },
  contactItem: {
    fontSize: 14,
    color: '#374151'
  },
  contactLabel: {
    fontWeight: '600',
    color: '#111827'
  },
  appInfo: {
    gap: 8
  },
  infoItem: {
    fontSize: 14,
    color: '#374151'
  },
  infoLabel: {
    fontWeight: '600',
    color: '#111827'
  }
});