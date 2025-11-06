import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>✓</Text>
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Your payment has been processed successfully. A receipt has been sent to your phone.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What's Next?</Text>
          <Text style={styles.cardText}>• Your session history is saved</Text>
          <Text style={styles.cardText}>• You can contact this professional again anytime</Text>
          <Text style={styles.cardText}>• Check your email for the receipt</Text>
        </View>

        <TouchableOpacity 
          style={styles.homeBtn}
          onPress={() => router.push('/dashboard')}
        >
          <Text style={styles.homeText}>Return to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.historyBtn}
          onPress={() => router.push('/history')}
        >
          <Text style={styles.historyText}>View Session History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 100, color: '#10B981', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  cardText: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  homeBtn: { backgroundColor: '#2563EB', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  homeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  historyBtn: { backgroundColor: '#fff', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  historyText: { color: '#111827', fontSize: 16, fontWeight: '600' }
});
