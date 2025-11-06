import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>About DirectConnect</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.motto}>"Skip the search, get the answer"</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.text}>
            DirectConnect instantly connects you to verified professionals across critical fields: 
            Legal, Medical, Mental Health, and Career Guidance. We eliminate the time-consuming 
            and unreliable search for professional help by providing real-time access to experts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⚡</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Instant Connection</Text>
              <Text style={styles.featureText}>Connect to experts in under 2 minutes</Text>
            </View>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Verified Professionals</Text>
              <Text style={styles.featureText}>All experts are licensed and verified</Text>
            </View>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Secure & Private</Text>
              <Text style={styles.featureText}>Your conversations are confidential</Text>
            </View>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💰</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Transparent Pricing</Text>
              <Text style={styles.featureText}>Pay per minute, no hidden fees</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.contactItem}>📧 support@directconnect.co.ke</Text>
          <Text style={styles.contactItem}>📞 +254 700 123 456</Text>
          <Text style={styles.contactItem}>🌐 www.directconnect.co.ke</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 DirectConnect Kenya</Text>
          <Text style={styles.footerText}>All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { fontSize: 16, color: '#2563EB', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  scroll: { flex: 1 },
  hero: { backgroundColor: '#2563EB', padding: 32, alignItems: 'center' },
  motto: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', fontStyle: 'italic' },
  section: { backgroundColor: '#fff', padding: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  text: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  feature: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  featureIcon: { fontSize: 28, marginRight: 12 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  featureText: { fontSize: 13, color: '#6B7280' },
  contactItem: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  footer: { padding: 20, alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 }
});
