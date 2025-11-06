import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface CategoryCardProps {
  id: string;
  title: string;
  icon: string;
  color: string;
  available: number;
  rate: string;
  avgResponse: string;
}

export default function CategoryCard({ id, title, icon, color, available, rate, avgResponse }: CategoryCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: color }]}
      onPress={() => router.push(`/category/${id}`)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: icon }} style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.available}>{available} Available</Text>
        </View>
        <Text style={styles.rate}>{rate}</Text>
        <Text style={styles.response}>Avg: {avgResponse}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  available: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  rate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2
  },
  response: {
    fontSize: 12,
    color: '#9CA3AF'
  }
});
