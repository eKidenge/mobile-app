import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface ProfessionalCardProps {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  experience: string;
  rate: number;
  available: boolean;
  photo: string;
}

export default function ProfessionalCard(props: ProfessionalCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/professional/${props.id}`)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: props.photo }} style={styles.photo} />
      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.name}>{props.name}</Text>
          {props.available && <View style={styles.onlineBadge} />}
        </View>
        <Text style={styles.specialization}>{props.specialization}</Text>
        <View style={styles.stats}>
          <Text style={styles.rating}>⭐ {props.rating}</Text>
          <Text style={styles.reviews}>({props.reviews} reviews)</Text>
          <Text style={styles.experience}>• {props.experience}</Text>
        </View>
        <Text style={styles.rate}>KSH {props.rate}/min</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12
  },
  info: {
    flex: 1,
    justifyContent: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1
  },
  onlineBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981'
  },
  specialization: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B'
  },
  reviews: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4
  },
  experience: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4
  },
  rate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669'
  }
});
