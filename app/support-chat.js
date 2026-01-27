import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';

export default function SupportChatScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! Welcome to ConsultApp Support. How can I help you today?",
      sender: 'support',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate support response
    setIsTyping(true);
    setTimeout(() => {
      const supportResponse = {
        id: messages.length + 2,
        text: getSupportResponse(message.trim()),
        sender: 'support',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, supportResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const getSupportResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('payment') || lowerMessage.includes('refund')) {
      return "I can help with payment issues. For refund requests, please provide your transaction ID and the date of the transaction. Our team typically processes refunds within 3-5 business days.";
    } else if (lowerMessage.includes('technical') || lowerMessage.includes('bug') || lowerMessage.includes('error')) {
      return "I'm sorry you're experiencing technical issues. Could you please describe what's happening in more detail? Include your device type and app version if possible.";
    } else if (lowerMessage.includes('account') || lowerMessage.includes('login')) {
      return "For account-related issues, I can help reset your password or guide you through account recovery. Would you like me to send a password reset link to your email?";
    } else if (lowerMessage.includes('professional') || lowerMessage.includes('consultant')) {
      return "I can help you find the right professional. Could you tell me what type of consultation you're looking for? We have experts in legal, medical, mental health, and business fields.";
    } else {
      return "Thank you for your message. I understand you're looking for help. Could you please provide more details so I can assist you better?";
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Support',
      'For urgent matters, please call our 24/7 emergency support line: +254 711 000 000',
      [
        {
          text: 'Call Now',
          onPress: () => {
            // Implement call functionality
            console.log('Calling emergency support...');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Support Chat</Text>
          <Text style={styles.subtitle}>We're here to help</Text>
        </View>
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
          <Text style={styles.emergencyText}>🚨 Emergency</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userMessage : styles.supportMessage
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.sender === 'user' && styles.userMessageText
              ]}>
                {msg.text}
              </Text>
              <Text style={[
                styles.timestamp,
                msg.sender === 'user' && styles.userTimestamp
              ]}>
                {formatTime(msg.timestamp)}
              </Text>
            </View>
          ))}
          
          {isTyping && (
            <View style={[styles.messageBubble, styles.supportMessage]}>
              <Text style={styles.typingText}>Support is typing...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message here..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backBtn: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600'
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  emergencyButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626'
  },
  chatContainer: {
    flex: 1
  },
  messagesContainer: {
    flex: 1,
    padding: 16
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB'
  },
  supportMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4
  },
  userMessageText: {
    color: '#fff'
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'flex-end'
  },
  userTimestamp: {
    color: '#E5E7EB'
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end'
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    backgroundColor: '#F9FAFB'
  },
  sendButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});