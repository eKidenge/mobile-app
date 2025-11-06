import { View, Text, TextInput, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { professionals } from '../constants/data';

export default function SessionScreen() {
  const { professionalId, mode } = useLocalSearchParams();
  const router = useRouter();
  const pro = professionals.find(p => p.id === professionalId);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const cost = pro ? duration * pro.rate : 0;

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { text: message, sender: 'client', time: new Date() }]);
      setMessage('');
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: "Thank you for your message. I'll assist you right away.", 
          sender: 'professional', 
          time: new Date() 
        }]);
      }, 2000);
    }
  };

  const endSession = () => {
    router.push({
      pathname: '/session-complete',
      params: { cost, duration, professionalId }
    });
  };

  if (!pro) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.proName}>{pro.name}</Text>
          <Text style={styles.mode}>{String(mode).toUpperCase()} Session</Text>
        </View>
        <View style={styles.timer}>
          <Text style={styles.duration}>{duration} min</Text>
          <Text style={styles.cost}>KSH {cost}</Text>
        </View>
      </View>

      <ScrollView style={styles.chat}>
        {messages.map((msg, idx) => (
          <View key={idx} style={[styles.message, msg.sender === 'client' ? styles.clientMsg : styles.proMsg]}>
            <Text style={styles.msgText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={endSession}>
        <Text style={styles.endText}>End Session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerInfo: { flex: 1 },
  proName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  mode: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timer: { alignItems: 'flex-end' },
  duration: { fontSize: 18, fontWeight: '700', color: '#2563EB' },
  cost: { fontSize: 14, color: '#059669', fontWeight: '600' },
  chat: { flex: 1, padding: 16 },
  message: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 8 },
  clientMsg: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  proMsg: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  msgText: { fontSize: 14, color: '#111827' },
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  sendBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
  endBtn: { backgroundColor: '#DC2626', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  endText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
