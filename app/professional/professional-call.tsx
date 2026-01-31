// app/professional/professional-call.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { PhoneOff, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfessionalCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, professional, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [callStarted, setCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Extract parameters
  const sessionId = params.sessionId as string;
  const clientId = params.clientId as string;
  const clientName = params.clientName as string;
  const mode = params.mode as 'chat' | 'audio' | 'video';
  const roomId = params.roomId as string;
  const isIncomingCall = params.isIncomingCall === 'true';
  
  // Zego credentials (MUST match client side)
  const zegoAppID = 1178040486;
  const zegoAppSign = "373ecf17185d1d8c94b03169895a336e";
  
  useEffect(() => {
    console.log('📞 Professional Call Params:', params);
    console.log('👤 Professional user:', professional?.name);
    console.log('🔑 Token available:', !!token);
    
    if (!roomId) {
      Alert.alert('Error', 'Missing room information');
      router.back();
      return;
    }
    
    if (!sessionId) {
      Alert.alert('Error', 'Missing session information');
      router.back();
      return;
    }
    
    // Set professional as busy/in-call
    setProfessionalBusyStatus(true);
    
    // Start duration timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    setIsLoading(false);
    
    return () => {
      clearInterval(timer);
      setProfessionalBusyStatus(false);
    };
  }, [params]);

  // Set professional as busy/in-call
  const setProfessionalBusyStatus = async (isBusy: boolean) => {
    try {
      if (!professional?.id || !token) return;
      
      await fetch('https://teleconnect-krga.onrender.com/api/professional/busy-status/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professional_id: professional.id,
          is_busy: isBusy,
          session_id: sessionId,
          client_id: clientId
        })
      });
      
      console.log(`✅ Professional marked as ${isBusy ? 'busy' : 'available'}`);
    } catch (error) {
      console.error('Error updating busy status:', error);
    }
  };

  // Get professional name for display
  const getProfessionalName = () => {
    return professional?.name || user?.name || user?.first_name || 'Professional';
  };

  // Get professional ID for Zego
  const getProfessionalUserId = () => {
    return professional?.id || user?.id || `pro_${Date.now()}`;
  };

  // Send call started notification to backend
  const sendCallStartedNotification = async () => {
    try {
      if (!token || !sessionId) return;
      
      await fetch('https://teleconnect-krga.onrender.com/api/call/started/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          client_id: clientId,
          professional_id: professional?.id || getProfessionalUserId(),
          room_id: roomId,
          call_type: mode === 'video' ? 'video' : 'voice',
          started_at: new Date().toISOString()
        })
      });
      
      console.log('✅ Call started notification sent');
      setCallStarted(true);
    } catch (error) {
      console.error('Error sending call started notification:', error);
    }
  };

  // Send call ended notification
  const sendCallEndedNotification = async () => {
    try {
      if (!token || !sessionId) return;
      
      await fetch('https://teleconnect-krga.onrender.com/api/call/ended/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          client_id: clientId,
          professional_id: professional?.id || getProfessionalUserId(),
          room_id: roomId,
          duration: callDuration,
          ended_by: 'professional',
          ended_at: new Date().toISOString(),
          call_type: mode === 'video' ? 'video' : 'voice'
        })
      });
      
      console.log('✅ Call ended notification sent');
    } catch (error) {
      console.error('Error sending call ended notification:', error);
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Joining call room...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ZegoUIKitPrebuiltCall
        appID={zegoAppID}
        appSign={zegoAppSign}
        userID={getProfessionalUserId()}
        userName={getProfessionalName()}
        callID={roomId}
        config={{
          ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
          turnOnCameraWhenJoining: mode === 'video',
          turnOnMicrophoneWhenJoining: true,
          onHangUp: () => {
            // Send call ended notification
            sendCallEndedNotification();
            setProfessionalBusyStatus(false);
            router.back();
          },
          onUserJoin: (users) => {
            console.log('👥 User joined:', users);
            if (users.length > 0) {
              console.log('✅ Client joined the call!');
              
              // Send notification that client joined
              if (!callStarted) {
                sendCallStartedNotification();
              }
              
              // Update UI to show client connected
              Alert.alert(
                'Client Joined',
                `${clientName} has joined the call.`,
                [{ text: 'OK' }]
              );
            }
          },
          onUserLeave: (users) => {
            console.log('👋 User left:', users);
            if (users.length === 0) {
              Alert.alert(
                'Client Left',
                `${clientName} has left the call.`,
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      sendCallEndedNotification();
                      setProfessionalBusyStatus(false);
                      router.back();
                    }
                  }
                ]
              );
            }
          },
          onRoomStateUpdate: (state) => {
            console.log('📡 Room state:', state);
          },
        }}
      />
      
      {/* Custom Controls Overlay */}
      <View style={styles.controlsOverlay}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'End Call',
              `Are you sure you want to end the call with ${clientName}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'End Call', 
                  style: 'destructive',
                  onPress: () => {
                    // This will trigger onHangUp in Zego config
                  }
                }
              ]
            );
          }}
        >
          <PhoneOff size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.callInfo}>
          <Text style={styles.clientName}>{clientName || 'Client'}</Text>
          <Text style={styles.callType}>
            {mode === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
          {callStarted && (
            <Text style={styles.callDuration}>
              {formatDuration(callDuration)}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.minimizeButton}
          onPress={() => {
            // Optional: Implement minimize functionality
          }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {/* Call Status Banner */}
      {!callStarted && (
        <View style={styles.connectingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.connectingText}>
            Waiting for {clientName} to join...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  callType: {
    color: '#E5E7EB',
    fontSize: 14,
    marginTop: 2,
  },
  callDuration: {
    color: '#10B981',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  connectingBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});