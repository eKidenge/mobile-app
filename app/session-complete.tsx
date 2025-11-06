import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

export default function SessionCompleteScreen() {
  const { cost, duration, professionalId } = useLocalSearchParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);

  const handlePayment = () => {
    router.push({
      pathname: '/payment',
      params: { amount: cost }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>✓</Text>
        <Text style={styles.title}>Session Complete</Text>
        
        <View style={styles.summary}>
          <View style={styles.row}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{duration} minutes</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Cost:</Text>
            <Text style={styles.valueHighlight}>KSH {cost}</Text>
          </View>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Rate your experience</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={handlePayment}>
          <Text style={styles.payText}>Proceed to Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/dashboard')}>
          <Text style={styles.homeLink}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 80, color: '#10B981', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 32 },
  summary: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 16, color: '#6B7280' },
  value: { fontSize: 16, fontWeight: '600', color: '#111827' },
  valueHighlight: { fontSize: 18, fontWeight: '700', color: '#059669' },
  ratingSection: { width: '100%', alignItems: 'center', marginBottom: 32 },
  ratingTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  stars: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 36 },
  payBtn: { backgroundColor: '#2563EB', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  payText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  homeLink: { fontSize: 16, color: '#2563EB', fontWeight: '600' }
});
