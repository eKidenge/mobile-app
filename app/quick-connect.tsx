import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { professionals } from '../constants/data';

export default function QuickConnectScreen() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(true);
  const [professional, setProfessional] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const availablePros = professionals.filter(p => p.available);
      const randomPro = availablePros[Math.floor(Math.random() * availablePros.length)];
      setProfessional(randomPro);
      setConnecting(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleConnect = (mode: string) => {
    router.push({
      pathname: '/session',
      params: { professionalId: professional.id, mode }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>

        {connecting ? (
          <View style={styles.connecting}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.title}>Finding you an expert...</Text>
            <Text style={styles.subtitle}>This usually takes less than 2 minutes</Text>
          </View>
        ) : (
          <View style={styles.found}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Expert Found!</Text>
            <Text style={styles.proName}>{professional?.name}</Text>
            <Text style={styles.proSpec}>{professional?.specialization}</Text>
            <Text style={styles.proRate}>KSH {professional?.rate}/min</Text>

            <Text style={styles.chooseMode}>Choose consultation mode:</Text>
            
            <TouchableOpacity style={styles.modeBtn} onPress={() => handleConnect('chat')}>
              <Text style={styles.modeIcon}>💬</Text>
              <Text style={styles.modeText}>Start Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modeBtn} onPress={() => handleConnect('call')}>
              <Text style={styles.modeIcon}>📞</Text>
              <Text style={styles.modeText}>Start Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modeBtn} onPress={() => handleConnect('video')}>
              <Text style={styles.modeIcon}>📹</Text>
              <Text style={styles.modeText}>Start Video</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20 },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
  connecting: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  found: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successIcon: { fontSize: 64, color: '#10B981', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  proName: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 4 },
  proSpec: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  proRate: { fontSize: 16, fontWeight: '600', color: '#059669', marginBottom: 32 },
  chooseMode: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 16 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', padding: 16, borderRadius: 12, width: '100%', marginBottom: 12 },
  modeIcon: { fontSize: 24, marginRight: 12 },
  modeText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
