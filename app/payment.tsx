import { View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

export default function PaymentScreen() {
  const { amount } = useLocalSearchParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleMpesaPayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      router.push('/payment-success');
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Payment</Text>
        
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amount}>KSH {amount}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>M-Pesa Payment</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter M-Pesa number (07XXXXXXXX)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Text style={styles.hint}>You'll receive an STK push to complete payment</Text>
        </View>

        <TouchableOpacity 
          style={[styles.payBtn, processing && styles.payBtnDisabled]} 
          onPress={handleMpesaPayment}
          disabled={processing || !phone}
        >
          <Text style={styles.payText}>
            {processing ? 'Processing...' : 'Pay with M-Pesa'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.altBtn}>
          <Text style={styles.altText}>Pay with Card</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelLink}>Cancel Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 24, textAlign: 'center' },
  amountCard: { backgroundColor: '#2563EB', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 32 },
  amountLabel: { fontSize: 14, color: '#BFDBFE', marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: '800', color: '#fff' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  hint: { fontSize: 12, color: '#6B7280' },
  payBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  payBtnDisabled: { backgroundColor: '#9CA3AF' },
  payText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', marginHorizontal: 12 },
  altBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  altText: { color: '#111827', fontSize: 16, fontWeight: '600' },
  cancelLink: { fontSize: 16, color: '#DC2626', fontWeight: '600', textAlign: 'center' }
});
