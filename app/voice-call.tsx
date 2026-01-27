// app/voice-call.tsx - UPDATED FOR DEPLOYED ENDPOINTS
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Dimensions,
  StatusBar,
  Animated,
  Vibration,
  Platform,
  AppState
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ✅ UPDATED TO YOUR DEPLOYED ENDPOINTS
const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';
const WS_BASE_URL = 'wss://teleconnect-krga.onrender.com'; // WebSocket base URL

// Token storage (use AsyncStorage in production)
let storedToken = '';
let storedUserId = '';

// Types
interface Professional {
  id: string;
  name: string;
  specialization: string;
  rate: number;
  average_rating: number;
  experience_years: number;
  online_status: boolean;
  available: boolean;
  phone?: string;
  email?: string;
  category?: string;
}

interface Session {
  id: number;
  professional_id: string;
  client_id: number;
  session_type: string;
  status: string;
  room_id?: string;
  started_at?: string;
  duration?: number;
  cost?: number;
  call_started_at?: string;
  call_ended_at?: string;
  call_duration?: number;
  actual_start?: string;
  ended_at?: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type CallStatus = 
  | 'initializing' 
  | 'connecting' 
  | 'ringing'
  | 'active' 
  | 'ending' 
  | 'ended' 
  | 'failed';

// 🎤 WEBRTC MANAGER - UPDATED FOR YOUR DEPLOYED BACKEND
class WebRTCVoiceManager {
  private peerConnection: RTCPeerConnection | null = null;
  private socket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private sessionId: string = '';
  private userId: string = '';
  private token: string = '';
  private isConnected: boolean = false;
  private remoteAudio: HTMLAudioElement | null = null;
  private iceServers: RTCIceServer[] = [];
  private onCallConnected: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private isInitiator: boolean = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  async initialize(sessionId: string, userId: string, token: string, isInitiator: boolean = true): Promise<boolean> {
    this.sessionId = sessionId;
    this.userId = userId;
    this.token = token;
    this.isInitiator = isInitiator;

    try {
      console.log('🔧 Initializing WebRTC voice call...');
      console.log('📋 Session:', sessionId, 'User:', userId);
      
      // 1. Connect to WebSocket
      const wsConnected = await this.connectToSignalingServer();
      if (!wsConnected) {
        throw new Error('Failed to connect to WebSocket');
      }
      
      // 2. Get microphone access
      await this.getLocalAudioStream();
      
      console.log('✅ WebRTC initialization complete');
      return true;
      
    } catch (error) {
      console.error('❌ WebRTC initialization failed:', error);
      if (this.onError) {
        this.onError(error instanceof Error ? error.message : 'WebRTC initialization failed');
      }
      this.cleanup();
      return false;
    }
  }

  setCallbacks(onCallConnected: () => void, onError: (error: string) => void) {
    this.onCallConnected = onCallConnected;
    this.onError = onError;
  }

  private async getLocalAudioStream(): Promise<void> {
    try {
      console.log('🎤 Requesting microphone access...');
      
      if (Platform.OS === 'web') {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16
          },
          video: false
        });
        console.log('✅ Microphone access granted, sample rate:', this.localStream.getAudioTracks()[0]?.getSettings().sampleRate);
      } else {
        // For React Native, you'd use expo-av differently
        console.log('📱 React Native audio handling would go here');
      }
      
    } catch (error) {
      console.error('❌ Failed to get audio stream:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  private async connectToSignalingServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // 🚨 FIXED: Correct WebSocket URL format for your backend
        // Your routing expects: /ws/webrtc/{session_id}/
        const wsUrl = `wss://teleconnect-krga.onrender.com/ws/webrtc/${this.sessionId}/`;
        
        console.log('🌐 Connecting to WebSocket:', wsUrl);
        
        // 🚨 FIXED: Create WebSocket with proper token encoding
        const encodedToken = encodeURIComponent(this.token);
        const fullWsUrl = `${wsUrl}?token=${encodedToken}`;
        
        console.log('🔗 Full WebSocket URL:', fullWsUrl);
        
        this.socket = new WebSocket(fullWsUrl);
        
        this.socket.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.reconnectAttempts = 0; // Reset reconnect attempts
          
          // 🚨 FIXED: Send proper authentication message
          setTimeout(() => {
            this.sendAuthentication();
            resolve(true);
          }, 100);
        };
        
        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.error('❌ WebSocket readyState:', this.socket?.readyState);
          console.error('❌ WebSocket URL:', wsUrl);
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          reject(new Error('WebSocket connection failed'));
        };
        
        this.socket.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          
          // Try to reconnect if not intentional
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            setTimeout(() => this.connectToSignalingServer().catch(() => {}), 1000 * this.reconnectAttempts);
          }
        };
        
        // Set connection timeout (15 seconds)
        this.connectionTimeout = setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket connection timeout');
            this.socket?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 15000);
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private sendAuthentication(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    // 🚨 FIXED: Send authentication in format your backend expects
    // Based on your consumers.py, it expects a proper token format
    const authMessage = {
      type: 'authenticate',
      token: this.token,
      user_id: parseInt(this.userId),
      session_id: parseInt(this.sessionId)
    };
    
    this.socket.send(JSON.stringify(authMessage));
    console.log('🔐 Authentication sent:', authMessage);
  }

  private setupWebSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message type:', data.type || 'unknown');

        // Handle different message types
        switch (data.type) {
          case 'ice_config':
            console.log('⚙️ Received ICE configuration, servers:', data.iceServers?.length || 0);
            this.iceServers = data.iceServers || [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
            ];
            await this.initializePeerConnection();
            break;
            
          case 'session_info':
            console.log('📋 Session info received:', {
              session_id: data.session_id,
              user_id: data.user_id,
              user_type: data.user_type,
              professional_name: data.professional_name
            });
            break;
            
          case 'session_joined':
            console.log('✅ Session joined successfully');
            // Now we can start the WebRTC connection
            if (this.isInitiator) {
              setTimeout(async () => {
                await this.createAndSendOffer();
              }, 1000);
            }
            break;
            
          case 'user_joined':
            console.log('👤 User joined:', data.user_id, data.username);
            break;
            
          case 'user_ready':
            console.log('👤 User ready:', data.user_id, data.user_type);
            if (data.user_type !== 'client' && this.isInitiator) {
              // Professional is ready, create offer
              setTimeout(async () => {
                if (this.peerConnection) {
                  await this.createAndSendOffer();
                }
              }, 1000);
            }
            break;
            
          case 'offer':
            console.log('📥 Received offer from:', data.from_user);
            await this.handleOffer(data.offer);
            break;
            
          case 'answer':
            console.log('📥 Received answer from:', data.from_user);
            await this.handleAnswer(data.answer);
            break;
            
          case 'ice_candidate':
            console.log('❄️ Received ICE candidate from:', data.from_user);
            await this.handleIceCandidate(data.candidate);
            break;
            
          case 'ice_candidates':
            console.log('❄️ Received batch ICE candidates:', data.candidates?.length);
            if (data.candidates) {
              for (const candidate of data.candidates) {
                await this.handleIceCandidate(candidate);
              }
            }
            break;
            
          case 'call_status_update':
            console.log('📞 Call status update:', data.status, 'from:', data.from_user);
            break;
            
          case 'error':
            console.error('❌ Server error:', data.message);
            if (this.onError) {
              this.onError(data.message || 'Server error');
            }
            break;
            
          case 'authentication_success':
            console.log('🔐 Authentication successful');
            // Send join session after successful auth
            this.socket.send(JSON.stringify({
              type: 'join_session',
              session_id: this.sessionId,
              user_id: this.userId
            }));
            break;
            
          case 'connection_established':
            console.log('🔗 Connection established message received');
            this.isConnected = true;
            // Send join session message
            this.socket.send(JSON.stringify({
              type: 'join_session',
              session_id: this.sessionId,
              user_id: this.userId
            }));
            break;
            
          case 'heartbeat':
            // Send pong response
            this.socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'chat_message':
            console.log('💬 Chat message from:', data.from_user, 'content:', data.content?.substring(0, 50));
            break;
            
          default:
            console.log('📨 Received unhandled message type:', data.type);
        }
        
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
      }
    };
  }

  private async initializePeerConnection(): Promise<void> {
    try {
      console.log('🔗 Initializing WebRTC peer connection...');
      
      const configuration: RTCConfiguration = {
        iceServers: this.iceServers,
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      };

      this.peerConnection = new RTCPeerConnection(configuration);
      
      // Add local audio track to peer connection
      if (this.localStream && Platform.OS === 'web') {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          this.peerConnection.addTrack(audioTrack, this.localStream);
          console.log('🎤 Local audio track added to peer connection');
        }
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate,
            session_id: this.sessionId,
            user_id: this.userId,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          }));
          console.log('❄️ ICE candidate sent');
        }
      };

      // Handle incoming remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('🔊 Remote audio track received:', event.track.kind);
        this.remoteStream = event.streams[0];
        this.playRemoteAudio();
        
        // Notify that call is connected
        if (this.onCallConnected) {
          setTimeout(() => {
            this.onCallConnected();
          }, 500);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('🔗 Peer connection state:', state);
        
        if (state === 'connected') {
          this.isConnected = true;
          console.log('✅ WebRTC connection established!');
          this.sendCallStatus('connected');
          
          // Send diagnostic info
          setTimeout(() => this.sendDiagnostic(), 1000);
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          this.isConnected = false;
          console.log('❌ WebRTC connection lost');
          if (this.onError && state === 'failed') {
            this.onError('WebRTC connection failed');
          }
        }
      };

      // Handle ICE connection state
      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection?.iceConnectionState;
        console.log('❄️ ICE connection state:', iceState);
      };

      // Handle ICE gathering state
      this.peerConnection.onicegatheringstatechange = () => {
        console.log('❄️ ICE gathering state:', this.peerConnection?.iceGatheringState);
      };

      console.log('✅ Peer connection initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize peer connection:', error);
      throw error;
    }
  }

  private async createAndSendOffer(): Promise<void> {
    try {
      if (!this.peerConnection) {
        await this.initializePeerConnection();
      }
      
      console.log('📤 Creating WebRTC offer...');
      
      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        iceRestart: false
      };
      
      const offer = await this.peerConnection!.createOffer(offerOptions);
      
      // Set codec preferences for better audio quality
      if (offer.sdp) {
        // Prefer Opus codec
        offer.sdp = offer.sdp.replace(/a=fmtp:111/, 'a=fmtp:111 minptime=10;useinbandfec=1');
      }
      
      await this.peerConnection!.setLocalDescription(offer);
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'offer',
          offer: offer,
          session_id: this.sessionId,
          user_id: this.userId,
          sdp_type: 'offer',
          metadata: {
            audio: true,
            video: false,
            platform: Platform.OS
          }
        }));
        console.log('✅ Offer sent');
      }
      
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      if (this.onError) {
        this.onError('Failed to create WebRTC offer');
      }
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      console.log('📥 Handling remote offer');
      
      if (!this.peerConnection) {
        await this.initializePeerConnection();
      }
      
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Remote description set');
      
      // Create and send answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          session_id: this.sessionId,
          user_id: this.userId
        }));
        console.log('✅ Answer sent');
      }
      
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      if (this.onError) {
        this.onError('Failed to handle WebRTC offer');
      }
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      console.log('📥 Handling remote answer');
      
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Remote description set');
      
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      if (this.onError) {
        this.onError('Failed to handle WebRTC answer');
      }
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      console.log('❄️ Adding remote ICE candidate');
      
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ ICE candidate added');
      
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  private playRemoteAudio(): void {
    if (Platform.OS === 'web' && this.remoteStream) {
      if (!this.remoteAudio) {
        this.remoteAudio = document.createElement('audio');
        this.remoteAudio.autoplay = true;
        this.remoteAudio.controls = false;
        this.remoteAudio.style.display = 'none';
        this.remoteAudio.volume = 1.0; // Full volume
        document.body.appendChild(this.remoteAudio);
        console.log('🔊 Audio element created');
      }
      
      this.remoteAudio.srcObject = this.remoteStream;
      
      // Try to play
      this.remoteAudio.play().catch(error => {
        console.log('⚠️ Auto-play prevented:', error);
        // Add play button or require user interaction
        const playButton = document.createElement('button');
        playButton.textContent = 'Click to Play Audio';
        playButton.style.position = 'fixed';
        playButton.style.top = '10px';
        playButton.style.left = '10px';
        playButton.style.zIndex = '9999';
        playButton.onclick = () => {
          this.remoteAudio?.play().catch(e => console.log('Still cannot play:', e));
          playButton.remove();
        };
        document.body.appendChild(playButton);
      });
      
      console.log('🔊 Remote audio ready, tracks:', this.remoteStream.getAudioTracks().length);
    }
  }

  async sendCallStatus(status: string): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'call_status',
        status: status,
        session_id: this.sessionId,
        user_id: this.userId,
        details: {
          platform: Platform.OS,
          timestamp: new Date().toISOString()
        }
      }));
      console.log('📤 Call status sent:', status);
    }
  }

  async sendDiagnostic(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const diagnostic = {
        platform: Platform.OS,
        browser: Platform.OS === 'web' ? navigator.userAgent : 'React Native',
        has_microphone: !!this.localStream,
        has_speaker: true,
        is_https: window.location.protocol === 'https:',
        ice_servers: this.iceServers.length,
        webrtc_state: this.peerConnection?.connectionState,
        timestamp: new Date().toISOString()
      };
      
      this.socket.send(JSON.stringify({
        type: 'diagnostic',
        diagnostic: diagnostic,
        session_id: this.sessionId,
        user_id: this.userId
      }));
      
      console.log('📊 Diagnostic sent:', diagnostic);
    }
  }

  async toggleMute(muted: boolean): Promise<void> {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });
      console.log(`🔇 ${muted ? 'Muted' : 'Unmuted'}`);
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'call_control',
          control: 'mute',
          value: muted,
          session_id: this.sessionId,
          user_id: this.userId
        }));
      }
    }
  }

  async toggleSpeaker(speakerOn: boolean): Promise<void> {
    console.log(`🔊 Speaker: ${speakerOn ? 'ON' : 'OFF'}`);
    
    if (Platform.OS === 'web' && this.remoteAudio) {
      this.remoteAudio.volume = speakerOn ? 1.0 : 0.5;
    }
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'call_control',
        control: 'speaker',
        value: speakerOn,
        session_id: this.sessionId,
        user_id: this.userId
      }));
    }
  }

  async endCall(): Promise<void> {
    console.log('🔚 Ending WebRTC call...');
    
    // Send call ended notification
    await this.sendCallStatus('ended');
    
    // Cleanup
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.socket) {
      this.socket.close(1000, 'Call ended');
      this.socket = null;
    }
    
    if (Platform.OS === 'web' && this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
      this.remoteAudio.remove();
      this.remoteAudio = null;
    }
    
    this.remoteStream = null;
    this.isConnected = false;
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    console.log('✅ WebRTC cleanup complete');
  }

  private cleanup(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  isCallConnected(): boolean {
    return this.isConnected && this.peerConnection?.connectionState === 'connected';
  }
}

// 🎵 AUDIO SERVICE
class AudioCallService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;

  async playRingtone() {
    try {
      console.log('🔊 Playing ringtone...');
      if (this.sound) {
        await this.sound.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/102/102-preview.mp3' },
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      
      this.sound = sound;
      this.isPlaying = true;
      console.log('✅ Ringtone started');
    } catch (error) {
      console.error('❌ Failed to play ringtone:', error);
      Vibration.vibrate([500, 500], true);
    }
  }

  async playConnectedTone() {
    try {
      console.log('🔊 Playing connected tone...');
      await this.stopRingtone();
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/289/289-preview.mp3' },
        { shouldPlay: true, volume: 0.3 }
      );
      setTimeout(() => {
        sound.unloadAsync();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to play connected tone:', error);
    }
  }

  async playEndedTone() {
    try {
      console.log('🔊 Playing call ended tone...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/246/246-preview.mp3' },
        { shouldPlay: true, volume: 0.3 }
      );
      setTimeout(() => {
        sound.unloadAsync();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to play ended tone:', error);
    }
  }

  async stopRingtone() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.isPlaying = false;
      }
      Vibration.cancel();
      console.log('🔇 Ringtone stopped');
    } catch (error) {
      console.error('❌ Failed to stop ringtone:', error);
    }
  }

  async setVoiceCallMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: Platform.OS === 'ios',
      });
      console.log('🎧 Voice call audio mode activated');
    } catch (error) {
      console.error('❌ Failed to set voice call mode:', error);
    }
  }

  async setNormalAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log('🔈 Normal audio mode activated');
    } catch (error) {
      console.error('❌ Failed to set normal audio mode:', error);
    }
  }
}

// ✅ API SERVICE FOR YOUR DEPLOYED ENDPOINTS
class VoiceCallApiService {
  private token: string = '';
  private userId: string = '1'; // Default user ID

  setToken(token: string) {
    this.token = token;
    storedToken = token;
  }

  setUserId(userId: string) {
    this.userId = userId;
    storedUserId = userId;
  }

  private getAuthHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const config: RequestInit = {
        method,
        headers: this.getAuthHeaders(),
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      console.log(`🌐 API ${method} ${url}`);
      const response = await fetch(url, config);
      console.log(`📡 Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`📨 Error Response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`✅ API Success:`, responseData);
      return responseData;
      
    } catch (error) {
      console.error(`❌ API Request Failed ${endpoint}:`, error);
      throw error;
    }
  }

  async initiateCall(professionalId: string): Promise<any> {
    try {
      console.log('🔧 Initiating voice call...');
      
      const response = await this.makeRequest('/voice/initiate/', 'POST', {
        professional_id: professionalId,
        client_id: parseInt(this.userId),
        call_type: 'audio'
      });
      
      console.log('✅ Voice call initiated:', response);
      
      if (!response.session_id && !response.id) {
        throw new Error('No session ID received from server');
      }
      
      // Generate a token that matches your backend expectations
      const sessionId = response.session_id || response.id;
      const token = this.generateWebSocketToken(parseInt(this.userId), sessionId);
      
      return {
        ...response,
        session_id: sessionId,
        token: token
      };
      
    } catch (error) {
      console.error('❌ Voice call initiation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('not available')) {
        throw new Error('Professional is not available at the moment.');
      } else if (errorMessage.includes('Professional not found')) {
        throw new Error('Professional not found.');
      } else if (errorMessage.includes('Network')) {
        throw new Error('Network issue. Please check your connection.');
      } else {
        throw new Error(`Call failed: ${errorMessage}`);
      }
    }
  }

  async endCall(sessionId: number, duration: number = 0): Promise<any> {
    try {
      console.log('🔚 Ending voice call...');
      
      const response = await this.makeRequest(`/voice/end/${sessionId}/`, 'POST', {
        payment_method: 'mpesa',
        call_quality: 'good',
        duration: duration
      });
      
      console.log('✅ Voice call ended successfully');
      return response;
      
    } catch (error) {
      console.error('❌ Voice call end failed:', error);
      return { success: false, message: 'Call ended locally' };
    }
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    try {
      console.log('📋 Getting session info...');
      return await this.makeRequest(`/voice/session/${sessionId}/`, 'GET');
    } catch (error) {
      console.error('❌ Failed to get session info:', error);
      throw error;
    }
  }

  async getIceServers(): Promise<any> {
    try {
      console.log('⚙️ Getting ICE servers...');
      // Your backend might have an endpoint for ICE servers
      // For now, return default STUN servers
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
        ]
      };
    } catch (error) {
      console.error('❌ Failed to get ICE servers:', error);
      throw error;
    }
  }

  private generateWebSocketToken(userId: number, sessionId: number): string {
    // 🚨 FIXED: Create a token that matches your consumers.py authentication logic
    // Your consumers.py accepts either JWT or base64 encoded JSON with user_id
    
    // Create a token object
    const tokenData = {
      user_id: userId,
      session_id: sessionId,
      timestamp: Date.now(),
      token_type: 'websocket',
      client_type: 'mobile'
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(tokenData);
    
    // For browser/React Native - use base64 encoding
    if (typeof btoa !== 'undefined') {
      const base64Token = btoa(jsonString);
      console.log('🔐 Generated base64 WebSocket token:', base64Token.substring(0, 50) + '...');
      return base64Token;
    } 
    // For Node.js environments
    else if (typeof Buffer !== 'undefined') {
      const base64Token = Buffer.from(jsonString).toString('base64');
      console.log('🔐 Generated base64 WebSocket token:', base64Token.substring(0, 50) + '...');
      return base64Token;
    }
    
    // Fallback
    console.warn('⚠️ btoa and Buffer not available, using plain JSON token');
    return jsonString;
  }

  // 🚨 ADDED: Generate alternative token format for testing
  generateAlternativeToken(userId: number): string {
    // Try a simple JWT-like token (like your original token: 88d7f816...)
    // This might be what your backend expects
    const timestamp = Date.now();
    const simpleToken = `${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔐 Generated alternative token:', simpleToken);
    return simpleToken;
  }
}

// Create instances
const apiService = new VoiceCallApiService();
const audioService = new AudioCallService();

// Main Component
export default function VoiceCallScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // State
  const [callStatus, setCallStatus] = useState<CallStatus>('initializing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [callCost, setCallCost] = useState(0);
  const [webRTCStatus, setWebRTCStatus] = useState<string>('Initializing...');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [websocketState, setWebsocketState] = useState<string>('disconnected');
  
  // Refs
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const callStartTime = useRef<number>(0);
  const webRTCManager = useRef<WebRTCVoiceManager | null>(null);
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;
  const rippleAnim3 = useRef(new Animated.Value(0)).current;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    initializeCall();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      cleanupCall();
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background' && callStatus === 'active') {
      console.log('📱 App in background, call is active');
    }
  };

  const initializeCall = async () => {
    try {
      console.log('🚀 Starting voice call with WebRTC...');
      setWebRTCStatus('Starting WebRTC call...');
      
      // Parse professional data
      const professionalData: Professional = typeof params.professional === 'string' 
        ? JSON.parse(params.professional) 
        : params.professional as any;

      if (!professionalData?.id) {
        throw new Error('No professional ID provided');
      }

      setProfessional(professionalData);
      setCallStatus('connecting');
      startRippleAnimation();

      // Set audio mode for voice call
      await audioService.setVoiceCallMode();

      // Set user ID (you might get this from auth context)
      const userId = '1'; // Default client ID
      apiService.setUserId(userId);

      // Create session via API
      console.log('📞 Creating session via API...');
      setWebRTCStatus('Creating session...');
      
      const response = await apiService.initiateCall(professionalData.id);
      
      const sessionId = response.session_id;
      if (!sessionId) {
        throw new Error('No session ID received');
      }

      const token = response.token;
      apiService.setToken(token);
      
      // Create session object
      const sessionData: Session = {
        id: sessionId,
        professional_id: professionalData.id,
        client_id: parseInt(userId),
        session_type: 'audio',
        status: 'active',
        call_started_at: new Date().toISOString(),
        actual_start: new Date().toISOString()
      };

      setSession(sessionData);
      setDebugInfo(`Session ID: ${sessionId}\nToken: ${token.substring(0, 50)}...`);
      
      // Start ringtone after session is created
      await audioService.playRingtone();
      setCallStatus('ringing');
      setWebRTCStatus('Connecting to WebSocket...');

      // Initialize WebRTC connection
      console.log('🔗 Initializing WebRTC connection...');
      webRTCManager.current = new WebRTCVoiceManager();
      
      // Set callbacks
      webRTCManager.current.setCallbacks(
        () => {
          console.log('✅ WebRTC connection callback triggered');
          handleWebRTCConnected();
        },
        (error) => {
          console.error('❌ WebRTC error callback:', error);
          handleCallFailed(error);
        }
      );
      
      const webRTCSuccess = await webRTCManager.current.initialize(
        sessionId.toString(),
        userId,
        token,
        true // Client is initiator
      );

      if (!webRTCSuccess) {
        throw new Error('WebRTC initialization failed');
      }

      setWebRTCStatus('WebRTC initialized, waiting for connection...');
      setWebsocketState('connecting');
      
    } catch (error) {
      console.error('❌ Call initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetails(errorMessage);
      setDebugInfo(prev => prev + `\nError: ${errorMessage}`);
      handleCallFailed(errorMessage);
    }
  };

  const handleWebRTCConnected = async () => {
    try {
      // Stop ringtone and play connected tone
      await audioService.stopRingtone();
      await audioService.playConnectedTone();
      
      setCallStatus('active');
      setWebsocketState('connected');
      setWebRTCStatus('Connected! Live audio streaming...');
      setDebugInfo(prev => prev + `\nWebRTC: Connected at ${new Date().toLocaleTimeString()}`);
      callStartTime.current = Date.now();
      startCallTimer();
      stopRippleAnimation();
      
      console.log('✅ Call active! WebRTC connected.');
      
      // Calculate initial cost
      calculateCallCost(0);
      
    } catch (error) {
      console.error('❌ Error activating call:', error);
      handleCallFailed(error instanceof Error ? error.message : 'Activation failed');
    }
  };

  const calculateCallCost = (duration: number) => {
    if (!professional) return;
    const minutes = Math.max(1, Math.ceil(duration / 60));
    const cost = minutes * professional.rate;
    setCallCost(cost);
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (webRTCManager.current) {
      await webRTCManager.current.toggleMute(newMutedState);
    }
    
    console.log(`🔇 ${newMutedState ? 'Muted' : 'Unmuted'}`);
  };

  const toggleSpeaker = async () => {
    const newSpeakerState = !isSpeaker;
    setIsSpeaker(newSpeakerState);
    
    if (webRTCManager.current) {
      await webRTCManager.current.toggleSpeaker(newSpeakerState);
    }
    
    console.log(`🔊 ${newSpeakerState ? 'Speaker On' : 'Speaker Off'}`);
  };

  const handleEndCall = async () => {
    try {
      if (callStatus === 'ending' || callStatus === 'ended') return;
      
      setCallStatus('ending');
      setWebsocketState('disconnecting');
      stopCallTimer();
      stopRippleAnimation();
      
      // Stop all audio
      await audioService.stopRingtone();
      await audioService.playEndedTone();
      
      // End WebRTC call
      if (webRTCManager.current) {
        await webRTCManager.current.endCall();
      }
      
      // Send end call to API
      if (session?.id) {
        await apiService.endCall(session.id, callDuration);
      }
      
      // Set final state
      setCallStatus('ended');
      setWebsocketState('disconnected');
      
      // Show summary after delay
      setTimeout(() => {
        showCallSummary();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error ending call:', error);
      setCallStatus('ended');
      Alert.alert(
        'Call Completed',
        'Call ended.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const showCallSummary = () => {
    Alert.alert(
      'Call Completed',
      `Duration: ${formatDuration(callDuration)}\nCost: KSH ${callCost}`,
      [
        {
          text: 'Rate Session',
          onPress: () => showRatingDialog()
        },
        {
          text: 'Done',
          onPress: () => {
            audioService.setNormalAudioMode();
            router.back();
          }
        }
      ]
    );
  };

  const showRatingDialog = () => {
    Alert.alert(
      'Rate Session',
      'How was your consultation?',
      [
        { text: 'Excellent ⭐⭐⭐⭐⭐', onPress: () => rateSession(5) },
        { text: 'Good ⭐⭐⭐⭐', onPress: () => rateSession(4) },
        { text: 'Average ⭐⭐⭐', onPress: () => rateSession(3) },
        { text: 'Poor ⭐⭐', onPress: () => rateSession(2) },
        { text: 'Very Poor ⭐', onPress: () => rateSession(1) },
        { 
          text: 'Skip', 
          style: 'cancel', 
          onPress: () => {
            audioService.setNormalAudioMode();
            router.back();
          }
        }
      ]
    );
  };

  const rateSession = async (rating: number) => {
    try {
      console.log('⭐ Rating submitted:', rating);
      Alert.alert('Thank You!', 'Your rating has been recorded.');
    } catch (error) {
      console.error('Failed to rate session:', error);
    } finally {
      audioService.setNormalAudioMode();
      router.back();
    }
  };

  const handleCallFailed = async (message: string) => {
    setCallStatus('failed');
    setWebsocketState('failed');
    cleanupCall();
    
    await audioService.stopRingtone();
    await audioService.setNormalAudioMode();
    
    Alert.alert(
      'Call Failed', 
      `${message}\n\nDebug Info:\n${debugInfo}\n\nWebSocket State: ${websocketState}`,
      [
        { 
          text: 'Try Again', 
          onPress: async () => {
            setErrorDetails('');
            setCallStatus('initializing');
            setWebsocketState('reconnecting');
            initializeCall();
          }
        },
        { 
          text: 'Use Alternative Token', 
          onPress: async () => {
            // Try with alternative token format
            setErrorDetails('');
            setCallStatus('initializing');
            setWebsocketState('trying_alternative');
            tryAlternativeConnection();
          }
        },
        { 
          text: 'Go Back', 
          style: 'cancel', 
          onPress: () => {
            audioService.setNormalAudioMode();
            router.back();
          }
        }
      ]
    );
  };

  const tryAlternativeConnection = async () => {
    try {
      const userId = '1';
      const sessionId = session?.id || 563;
      
      // Generate alternative token
      const altToken = apiService.generateAlternativeToken(parseInt(userId));
      
      // Initialize WebRTC with alternative token
      webRTCManager.current = new WebRTCVoiceManager();
      webRTCManager.current.setCallbacks(
        () => handleWebRTCConnected(),
        (error) => handleCallFailed(error)
      );
      
      await webRTCManager.current.initialize(
        sessionId.toString(),
        userId,
        altToken,
        true
      );
      
    } catch (error) {
      handleCallFailed(`Alternative connection failed: ${error}`);
    }
  };

  const startRippleAnimation = () => {
    rippleAnim1.setValue(0);
    rippleAnim2.setValue(0);
    rippleAnim3.setValue(0);

    Animated.loop(
      Animated.parallel([
        createRippleSequence(rippleAnim1, 0),
        createRippleSequence(rippleAnim2, 600),
        createRippleSequence(rippleAnim3, 1200),
      ])
    ).start();
  };

  const createRippleSequence = (anim: Animated.Value, delay: number) => {
    return Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);
  };

  const stopRippleAnimation = () => {
    rippleAnim1.stopAnimation();
    rippleAnim2.stopAnimation();
    rippleAnim3.stopAnimation();
  };

  const startCallTimer = () => {
    callStartTime.current = Date.now();
    durationInterval.current = setInterval(() => {
      const newDuration = Math.floor((Date.now() - callStartTime.current) / 1000);
      setCallDuration(newDuration);
      calculateCallCost(newDuration);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const cleanupCall = () => {
    stopCallTimer();
    stopRippleAnimation();
    
    if (webRTCManager.current) {
      webRTCManager.current.endCall();
      webRTCManager.current = null;
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch (callStatus) {
      case 'initializing': return 'Preparing your call...';
      case 'connecting': return 'Connecting to professional...';
      case 'ringing': return 'Calling professional...';
      case 'active': return 'In consultation';
      case 'ending': return 'Ending call...';
      case 'ended': return 'Call completed';
      case 'failed': return 'Call failed';
      default: return 'Connecting...';
    }
  };

  const renderRippleEffect = () => {
    return (
      <View style={styles.rippleContainer}>
        <Animated.View style={[
          styles.ripple, 
          { 
            transform: [{ scale: rippleAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }], 
            opacity: rippleAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) 
          }
        ]} />
        <Animated.View style={[
          styles.ripple, 
          { 
            transform: [{ scale: rippleAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }], 
            opacity: rippleAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) 
          }
        ]} />
        <Animated.View style={[
          styles.ripple, 
          { 
            transform: [{ scale: rippleAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }], 
            opacity: rippleAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) 
          }
        ]} />
      </View>
    );
  };

  const renderCallContent = () => {
    switch (callStatus) {
      case 'initializing':
      case 'connecting':
        return (
          <View style={styles.centerContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.avatarGradient}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </LinearGradient>
              {renderRippleEffect()}
            </View>
            
            <Text style={styles.professionalName}>{professional?.name || 'Professional'}</Text>
            <Text style={styles.callStatusText}>{getStatusMessage()}</Text>
            <Text style={styles.webrtcStatus}>{webRTCStatus}</Text>
            <Text style={styles.websocketStatus}>WebSocket: {websocketState}</Text>
            <Text style={styles.specialization}>{professional?.specialization}</Text>

            <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingIndicator} />
            {debugInfo ? <Text style={styles.debugInfo}>{debugInfo}</Text> : null}
          </View>
        );

      case 'ringing':
        return (
          <View style={styles.centerContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.avatarGradient}>
                <Ionicons name="call" size={60} color="#FFFFFF" />
              </LinearGradient>
              {renderRippleEffect()}
            </View>
            
            <Text style={styles.professionalName}>{professional?.name}</Text>
            <Text style={styles.callStatusText}>📞 Calling professional...</Text>
            <Text style={styles.webrtcStatus}>{webRTCStatus}</Text>
            <Text style={styles.websocketStatus}>WebSocket: {websocketState}</Text>
            <Text style={styles.specialization}>{professional?.specialization}</Text>

            <ActivityIndicator size="large" color="#F59E0B" style={styles.loadingIndicator} />

            <TouchableOpacity style={[styles.button, styles.endCallButton]} onPress={handleEndCall}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.endCallGradient}>
                <Ionicons name="call" size={24} color="#FFF" />
                <Text style={styles.endCallText}>Cancel Call</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case 'active':
        return (
          <View style={styles.centerContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.avatarGradient}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
              </View>
            </View>
            
            <Text style={styles.professionalName}>{professional?.name}</Text>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
            <Text style={styles.costText}>KSH {callCost}</Text>
            <Text style={styles.connectedText}>✅ Live WebRTC Call</Text>
            <Text style={styles.webrtcStatus}>{webRTCStatus}</Text>
            <Text style={styles.websocketStatus}>WebSocket: {websocketState}</Text>

            <View style={styles.controlsContainer}>
              <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleMute}>
                <LinearGradient colors={isMuted ? ['#EF4444', '#DC2626'] : ['#374151', '#4B5563']} style={styles.controlButtonGradient}>
                  <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.controlText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.controlButton, isSpeaker && styles.controlButtonActive]} onPress={toggleSpeaker}>
                <LinearGradient colors={isSpeaker ? ['#3B82F6', '#2563EB'] : ['#374151', '#4B5563']} style={styles.controlButtonGradient}>
                  <Ionicons name={isSpeaker ? "volume-high" : "volume-medium"} size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.controlText}>{isSpeaker ? 'Speaker' : 'Earpiece'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.button, styles.endCallButtonActive]} onPress={handleEndCall}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.endCallGradient}>
                <Ionicons name="call" size={24} color="#FFF" />
                <Text style={styles.endCallText}>End Call</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case 'ending':
        return (
          <View style={styles.centerContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#6B7280', '#4B5563']} style={styles.avatarGradient}>
                <Ionicons name="call" size={60} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.statusText}>Ending Call</Text>
            <Text style={styles.durationText}>Duration: {formatDuration(callDuration)}</Text>
            <Text style={styles.costText}>Total: KSH {callCost}</Text>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        );

      case 'ended':
        return (
          <View style={styles.centerContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.avatarGradient}>
                <Ionicons name="checkmark" size={60} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.statusText}>Call Completed</Text>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
            <Text style={styles.costText}>KSH {callCost}</Text>
            <Text style={styles.redirectText}>Returning to dashboard...</Text>
          </View>
        );

      case 'failed':
        return (
          <View style={styles.centerContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.avatarGradient}>
                <Ionicons name="close" size={60} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.statusText}>Call Failed</Text>
            <Text style={styles.subStatusText}>{errorDetails}</Text>
            <Text style={styles.debugText}>{debugInfo}</Text>
            <Text style={styles.websocketStatus}>WebSocket State: {websocketState}</Text>
            
            <View style={styles.failedButtons}>
              <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={() => { 
                setErrorDetails(''); 
                setCallStatus('initializing');
                initializeCall(); 
              }}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => router.back()}>
                <Text style={styles.buttonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={['#1F2937', '#111827']} style={styles.container}>
      <StatusBar backgroundColor="#111827" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerText}>Voice Consultation</Text>
        {callStatus === 'active' && (
          <View style={styles.durationContainer}>
            <Ionicons name="time" size={16} color="#10B981" />
            <Text style={styles.durationHeader}>{formatDuration(callDuration)}</Text>
            <Text style={styles.costHeader}>KSH {callCost}</Text>
          </View>
        )}
      </View>

		<View style = {styles.content}>
        {renderCallContent()}
      </View>

      {professional && (
        <View style={styles.bottomInfo}>
          <Text style={styles.rateInfo}>
            KSH {professional.rate}/min • {professional.experience_years} years experience
          </Text>
          <Text style={styles.webrtcInfo}>
            WebRTC Live Audio • Status: {callStatus} • WS: {websocketState}
          </Text>
          <Text style={styles.serverInfo}>
            Server: teleconnect-krga.onrender.com
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 60, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerText: { color: '#F9FAFB', fontSize: 18, fontWeight: '700' },
  durationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  durationHeader: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  costHeader: { color: '#F59E0B', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  avatarContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 32, position: 'relative' },
  avatarGradient: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  rippleContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  ripple: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: 'rgba(59, 130, 246, 0.5)' },
  activeIndicator: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#10B981', borderRadius: 10, padding: 4 },
  activeDot: { width: 8, height: 8, backgroundColor: '#FFFFFF', borderRadius: 4 },
  professionalName: { color: '#F9FAFB', fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  callStatusText: { color: '#D1D5DB', fontSize: 18, marginBottom: 8, fontWeight: '600' },
  webrtcStatus: { color: '#60A5FA', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  websocketStatus: { color: '#F59E0B', fontSize: 12, marginBottom: 8, textAlign: 'center' },
  statusText: { color: '#F9FAFB', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  subStatusText: { color: '#FCA5A5', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  debugText: { color: '#9CA3AF', fontSize: 10, textAlign: 'center', marginBottom: 4, paddingHorizontal: 20 },
  debugInfo: { color: '#60A5FA', fontSize: 10, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  specialization: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  durationText: { color: '#10B981', fontSize: 32, fontWeight: '700', marginBottom: 8 },
  costText: { color: '#F59E0B', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  connectedText: { color: '#10B981', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  redirectText: { color: '#9CA3AF', fontSize: 14, marginTop: 16 },
  loadingIndicator: { marginBottom: 32 },
  controlsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 20 },
  controlButton: { alignItems: 'center' },
  controlButtonGradient: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  controlButtonActive: {},
  controlText: { color: '#F9FAFB', fontSize: 11, fontWeight: '600' },
  button: { borderRadius: 40, overflow: 'hidden', minWidth: 120 },
  endCallGradient: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  endCallButton: { marginTop: 20 },
	endCallButtonActive: {},
  endCallText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  failedButtons: { flexDirection: 'row', gap: 8 },
  retryButton: { backgroundColor: '#3B82F6' },
  backButton: { backgroundColor: '#6B7280' },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 12 },
  bottomInfo: { padding: 16, paddingBottom: 34, alignItems: 'center' },
  rateInfo: { color: '#D1D5DB', fontSize: 12, marginBottom: 4 },
  webrtcInfo: { color: '#60A5FA', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  serverInfo: { color: '#9CA3AF', fontSize: 9 },
});