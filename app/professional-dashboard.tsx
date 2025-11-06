import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ProfessionalDashboardScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Professional Dashboard</Text>
        <View style={styles.statusToggle}>
          <Text style={styles.statusLabel}>
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </Text>
          <Switch value={isOnline} onValueChange={setIsOnline} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.earnings}>
          <Text style={styles.earningsTitle}>Today's Earnings</Text>
          <Text style={styles.earningsAmount}>KSH 4,800</Text>
          <Text style={styles.earningsSubtext}>6 sessions completed</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>234</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.9 ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>KSH 45k</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          <View style={styles.requestCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>Sarah M.</Text>
              <Text style={styles.requestType}>Legal Consultation</Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity style={styles.acceptBtn}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionText}>Withdraw Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>View Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  scroll: { flex: 1, padding: 20 },
  earnings: { backgroundColor: '#2563EB', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  earningsTitle: { fontSize: 14, color: '#BFDBFE', marginBottom: 8 },
  earningsAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 4 },
  earningsSubtext: { fontSize: 13, color: '#DBEAFE' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  requestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  requestInfo: { marginBottom: 12 },
  requestName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  requestType: { fontSize: 13, color: '#6B7280' },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700' },
  declineBtn: { flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, alignItems: 'center' },
  declineText: { color: '#6B7280', fontWeight: '600' },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  actionIcon: { fontSize: 24, marginRight: 12 },
  actionText: { fontSize: 16, fontWeight: '600', color: '#111827' }
});
