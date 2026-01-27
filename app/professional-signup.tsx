import { View, Text, TextInput, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ProfessionalSignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: '',
    specialization: '',
    experience: '',
    license: ''
  });

  const handleSubmit = () => {
    router.push('/professional-pending');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Join as a Professional</Text>
          <Text style={styles.subtitle}>
            Expand your practice and reach more clients through DirectConnect
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Dr. John Doe"
            value={formData.name}
            onChangeText={(text) => setFormData({...formData, name: text})}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="0712345678"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.categories}>
            {['Legal', 'Medical', 'Mental Health', 'Career'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, formData.category === cat && styles.catBtnActive]}
                onPress={() => setFormData({...formData, category: cat})}
              >
                <Text style={[styles.catText, formData.category === cat && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Specialization *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Family Law, General Practice"
            value={formData.specialization}
            onChangeText={(text) => setFormData({...formData, specialization: text})}
          />

          <Text style={styles.label}>Years of Experience *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 10"
            value={formData.experience}
            onChangeText={(text) => setFormData({...formData, experience: text})}
            keyboardType="numeric"
          />

          <Text style={styles.label}>License Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your professional license number"
            value={formData.license}
            onChangeText={(text) => setFormData({...formData, license: text})}
          />

          <TouchableOpacity style={styles.uploadBtn}>
            <Text style={styles.uploadText}>📎 Upload License Document</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit Application</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { fontSize: 16, color: '#2563EB', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  catBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  catText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  catTextActive: { color: '#fff', fontWeight: '600' },
  uploadBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 16 },
  uploadText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
