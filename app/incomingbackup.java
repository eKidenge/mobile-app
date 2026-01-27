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
  AppState
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import { useAuth } from '../../contexts/AuthContext';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { registerForPushNotificationsAsync } from '../../utils/notifications';

// ✅ ONLY IMPORT ZEGO ENGINE (Skip the broken UI Kit)
let ZegoExpressEngine = null;
try {
  ZegoExpressEngine = require('zego-express-engine-reactnative').default;
  console.log('✅ ZEGO Engine loaded successfully');
} catch (error) {
  console.warn('⚠️ ZEGO Engine failed to load:', error.message);
  console.log('⚠️ Sound and basic call features will still work');
}

const { width, height } = Dimensions.get('window');

// ✅ ZEGOCLOUD Configuration
const ZEGO_CONFIG = {
  appID: 408880662,
  appSign: 'edadcc63305dc4c82773507ecab38dca3e90f29bdb3849aaef3f9bc9a1750ecb',
};

// ✅ SIMPLIFIED CALL MANAGER - Works even without ZEGO UI Kit
class RealTimeCallManager {
  static instance = null;
  
  constructor() {
    this.sound = null;
    this.isPlaying = false;
    this.vibrationInterval = null;
    this.currentCall = null;
    this.engine = null;
    this.isZegoInitialized = false;
    this.callListeners = [];
    this.soundLoaded = false;
    this.zegoEngineAvailable = ZegoExpressEngine !== null;
  }
  
  static getInstance() {
    if (!RealTimeCallManager.instance) {
      RealTimeCallManager.instance = new RealTimeCallManager();
    }
    return RealTimeCallManager.instance;
  }
  
  // ✅ LOAD SOUND FOR INSTANT RINGING
  async loadSound() {
    try {
      console.log('🔊 Loading ringtone for instant calls...');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      
      // Try different sound sources
      const soundSources = [
        require('../../assets/sounds/ringtone.mp3'),
        require('../../assets/sounds/classic_ring.mp3'),
      ];
      
      for (const source of soundSources) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            source,
            { shouldPlay: false, isLooping: true, volume: 1.0 }
          );
          this.sound = sound;
          this.soundLoaded = true;
          console.log('✅ Ringtone loaded successfully');
          return true;
        } catch (error) {
          console.log('Failed to load sound from source:', error.message);
        }
      }
      
      // If no sound file, use default
      this.soundLoaded = true;
      console.log('⚠️ Using default vibration only');
      return true;
    } catch (error) {
      console.error('❌ Error loading sound:', error);
      this.soundLoaded = false;
      return false;
    }
  }
  
  // ✅ PLAY SOUND IMMEDIATELY WHEN CALL COMES
  async playInstantRingtone(callData) {
    console.log('🔔 Playing INSTANT ringtone for incoming call:', callData.clientName);
    
    // Stop any existing sound
    if (this.isPlaying) {
      await this.stop();
    }
    
    this.currentCall = callData;
    this.isPlaying = true;
    
    try {
      // PLAY SOUND IMMEDIATELY
      if (this.sound && this.soundLoaded) {
        await this.sound.setVolumeAsync(1.0);
        await this.sound.setIsLoopingAsync(true);
        await this.sound.playAsync();
        console.log('🔊 Sound playing NOW');
      }
      
      // START VIBRATION
      this.startVibration();
      
      // NOTIFY ALL LISTENERS
      this.callListeners.forEach(listener => {
        listener.onCallReceived(callData);
      });
      
    } catch (error) {
      console.error('Error playing ringtone:', error);
      this.isPlaying = false;
      this.startVibration(); // At least vibrate
    }
  }
  
  startVibration() {
    try {
      Vibration.cancel();
      
      // Strong vibration pattern for calls
      const pattern = [0, 1000, 500, 1000]; // Vibrate 1s, pause 0.5s, repeat
      
      if (Platform.OS === 'android') {
        Vibration.vibrate(pattern, true);
      } else {
        // iOS vibration
        Vibration.vibrate(1000);
        this.vibrationInterval = setInterval(() => {
          Vibration.vibrate(1000);
        }, 1500);
      }
      
      console.log('📳 Vibration started for call');
    } catch (error) {
      console.error('Vibration error:', error);
    }
  }
  
  // ✅ STOP SOUND
  async stop() {
    try {
      console.log('🔇 Stopping ringtone...');
      
      if (this.sound && this.isPlaying) {
        await this.sound.stopAsync();
        await this.sound.setPositionAsync(0);
      }
      
      Vibration.cancel();
      if (this.vibrationInterval) {
        clearInterval(this.vibrationInterval);
        this.vibrationInterval = null;
      }
      
      this.isPlaying = false;
      this.currentCall = null;
      
      console.log('✅ Ringtone stopped');
    } catch (error) {
      console.error('Error stopping sound:', error);
      this.isPlaying = false;
    }
  }
  
  // ✅ SIMPLE ZEGO INITIALIZATION (Engine only)
  async initializeZego(userID, userName) {
    if (this.isZegoInitialized) return true;
    
    if (!this.zegoEngineAvailable) {
      console.warn('⚠️ ZEGO Engine not available, using sound only');
      return false;
    }
    
    try {
      console.log('🚀 Initializing ZEGO Engine...');
      
      // Create Zego engine
      this.engine = await ZegoExpressEngine.createEngine(
        ZEGO_CONFIG.appID,
        ZEGO_CONFIG.appSign
      );
      
      // Set user info
      await this.engine.loginRoom(
        `user_room_${userID}`,
        { userID, userName },
        { userUpdate: true }
      );
      
      this.isZegoInitialized = true;
      console.log('✅ ZEGO Engine ready for basic calls');
      return true;
      
    } catch (error) {
      console.error('❌ ZEGO Engine initialization failed:', error);
      console.log('⚠️ Sound and vibration will still work');
      return false;
    }
  }
  
  // ✅ CREATE CALL ROOM
  generateCallRoomID(sessionId) {
    return `teleconnect_call_${sessionId}_${Date.now()}`;
  }
  
  // ✅ ADD CALL LISTENER
  addCallListener(listener) {
    this.callListeners.push(listener);
  }
  
  // ✅ REMOVE CALL LISTENER
  removeCallListener(listener) {
    this.callListeners = this.callListeners.filter(l => l !== listener);
  }
  
  // ✅ CHECK IF RINGING
  isRinging() {
    return this.isPlaying;
  }
  
  // ✅ GET CURRENT CALL
  getCurrentCall() {
    return this.currentCall;
  }
  
  // ✅ GET ZEGO STATUS
  getZegoStatus() {
    return {
      zegoEngineAvailable: this.zegoEngineAvailable,
      zegoInitialized: this.isZegoInitialized,
      zegoEngine: this.engine !== null
    };
  }
  
  // ✅ START BASIC ZEGO CALL (Audio only)
  async startBasicCall(roomId, userId, userName, isHost = true) {
    if (!this.engine || !this.isZegoInitialized) {
      console.warn('ZEGO Engine not ready for calls');
      return false;
    }
    
    try {
      console.log(`🎤 Starting basic call in room: ${roomId}`);
      
      // Join room
      await this.engine.loginRoom(
        roomId,
        { userID: userId, userName },
        { userUpdate: true }
      );
      
      // Start publishing audio
      if (isHost) {
        await this.engine.startPublishingStream(`stream_${userId}`);
        console.log('🎤 Audio publishing started');
      }
      
      return true;
    } catch (error) {
      console.error('Error starting basic call:', error);
      return false;
    }
  }
  
  // ✅ STOP ZEGO CALL
  async stopCall(roomId) {
    if (!this.engine) return;
    
    try {
      await this.engine.stopPublishingStream();
      await this.engine.logoutRoom(roomId);
      console.log('📞 Call stopped');
    } catch (error) {
      console.error('Error stopping call:', error);
    }
  }
}

// ✅ INITIALIZE REAL-TIME CALL MANAGER
const callManager = RealTimeCallManager.getInstance();

// Define background task name
const BACKGROUND_FETCH_TASK = 'background-call-check';

// Register background task
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    console.log('🔄 Background task checking for calls...');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  });
}

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
}

interface CallNotificationData {
  type: string;
  sessionId: string;
  clientId: string;
  clientName: string;
  mode: 'chat' | 'audio' | 'video';
  timestamp: string;
  professionalId: string;
  roomId?: string;
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

export default function ProfessionalDashboardScreen() {
  const router = useRouter();
  const { 
    user, 
    professional, 
    logout, 
    setProfessionalOnline, 
    updateProfessionalAvailability,
    isProfessional,
    refreshProfessionalProfile
  } = useAuth();
  
  const [isOnline, setIsOnline] = useState(professional?.online_status || false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedSpecialization, setDisplayedSpecialization] = useState('');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [activeCall, setActiveCall] = useState<CallNotificationData | null>(null);
  const [lastCallCheck, setLastCallCheck] = useState<number>(0);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const [backgroundFetchRegistered, setBackgroundFetchRegistered] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    volume: 1.0,
  });
  const [zegoStatus, setZegoStatus] = useState(callManager.getZegoStatus());
  const [appState, setAppState] = useState(AppState.currentState);
  const [callVolume, setCallVolume] = useState(1.0);
  const [zegoTestResult, setZegoTestResult] = useState<string>('Not tested');
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);
  const backHandlerRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const appStateSubscriptionRef = useRef<any>(null);
  const callListenerRef = useRef<any>(null);

  // ✅ INITIALIZE REAL-TIME CALL SYSTEM
  useEffect(() => {
    const initializeCallSystem = async () => {
      try {
        console.log('🚀 Initializing real-time call system...');
        
        // 1. Load sound for instant ringing
        const soundLoaded = await callManager.loadSound();
        setSoundLoaded(soundLoaded);
        
        // 2. Initialize ZEGO Engine (if available)
        if (professional?.id) {
          const userID = professional.id.toString();
          const userName = professional.name || user?.first_name || 'Professional';
          const zegoReady = await callManager.initializeZego(userID, userName);
          setZegoStatus(callManager.getZegoStatus());
          console.log(`✅ ZEGO Engine initialization: ${zegoReady}`);
        }
        
        // 3. Set up call listener
        callListenerRef.current = {
          onCallReceived: (callData) => {
            console.log('📞 Call received via listener:', callData);
            handleIncomingCallAlert(callData);
          }
        };
        callManager.addCallListener(callListenerRef.current);
        
        console.log('✅ Real-time call system ready');
      } catch (error) {
        console.error('❌ Error initializing call system:', error);
      }
    };
    
    initializeCallSystem();
    
    return () => {
      // Clean up
      if (callListenerRef.current) {
        callManager.removeCallListener(callListenerRef.current);
      }
      callManager.stop();
    };
  }, [professional?.id]);

  // Initialize Audio and notifications
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing professional dashboard...');
        
        // Set up audio
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        // Initialize push notifications
        await initPushNotifications();
        
        // Set up notification listeners
        setupNotificationListeners();
        
        // Set up WebSocket for real-time calls
        setupWebSocket();
        
        // Register background fetch
        await registerBackgroundFetch();
        
        // Listen to app state changes
        setupAppStateListener();
        
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ Initialization error:', error);
      }
    };
    
    initializeApp();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    console.log('🧹 Cleaning up...');
    
    // Stop ringtone
    await callManager.stop();
    
    // Stop polling
    stopPollingForCalls();
    
    // Remove listeners
    if (notificationListenerRef.current) {
      notificationListenerRef.current.remove();
    }
    if (responseListenerRef.current) {
      responseListenerRef.current.remove();
    }
    if (backHandlerRef.current) {
      backHandlerRef.current.remove();
    }
    if (appStateSubscriptionRef.current) {
      appStateSubscriptionRef.current.remove();
    }
    if (callListenerRef.current) {
      callManager.removeCallListener(callListenerRef.current);
    }
    
    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Unregister background fetch
    await unregisterBackgroundFetch();
  };

  const setupAppStateListener = () => {
    appStateSubscriptionRef.current = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 App state changed to:', nextAppState);
      setAppState(nextAppState);
      
      // Restart polling when app comes to foreground
      if (nextAppState === 'active' && isOnline && professional?.id) {
        console.log('📱 App is active, restarting polling...');
        startPollingForCalls();
      }
    });
  };

  // Initialize push notifications
  const initPushNotifications = async () => {
    try {
      console.log('🔔 Initializing push notifications...');
      
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: notificationSettings.soundEnabled,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Get push token
      const token = await registerForPushNotificationsAsync();
      console.log('Expo Push Token:', token);
      setExpoPushToken(token);
      
      // Send token to backend
      if (token && professional?.id && user?.token) {
        await sendPushTokenToBackend(token);
      }
      
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const sendPushTokenToBackend = async (token: string) => {
    if (!professional?.id || !user?.token) return;
    
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/professional/update-push-token/${professional.id}/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${user.token}`,
          },
          body: JSON.stringify({
            push_token: token,
            device_type: Platform.OS,
            device_name: Device.deviceName || 'Unknown',
            device_model: Device.modelName || 'Unknown',
            app_version: '1.0.0',
          }),
        }
      );
      
      if (response.ok) {
        console.log('✅ Push token sent to backend');
      } else {
        console.error('Failed to send push token:', response.status);
      }
    } catch (error) {
      console.error('Error sending push token:', error);
    }
  };

  const setupNotificationListeners = () => {
    console.log('🎧 Setting up notification listeners...');
    
    // Listen for notifications received while app is foregrounded
    notificationListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received:', notification.request.content);
      
      const data = notification.request.content.data as CallNotificationData;
      
      if (data?.type === 'incoming_call') {
        console.log('📞 Incoming call notification detected');
        handleIncomingCallAlert(data);
      }
      
      if (data?.type === 'call_ended') {
        console.log('📞 Call ended notification');
        callManager.stop();
        setActiveCall(null);
      }
    });

    // Listen for notification responses (user tapped notification)
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response.notification.request.content.data);
      
      const data = response.notification.request.content.data as CallNotificationData;
      
      if (data?.type === 'incoming_call') {
        console.log('🚀 Navigating to session from notification tap');
        router.push({
          pathname: '/professional/basic-call',
          params: { 
            sessionId: data.sessionId,
            clientId: data.clientId,
            clientName: data.clientName,
            mode: data.mode,
            timestamp: data.timestamp,
            roomId: data.roomId || callManager.generateCallRoomID(data.sessionId)
          }
        });
      }
    });
    
    console.log('✅ Notification listeners setup complete');
  };

  const setupWebSocket = () => {
    if (!professional?.id) return;
    
    try {
      // WebSocket connection for real-time calls
      const wsUrl = API_CONFIG.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      const socket = new WebSocket(`${wsUrl}/ws/calls/${professional.id}/`);
      
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('🔌 WebSocket connected');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket message:', data);
          
          if (data.type === 'incoming_call') {
            // ✅ IMMEDIATELY PLAY SOUND WHEN CALL COMES
            handleIncomingCallAlert(data);
          }
          
          if (data.type === 'call_status_update') {
            console.log('Call status update:', data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (professional?.id) {
            setupWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  };

  const registerBackgroundFetch = async () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        setBackgroundFetchRegistered(true);
        console.log('✅ Background fetch registered');
      } catch (error) {
        console.error('Error registering background fetch:', error);
        setBackgroundFetchRegistered(false);
      }
    }
  };

  const unregisterBackgroundFetch = async () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        setBackgroundFetchRegistered(false);
        console.log('✅ Background fetch unregistered');
      } catch (error) {
        console.error('Error unregistering background fetch:', error);
      }
    }
  };

  // ✅ HANDLE INCOMING CALL WITH INSTANT SOUND
  const handleIncomingCallAlert = async (callData: CallNotificationData) => {
    console.log('📞 Handling incoming call WITH INSTANT SOUND:', callData);
    
    // Don't show if already handling this call
    if (activeCall?.sessionId === callData.sessionId) {
      console.log('Already handling this call');
      return;
    }
    
    // ✅ PLAY SOUND IMMEDIATELY - NO WAITING!
    await callManager.playInstantRingtone(callData);
    
    // Update active call state
    setActiveCall(callData);
    
    // Show call alert
    Alert.alert(
      `📞 Incoming ${callData.mode === 'audio' ? 'Voice Call' : callData.mode === 'video' ? 'Video Call' : 'Chat Session'}`,
      `${callData.clientName} wants to connect with you\n\nMode: ${callData.mode.toUpperCase()}\nTap Accept to start the session`,
      [
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            console.log('❌ Call declined');
            await declineCall(callData);
          }
        },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            console.log('✅ Call accepted');
            await acceptCall(callData);
          }
        }
      ],
      { 
        cancelable: false,
        onDismiss: async () => {
          console.log('Call alert dismissed');
          await callManager.stop();
          setActiveCall(null);
        }
      }
    );
  };

  const acceptCall = async (callData: CallNotificationData) => {
    // Stop sound immediately
    await callManager.stop();
    setActiveCall(null);
    
    try {
      // Send acceptance to backend
      const response = await apiClient(`/api/session/accept/${callData.sessionId}/`, {
        method: 'POST',
        body: JSON.stringify({
          professional_id: professional.id,
        }),
      });
      
      console.log('Call accepted on backend:', response);
      
      // Generate room ID
      const roomId = callData.roomId || callManager.generateCallRoomID(callData.sessionId);
      
      // Navigate to basic call screen
      router.push({
        pathname: '/professional/basic-call',
        params: { 
          sessionId: callData.sessionId,
          clientId: callData.clientId,
          clientName: callData.clientName,
          mode: callData.mode,
          timestamp: new Date().toISOString(),
          roomId: roomId,
          isHost: 'true'
        }
      });
      
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call. Please try again.');
    }
  };

  const declineCall = async (callData: CallNotificationData) => {
    // Stop sound
    await callManager.stop();
    setActiveCall(null);
    
    try {
      await apiClient(`/api/session/decline/${callData.sessionId}/`, {
        method: 'POST',
        body: JSON.stringify({
          professional_id: professional.id,
          reason: 'declined_by_professional'
        }),
      });
      
      console.log('Call declined on backend');
      
      // Refresh pending requests
      fetchPendingRequests();
      
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  // API Client
  const apiClient = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    let lastError: Error;
    
    for (let attempt = 0; attempt < API_CONFIG.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        console.log(`🌐 API ${options.method || 'GET'} ${url}`);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token ? { 'Authorization': `Token ${user.token}` } : {}),
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
          if (response.status === 403) {
            throw new Error('Access denied');
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ API Success: ${endpoint}`);
        return data;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ API attempt ${attempt + 1} failed:`, error);
        
        if (attempt === API_CONFIG.retries - 1) throw lastError;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    throw lastError!;
  }, [user?.token, logout, router]);

  // Start/stop polling based on online status
  useEffect(() => {
    if (isOnline && professional?.id && user?.token) {
      console.log('🚀 Starting polling for incoming calls...');
      startPollingForCalls();
      setupWebSocket(); // Ensure WebSocket is connected
    } else {
      console.log('🛑 Stopping polling for calls...');
      stopPollingForCalls();
      setActiveCall(null);
      callManager.stop(); // Stop any ringing
    }

    return () => {
      stopPollingForCalls();
    };
  }, [isOnline, professional?.id, user?.token]);

  // Enhanced polling for calls
  const startPollingForCalls = () => {
    if (!professional?.id || !user?.token || isPolling) {
      console.log('Cannot start polling');
      return;
    }
    
    console.log(`🚀 Starting call polling for professional ${professional.id}...`);
    setIsPolling(true);
    
    // Initial check
    checkForIncomingCalls();
    
    // Set up interval
    pollingIntervalRef.current = setInterval(async () => {
      await checkForIncomingCalls();
    }, 3000); // Check every 3 seconds for faster response
    
    console.log('✅ Call polling started');
  };

  // Check for incoming calls from multiple endpoints
  const checkForIncomingCalls = async () => {
    if (!professional?.id || !user?.token) {
      console.log('Cannot check calls: missing professional ID or token');
      return;
    }

    // If already handling a call, skip check
    if (activeCall || callManager.isRinging()) {
      return;
    }

    try {
      console.log(`🔍 Checking for incoming calls (Professional ID: ${professional.id})...`);
      
      const timestamp = Date.now();
      setLastCallCheck(timestamp);
      
      // Try multiple endpoints
      const endpoints = [
        `/api/professional/incoming-calls/${professional.id}/`,
        `/api/professional/pending-requests/${professional.id}/`,
        `/api/session/pending-for-professional/${professional.id}/`,
        `/api/calls/pending/${professional.id}/`
      ];
      
      let incomingCallFound = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient(endpoint);
          
          if (response && (response.requests || response.sessions || response.active_calls || Array.isArray(response))) {
            let calls = [];
            
            if (response.requests) calls = response.requests;
            else if (response.sessions) calls = response.sessions;
            else if (response.active_calls) calls = response.active_calls;
            else if (Array.isArray(response)) calls = response;
            
            if (calls && calls.length > 0) {
              const incomingCall = calls[0];
              console.log('📞 Found incoming call:', incomingCall);
              
              const callDetails: CallNotificationData = {
                type: 'incoming_call',
                sessionId: incomingCall.session_id || incomingCall.id,
                clientId: incomingCall.client_id || incomingCall.client?.id,
                clientName: incomingCall.client_name || incomingCall.client?.name || 'Client',
                mode: incomingCall.mode || 'audio',
                timestamp: incomingCall.created_at || new Date().toISOString(),
                professionalId: professional.id.toString(),
                roomId: incomingCall.room_id || callManager.generateCallRoomID(incomingCall.session_id || incomingCall.id)
              };
              
              // ✅ IMMEDIATELY PLAY SOUND AND SHOW ALERT
              handleIncomingCallAlert(callDetails);
              incomingCallFound = true;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} error:`, endpointError);
        }
      }
      
      if (!incomingCallFound) {
        console.log('📭 No incoming calls found');
      }
      
    } catch (error) {
      console.error('❌ Error checking incoming calls:', error);
    }
  };

  const stopPollingForCalls = () => {
    if (pollingIntervalRef.current) {
      console.log('🛑 Stopping call polling...');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
      console.log('✅ Call polling stopped');
    }
  };

  // Fetch dashboard data
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

      console.log('📊 Fetching dashboard data for professional:', professional.id);
      
      // Update specialization from professional data
      const spec = professional.primary_category?.name || professional.specialization || 'Not specified';
      setDisplayedSpecialization(spec);
      
      // Fetch dashboard stats and pending requests
      const [statsData, requestsData] = await Promise.all([
        apiClient(`/api/professional/dashboard-stats/${professional.id}/`),
        apiClient(`/api/professional/pending-requests/${professional.id}/`)
      ]);

      console.log('✅ Dashboard data fetched successfully');

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
      console.error('❌ Error fetching dashboard data:', error);
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

  // Handle online status change
  const handleOnlineStatusChange = async (value: boolean) => {
    if (!professional?.id) {
      Alert.alert('Profile Required', 'Please complete your professional profile first.');
      return;
    }

    setUpdatingStatus(true);
    try {
      setIsOnline(value);
      
      console.log(`🔄 Updating online status to: ${value} for professional: ${professional.id}`);
      
      // Update online status
      await apiClient(`/api/professional/online-status/${professional.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          online_status: value,
          last_seen: new Date().toISOString()
        }),
      });
      
      // Update local context
      setProfessionalOnline(value);
      updateProfessionalAvailability({ online_status: value });
      
      console.log(`✅ Online status updated to: ${value}`);
      
      // If going online, refresh pending requests
      if (value) {
        fetchPendingRequests();
      } else {
        // If going offline, stop all active calls
        await callManager.stop();
        setActiveCall(null);
        stopPollingForCalls();
      }
      
    } catch (error) {
      console.error('Error updating online status:', error);
      Alert.alert('Error', 'Failed to update online status. Please try again.');
      setIsOnline(!value); // Revert UI state
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop all ongoing activities
              await cleanup();
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSessionPress = (request: PendingRequest) => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to accept sessions. Please toggle the online switch first.');
      return;
    }
    
    router.push({
      pathname: '/professional/session-details',
      params: {
        sessionId: request.id,
        requestData: JSON.stringify(request)
      }
    });
  };

  const renderStatsCard = (title: string, value: string | number, icon: string, color: string, subtitle?: string) => {
    return (
      <Animated.View 
        style={[
          styles.statsCard,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <BlurView intensity={80} tint="light" style={styles.statsCardBlur}>
          <View style={[styles.statsIconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <View style={styles.statsContent}>
            <Text style={styles.statsValue}>{value}</Text>
            <Text style={styles.statsTitle}>{title}</Text>
            {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  const renderRequestCard = (request: PendingRequest, index: number) => {
    const isUrgent = request.urgency === 'high';
    const modeIcon = request.mode === 'video' ? 'videocam' : request.mode === 'audio' ? 'call' : 'chatbubbles';
    const modeColor = request.mode === 'video' ? '#FF6B6B' : request.mode === 'audio' ? '#4ECDC4' : '#FFD166';
    const timeAgo = formatTimeAgo(request.created_at);
    
    return (
      <TouchableOpacity 
        key={request.id || index}
        style={[styles.requestCard, isUrgent && styles.urgentCard]}
        onPress={() => handleSessionPress(request)}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <View style={styles.clientInfo}>
            <View style={[styles.modeBadge, { backgroundColor: `${modeColor}20` }]}>
              <Ionicons name={modeIcon as any} size={16} color={modeColor} />
              <Text style={[styles.modeText, { color: modeColor }]}>
                {request.mode.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.clientName}>{request.client_name}</Text>
            {isUrgent && (
              <View style={styles.urgencyBadge}>
                <Ionicons name="alert-circle" size={12} color="#FF6B6B" />
                <Text style={styles.urgencyText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.requestTime}>{timeAgo}</Text>
        </View>
        
        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="grid" size={14} color="#666" />
            <Text style={styles.detailText}>{request.category}</Text>
          </View>
          {request.client_email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={14} color="#666" />
              <Text style={styles.detailText}>{request.client_email}</Text>
            </View>
          )}
          {request.client_phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call" size={14} color="#666" />
              <Text style={styles.detailText}>{request.client_phone}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.requestFooter}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleSessionPress(request)}
          >
            <Text style={styles.acceptButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(false);
    refreshProfessionalProfile();
  }, [fetchDashboardData, refreshProfessionalProfile]);

  const testZegoEngine = async () => {
    try {
      setZegoTestResult('Testing...');
      const userID = professional?.id?.toString() || 'test_user';
      const userName = professional?.name || 'Test User';
      
      const zegoReady = await callManager.initializeZego(userID, userName);
      setZegoStatus(callManager.getZegoStatus());
      
      if (zegoReady) {
        setZegoTestResult('✅ ZEGO Engine working');
      } else {
        setZegoTestResult('⚠️ ZEGO Engine not available');
      }
    } catch (error) {
      setZegoTestResult(`❌ Error: ${error.message}`);
    }
  };

  // Handle back button on Android
  useEffect(() => {
    const handleBackPress = () => {
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit the app?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    };

    if (Platform.OS === 'android') {
      backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => {
        if (backHandlerRef.current) {
          backHandlerRef.current.remove();
        }
      };
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (professional?.id) {
      fetchDashboardData(true);
    } else {
      setLoading(false);
    }
  }, [professional?.id, fetchDashboardData]);

  // ✅ FIXED: Use useFocusEffect instead of router.addListener
  useFocusEffect(
    useCallback(() => {
      if (professional?.id && isOnline) {
        console.log('📱 Dashboard focused, refreshing data...');
        fetchDashboardData(false);
        fetchPendingRequests();
      }
    }, [professional?.id, isOnline, fetchDashboardData, fetchPendingRequests])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
          {professional?.id && (
            <Text style={styles.loadingSubtext}>
              Setting up real-time call system...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (error && !professional?.id) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Profile Setup Required</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.push('/professional/profile-setup')}
          >
            <Text style={styles.errorButtonText}>Complete Profile Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.errorButton, styles.errorButtonSecondary]}
            onPress={handleLogout}
          >
            <Text style={styles.errorButtonSecondaryText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {professional?.name?.charAt(0) || user?.first_name?.charAt(0) || 'P'}
              </Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.profileName}>
                {professional?.name || user?.first_name || 'Professional'}
              </Text>
              <Text style={styles.specializationText}>
                {displayedSpecialization}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/professional/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/professional/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {pendingRequests.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Online Status Toggle */}
      <View style={styles.onlineStatusContainer}>
        <BlurView intensity={60} tint="light" style={styles.onlineStatusCard}>
          <View style={styles.onlineStatusContent}>
            <View>
              <Text style={styles.onlineStatusTitle}>
                {isOnline ? 'You are Online' : 'You are Offline'}
              </Text>
              <Text style={styles.onlineStatusText}>
                {isOnline 
                  ? 'Accepting new sessions and calls' 
                  : 'Not accepting new sessions'
                }
              </Text>
            </View>
            <View style={styles.switchContainer}>
              {updatingStatus && (
                <ActivityIndicator size="small" color="#4A90E2" style={styles.statusLoader} />
              )}
              <Switch
                value={isOnline}
                onValueChange={handleOnlineStatusChange}
                disabled={updatingStatus}
                trackColor={{ false: '#ddd', true: '#4A90E2' }}
                thumbColor="#fff"
                ios_backgroundColor="#ddd"
              />
            </View>
          </View>
          
          {isOnline && isPolling && (
            <View style={styles.pollingStatus}>
              <View style={styles.pollingIndicator}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.pollingText}>
                  Listening for calls... ({lastCallCheck ? formatTimeAgo(new Date(lastCallCheck).toISOString()) : 'Now'})
                </Text>
              </View>
              <View style={styles.connectionStatus}>
                <View style={[styles.statusDot, { backgroundColor: socketRef.current?.readyState === WebSocket.OPEN ? '#4CAF50' : '#FF6B6B' }]} />
                <Text style={styles.statusText}>
                  {socketRef.current?.readyState === WebSocket.OPEN ? 'Live' : 'Reconnecting'}
                </Text>
              </View>
            </View>
          )}
        </BlurView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >
        {/* System Status */}
        {(activeCall || callManager.isRinging()) && (
          <View style={styles.activeCallBanner}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.activeCallText}>
              📞 Active call with {activeCall?.clientName || 'Client'}
            </Text>
          </View>
        )}

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          {stats ? (
            <>
              {renderStatsCard(
                'Today Earnings', 
                formatCurrency(stats.today_earnings || 0), 
                'cash-outline', 
                '#4A90E2'
              )}
              {renderStatsCard(
                'Today Sessions', 
                stats.today_sessions || 0, 
                'today-outline', 
                '#FF6B6B'
              )}
              {renderStatsCard(
                'Pending Requests', 
                stats.pending_requests || pendingRequests.length, 
                'time-outline', 
                '#FFD166'
              )}
              {renderStatsCard(
                'Avg Rating', 
                stats.average_rating?.toFixed(1) || 'N/A', 
                'star-outline', 
                '#4ECDC4',
                '/5.0'
              )}
            </>
          ) : (
            // Loading skeletons
            Array(4).fill(0).map((_, index) => (
              <View key={index} style={styles.statsCardSkeleton}>
                <ActivityIndicator size="small" color="#4A90E2" />
              </View>
            ))
          )}
        </View>

        {/* More Stats */}
        {stats && (
          <View style={styles.moreStatsContainer}>
            <View style={styles.moreStatsCard}>
              <Text style={styles.moreStatsTitle}>Performance Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{stats.total_sessions || 0}</Text>
                  <Text style={styles.metricLabel}>Total Sessions</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{stats.monthly_earnings ? formatCurrency(stats.monthly_earnings) : '₹0'}</Text>
                  <Text style={styles.metricLabel}>Monthly Earnings</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{stats.response_rate ? `${stats.response_rate}%` : 'N/A'}</Text>
                  <Text style={styles.metricLabel}>Response Rate</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Pending Requests */}
        <View style={styles.requestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Session Requests</Text>
            <TouchableOpacity 
              onPress={() => router.push('/professional/requests')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          
          {pendingRequests.length > 0 ? (
            <View style={styles.requestsList}>
              {pendingRequests.slice(0, 3).map((request, index) => 
                renderRequestCard(request, index)
              )}
            </View>
          ) : (
            <View style={styles.emptyRequests}>
              <Ionicons name="time-outline" size={48} color="#ddd" />
              <Text style={styles.emptyRequestsText}>
                {isOnline ? 'No pending requests' : 'Go online to receive requests'}
              </Text>
              {!isOnline && (
                <TouchableOpacity 
                  style={styles.goOnlineButton}
                  onPress={() => handleOnlineStatusChange(true)}
                >
                  <Text style={styles.goOnlineButtonText}>Go Online Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/professional/schedule')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#4A90E220' }]}>
              <Ionicons name="calendar" size={24} color="#4A90E2" />
            </View>
            <Text style={styles.quickActionText}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/professional/sessions')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B6B20' }]}>
              <Ionicons name="chatbubbles" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.quickActionText}>Sessions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/professional/earnings')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFD16620' }]}>
              <Ionicons name="wallet" size={24} color="#FFD166" />
            </View>
            <Text style={styles.quickActionText}>Earnings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/professional/profile')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#4ECDC420' }]}>
              <Ionicons name="person" size={24} color="#4ECDC4" />
            </View>
            <Text style={styles.quickActionText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* System Status Debug - Can be removed in production */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>System Status</Text>
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                🔊 Sound: {soundLoaded ? '✅ Loaded' : '❌ Not loaded'}
              </Text>
              <Text style={styles.debugText}>
                🔔 Push Token: {expoPushToken ? '✅ Set' : '❌ Not set'}
              </Text>
              <Text style={styles.debugText}>
                🌐 WebSocket: {socketRef.current?.readyState === WebSocket.OPEN ? '✅ Connected' : '❌ Disconnected'}
              </Text>
              <Text style={styles.debugText}>
                🎤 ZEGO Engine: {zegoStatus.zegoEngineAvailable ? '✅ Available' : '❌ Not available'}
              </Text>
              <Text style={styles.debugText}>
                🔄 Background Fetch: {backgroundFetchRegistered ? '✅ Registered' : '❌ Not registered'}
              </Text>
              <Text style={styles.debugText}>
                📱 App State: {appState}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={testZegoEngine}
            >
              <Text style={styles.debugButtonText}>Test ZEGO Engine</Text>
            </TouchableOpacity>
            {zegoTestResult !== 'Not tested' && (
              <Text style={[styles.debugText, { marginTop: 8 }]}>{zegoTestResult}</Text>
            )}
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorButtonSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  specializationText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  onlineStatusContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  onlineStatusCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.1)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  onlineStatusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  onlineStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  onlineStatusText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLoader: {
    marginRight: 12,
  },
  pollingStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 8,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pollingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollView: {
    flex: 1,
  },
  activeCallBanner: {
    backgroundColor: 'linear-gradient(90deg, #4A90E2, #6AABFF)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activeCallText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
    justifyContent: 'space-between',
  },
  statsCard: {
    width: (width - 56) / 2,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsCardBlur: {
    flex: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statsCardSkeleton: {
    width: (width - 56) / 2,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreStatsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  moreStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  moreStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
  },
  metricLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#f0f0f0',
  },
  requestsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  requestsList: {
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  urgentCard: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clientInfo: {
    flex: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FFD1D1',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B6B',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  requestTime: {
    fontSize: 13,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  emptyRequests: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  emptyRequestsText: {
    fontSize: 15,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  goOnlineButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  goOnlineButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    width: (width - 60) / 4,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  debugSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  debugInfo: {
    gap: 8,
  },
  debugText: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  debugButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  debugButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});