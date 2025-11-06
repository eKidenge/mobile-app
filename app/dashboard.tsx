import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import CategoryCard from '../components/CategoryCard';
import QuickCallButton from '../components/QuickCallButton';
import BottomNav from '../components/BottomNav';
import { categories } from '../constants/data';



export default function Dashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back! 👋</Text>
          <Text style={styles.title}>How can we help you today?</Text>
        </View>

        <QuickCallButton />

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR CHOOSE A CATEGORY</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.categories}>
          {categories.map((category) => (
            <CategoryCard key={category.id} {...category} />
          ))}
        </View>

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2,500+</Text>
            <Text style={styles.statLabel}>Verified Experts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>50k+</Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 Secure • Verified • Instant</Text>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scroll: {
    flex: 1,
    padding: 20
  },
  header: {
    marginBottom: 10
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB'
  },
  dividerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginHorizontal: 12
  },
  categories: {
    marginBottom: 20
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  }
});
