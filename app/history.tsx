import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';


const mockHistory = [
  { id: '1', professional: 'Dr. Amina Wanjiru', category: 'Legal', date: 'Oct 3, 2025', duration: '15 min', cost: 1800, rating: 5 },
  { id: '2', professional: 'Dr. James Omondi', category: 'Medical', date: 'Oct 1, 2025', duration: '10 min', cost: 1200, rating: 5 },
  { id: '3', professional: 'Dr. Grace Muthoni', category: 'Mental Health', date: 'Sep 28, 2025', duration: '30 min', cost: 3000, rating: 4 }
];

export default function HistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session History</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {mockHistory.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.proName}>{session.professional}</Text>
              <Text style={styles.cost}>KSH {session.cost}</Text>
            </View>
            <Text style={styles.category}>{session.category}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.date}>{session.date}</Text>
              <Text style={styles.duration}>{session.duration}</Text>
              <Text style={styles.rating}>{'⭐'.repeat(session.rating)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.stats}>
          <Text style={styles.statsTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>55 min</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>KSH 6,000</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { fontSize: 16, color: '#2563EB', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  scroll: { flex: 1, padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  proName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  cost: { fontSize: 16, fontWeight: '700', color: '#059669' },
  category: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#9CA3AF' },
  duration: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  rating: { fontSize: 14 },
  stats: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginTop: 8, marginBottom: 20 },
  statsTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#2563EB', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' }
});
