// app/professional/professional-call.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { ArrowLeft, PhoneOff } from 'lucide-react-native';

export default function ProfessionalCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract parameters
  const sessionId = params.sessionId as string;
  const clientId = params.clientId as string;
  const clientName = params.clientName as string;
  const mode = params.mode as 'chat' | 'audio' | 'video';
  const roomId = params.roomId as string;
  
  // Zego credentials (should match client side)
  const zegoAppID = 1178040486;
  const zegoAppSign = "373ecf17185d1d8c94b03169895a336e";
  
  useEffect(() => {
    console.log('📞 Professional Call Params:', params);
    
    if (!roomId || !sessionId) {
      Alert.alert('Error', 'Missing call information');
      router.back();
      return;
    }
    
    setIsLoading(false);
  }, [params]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Joining call...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ZegoUIKitPrebuiltCall
        appID={zegoAppID}
        appSign={zegoAppSign}
        userID={`pro_${sessionId}`} // Professional user ID
        userName={clientName || 'Professional'}
        callID={roomId}
        config={{
          ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
          turnOnCameraWhenJoining: mode === 'video',
          turnOnMicrophoneWhenJoining: true,
          onHangUp: () => {
            // Send call ended notification
            sendCallEndedNotification();
            router.back();
          },
          onUserJoin: (users) => {
            console.log('👥 User joined:', users);
            if (users.length > 0) {
              console.log('✅ Client joined the call!');
            }
          },
          onUserLeave: (users) => {
            console.log('👋 User left:', users);
            if (users.length === 0) {
              Alert.alert('Client Left', 'The client has left the call.');
              router.back();
            }
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
              'Are you sure you want to end the call?',
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
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.callType}>
            {mode === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
        </View>
      </View>
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
  callInfo: {
    alignItems: 'center',
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  callType: {
    color: '#E5E7EB',
    fontSize: 14,
  },
});

async function sendCallEndedNotification() {
  // Send notification to backend that call ended
  try {
    // Implement based on your backend
  } catch (error) {
    console.error('Error sending call ended notification:', error);
  }
}