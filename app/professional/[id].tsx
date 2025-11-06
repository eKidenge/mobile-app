import { View, Text, Image, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { professionals } from '../../constants/data';

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const pro = professionals.find(p => p.id === id);

  if (!pro) return null;

  const handleConnect = (mode: string) => {
    router.push({
      pathname: '/session',
      params: { professionalId: id, mode }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profile}>
          <Image source={{ uri: pro.photo }} style={styles.photo} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ Verified</Text>
          </View>
          <Text style={styles.name}>{pro.name}</Text>
          <Text style={styles.specialization}>{pro.specialization}</Text>
          
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>⭐ {pro.rating}</Text>
              <Text style={styles.statLabel}>{pro.reviews} reviews</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{pro.experience}</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>KSH {pro.rate}</Text>
              <Text style={styles.statLabel}>per minute</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.about}>
            Experienced professional with a proven track record of helping clients achieve their goals. 
            Specialized in providing personalized guidance and support.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleConnect('chat')}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleConnect('call')}>
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleConnect('video')}>
            <Text style={styles.actionIcon}>📹</Text>
            <Text style={styles.actionText}>Video</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20 },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
  profile: { alignItems: 'center', padding: 20, backgroundColor: '#fff', marginBottom: 16 },
  photo: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  badge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  specialization: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  stats: { flexDirection: 'row', gap: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  section: { backgroundColor: '#fff', padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  about: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  actions: { flexDirection: 'row', padding: 20, gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
