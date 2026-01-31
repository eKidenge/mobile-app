import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Switch, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  BackHandler,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface DashboardStats {
  today_earnings: number;
  today_sessions: number;
  total_sessions: number;
  average_rating: number;
  monthly_earnings: number;
  pending_requests: number;
  response_rate: number;
  completion_rate: number;
}

interface PendingRequest {
  id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  category: string;
  mode: 'chat' | 'audio' | 'video';
  created_at: string;
  client_id: string;
  urgency?: 'low' | 'medium' | 'high';
  session_id?: string;
  call_id?: string; // ADDED
  room_id?: string; // ADDED
}

interface CallNotificationData {
  type: string;
  sessionId: string;
  callId: string; // ADDED
  clientId: string;
  clientName: string;
  mode: 'chat' | 'audio' | 'video';
  timestamp: string;
  professionalId: string;
  ringtone?: string;
  vibration?: boolean;
  consultationId?: string;
  roomId?: string; // ADDED: Room ID from client
}

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

const API_CONFIG: ApiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://teleconnect-krga.onrender.com',
  timeout: 10000,
  retries: 3
};

// Ringtone Manager - Updated version
class RingtoneManager {
  private static instance: RingtoneManager;
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private vibrationInterval: NodeJS.Timeout | null = null;
  private callSessionId: string | null = null;
  private audioInitialized = false;

  static getInstance(): RingtoneManager {
    if (!RingtoneManager.instance) {
      RingtoneManager.instance = new RingtoneManager();
    }
    return RingtoneManager.instance;
  }

  private constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    if (this.audioInitialized) return;
    
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
      this.audioInitialized = true;
      console.log('🎵 Audio system initialized');
    } catch (error) {
      console.error('Audio initialization error:', error);
    }
  }

  async play(sessionId?: string): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stop();
      }

      this.callSessionId = sessionId || null;
      this.isPlaying = true;

      // Start vibration
      this.startVibration();

      // Play ringtone based on platform
      if (Platform.OS === 'web') {
        this.playWebRingtone();
      } else {
        await this.playMobileRingtone();
      }
      
      console.log('🔊 Ringtone started for session:', sessionId);
      
    } catch (error) {
      console.error('❌ Error playing ringtone:', error);
      this.isPlaying = false;
      this.callSessionId = null;
      // Fallback vibration
      this.startVibration();
    }
  }

  private playWebRingtone(): void {
    try {
      // For web, we'll use a simple beep pattern
      console.log('🔊 Playing web ringtone');
      // Web vibration if supported
      if (navigator.vibrate) {
        navigator.vibrate([500, 500]);
      }
    } catch (webError) {
      console.error('Web ringtone error:', webError);
    }
  }

  private async playMobileRingtone(): Promise<void> {
    try {
      // First unload any existing sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      console.log('🎵 Loading mobile ringtone...');
      
      // For mobile, use system sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/ringtone.mp3'),
        { 
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );
      
      this.sound = sound;
      console.log('✅ Mobile ringtone playing');
      
    } catch (mobileError) {
      console.error('Mobile ringtone error:', mobileError);
      // Just vibrate if sound fails
      this.startVibration();
    }
  }

  private startVibration(): void {
    try {
      this.stopVibration();
      
      if (Platform.OS === 'web') {
        if (navigator.vibrate) {
          navigator.vibrate([1000, 1000, 1000, 1000]);
        }
        return;
      }
      
      Vibration.cancel();
      
      // Different vibration patterns for platforms
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 1000, 500, 1000], true);
      } else {
        Vibration.vibrate(1000);
        this.vibrationInterval = setInterval(() => {
          Vibration.vibrate(1000);
        }, 2000);
      }
    } catch (error) {
      console.error('Vibration error:', error);
    }
  }

  private stopVibration(): void {
    try {
      if (Platform.OS === 'web') {
        if (navigator.vibrate) {
          navigator.vibrate(0);
        }
      } else {
        Vibration.cancel();
      }
      
      if (this.vibrationInterval) {
        clearInterval(this.vibrationInterval);
        this.vibrationInterval = null;
      }
    } catch (error) {
      console.error('Stop vibration error:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping ringtone...');
      
      // Stop vibration
      this.stopVibration();
      
      // Stop audio
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      // Clear any web audio
      if (Platform.OS === 'web' && navigator.vibrate) {
        navigator.vibrate(0);
      }
      
      this.isPlaying = false;
      this.callSessionId = null;
      console.log('✅ Ringtone stopped');
      
    } catch (error) {
      console.error('Error stopping ringtone:', error);
      this.isPlaying = false;
      this.callSessionId = null;
    }
  }

  isCurrentlyRinging(): boolean {
    return this.isPlaying;
  }

  getCurrentSessionId(): string | null {
    return this.callSessionId;
  }
}

const ringtoneManager = RingtoneManager.getInstance();

// NEW: WebSocket Manager for real-time notifications
class WebSocketManager {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private professionalId: string | null = null;

  connect(professionalId: string) {
    if (this.ws && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    this.professionalId = professionalId;
    
    try {
      // Use wss for secure, ws for non-secure
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//teleconnect-krga.onrender.com/ws/professional/${professionalId}/`;
      
      console.log('🔗 Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send registration message
        this.send({
          type: 'register',
          professionalId: professionalId,
          role: 'professional'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.professionalId) {
        this.connect(this.professionalId);
      }
    }, delay);
  }

  private handleMessage(data: any) {
    console.log('Processing WebSocket message:', data);
    
    if (data.type === 'incoming_call') {
      console.log('📞 Incoming call received via WebSocket:', data);
      
      const callData: CallNotificationData = {
        type: 'incoming_call',
        sessionId: data.sessionId || data.callId,
        callId: data.callId,
        clientId: data.clientId,
        clientName: data.clientName,
        mode: data.mode || 'audio',
        timestamp: data.timestamp || new Date().toISOString(),
        professionalId: data.professionalId,
        consultationId: data.consultationId,
        roomId: data.roomId
      };
      
      // Emit to all registered callbacks
      const callbacks = this.callbacks.get('incoming_call');
      if (callbacks) {
        callbacks.forEach(callback => callback(callData));
      }
    }
  }

  send(message: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected');
    return false;
  }

  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.callbacks.clear();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    console.log('WebSocket manager disconnected');
  }
}

// Enhanced Connection Manager with both WebSocket and polling
class ConnectionManager {
  private webSocketManager: WebSocketManager | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, Function[]> = new Map();
  private isConnected = false;

  constructor() {
    this.webSocketManager = new WebSocketManager();
  }

  connect(professionalId: string, token: string) {
    console.log('🔗 Starting enhanced connection manager');
    this.isConnected = true;
    
    // Start WebSocket connection
    this.webSocketManager?.connect(professionalId);
    this.webSocketManager?.on('incoming_call', (data: CallNotificationData) => {
      console.log('📞 WebSocket incoming call:', data);
      this.emit('incoming_call', data);
    });
    
    // Also start polling as fallback
    this.startPolling(professionalId, token);
  }

  private startPolling(professionalId: string, token: string) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Initial check
    this.checkForCalls(professionalId, token);

    // Poll every 3 seconds (more frequent for better responsiveness)
    this.pollingInterval = setInterval(() => {
      this.checkForCalls(professionalId, token);
    }, 3000);
  }

  private async checkForCalls(professionalId: string, token: string) {
    try {
      console.log('🔍 Polling for incoming calls...');
      
      const response = await fetch(`${API_CONFIG.baseUrl}/api/professional/pending-requests/${professionalId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Pending requests:', data);
        
        if (data.requests && data.requests.length > 0) {
          const request = data.requests[0];
          
          // Check if this is a new call (not already being handled)
          const currentTime = new Date().getTime();
          const requestTime = new Date(request.created_at).getTime();
          const isNewRequest = (currentTime - requestTime) < 10000; // Within last 10 seconds
          
          if (isNewRequest) {
            console.log('📞 New call request found:', request);
            
            const callData: CallNotificationData = {
              type: 'incoming_call',
              sessionId: request.session_id || request.id,
              callId: request.call_id || request.id,
              clientId: request.client_id,
              clientName: request.client_name || 'Client',
              mode: request.mode || 'audio',
              timestamp: request.created_at || new Date().toISOString(),
              professionalId: professionalId.toString(),
              ringtone: 'default',
              vibration: true,
              consultationId: request.consultation_id,
              roomId: request.room_id
            };

            this.emit('incoming_call', callData);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for calls:', error);
    }
  }

  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  private emit(event: string, data: any) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      console.log(`📢 Emitting ${event} to ${callbacks.length} callbacks`);
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect() {
    this.isConnected = false;
    
    // Disconnect WebSocket
    this.webSocketManager?.disconnect();
    
    // Clear polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Clear callbacks
    this.callbacks.clear();
    console.log('🔌 Connection manager disconnected');
  }
}

// Incoming Call Modal Component - UPDATED
const IncomingCallModal = ({ 
  visible, 
  callData, 
  onAccept, 
  onDecline 
}: { 
  visible: boolean;
  callData: CallNotificationData | null;
  onAccept: () => void;
  onDecline: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible && callData) {
      setTimeLeft(30);
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            onDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, callData]);

  if (!visible || !callData) return null;

  const { clientName, mode } = callData;
  const callType = mode === 'audio' ? 'Voice Call' : mode === 'video' ? 'Video Call' : 'Chat Session';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            {/* Caller Info */}
            <View style={styles.callerInfo}>
              <View style={styles.callerAvatar}>
                <Ionicons name="person" size={80} color="#FFF" />
              </View>
              
              <Text style={styles.callerName}>
                {clientName}
              </Text>
              
              <Text style={styles.callType}>
                {callType}
              </Text>
              
              <View style={styles.ringingContainer}>
                <Ionicons name="call" size={20} color="#FFF" />
                <Text style={styles.ringingText}>
                  Ringing... {timeLeft}s
                </Text>
              </View>
            </View>

            {/* Call Buttons */}
            <View style={styles.callButtons}>
              <TouchableOpacity 
                style={[styles.callButton, styles.declineCallButton]}
                onPress={onDecline}
              >
                <View style={styles.declineButtonInner}>
                  <Ionicons name="close" size={32} color="#FFF" />
                </View>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.callButton, styles.acceptCallButton]}
                onPress={onAccept}
              >
                <View style={styles.acceptButtonInner}>
                  <Ionicons name="call" size={28} color="#FFF" />
                </View>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

export default function ProfessionalDashboardScreen() {
  const router = useRouter();
  const { 
    user, 
    professional, 
    logout, 
    setProfessionalOnline, 
    updateProfessionalAvailability,
    isProfessional,
    refreshProfessionalProfile,
    token
  } = useAuth();
  
  const [isOnline, setIsOnline] = useState(professional?.online_status || false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedSpecialization, setDisplayedSpecialization] = useState('');
  const [incomingCall, setIncomingCall] = useState<CallNotificationData | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const backHandlerRef = useRef<any>(null);
  const hasSetupRef = useRef(false);
  const incomingCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configure notifications
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Only request permissions on mobile
        if (Platform.OS !== 'web') {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.log('Notification permissions not granted');
            return;
          }

          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
        }
      } catch (error) {
        console.error('Notification setup error:', error);
      }
    };

    setupNotifications();
  }, []);

  // Initialize connection manager when professional is online
  useEffect(() => {
    if (professional?.id && token && isOnline) {
      console.log('🚀 Starting connection manager for professional:', professional.id);
      setupConnectionManager();
    } else {
      console.log('⏸️ Pausing connection manager - offline or no professional');
      cleanupConnectionManager();
    }

    return () => {
      cleanupConnectionManager();
    };
  }, [professional?.id, token, isOnline]);

  const setupConnectionManager = () => {
    if (!professional?.id || !token) {
      console.error('❌ Cannot setup connection manager: missing professional ID or token');
      return;
    }

    // Clean up existing connection
    if (connectionManagerRef.current) {
      connectionManagerRef.current.disconnect();
    }

    const manager = new ConnectionManager();
    connectionManagerRef.current = manager;

    // Connect with professional ID and token
    manager.connect(professional.id.toString(), token);

    // Listen for incoming calls
    manager.on('incoming_call', (data: CallNotificationData) => {
      console.log('📞 Incoming call received in dashboard:', data);
      handleIncomingCall(data);
    });
  };

  const cleanupConnectionManager = () => {
    if (connectionManagerRef.current) {
      connectionManagerRef.current.disconnect();
      connectionManagerRef.current = null;
    }
  };

  // Handle incoming call
  const handleIncomingCall = async (callData: CallNotificationData) => {
    console.log('🎯 Handling incoming call:', callData);
    
    // Skip if same call is already being handled
    if (incomingCall?.sessionId === callData.sessionId) {
      console.log('⚠️ Same call already being handled, skipping...');
      return;
    }

    // Clear any existing timeout
    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
    }

    // Stop any existing ringtone
    await ringtoneManager.stop();
    
    // Set incoming call data
    setIncomingCall(callData);
    setShowCallModal(true);
    
    // Start ringing
    await ringtoneManager.play(callData.sessionId);
    
    // Send local notification (on mobile only)
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📞 Incoming ${callData.mode === 'audio' ? 'Voice Call' : callData.mode === 'video' ? 'Video Call' : 'Chat Session'}`,
            body: `${callData.clientName} wants to connect with you`,
            data: callData,
            sound: true,
          },
          trigger: null,
        });
      } catch (error) {
        console.error('Failed to schedule notification:', error);
      }
    }
    
    // Auto-decline after 30 seconds if not answered
    incomingCallTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Call timeout - auto declining');
      handleDeclineCall();
    }, 30000);
  };

  // Handle call acceptance - UPDATED
  const handleAcceptCall = async () => {
    if (!incomingCall || !professional?.id || !token) {
      Alert.alert('Error', 'Unable to accept call. Missing information.');
      return;
    }

    try {
      console.log('✅ Professional accepting call:', incomingCall);
      
      // Stop ringtone first
      await ringtoneManager.stop();
      setShowCallModal(false);
      
      // Clear timeout
      if (incomingCallTimeoutRef.current) {
        clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
      
      // Get room ID (use the one from client or generate a matching one)
      const roomId = incomingCall.roomId || `room_${professional.id}_${incomingCall.consultationId}_${Date.now()}`;
      
      console.log('🎯 Room ID for call:', roomId);
      
      // Send acceptance to server
      const response = await fetch(`${API_CONFIG.baseUrl}/api/call/accept/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: incomingCall.callId || incomingCall.sessionId,
          professional_id: professional.id,
          professional_name: professional.name,
          status: 'accepted',
          room_id: roomId,
          call_type: incomingCall.mode === 'audio' ? 'voice' : 'video'
        }),
      });

      if (response.ok) {
        console.log('✅ Call accepted on server, navigating to call page...');
        
        // Navigate to professional call page
        router.push({
          pathname: '/professional/professional-call',
          params: { 
            sessionId: incomingCall.sessionId,
            callId: incomingCall.callId,
            clientId: incomingCall.clientId,
            clientName: incomingCall.clientName,
            mode: incomingCall.mode,
            roomId: roomId,
            isIncomingCall: 'true',
            consultationId: incomingCall.consultationId,
            timestamp: new Date().toISOString()
          }
        });
        
        // Refresh pending requests
        fetchPendingRequests();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call. Please try again.');
    } finally {
      setIncomingCall(null);
    }
  };

  // Handle call decline
  const handleDeclineCall = async () => {
    if (!incomingCall || !professional?.id || !token) {
      await ringtoneManager.stop();
      setShowCallModal(false);
      setIncomingCall(null);
      return;
    }

    try {
      console.log('❌ Professional declining call:', incomingCall);
      
      await ringtoneManager.stop();
      setShowCallModal(false);
      
      // Clear timeout
      if (incomingCallTimeoutRef.current) {
        clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
      
      // Send decline to server
      await fetch(`${API_CONFIG.baseUrl}/api/call/decline/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: incomingCall.callId || incomingCall.sessionId,
          professional_id: professional.id,
          reason: 'declined_by_professional'
        }),
      });

      // Refresh pending requests
      fetchPendingRequests();
      
    } catch (error) {
      console.error('Error declining call:', error);
    } finally {
      setIncomingCall(null);
    }
  };

  // API client function
  const apiClient = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    let lastError: Error;
    
    for (let attempt = 0; attempt < API_CONFIG.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Token ${token}` } : {}),
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            await logout();
            router.replace('/login');
            throw new Error('Authentication failed');
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;
        if (attempt === API_CONFIG.retries - 1) throw lastError;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    throw lastError!;
  }, [token, logout, router]);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (!professional?.id) {
      setError('Professional profile not found. Please complete your professional profile setup.');
      if (showLoading) setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      if (showLoading) setLoading(true);

      const spec = professional.primary_category?.name || professional.specialization || 'Not specified';
      setDisplayedSpecialization(spec);
      
      const [statsData, requestsData] = await Promise.all([
        apiClient(`/api/professional/dashboard-stats/${professional.id}/`),
        apiClient(`/api/professional/pending-requests/${professional.id}/`)
      ]);

      setStats(statsData);
      setPendingRequests(requestsData.requests || []);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data from server';
      setError(errorMessage);
      
      if (!refreshing && showLoading) {
        Alert.alert('Connection Error', 
          `Could not fetch data from server: ${errorMessage}`,
          [
            { text: 'Try Again', onPress: () => fetchDashboardData(true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [professional, apiClient, fadeAnim, slideAnim, refreshing]);

  const fetchPendingRequests = useCallback(async () => {
    if (!professional?.id || !isOnline) return;

    try {
      const data = await apiClient(`/api/professional/pending-requests/${professional.id}/`);
      setPendingRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, [professional?.id, isOnline, apiClient]);

  const handleOnlineStatusChange = async (value: boolean) => {
    if (!professional?.id) {
      Alert.alert('Profile Required', 'Please complete your professional profile first.');
      return;
    }

    if (incomingCall) {
      Alert.alert('Cannot Change Status', 'You have an incoming call. Please accept or decline it first.');
      return;
    }

    setUpdatingStatus(true);
    try {
      setIsOnline(value);
      
      await apiClient(`/api/professional/online-status/${professional.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_online: value,
        }),
      });
      
      await apiClient(`/api/professional/availability/${professional.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_available: value,
        }),
      });

      if (setProfessionalOnline) {
        await setProfessionalOnline(value);
      }
      
      if (updateProfessionalAvailability) {
        await updateProfessionalAvailability(value);
      }

      try {
        await refreshProfessionalProfile();
      } catch (profileError) {
        console.log('Profile refresh failed:', profileError);
      }

      if (value) {
        fetchDashboardData(false);
      } else {
        cleanupConnectionManager();
        await ringtoneManager.stop();
        setIncomingCall(null);
        setShowCallModal(false);
      }

    } catch (error) {
      console.error('Error updating online status:', error);
      setIsOnline(!value);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      Alert.alert('Error', `Failed to update online status: ${errorMessage}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!professional?.id) {
      Alert.alert('Profile Required', 'Please complete your professional profile first.');
      return;
    }

    if (incomingCall) {
      Alert.alert('Active Call', 'Please handle the incoming call first.');
      return;
    }

    try {
      const data = await apiClient(`/api/session/accept/${requestId}/`, {
        method: 'POST',
        body: JSON.stringify({
          professional_id: professional.id,
        }),
      });

      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      setStats(prev => prev ? { ...prev, pending_requests: (prev.pending_requests || 0) - 1 } : null);
      
      // Navigate to professional call page
      router.push({
        pathname: '/professional/professional-call',
        params: { 
          sessionId: data.session_id,
          clientId: data.client_id,
          clientName: data.client_name || 'Client',
          mode: data.mode || 'chat',
          roomId: data.zego_room_id || `room_${professional.id}_${data.session_id}_${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      Alert.alert('Error', `Failed to accept request: ${errorMessage}`);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!professional?.id) {
      Alert.alert('Profile Required', 'Please complete your professional profile first.');
      return;
    }

    if (incomingCall) {
      Alert.alert('Active Call', 'Please handle the incoming call first.');
      return;
    }

    try {
      await apiClient(`/api/session/decline/${requestId}/`, {
        method: 'POST',
        body: JSON.stringify({
          professional_id: professional.id,
        }),
      });

      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      setStats(prev => prev ? { ...prev, pending_requests: (prev.pending_requests || 0) - 1 } : null);
    } catch (error) {
      console.error('Error declining request:', error);
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (professional?.id && !hasSetupRef.current) {
      hasSetupRef.current = true;
      fetchDashboardData(true);
    } else {
      setLoading(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) {
      const spec = professional.primary_category?.name || professional.specialization || 'Not specified';
      setDisplayedSpecialization(spec);
    }
  }, [professional]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOnline && professional?.id) {
      fetchPendingRequests();
      interval = setInterval(fetchPendingRequests, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOnline, professional?.id, fetchPendingRequests]);

  useEffect(() => {
    const backAction = () => {
      if (incomingCall) {
        Alert.alert('Active Call', 'You have an incoming call. Please accept or decline it first.');
        return true;
      }
      return false;
    };

    backHandlerRef.current = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandlerRef.current?.remove();
  }, [incomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ringtoneManager.stop();
      cleanupConnectionManager();
      if (backHandlerRef.current) {
        backHandlerRef.current.remove();
      }
      if (incomingCallTimeoutRef.current) {
        clearTimeout(incomingCallTimeoutRef.current);
      }
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return `KSH ${amount?.toFixed(0)?.replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}`;
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'chat': return '💬';
      case 'audio': return '🎤';
      case 'video': return '📹';
      default: return '❓';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  if (isProfessional && !professional) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.setupContainer}>
          <Ionicons name="person-add-outline" size={80} color="#6366F1" />
          <Text style={styles.setupTitle}>Professional Profile Required</Text>
          <Text style={styles.setupText}>
            You need to set up your professional profile before accessing the dashboard.
          </Text>
          <TouchableOpacity style={styles.setupButton} onPress={() => router.push('/professional-setup')}>
            <Text style={styles.setupButtonText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.errorContainer}>
          <Ionicons name="wifi-outline" size={64} color="#9CA3AF" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboardData(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        
        <BlurView intensity={80} tint="light" style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>Professional Dashboard</Text>
              <Text style={styles.subtitle}>
                {professional?.name || user?.first_name || 'Professional'} • {displayedSpecialization}
              </Text>
              {incomingCall && (
                <View style={styles.activeCallIndicator}>
                  <Ionicons name="call" size={14} color="#EF4444" />
                  <Text style={styles.activeCallText}>INCOMING CALL...</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              <View style={styles.statusToggle}>
                <Text style={[styles.statusLabel, isOnline && styles.statusOnline]}>
                  {isOnline ? '🟢 Online' : '⚫ Offline'}
                </Text>
                <Switch 
                  value={isOnline} 
                  onValueChange={handleOnlineStatusChange}
                  disabled={updatingStatus || !professional || incomingCall}
                  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  thumbColor={isOnline ? '#FFFFFF' : '#FFFFFF'}
                />
                {updatingStatus && (
                  <ActivityIndicator size="small" color="#6366F1" style={styles.statusLoader} />
                )}
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>

        <ScrollView 
          style={styles.scroll} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
        >
          <Animated.View 
            style={[
              styles.animatedContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Earnings & Stats Section */}
            <View style={styles.heroSection}>
              <View style={styles.earningsCard}>
                <View style={styles.earningsHeader}>
                  <Text style={styles.earningsTitle}>Today's Earnings</Text>
                </View>
                <Text style={styles.earningsAmount}>
                  {formatCurrency(stats?.today_earnings || 0)}
                </Text>
                <View style={styles.earningsFooter}>
                  <Text style={styles.earningsSubtext}>
                    {stats?.today_sessions || 0} session{stats?.today_sessions !== 1 ? 's' : ''} completed
                  </Text>
                  {stats?.response_rate && (
                    <View style={styles.earningsBadge}>
                      <Text style={styles.earningsBadgeText}>
                        {(stats.response_rate).toFixed(0)}% response rate
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { borderLeftColor: '#6366F1' }]}>
                  <Text style={styles.statIcon}>📊</Text>
                  <Text style={styles.statValue}>{stats?.total_sessions || 0}</Text>
                  <Text style={styles.statLabel}>Total Sessions</Text>
                </View>
                
                <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statValue}>
                    {stats?.average_rating ? `${stats.average_rating.toFixed(1)}` : 'N/A'}
                  </Text>
                  <Text style={styles.statLabel}>Avg Rating</Text>
                </View>
                
                <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                  <Text style={styles.statIcon}>💰</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(stats?.monthly_earnings || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Monthly</Text>
                </View>
                
                <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
                  <Text style={styles.statIcon}>✅</Text>
                  <Text style={styles.statValue}>
                    {(stats?.completion_rate || 0).toFixed(0)}%
                  </Text>
                  <Text style={styles.statLabel}>Completion</Text>
                </View>
              </View>
            </View>

            {/* Pending Requests Section */}
            {isOnline && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending Requests</Text>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.sectionBadge}>
                      {pendingRequests.length}
                    </Text>
                  </View>
                </View>
                
                {pendingRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.emptyText}>No pending requests</Text>
                  </View>
                ) : (
                  pendingRequests.slice(0, 3).map((request) => (
                    <View 
                      key={request.id} 
                      style={[
                        styles.requestCard,
                        { borderLeftColor: getUrgencyColor(request.urgency || 'medium') }
                      ]}
                    >
                      <View style={styles.requestHeader}>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestName}>{request.client_name}</Text>
                          <View style={styles.requestMeta}>
                            <Text style={styles.requestType}>
                              {getModeIcon(request.mode)} {request.mode.charAt(0).toUpperCase() + request.mode.slice(1)}
                            </Text>
                            <Text style={styles.requestCategory}>• {request.category}</Text>
                          </View>
                        </View>
                        <Text style={styles.requestTime}>
                          {new Date(request.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.declineBtn]}
                          onPress={() => handleDeclineRequest(request.id)}
                          disabled={incomingCall}
                        >
                          <Ionicons name="close" size={16} color="#6B7280" />
                          <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.acceptBtn]}
                          onPress={() => handleAcceptRequest(request.id)}
                          disabled={incomingCall}
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                
                {pendingRequests.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => router.push('/professional/incoming')}
                    disabled={incomingCall}
                  >
                    <Text style={styles.viewAllText}>View All Requests ({pendingRequests.length})</Text>
                    <Ionicons name="arrow-forward" size={16} color="#6366F1" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={styles.quickActionCard} 
                  onPress={() => router.push('/withdraw-earnings')} 
                  disabled={incomingCall}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="cash-outline" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.quickActionText}>Withdraw</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionCard} 
                  onPress={() => router.push('/professional-analytics')} 
                  disabled={incomingCall}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.quickActionText}>Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickActionCard} 
                  onPress={() => router.push('/professional-settings')} 
                  disabled={incomingCall}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="settings-outline" size={24} color="#6B7280" />
                  </View>
                  <Text style={styles.quickActionText}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickActionCard} 
                  onPress={() => {
                    if (professional?.id) {
                      router.push(`/professional-sessions/${professional.id}`);
                    }
                  }} 
                  disabled={incomingCall}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="calendar-outline" size={24} color="#D97706" />
                  </View>
                  <Text style={styles.quickActionText}>Sessions</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Professional Status */}
            <View style={styles.statusCard}>
              <Text style={styles.statusCardTitle}>Account Status</Text>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Verification</Text>
                <Text style={[
                  styles.statusValue, 
                  professional?.is_approved ? styles.statusApproved : styles.statusPending
                ]}>
                  {professional?.is_approved ? 'Verified' : 'Pending'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Session Rate</Text>
                <Text style={styles.statusValue}>KSH {professional?.rate || 0}/min</Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Call Status</Text>
                <Text style={[
                  styles.statusValue,
                  incomingCall ? styles.statusPending : styles.statusApproved
                ]}>
                  {incomingCall ? '📞 INCOMING CALL' : '✅ Ready'}
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Incoming Call Modal */}
      <IncomingCallModal
        visible={showCallModal}
        callData={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 24,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  setupText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  setupButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.5)',
  },
  headerContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 12,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#111827', 
    marginBottom: 4 
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  activeCallIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  activeCallText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  statusToggle: { 
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#6B7280' 
  },
  statusOnline: {
    color: '#10B981',
  },
  statusLoader: {
    position: 'absolute',
    bottom: -20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  scroll: { 
    flex: 1, 
  },
  animatedContent: {
    padding: 20,
  },
  heroSection: {
    marginBottom: 24,
  },
  earningsCard: { 
    backgroundColor: '#4F46E5', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsTitle: { 
    fontSize: 16, 
    color: '#C7D2FE', 
    fontWeight: '600',
  },
  earningsAmount: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#fff', 
    marginBottom: 12 
  },
  earningsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsSubtext: { 
    fontSize: 14, 
    color: '#C7D2FE',
    flex: 1,
  },
  earningsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  earningsBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: { 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 12, 
    flex: 1,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#111827', 
    marginBottom: 2 
  },
  statLabel: { 
    fontSize: 10, 
    color: '#6B7280', 
    fontWeight: '500',
    textAlign: 'center',
  },
  section: { 
    marginBottom: 24 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827'
  },
  badgeContainer: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sectionBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  requestCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 2 
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestType: { 
    fontSize: 12, 
    color: '#6366F1',
    fontWeight: '500',
  },
  requestCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  requestTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  requestActions: { 
    flexDirection: 'row', 
    gap: 8 
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
  acceptBtn: { 
    backgroundColor: '#10B981',
  },
  acceptText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 12,
  },
  declineBtn: { 
    backgroundColor: '#F3F4F6',
  },
  declineText: { 
    color: '#6B7280', 
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginTop: 8,
  },
  viewAllText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusApproved: {
    color: '#10B981',
  },
  statusPending: {
    color: '#F59E0B',
  },
  // Incoming Call Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  callerAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 18,
    color: '#E0E7FF',
    marginBottom: 16,
  },
  ringingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ringingText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  callButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  callButton: {
    flex: 1,
    alignItems: 'center',
  },
  declineButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  acceptButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  declineButtonText: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: '#86EFAC',
    fontSize: 16,
    fontWeight: '600',
  },
});