// app/chat-interface.tsx - FULL WEBSOCKET INTEGRATION
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  sender_name?: string;
  sender_type: 'client' | 'professional';
  message_type: 'text' | 'image' | 'file' | 'system';
  content: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  timestamp: string;
  read: boolean;
  delivered: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface ChatSession {
  id: string;
  professional_id: string;
  client_id: string;
  status: 'active' | 'ended' | 'paused';
  started_at: string;
  ended_at: string | null;
  last_activity: string;
}

interface Professional {
  id: string;
  name: string;
  specialization: string;
  online_status: boolean;
  typing: boolean;
  last_seen?: string;
  profile_picture?: string;
}

// 🗨️ WEBRTC CHAT MANAGER WITH REAL-TIME MESSAGES
class WebRTCChatManager {
  private socket: WebSocket | null = null;
  private sessionId: string = '';
  private userId: string = '';
  private userType: string = 'client';
  private token: string = '';
  private messageQueue: Message[] = [];
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private onMessageCallback: ((message: Message) => void) | null = null;
  private onTypingCallback: ((isTyping: boolean, userId: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  async initialize(sessionId: string, userId: string, userType: string, token: string): Promise<boolean> {
    this.sessionId = sessionId;
    this.userId = userId;
    this.userType = userType;
    this.token = token;

    try {
      console.log('🔧 Initializing WebSocket chat connection...');
      await this.connectToWebSocket();
      return true;
    } catch (error) {
      console.error('❌ WebSocket chat initialization failed:', error);
      return false;
    }
  }

  private async connectToWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://teleconnect-krga.onrender.com/ws/webrtc/${this.sessionId}/?token=${this.token}&user_type=${this.userType}`;
        console.log('🌐 Connecting to chat WebSocket:', wsUrl);
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('✅ Chat WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send join message
          this.socket!.send(JSON.stringify({
            type: 'join_session',
            session_id: this.sessionId,
            user_id: this.userId,
            user_type: this.userType,
            join_type: 'chat'
          }));
          
          // Process any queued messages
          this.processMessageQueue();
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };
        
        this.socket.onerror = (error) => {
          console.error('❌ Chat WebSocket error:', error);
          reject(error);
        };
        
        this.socket.onclose = () => {
          console.log('🔌 Chat WebSocket disconnected');
          this.isConnected = false;
          this.handleReconnection();
        };
        
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Chat WebSocket message:', data.type);

      switch (data.type) {
        case 'chat_message':
          this.handleChatMessage(data);
          break;
          
        case 'typing_status':
          this.handleTypingStatus(data);
          break;
          
        case 'message_status':
          this.handleMessageStatus(data);
          break;
          
        case 'session_update':
          this.handleSessionUpdate(data);
          break;
          
        case 'user_joined':
          console.log('👤 User joined chat:', data.user_id);
          this.sendSystemMessage(`${data.user_type === 'professional' ? 'Professional' : 'Client'} joined the chat`);
          break;
          
        case 'user_left':
          console.log('👤 User left chat:', data.user_id);
          this.sendSystemMessage(`${data.user_type === 'professional' ? 'Professional' : 'Client'} left the chat`);
          break;
          
        case 'session_ended':
          console.log('📞 Chat session ended');
          if (this.onStatusCallback) {
            this.onStatusCallback('ended');
          }
          break;
          
        case 'error':
          console.error('❌ Chat error:', data.message);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  private handleChatMessage(data: any): void {
    const message: Message = {
      id: data.message_id || `msg_${Date.now()}`,
      session_id: this.sessionId,
      sender_id: data.sender_id,
      sender_name: data.sender_name,
      sender_type: data.sender_type,
      message_type: data.message_type || 'text',
      content: data.content,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      timestamp: data.timestamp || new Date().toISOString(),
      read: data.read || false,
      delivered: data.delivered || true,
      status: 'delivered'
    };

    if (this.onMessageCallback && data.sender_id !== this.userId) {
      this.onMessageCallback(message);
    }
  }

  private handleTypingStatus(data: any): void {
    if (this.onTypingCallback && data.user_id !== this.userId) {
      this.onTypingCallback(data.typing, data.user_id);
    }
  }

  private handleMessageStatus(data: any): void {
    // Update message delivery status
    if (this.onMessageCallback) {
      const statusMessage: Message = {
        id: data.message_id,
        session_id: this.sessionId,
        sender_id: this.userId,
        sender_type: this.userType,
        message_type: 'system',
        content: `Message ${data.status}`,
        timestamp: new Date().toISOString(),
        read: true,
        delivered: true,
        status: data.status
      };
      this.onMessageCallback(statusMessage);
    }
  }

  private handleSessionUpdate(data: any): void {
    console.log('🔄 Session update:', data.status);
    if (this.onStatusCallback) {
      this.onStatusCallback(data.status);
    }
  }

  private async sendSystemMessage(content: string): Promise<void> {
    const systemMessage: Message = {
      id: `sys_${Date.now()}`,
      session_id: this.sessionId,
      sender_id: 'system',
      sender_type: 'system',
      message_type: 'system',
      content: content,
      timestamp: new Date().toISOString(),
      read: true,
      delivered: true
    };

    if (this.onMessageCallback) {
      this.onMessageCallback(systemMessage);
    }
  }

  async sendMessage(message: Message): Promise<boolean> {
    try {
      if (!this.isConnected || !this.socket) {
        console.log('📨 Queueing message (offline):', message.content.substring(0, 50));
        this.messageQueue.push(message);
        return false;
      }

      const messageData = {
        type: 'send_message',
        session_id: this.sessionId,
        user_id: this.userId,
        user_type: this.userType,
        message_type: message.message_type,
        content: message.content,
        file_url: message.file_url,
        file_name: message.file_name,
        file_size: message.file_size,
        timestamp: new Date().toISOString()
      };

      this.socket.send(JSON.stringify(messageData));
      console.log('✅ Message sent via WebSocket');
      return true;

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  async sendTypingStatus(isTyping: boolean): Promise<void> {
    if (!this.isConnected || !this.socket) return;

    try {
      this.socket.send(JSON.stringify({
        type: 'typing_status',
        session_id: this.sessionId,
        user_id: this.userId,
        user_type: this.userType,
        typing: isTyping
      }));
    } catch (error) {
      console.error('❌ Failed to send typing status:', error);
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (!this.isConnected || !this.socket) return;

    try {
      this.socket.send(JSON.stringify({
        type: 'mark_read',
        session_id: this.sessionId,
        message_id: messageId,
        user_id: this.userId
      }));
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📨 Processing ${this.messageQueue.length} queued messages`);
    
    // Send queued messages
    this.messageQueue.forEach(async (message) => {
      await this.sendMessage(message);
    });
    
    this.messageQueue = [];
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      if (this.onStatusCallback) {
        this.onStatusCallback('disconnected');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connectToWebSocket();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  setOnMessageCallback(callback: (message: Message) => void): void {
    this.onMessageCallback = callback;
  }

  setOnTypingCallback(callback: (isTyping: boolean, userId: string) => void): void {
    this.onTypingCallback = callback;
  }

  setOnStatusCallback(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  async endSession(): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify({
        type: 'end_session',
        session_id: this.sessionId,
        user_id: this.userId
      }));
    }
    
    this.disconnect();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';
const chatManager = new WebRTCChatManager();

export default function ChatInterface() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [professionalTyping, setProfessionalTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = params.sessionId as string;
  const clientId = '1'; // Default client ID - replace with actual user ID

  useEffect(() => {
    initializeChat();
    
    return () => {
      cleanupChat();
    };
  }, []);

  const cleanupChat = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    chatManager.disconnect();
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Parse professional data
      if (params.professional) {
        const professionalData: Professional = JSON.parse(params.professional as string);
        setProfessional(professionalData);
        setIsOnline(professionalData.online_status);
      }

      // Initialize chat session
      await initializeChatSession();
      
      // Initialize WebSocket connection
      await initializeWebSocket();
      
      // Load existing messages
      await fetchMessages();

    } catch (error) {
      console.error('Chat initialization error:', error);
      Alert.alert('Error', 'Failed to initialize chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeChatSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat_sessions/initialize/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          professional_id: professional?.id,
          client_id: clientId,
          consultation_type: 'chat'
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData.session);
        console.log('✅ Chat session initialized:', sessionData);
      } else {
        throw new Error('Failed to initialize chat session');
      }
    } catch (error) {
      console.error('Chat session initialization error:', error);
      // Create local session as fallback
      const fallbackSession: ChatSession = {
        id: sessionId,
        professional_id: professional?.id || '',
        client_id: clientId,
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
        last_activity: new Date().toISOString()
      };
      setSession(fallbackSession);
    }
  };

  const initializeWebSocket = async () => {
    try {
      // Get token for WebSocket
      const token = await getSessionToken();
      
      // Initialize WebSocket connection
      const success = await chatManager.initialize(
        sessionId,
        clientId,
        'client',
        token
      );
      
      if (!success) {
        throw new Error('WebSocket connection failed');
      }

      // Setup callbacks
      chatManager.setOnMessageCallback(handleIncomingMessage);
      chatManager.setOnTypingCallback(handleTypingStatus);
      chatManager.setOnStatusCallback(handleConnectionStatus);
      
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      setConnectionStatus('disconnected');
    }
  };

  const getSessionToken = async (): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/token/`);
      if (response.ok) {
        const data = await response.json();
        return data.token || 'demo_token';
      }
    } catch (error) {
      console.error('Failed to get session token:', error);
    }
    return 'demo_token';
  };

  const handleIncomingMessage = (message: Message) => {
    console.log('📨 Incoming message:', message.content.substring(0, 50));
    
    setMessages(prev => {
      // Check if message already exists
      const exists = prev.some(msg => msg.id === message.id);
      if (exists) {
        return prev.map(msg => msg.id === message.id ? message : msg);
      }
      return [...prev, message];
    });
    
    // Mark as read if it's from professional
    if (message.sender_type === 'professional') {
      chatManager.markMessageAsRead(message.id);
    }
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleTypingStatus = (isTyping: boolean, userId: string) => {
    if (userId !== clientId) {
      setProfessionalTyping(isTyping);
    }
  };

  const handleConnectionStatus = (status: string) => {
    console.log('🔗 Connection status:', status);
    
    switch (status) {
      case 'connected':
        setConnectionStatus('connected');
        break;
      case 'disconnected':
        setConnectionStatus('disconnected');
        Alert.alert('Connection Lost', 'Attempting to reconnect...');
        break;
      case 'ended':
        Alert.alert('Session Ended', 'The chat session has ended.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        break;
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat_messages/${sessionId}/`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendTypingStatus = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing status
    chatManager.sendTypingStatus(true);
    
    // Set timeout to send "stopped typing" after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      chatManager.sendTypingStatus(false);
      setIsTyping(false);
    }, 2000);
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      sendTypingStatus();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMessage: Message = {
      id: messageId,
      session_id: sessionId,
      sender_id: clientId,
      sender_type: 'client',
      message_type: 'text',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false,
      status: 'sending'
    };

    // Add message immediately for optimistic UI
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      chatManager.sendTypingStatus(false);
    }
    
    setSending(true);

    try {
      // Create final message
      const finalMessage: Message = {
        ...tempMessage,
        delivered: true,
        status: 'sent'
      };

      // Send via WebSocket
      const success = await chatManager.sendMessage(finalMessage);
      
      if (success) {
        // Update message status
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...finalMessage, status: 'delivered' } : msg
        ));
      } else {
        // Mark as failed if WebSocket not available
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        ));
        
        // Fallback to REST API
        await sendMessageViaAPI(newMessage.trim());
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' } : msg
      ));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendMessageViaAPI = async (content: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat_messages/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          sender_id: clientId,
          sender_type: 'client',
          message_type: 'text',
          content: content
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Message sent via API fallback');
        return data;
      }
    } catch (error) {
      console.error('API fallback failed:', error);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);
      setShowAttachmentOptions(false);

      // In a real app, you would upload to your server
      // For demo, we'll simulate upload
      const fileName = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const fileSize = 1024 * 1024; // Simulate 1MB file
      
      const tempMessageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const tempMessage: Message = {
        id: tempMessageId,
        session_id: sessionId,
        sender_id: clientId,
        sender_type: 'client',
        message_type: 'image',
        content: '📷 Image',
        file_url: imageUri,
        file_name: fileName,
        file_size: fileSize,
        timestamp: new Date().toISOString(),
        read: false,
        delivered: false,
        status: 'sending'
      };

      setMessages(prev => [...prev, tempMessage]);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send via WebSocket
      const success = await chatManager.sendMessage({
        ...tempMessage,
        delivered: true,
        status: 'sent'
      });

      if (success) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessageId ? { ...msg, status: 'delivered' } : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessageId ? { ...msg, status: 'failed' } : msg
        ));
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const checkProfessionalOnline = async () => {
    if (!professional) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/professionals/${professional.id}/status/`);
      if (response.ok) {
        const data = await response.json();
        setIsOnline(data.online_status);
      }
    } catch (error) {
      console.error('Error checking professional status:', error);
    }
  };

  const endChat = async () => {
    Alert.alert(
      'End Chat Session',
      'Are you sure you want to end this chat session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Chat', 
          style: 'destructive',
          onPress: async () => {
            try {
              await chatManager.endSession();
              
              // Update session status via API
              await fetch(`${API_BASE_URL}/chat_sessions/${sessionId}/status/`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'ended'
                })
              });
              
              router.back();
            } catch (error) {
              console.error('Error ending chat:', error);
              router.back();
            }
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender_type === 'client';
    const isSystem = item.sender_type === 'system';
    
    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessage}>{item.content}</Text>
        </View>
      );
    }

    if (item.message_type === 'image') {
      return (
        <View style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.professionalMessage
        ]}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.file_url }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
            {item.status === 'sending' && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.messageMeta}>
            <Text style={styles.timestamp}>
              {formatTime(item.timestamp)}
            </Text>
            {isUser && (
              <View style={styles.statusIcons}>
                {item.status === 'delivered' ? (
                  <Ionicons name="checkmark-done" size={12} color="#10B981" />
                ) : item.status === 'sent' ? (
                  <Ionicons name="checkmark" size={12} color="#6B7280" />
                ) : item.status === 'failed' ? (
                  <Ionicons name="close-circle" size={12} color="#DC2626" />
                ) : (
                  <ActivityIndicator size={12} color="#6B7280" />
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.professionalMessage
      ]}>
        {!isUser && (
          <Text style={styles.senderName}>
            {item.sender_name || 'Professional'}
          </Text>
        )}
        <Text style={[
          styles.messageText,
          isUser ? styles.userMessageText : styles.professionalMessageText
        ]}>
          {item.content}
        </Text>
        <View style={styles.messageMeta}>
          <Text style={styles.timestamp}>
            {formatTime(item.timestamp)}
          </Text>
          {isUser && (
            <View style={styles.statusIcons}>
              {item.status === 'delivered' ? (
                <Ionicons name="checkmark-done" size={12} color="#10B981" />
              ) : item.status === 'sent' ? (
                <Ionicons name="checkmark" size={12} color="#6B7280" />
              ) : item.status === 'failed' ? (
                <Ionicons name="close-circle" size={12} color="#DC2626" />
              ) : item.status === 'sending' ? (
                <ActivityIndicator size={12} color="#6B7280" />
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.professionalName}>
          {professional?.name || 'Professional'}
        </Text>
        <View style={styles.statusRow}>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              isOnline ? styles.onlineDot : styles.offlineDot
            ]} />
            <Text style={styles.status}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              connectionStatus === 'connected' ? styles.connectedDot :
              connectionStatus === 'connecting' ? styles.connectingDot :
              styles.disconnectedDot
            ]} />
            <Text style={styles.connectionText}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={endChat} style={styles.endButton}>
        <Ionicons name="call" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  const renderTypingIndicator = () => {
    if (!professionalTyping) return null;
    
    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {professional?.name || 'Professional'} is typing...
        </Text>
        <View style={styles.typingDots}>
          <View style={[styles.typingDot, { animationDelay: '0ms' } as any]} />
          <View style={[styles.typingDot, { animationDelay: '200ms' } as any]} />
          <View style={[styles.typingDot, { animationDelay: '400ms' } as any]} />
        </View>
      </View>
    );
  };

  const renderAttachmentOptions = () => {
    if (!showAttachmentOptions) return null;
    
    return (
      <View style={styles.attachmentOptions}>
        <TouchableOpacity 
          style={styles.attachmentOption}
          onPress={pickImage}
          disabled={uploading}
        >
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.attachmentOptionGradient}>
            <Ionicons name="image" size={24} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.attachmentOptionText}>Photo Library</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.attachmentOption}
          onPress={takePhoto}
          disabled={uploading}
        >
          <LinearGradient colors={['#10B981', '#059669']} style={styles.attachmentOptionGradient}>
            <Ionicons name="camera" size={24} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.attachmentOptionText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.attachmentOption}
          onPress={() => {
            setShowAttachmentOptions(false);
            // Handle document picker
          }}
          disabled={uploading}
        >
          <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.attachmentOptionGradient}>
            <Ionicons name="document" size={24} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.attachmentOptionText}>Document</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
          ListFooterComponent={renderTypingIndicator()}
        />

        {renderAttachmentOptions()}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachmentButton}
            onPress={() => setShowAttachmentOptions(!showAttachmentOptions)}
            disabled={uploading}
          >
            <Ionicons name="add" size={24} color="#6B7280" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTextChange}
            placeholder="Type your message..."
            multiline
            maxLength={1000}
            editable={!sending && !uploading}
            onFocus={() => sendTypingStatus()}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              (!newMessage.trim() || sending || uploading) && styles.sendButtonDisabled
            ]} 
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending || uploading}
          >
            {sending || uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#6B7280',
  },
  status: {
    fontSize: 12,
    color: '#6B7280',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectedDot: {
    backgroundColor: '#10B981',
  },
  connectingDot: {
    backgroundColor: '#F59E0B',
  },
  disconnectedDot: {
    backgroundColor: '#DC2626',
  },
  connectionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  endButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  systemMessage: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  professionalMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  professionalMessageText: {
    color: '#111827',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 4,
  },
  statusIcons: {
    flexDirection: 'row',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
    marginHorizontal: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  attachmentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachmentOption: {
    alignItems: 'center',
  },
  attachmentOptionGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentOptionText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});