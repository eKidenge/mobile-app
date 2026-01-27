import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Modal,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// 🎵 SIMPLIFIED RINGTONE MANAGER - Works on web
class RingtoneManager {
  private static instance: RingtoneManager;
  private audioElement: HTMLAudioElement | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private isPlaying: boolean = false;

  private constructor() {}

  static getInstance(): RingtoneManager {
    if (!RingtoneManager.instance) {
      RingtoneManager.instance = new RingtoneManager();
    }
    return RingtoneManager.instance;
  }

  play() {
    if (this.isPlaying) return;
    
    console.log('🔊 Starting ringtone...');
    this.isPlaying = true;
    
    this.playPrimary().catch(() => {
      this.playFallback();
    });
  }

  private playPrimary(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clear any existing audio
        this.stop();
        
        // Try multiple audio sources
        const audioSources = [
          'https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3',
          '/audio/ringtone.mp3',
          '/audio/ringtone.ogg'
        ];
        
        this.audioElement = new Audio();
        this.audioElement.loop = true;
        this.audioElement.volume = 0.7;
        
        // Try each source until one works
        let currentSourceIndex = 0;
        
        const tryNextSource = () => {
          if (currentSourceIndex >= audioSources.length) {
            reject(new Error('All audio sources failed'));
            return;
          }
          
          // CRITICAL FIX: Check if audioElement exists before setting src
          if (this.audioElement) {
            this.audioElement.src = audioSources[currentSourceIndex];
            currentSourceIndex++;
            
            this.audioElement.play()
              .then(resolve)
              .catch(() => {
                console.log(`Audio source ${currentSourceIndex} failed, trying next...`);
                tryNextSource();
              });
          } else {
            reject(new Error('Audio element not initialized'));
          }
        };
        
        tryNextSource();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private playFallback() {
    console.log('🎵 Using fallback beep ringtone');
    
    let beepCount = 0;
    const maxBeeps = 20; // Limit to 20 beeps
    
    const playBeep = () => {
      if (!this.isPlaying || beepCount >= maxBeeps) {
        this.stop();
        return;
      }
      
      beepCount++;
      
      if (typeof window !== 'undefined' && window.AudioContext) {
        try {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.1;
          
          oscillator.start();
          
          setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            audioContext.close();
            
            // Schedule next beep
            if (this.isPlaying) {
              this.fallbackInterval = setTimeout(() => {
                playBeep();
              }, 500);
            }
          }, 500);
          
        } catch (error) {
          console.error('Beep error:', error);
          if (this.isPlaying) {
            this.fallbackInterval = setTimeout(() => {
              playBeep();
            }, 1000);
          }
        }
      }
    };
    
    playBeep();
  }

  stop() {
    console.log('🔇 Stopping ringtone...');
    this.isPlaying = false;
    
    // Stop primary audio
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
      this.audioElement = null;
    }
    
    // Clear fallback interval
    if (this.fallbackInterval) {
      clearTimeout(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }
}

const ringtoneManager = RingtoneManager.getInstance();

// 🚀 WebRTC Manager with WebSocket FALLBACK
class WebRTCManager {
  private static instance: WebRTCManager;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onCallStatus: ((status: string) => void) | null = null;
  private onMessage: ((data: any) => void) | null = null;
  private socket: WebSocket | null = null;
  private sessionId: string = '';
  private userId: string = '';
  private userToken: string = '';
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 2;

  private constructor() {}

  static getInstance(): WebRTCManager {
    if (!WebRTCManager.instance) {
      WebRTCManager.instance = new WebRTCManager();
    }
    return WebRTCManager.instance;
  }

  private initializeWebRTC() {
    console.log('🟡 Initializing WebRTC...');
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.voiparound.com' }
      ]
    };

    try {
      this.peerConnection = new RTCPeerConnection(configuration);
      console.log('✅ WebRTC peer connection created');

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate
          }));
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('📹 Remote track received');
        if (event.streams && event.streams[0]) {
          if (this.onRemoteStream) {
            this.onRemoteStream(event.streams[0]);
          }
        }
      };

      // Handle connection state
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('🔗 Connection state:', state);
        if (this.onCallStatus) {
          this.onCallStatus(state || 'disconnected');
        }
      };

    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  async startLocalStream(audio: boolean = true, video: boolean = false): Promise<MediaStream> {
    try {
      console.log('🎤 Requesting media permissions...');
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: video ? {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Local stream obtained');
      
      // Add tracks to peer connection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
        console.log('✅ Local tracks added to peer connection');
      }
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      throw error;
    }
  }

  // 🚀 SIMPLIFIED WebSocket connection
  async connectToSession(sessionId: string, userId: string, token: string, wsUrl: string): Promise<boolean> {
    if (this.isConnecting) return false;
    
    this.isConnecting = true;
    this.connectionAttempts++;
    
    console.log(`🔗 Connecting to WebSocket session (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
    
    this.sessionId = sessionId;
    this.userId = userId;
    this.userToken = token;

    // Close existing connection
    if (this.socket) {
      this.socket.close();
    }

    // Initialize WebRTC
    if (!this.peerConnection) {
      this.initializeWebRTC();
    }

    // Try different WebSocket URL formats
    const wsUrlFormats = [
      `${wsUrl.replace(/\/$/, '')}/ws/webrtc/${sessionId}/?token=${encodeURIComponent(token)}`,
      `${wsUrl.replace(/\/$/, '')}/ws/webrtc/${sessionId}/`,
      `${wsUrl.replace(/\/$/, '')}/ws/${sessionId}/?token=${encodeURIComponent(token)}`
    ];

    return new Promise((resolve, reject) => {
      let connected = false;
      
      const tryNextUrl = (index: number) => {
        if (index >= wsUrlFormats.length) {
          this.isConnecting = false;
          reject(new Error('All WebSocket connection attempts failed'));
          return;
        }
        
        const wsFullUrl = wsUrlFormats[index];
        console.log(`🌐 Trying WebSocket URL ${index + 1}: ${wsFullUrl.substring(0, 100)}...`);
        
        try {
          this.socket = new WebSocket(wsFullUrl);
          
          const timeout = setTimeout(() => {
            if (!connected) {
              console.log(`⏰ WebSocket connection timeout for URL ${index + 1}`);
              this.socket?.close();
              tryNextUrl(index + 1);
            }
          }, 5000);
          
          this.socket.onopen = () => {
            console.log(`✅ WebSocket connected with URL ${index + 1}`);
            clearTimeout(timeout);
            connected = true;
            this.isConnecting = false;
            this.connectionAttempts = 0;
            resolve(true);
          };
          
          this.socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('📨 WebSocket message:', data.type);
              this.handleMessage(data);
            } catch (error) {
              console.error('❌ Error parsing WebSocket message:', error);
            }
          };
          
          this.socket.onerror = (error) => {
            console.error(`❌ WebSocket error for URL ${index + 1}:`, error);
            clearTimeout(timeout);
            if (!connected) {
              tryNextUrl(index + 1);
            }
          };
          
          this.socket.onclose = (event) => {
            console.log(`🔌 WebSocket disconnected for URL ${index + 1}:`, event.code, event.reason);
            clearTimeout(timeout);
            if (!connected && this.connectionAttempts < this.maxConnectionAttempts) {
              setTimeout(() => {
                this.connectToSession(sessionId, userId, token, wsUrl)
                  .then(resolve)
                  .catch(reject);
              }, 1000);
            }
          };
          
        } catch (error) {
          console.error(`❌ Error creating WebSocket for URL ${index + 1}:`, error);
          tryNextUrl(index + 1);
        }
      };
      
      tryNextUrl(0);
    });
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'authenticated':
        console.log('✅ Authentication successful');
        this.sendMessage({ type: 'join_session', session_id: parseInt(this.sessionId) });
        break;
      case 'connection_established':
        console.log('✅ Connection established');
        break;
      case 'offer':
        this.handleOffer(data.offer).catch(console.error);
        break;
      case 'answer':
        this.handleAnswer(data.answer).catch(console.error);
        break;
      case 'ice_candidate':
        this.handleIceCandidate(data.candidate).catch(console.error);
        break;
      case 'call_status_update':
        if (this.onCallStatus) {
          this.onCallStatus(data.status);
        }
        break;
      case 'chat_message':
        if (this.onMessage) {
          this.onMessage(data);
        }
        break;
    }
  }

  sendMessage(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    this.sendMessage({ type: 'answer', answer: answer });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  sendCallStatus(status: string) {
    this.sendMessage({ type: 'call_status', status: status });
  }

  sendChatMessage(content: string) {
    this.sendMessage({
      type: 'send_message',
      content: content,
      timestamp: new Date().toISOString()
    });
  }

  setRemoteStreamCallback(callback: (stream: MediaStream) => void) {
    this.onRemoteStream = callback;
  }

  setCallStatusCallback(callback: (status: string) => void) {
    this.onCallStatus = callback;
  }

  setMessageCallback(callback: (data: any) => void) {
    this.onMessage = callback;
  }

  async endCall() {
    console.log('🔚 Ending call...');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Close WebSocket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.connectionAttempts = 0;
    this.isConnecting = false;
    
    console.log('✅ Call ended');
  }

  async toggleMute(muted: boolean) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

const webRTCManager = WebRTCManager.getInstance();

// Video component wrapper with null safety
const SafeVideo = React.forwardRef<HTMLVideoElement, {
  ref: React.RefObject<HTMLVideoElement | null>;
  style?: any;
  autoPlay?: boolean;
  playsInline?: boolean;
  muted?: boolean;
}>(({ ref, style, autoPlay = true, playsInline = true, muted = false }, forwardRef) => {
  if (Platform.OS !== 'web') {
    return null;
  }
  
  return (
    <video
      ref={forwardRef}
      style={style}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted}
    />
  );
});

SafeVideo.displayName = 'SafeVideo';

export default function ProfessionalSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, professional, token } = useAuth();
  
  const sessionId = params.sessionId as string;
  const clientId = params.clientId as string;
  const mode = (params.mode as 'chat' | 'audio' | 'video') || 'audio';
  const isIncomingCall = params.isIncomingCall === 'true';
  
  const [callState, setCallState] = useState({
    isActive: false,
    isConnecting: false,
    isRinging: isIncomingCall,
    duration: 0,
    status: isIncomingCall ? 'ringing' : 'ready',
    hasRemoteStream: false
  });
  
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: 'professional' | 'client' | 'system';
    timestamp: Date;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [clientName, setClientName] = useState('Client');
  const [error, setError] = useState<string | null>(null);
  
  const durationRef = useRef<NodeJS.Timeout>();
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const autoRejectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const API_BASE_URL = 'https://teleconnect-krga.onrender.com';
  const WS_URL = API_BASE_URL.replace('https://', 'wss://');

  // Helper function to safely set video source
  const setVideoSource = (videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream | null) => {
    if (Platform.OS === 'web' && videoRef.current) {
      try {
        videoRef.current.srcObject = stream;
        if (stream) {
          videoRef.current.play().catch(err => {
            console.warn('Could not autoplay video:', err);
          });
        }
      } catch (err) {
        console.error('Error setting video source:', err);
      }
    }
  };

  useEffect(() => {
    initializeSession();
    
    return () => {
      cleanup();
    };
  }, []);

  const getAuthToken = () => {
    // Try to get token from different sources
    const tokenSources = [
      token, // from AuthContext
      localStorage.getItem('auth_token'),
      sessionStorage.getItem('auth_token')
    ];
    
    for (const tokenSource of tokenSources) {
      if (tokenSource && tokenSource.length >= 40) {
        console.log('🔑 Found auth token:', tokenSource.substring(0, 20) + '...');
        return tokenSource;
      }
    }
    
    // Generate fallback hex token from user ID
    const userId = professional?.id?.toString() || user?.id?.toString() || '66';
    const hexToken = parseInt(userId).toString(16).padStart(8, '0') + 
                     Math.random().toString(16).substring(2, 34);
    
    console.log('🔑 Generated fallback hex token:', hexToken);
    return hexToken;
  };

  const initializeSession = async () => {
    try {
      console.log('🟡 Initializing professional session...');
      console.log('Session ID:', sessionId);
      
      // Set client name
      if (params.clientName) {
        setClientName(params.clientName as string);
      } else if (clientId) {
        setClientName(`Client ${clientId}`);
      }

      // Setup WebRTC callbacks
      webRTCManager.setRemoteStreamCallback((stream) => {
        console.log('📹 Remote stream received');
        setCallState(prev => ({ ...prev, hasRemoteStream: true }));
        
        // SAFELY set the video source
        setVideoSource(remoteVideoRef, stream);
      });

      webRTCManager.setCallStatusCallback((status) => {
        console.log('📞 Call status update:', status);
        
        if (status === 'connected') {
          setCallState(prev => ({
            ...prev,
            isActive: true,
            isConnecting: false,
            isRinging: false,
            status: 'active'
          }));
          
          startCallTimer();
        } else if (status === 'connecting') {
          setCallState(prev => ({
            ...prev,
            isConnecting: true,
            status: 'connecting'
          }));
        } else if (status === 'disconnected') {
          handleCallDisconnected();
        }
      });

      webRTCManager.setMessageCallback((data) => {
        console.log('💬 Received message:', data);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.content,
          sender: 'client',
          timestamp: new Date(data.timestamp || Date.now())
        }]);
      });

      // Start ringing for incoming calls
      if (isIncomingCall) {
        await handleIncomingCall();
      }
      
    } catch (error: any) {
      console.error('❌ Session initialization failed:', error);
      setError(error.message || 'Failed to initialize session.');
    }
  };

  const handleIncomingCall = async () => {
    console.log('📞 Starting incoming call...');
    setCallState(prev => ({ ...prev, isRinging: true, status: 'ringing' }));
    ringtoneManager.play();
    
    // Auto reject after 30 seconds
    autoRejectTimeoutRef.current = setTimeout(() => {
      if (callState.isRinging) {
        console.log('⏰ Auto-rejecting call after timeout');
        handleRejectCall();
      }
    }, 30000);
  };

  const handleAcceptCall = async () => {
    console.log('✅ Accepting call...');
    
    try {
      ringtoneManager.stop();
      clearTimeout(autoRejectTimeoutRef.current);
      
      setCallState(prev => ({ 
        ...prev, 
        isRinging: false, 
        isConnecting: true, 
        status: 'connecting' 
      }));
      
      // Get user ID and token
      const userId = professional?.id?.toString() || user?.id?.toString() || '66';
      const wsToken = getAuthToken();
      
      console.log('🔗 Connecting WebSocket...');
      console.log('User ID:', userId);
      console.log('Session ID:', sessionId);
      
      // Try to connect WebSocket (with fallback)
      try {
        await webRTCManager.connectToSession(sessionId, userId, wsToken, WS_URL);
        console.log('✅ WebSocket connected');
      } catch (wsError) {
        console.warn('⚠️ WebSocket connection failed, continuing with media only');
        // Continue even if WebSocket fails - user can still use local media
      }
      
      // Start local media stream
      console.log('🎤 Starting local stream...');
      try {
        const stream = await webRTCManager.startLocalStream(
          mode === 'audio' || mode === 'video',
          mode === 'video'
        );
        
        // SAFELY set local video source
        if (mode === 'video') {
          setVideoSource(localVideoRef, stream);
        }
        console.log('✅ Local stream started');
      } catch (streamError) {
        console.error('❌ Failed to start local stream:', streamError);
        setError('Could not access microphone/camera. Please check permissions.');
        return;
      }
      
      // Update call state
      setCallState(prev => ({ 
        ...prev, 
        isConnecting: false,
        status: 'active',
        isActive: true
      }));
      
    } catch (error: any) {
      console.error('❌ Failed to accept call:', error);
      setError('Failed to accept call: ' + (error.message || 'Unknown error'));
      setCallState(prev => ({ ...prev, isConnecting: false, status: 'failed' }));
      
      Alert.alert('Error', 'Failed to accept call. Please try again.', [
        { text: 'Retry', onPress: () => handleAcceptCall() },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const handleRejectCall = async () => {
    console.log('❌ Rejecting call...');
    
    ringtoneManager.stop();
    clearTimeout(autoRejectTimeoutRef.current);
    
    // Navigate back immediately (no API call needed)
    router.back();
  };

  const handleCallDisconnected = () => {
    console.log('🔌 Call disconnected');
    stopCallTimer();
    
    // Clear video sources safely
    setVideoSource(remoteVideoRef, null);
    setVideoSource(localVideoRef, null);
    
    setCallState(prev => ({
      ...prev,
      isActive: false,
      isConnecting: false,
      isRinging: false,
      status: 'disconnected'
    }));
    
    Alert.alert('Call Ended', 'The call has been disconnected.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    await webRTCManager.toggleMute(newMutedState);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const startCallTimer = () => {
    let seconds = 0;
    durationRef.current = setInterval(() => {
      seconds++;
      setCallState(prev => ({ ...prev, duration: seconds }));
    }, 1000);
  };

  const stopCallTimer = () => {
    if (durationRef.current) {
      clearInterval(durationRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = async () => {
    console.log('🔚 Ending call...');
    
    stopCallTimer();
    ringtoneManager.stop();
    setShowEndModal(false);
    
    // Clear video sources safely before ending call
    setVideoSource(remoteVideoRef, null);
    setVideoSource(localVideoRef, null);
    
    try {
      await webRTCManager.endCall();
      
      // Show call summary
      const rate = professional?.rate || 50;
      const minutes = Math.ceil(callState.duration / 60);
      const earnings = Math.max(rate, minutes * rate);
      
      Alert.alert(
        'Call Ended',
        `Duration: ${formatTime(callState.duration)}\nEarnings: KSH ${earnings}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
    } catch (error) {
      console.error('❌ Error ending call:', error);
      router.back();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'professional' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Try to send via WebSocket
    webRTCManager.sendChatMessage(newMessage);
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up...');
    stopCallTimer();
    ringtoneManager.stop();
    if (autoRejectTimeoutRef.current) {
      clearTimeout(autoRejectTimeoutRef.current);
    }
    
    // Clear video sources
    setVideoSource(remoteVideoRef, null);
    setVideoSource(localVideoRef, null);
    
    webRTCManager.endCall();
  };

  // Incoming call screen
  if (callState.isRinging) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.incomingCallContainer}>
          <View style={styles.incomingCallContent}>
            <View style={styles.callerAvatar}>
              <Ionicons name="person" size={80} color="#FFFFFF" />
            </View>
            
            <Text style={styles.callerName}>{clientName}</Text>
            <Text style={styles.callType}>
              Incoming {mode === 'video' ? 'Video' : 'Voice'} Call
            </Text>
            <Text style={styles.ringingText}>📞 Ringing...</Text>

            <View style={styles.incomingCallButtons}>
              <TouchableOpacity 
                style={[styles.callActionButton, styles.rejectButton]}
                onPress={handleRejectCall}
              >
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.callButtonGradient}>
                  <Ionicons name="close" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.callButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.callActionButton, styles.acceptButton]}
                onPress={handleAcceptCall}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.callButtonGradient}>
                  <Ionicons name="call" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.callButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Active audio call
  if (callState.isActive && mode === 'audio') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1F2937', '#111827']} style={styles.audioCallContainer}>
          <StatusBar backgroundColor="#111827" barStyle="light-content" />
          
          <View style={styles.audioCallHeader}>
            <Text style={styles.audioCallTitle}>Voice Call</Text>
            <Text style={styles.audioCallDuration}>{formatTime(callState.duration)}</Text>
          </View>

          <View style={styles.audioCallContent}>
            <View style={styles.callerInfo}>
              <View style={styles.audioCallAvatar}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </View>
              <Text style={styles.audioClientName}>{clientName}</Text>
              <Text style={styles.audioCallStatus}>
                {callState.status === 'active' ? '✅ Connected' : '🔄 Connecting...'}
              </Text>
            </View>

            <View style={styles.audioCallControls}>
              <TouchableOpacity 
                style={[styles.controlButton, isMuted && styles.activeControlButton]}
                onPress={toggleMute}
              >
                <Ionicons 
                  name={isMuted ? "mic-off" : "mic"} 
                  size={24} 
                  color={isMuted ? "#FFFFFF" : "#374151"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlButton, styles.endCallButton]}
                onPress={() => setShowEndModal(true)}
              >
                <Ionicons name="call" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
                onPress={toggleSpeaker}
              >
                <Ionicons
                  name={isSpeakerOn ? "volume-high" : "volume-mute"}
                  size={24}
                  color={isSpeakerOn ? "#FFFFFF" : "#374151"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <Modal visible={showEndModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>End Call</Text>
              <Text style={styles.modalText}>
                Are you sure you want to end this call?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEndModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmEndButton}
                  onPress={endCall}
                >
                  <Text style={styles.confirmEndButtonText}>End Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Active video call
  if (callState.isActive && mode === 'video') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1F2937', '#111827']} style={styles.videoCallContainer}>
          <StatusBar backgroundColor="#111827" barStyle="light-content" />
          
          {/* Remote Video */}
          <View style={styles.remoteVideoContainer}>
            {Platform.OS === 'web' ? (
              <video
                ref={remoteVideoRef}
                style={styles.remoteVideo}
                autoPlay
                playsInline
              />
            ) : (
              <View style={styles.videoPlaceholderContainer}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
                <Text style={styles.videoPlaceholderText}>{clientName}</Text>
                {!callState.hasRemoteStream && (
                  <Text style={styles.connectingVideoText}>Waiting for video...</Text>
                )}
              </View>
            )}
          </View>

          {/* Local Video */}
          <View style={styles.localVideoContainer}>
            {Platform.OS === 'web' ? (
              <video
                ref={localVideoRef}
                style={styles.localVideo}
                autoPlay
                playsInline
                muted
              />
            ) : (
              <View style={styles.videoPlaceholderContainer}>
                <Ionicons name="person" size={30} color="#FFFFFF" />
                <Text style={styles.videoPlaceholderText}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.videoCallControls}>
            <TouchableOpacity 
              style={[styles.controlButton, isMuted && styles.activeControlButton]}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? "mic-off" : "mic"} 
                size={24} 
                color={isMuted ? "#FFFFFF" : "#374151"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.endCallButton]}
              onPress={() => setShowEndModal(true)}
            >
              <Ionicons name="call" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={isSpeakerOn ? "volume-high" : "volume-mute"}
                size={24}
                color={isSpeakerOn ? "#FFFFFF" : "#374151"}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Loading/Connecting state
  if (callState.isConnecting) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            Connecting {mode} call...
          </Text>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Default fallback view
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.sessionInfo}>
            Session • {callState.status}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <View style={styles.noMessagesContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color="#D1D5DB" />
            <Text style={styles.noMessagesText}>No messages yet</Text>
            <Text style={styles.noMessagesSubtext}>
              Send a message to start the conversation
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === 'professional' 
                    ? styles.professionalMessage
                    : message.sender === 'client'
                    ? styles.clientMessage
                    : styles.systemMessage
                ]}
              >
                <Text style={[
                  styles.messageText,
                  message.sender === 'professional' && styles.professionalMessageText,
                  message.sender === 'client' && styles.clientMessageText,
                  message.sender === 'system' && styles.systemMessageText
                ]}>
                  {message.text}
                </Text>
                <Text style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Input area for chat */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.disabledSendButton]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
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
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  incomingCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingCallContent: {
    alignItems: 'center',
    padding: 40,
  },
  callerAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 18,
    color: '#E0E7FF',
    marginBottom: 20,
  },
  ringingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 40,
  },
  incomingCallButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  callActionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  callButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {},
  acceptButton: {},
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  audioCallContainer: {
    flex: 1,
  },
  audioCallHeader: {
    padding: 16,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  audioCallTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  audioCallDuration: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  audioCallContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 40,
  },
  callerInfo: {
    alignItems: 'center',
  },
  audioCallAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  audioClientName: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  audioCallStatus: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  audioCallControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  videoCallContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoPlaceholderContainer: {
    alignItems: 'center',
    padding: 20,
  },
  videoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  connectingVideoText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 5,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#374151',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4B5563',
  },
  videoCallControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sessionInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  noMessagesText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 16,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  professionalMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1',
  },
  clientMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
  },
  professionalMessageText: {
    color: '#FFFFFF',
  },
  clientMessageText: {
    color: '#374151',
  },
  systemMessageText: {
    color: '#6B7280',
    fontSize: 14,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  disabledSendButton: {
    backgroundColor: '#D1D5DB',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  activeControlButton: {
    backgroundColor: '#6366F1',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmEndButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmEndButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});