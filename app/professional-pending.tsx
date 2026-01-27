import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfessionalPendingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Application Submitted!</Text>
        <Text style={styles.subtitle}>
          Thank you for your interest in joining DirectConnect. Our team will review your application and verify your credentials.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What happens next?</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>We verify your license and credentials (1-2 business days)</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>You'll receive an email with your approval status</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Once approved, you can start accepting clients immediately</Text>
          </View>
        </View>

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Questions?</Text>
          <Text style={styles.contactText}>Email: support@directconnect.co.ke</Text>
          <Text style={styles.contactText}>Phone: +254 700 123 456</Text>
        </View>

        <TouchableOpacity 
          style={styles.homeBtn}
          onPress={() => router.push('/dashboard')}
        >
          <Text style={styles.homeText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  icon: { fontSize: 80, textAlign: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  step: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  stepNumber: { width: 28, height: 28, backgroundColor: '#2563EB', color: '#fff', borderRadius: 14, textAlign: 'center', lineHeight: 28, fontWeight: '700', marginRight: 12 },
  stepText: { flex: 1, fontSize: 14, color: '#6B7280', lineHeight: 20 },
  contact: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, marginBottom: 24 },
  contactTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  contactText: { fontSize: 13, color: '#92400E', marginBottom: 4 },
  homeBtn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' },
  homeText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
