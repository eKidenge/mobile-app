import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import {
  Phone,
  Video,
  User,
  Clock,
  PhoneOff,
  VideoOff,
  Mic,
  MicOff,
  ArrowLeft,
  MessageCircle,
  Maximize2,
  Shield,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface PaymentData {
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  consultationId: string;
  duration: number;
  amount: number;
  transactionId: string;
  categoryName: string;
  paymentStatus: string;
  consultationType: string;
}

interface ProfessionalData {
  id: string;
  name: string;
  roomId: string;
}

interface CallRequestStatus {
  id: number;
  status: 'pending' | 'ringing' | 'accepted' | 'rejected' | 'connecting' | 'connected' | 'ended';
  rejection_reason?: string;
}

// ADDED: Interface for professional status
interface ProfessionalCallStatus {
  status: 'ringing' | 'accepted' | 'rejected' | 'busy' | 'joined' | 'left' | 'ended';
  message: string;
  timestamp: string;
}

export default function CallPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [professionalData, setProfessionalData] = useState<ProfessionalData | null>(null);
  const [callType, setCallType] = useState<'voice' | 'video'>('video');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 minutes in seconds
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ending'>('idle');
  const [callRequestStatus, setCallRequestStatus] = useState<CallRequestStatus | null>(null);
  const [showCallControls, setShowCallControls] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showEndCallModal, setShowEndCallModal] = useState<boolean>(false);
  
  // ADDED: Professional status tracking
  const [professionalStatus, setProfessionalStatus] = useState<ProfessionalCallStatus | null>(null);
  const [professionalJoined, setProfessionalJoined] = useState<boolean>(false);
  const [showProfessionalStatus, setShowProfessionalStatus] = useState<boolean>(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Zego credentials - NO CHANGES
  const zegoAppID = 1178040486;
  const zegoAppSign = "373ecf17185d1d8c94b03169895a336e";
  
  // Extract data from params
  useEffect(() => {
    console.log('📞 CallPage params:', params);
    
    if (params.paymentData) {
      try {
        const payment = JSON.parse(params.paymentData as string);
        setPaymentData(payment);
        
        // Create professional data
        const professional: ProfessionalData = {
          id: payment.professionalId,
          name: payment.professionalName,
          roomId: `room_${payment.professionalId}_${payment.consultationId}_${Date.now()}`
        };
        
        setProfessionalData(professional);
        
        // Set call type based on consultation type
        const type = payment.consultationType === 'voice' ? 'voice' : 'video';
        setCallType(type);
        
        console.log('✅ CallPage initialized with:', { 
          professional, 
          callType: type,
          roomId: professional.roomId 
        });
        
        // Start call request process
        sendCallRequest();
      } catch (error) {
        console.error('❌ Error parsing payment data:', error);
        Alert.alert('Error', 'Invalid payment data');
        router.back();
      }
    } else {
      Alert.alert('Error', 'No payment data provided');
      router.back();
    }
    
    return () => {
      // Cleanup polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [params]);

  // Handle call timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isInCall && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            endCall('timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isInCall, timeLeft]);

  // ADDED: Show professional status temporarily
  const showProfessionalStatusMessage = (status: ProfessionalCallStatus) => {
    setProfessionalStatus(status);
    setShowProfessionalStatus(true);
    
    // Hide after 3 seconds
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    
    statusTimeoutRef.current = setTimeout(() => {
      setShowProfessionalStatus(false);
    }, 3000);
  };

  // Send call request to backend
  const sendCallRequest = async () => {
    if (!paymentData || !professionalData) return;
    
    try {
      setCallStatus('ringing');
      setIsConnecting(true);
      
      // ADDED: Show professional ringing status
      showProfessionalStatusMessage({
        status: 'ringing',
        message: `Calling ${professionalData.name}...`,
        timestamp: new Date().toISOString()
      });
      
      const callRequestData = {
        professional: professionalData.id,
        client_id: paymentData.clientId,
        client_name: paymentData.clientName,
        call_type: callType,
        duration: paymentData.duration || 30,
        consultation_id: paymentData.consultationId,
        amount: paymentData.amount || 0,
        category: paymentData.categoryName || 'Consultation',
        room_id: professionalData.roomId // ADDED: Send room ID
      };

      console.log('📤 Sending call request:', callRequestData);

      // Try to send to your backend API
      try {
        const response = await fetch('https://teleconnect-krga.onrender.com/api/call/request/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(callRequestData)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Call request sent to backend:', data);
          
          const mockResponse: CallRequestStatus = {
            id: data.call_id || Math.floor(Math.random() * 1000),
            status: 'ringing'
          };
          
          setCallRequestStatus(mockResponse);
          
          // Start polling for call status
          startPollingCallStatus(mockResponse.id);
          
        } else {
          throw new Error('Backend request failed');
        }
      } catch (apiError) {
        console.log('Using simulated response due to API error:', apiError);
        simulateCallRequest();
      }
      
    } catch (error) {
      console.error('❌ Error sending call request:', error);
      Alert.alert('Error', 'Failed to send call request');
      setCallStatus('idle');
      setIsConnecting(false);
    }
  };

  // Simulate call request response (replace with actual API call)
  const simulateCallRequest = () => {
    // Simulate API call delay
    setTimeout(() => {
      const mockResponse: CallRequestStatus = {
        id: Math.floor(Math.random() * 1000),
        status: 'ringing'
      };
      
      setCallRequestStatus(mockResponse);
      
      // Start polling for call status
      startPollingCallStatus(mockResponse.id);
      
    }, 1500);
  };

  // Poll for call status - UPDATED with professional status
  const startPollingCallStatus = (requestId: number) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    let pollCount = 0;
    const maxPolls = 60; // 60 seconds timeout
    
    pollingIntervalRef.current = setInterval(() => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(pollingIntervalRef.current!);
        
        // ADDED: Show timeout status
        showProfessionalStatusMessage({
          status: 'ended',
          message: `${professionalData?.name} did not respond`,
          timestamp: new Date().toISOString()
        });
        
        Alert.alert('Timeout', 'Professional did not respond. Please try again.');
        setCallStatus('idle');
        setIsConnecting(false);
        return;
      }
      
      // In a real app, fetch call status from backend
      // For now, simulate professional accepting after 5 seconds
      
      // ADDED: Show different status messages
      if (pollCount === 2) {
        showProfessionalStatusMessage({
          status: 'ringing',
          message: `${professionalData?.name} is being notified...`,
          timestamp: new Date().toISOString()
        });
      } else if (pollCount === 4) {
        showProfessionalStatusMessage({
          status: 'accepted',
          message: `${professionalData?.name} accepted your call!`,
          timestamp: new Date().toISOString()
        });
        
        clearInterval(pollingIntervalRef.current!);
        setCallRequestStatus(prev => prev ? { ...prev, status: 'accepted' } : null);
        joinCallAfterAcceptance();
      }
      
    }, 1000);
  };

  // Join call after professional accepts
  const joinCallAfterAcceptance = () => {
    setCallStatus('connecting');
    
    // ADDED: Show connecting status
    showProfessionalStatusMessage({
      status: 'joined',
      message: `Connecting to ${professionalData?.name}...`,
      timestamp: new Date().toISOString()
    });
    
    // Simulate connection delay
    setTimeout(() => {
      setIsConnecting(false);
      setIsInCall(true);
      setCallStatus('connected');
      setProfessionalJoined(true);
      console.log('✅ Call connected successfully');
      
      // ADDED: Show joined status
      showProfessionalStatusMessage({
        status: 'joined',
        message: `Connected with ${professionalData?.name}`,
        timestamp: new Date().toISOString()
      });
      
      // Start the session timer
      setTimeLeft((paymentData?.duration || 30) * 60);
      
    }, 2000);
  };

  const endCall = (reason: 'user' | 'professional' | 'timeout' | 'error' = 'user') => {
    setCallStatus('ending');
    setIsInCall(false);
    setProfessionalJoined(false);
    
    // Stop any polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Update call request status
    setCallRequestStatus(prev => prev ? { ...prev, status: 'ended' } : null);
    
    // ADDED: Show professional left status
    if (reason === 'professional') {
      showProfessionalStatusMessage({
        status: 'left',
        message: `${professionalData?.name} left the call`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Send call ended notification to backend
    sendCallEndedNotification(reason);
    
    // Show ending message and go back to dashboard
    let message = 'Call ended successfully.';
    switch(reason) {
      case 'timeout':
        message = 'Call ended due to timeout.';
        break;
      case 'professional':
        message = 'Professional left the call.';
        break;
      case 'error':
        message = 'Call ended due to technical issues.';
        break;
    }
    
    setTimeout(() => {
      Alert.alert(
        'Call Ended',
        `${message} Thank you for your consultation!`,
        [{ 
          text: 'OK', 
          onPress: () => router.push('/dashboard')
        }]
      );
    }, 500);
  };

  const sendCallEndedNotification = async (reason: string) => {
    try {
      if (!paymentData || !callRequestStatus) return;
      
      // Send call ended notification to backend
      const response = await fetch('https://teleconnect-krga.onrender.com/api/call-ended/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId: paymentData.consultationId,
          duration: ((paymentData.duration || 30) * 60) - timeLeft,
          professionalId: paymentData.professionalId,
          clientId: paymentData.clientId,
          callType: callType,
          amount: paymentData.amount,
          reason: reason,
          callRequestId: callRequestStatus.id
        })
      });
      
      if (response.ok) {
        console.log('✅ Call ended notification sent');
      }
    } catch (error) {
      console.error('❌ Error sending call ended notification:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleCallControls = () => {
    setShowCallControls(!showCallControls);
  };

  const sendMessage = () => {
    Alert.alert(
      'Send Message',
      'This feature allows you to send text messages during the call.',
      [{ text: 'OK' }]
    );
  };

  const showCallInfo = () => {
    Alert.alert(
      'Call Information',
      `Professional: ${professionalData?.name}\nCall Type: ${callType === 'video' ? 'Video' : 'Voice'}\nDuration: ${formatTime(timeLeft)} remaining\nConnection: Secure`,
      [{ text: 'OK' }]
    );
  };

  // ADDED: Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ringing': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'joined': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'busy': return '#F59E0B';
      case 'left': return '#EF4444';
      case 'ended': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // If in call and professional data exists, show Zego call interface
  if (isInCall && professionalData && paymentData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ZegoUIKitPrebuiltCall
          appID={zegoAppID}
          appSign={zegoAppSign}
          userID={paymentData.clientId}
          userName={paymentData.clientName}
          callID={professionalData.roomId}
          config={{
            ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
            turnOnCameraWhenJoining: callType === 'video' && !isVideoOff,
            turnOnMicrophoneWhenJoining: !isMuted,
            layout: isFullscreen ? "FullScreen" : "Auto",
            onHangUp: () => {
              setShowEndCallModal(true);
            },
            onUserJoin: (users) => {
              console.log('👥 User joined:', users);
              if (users.length > 0) {
                console.log('✅ Professional joined the call!');
                setProfessionalJoined(true);
                
                // ADDED: Show professional joined status
                showProfessionalStatusMessage({
                  status: 'joined',
                  message: `${professionalData?.name} joined the call`,
                  timestamp: new Date().toISOString()
                });
              }
            },
            onUserLeave: (users) => {
              console.log('👋 User left:', users);
              if (users.length === 0) {
                // ADDED: Show professional left status
                showProfessionalStatusMessage({
                  status: 'left',
                  message: `${professionalData?.name} left the call`,
                  timestamp: new Date().toISOString()
                });
                
                setTimeout(() => {
                  Alert.alert('Professional Left', 'The professional has left the call.');
                  endCall('professional');
                }, 1000);
              }
            },
            onRoomStateUpdate: (state) => {
              console.log('📡 Room state:', state);
            },
          }}
        />
        
        {/* ADDED: Professional Status Banner */}
        {showProfessionalStatus && professionalStatus && (
          <View style={[styles.statusBanner, { backgroundColor: getStatusColor(professionalStatus.status) }]}>
            <Text style={styles.statusBannerText}>{professionalStatus.message}</Text>
          </View>
        )}
        
        {/* Custom Call Controls Overlay */}
        {showCallControls && (
          <View style={styles.callControlsOverlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setShowEndCallModal(true)}
              >
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.callInfo}>
                <View style={styles.connectionStatus}>
                  <View style={[styles.connectionDot, { 
                    backgroundColor: professionalJoined ? '#10B981' : '#F59E0B' 
                  }]} />
                  <Text style={styles.connectionText}>
                    {professionalJoined ? 'Professional Connected' : 'Waiting for professional...'}
                  </Text>
                </View>
                <Text style={styles.callDuration}>{formatTime(timeLeft)}</Text>
              </View>
              
              <TouchableOpacity style={styles.infoButton} onPress={showCallInfo}>
                <Shield size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {/* Center Professional Info */}
            <View style={styles.centerInfo}>
              <Text style={styles.professionalName}>
                {professionalData.name}
              </Text>
              <Text style={styles.callTypeText}>
                {callType === 'video' ? 'Video Call' : 'Voice Call'}
                {professionalJoined ? ' • Connected' : ' • Connecting...'}
              </Text>
            </View>
            
            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <View style={styles.controlRow}>
                <TouchableOpacity 
                  style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                  onPress={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <MicOff size={24} color="#FFFFFF" />
                  ) : (
                    <Mic size={24} color="#FFFFFF" />
                  )}
                  <Text style={styles.controlButtonText}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
                
                {callType === 'video' && (
                  <TouchableOpacity 
                    style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
                    onPress={() => setIsVideoOff(!isVideoOff)}
                  >
                    {isVideoOff ? (
                      <Video size={24} color="#FFFFFF" />
                    ) : (
                      <VideoOff size={24} color="#FFFFFF" />
                    )}
                    <Text style={styles.controlButtonText}>
                      {isVideoOff ? 'Video On' : 'Video Off'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.controlButton]}
                  onPress={sendMessage}
                >
                  <MessageCircle size={24} color="#FFFFFF" />
                  <Text style={styles.controlButtonText}>Message</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.controlButton]}
                  onPress={toggleFullscreen}
                >
                  <Maximize2 size={24} color="#FFFFFF" />
                  <Text style={styles.controlButtonText}>
                    {isFullscreen ? 'Exit Full' : 'Full'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* End Call Button */}
              <TouchableOpacity 
                style={styles.endCallButton} 
                onPress={() => setShowEndCallModal(true)}
              >
                <PhoneOff size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Toggle Controls Button */}
        <TouchableOpacity 
          style={styles.toggleControlsButton}
          onPress={toggleCallControls}
        >
          <Text style={styles.toggleControlsText}>
            {showCallControls ? '▼' : '▲'}
          </Text>
        </TouchableOpacity>
        
        {/* End Call Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showEndCallModal}
          onRequestClose={() => setShowEndCallModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>End Call</Text>
              <Text style={styles.modalText}>
                Are you sure you want to end the call with {professionalData?.name}?
              </Text>
              
              <View style={styles.callStats}>
                <View style={styles.statItem}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.statText}>{formatTime(timeLeft)} left</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statText}>
                    Professional: {professionalJoined ? 'Connected' : 'Not Connected'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEndCallModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.endCallModalButton]}
                  onPress={() => {
                    setShowEndCallModal(false);
                    endCall('user');
                  }}
                >
                  <PhoneOff size={20} color="#FFFFFF" />
                  <Text style={styles.endCallModalButtonText}>End Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Pre-call screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonPreCall}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.title}>Start Consultation</Text>
          <Text style={styles.subtitle}>DIRECT-CONNECT TECHNOLOGIES</Text>
        </View>

        <View style={styles.content}>
          {/* Professional Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, styles.blueGradient]}>
                <User size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>Connecting to Professional</Text>
            </View>
            
            {professionalData && (
              <View style={styles.professionalInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {professionalData.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.professionalDetails}>
                  <Text style={styles.professionalName}>{professionalData.name}</Text>
                  <Text style={styles.professionalService}>
                    {paymentData?.categoryName || 'Consultation'}
                  </Text>
                  <View style={styles.callTypeBadge}>
                    <Text style={styles.callTypeText}>
                      {callType === 'video' ? 'Video Consultation' : 'Voice Consultation'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Payment Summary */}
          {paymentData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Summary</Text>
              <View style={styles.paymentDetails}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Amount Paid</Text>
                  <Text style={styles.paymentValue}>KES {paymentData.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Duration</Text>
                  <Text style={styles.paymentValue}>{paymentData.duration || 30} minutes</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Transaction ID</Text>
                  <Text style={styles.transactionId}>{paymentData.transactionId}</Text>
                </View>
                <View style={[styles.paymentRow, { marginTop: 8 }]}>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.statusText}>PAID & VERIFIED</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Connection Status */}
          {isConnecting && (
            <View style={[styles.card, styles.connectingCard]}>
              <View style={styles.connectingHeader}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.connectingTitle}>
                  {callStatus === 'ringing' ? '📞 Calling Professional...' : '🔗 Connecting...'}
                </Text>
              </View>
              
              <Text style={styles.connectingSubtext}>
                Please wait while we connect you to {professionalData?.name}
              </Text>
              
              {/* ADDED: Professional Status Display */}
              {professionalStatus && (
                <View style={styles.professionalStatusContainer}>
                  <View style={[styles.professionalStatusDot, { 
                    backgroundColor: getStatusColor(professionalStatus.status) 
                  }]} />
                  <Text style={styles.professionalStatusText}>
                    {professionalStatus.message}
                  </Text>
                </View>
              )}
              
              {callRequestStatus && (
                <View style={styles.callRequestStatus}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <View style={[
                    styles.statusIndicator,
                    callRequestStatus.status === 'ringing' && styles.statusRinging,
                    callRequestStatus.status === 'accepted' && styles.statusAccepted,
                  ]}>
                    <Text style={styles.statusIndicatorText}>
                      {callRequestStatus.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Call Information */}
          <View style={[styles.card, styles.infoCard]}>
            <Text style={styles.cardTitle}>Call Information</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Shield size={16} color="#059669" />
                </View>
                <Text style={styles.infoItemText}>Secure encrypted connection</Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Clock size={16} color="#2563EB" />
                </View>
                <Text style={styles.infoItemText}>{paymentData?.duration || 30} minute session</Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  {callType === 'video' ? (
                    <Video size={16} color="#8B5CF6" />
                  ) : (
                    <Phone size={16} color="#8B5CF6" />
                  )}
                </View>
                <Text style={styles.infoItemText}>
                  {callType === 'video' ? 'Video call with screen sharing' : 'High-quality audio call'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer with Status */}
      <View style={styles.footer}>
        {isConnecting ? (
          <View style={styles.connectingFooter}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.connectingFooterText}>
              {callStatus === 'ringing' ? 'Waiting for professional to answer...' : 'Establishing connection...'}
            </Text>
            <TouchableOpacity 
              style={styles.cancelCallButton}
              onPress={() => {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                router.back();
              }}
            >
              <Text style={styles.cancelCallButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : !isInCall ? (
          <View style={styles.readyFooter}>
            <Text style={styles.readyText}>Ready to connect</Text>
            <TouchableOpacity 
              style={styles.startCallButton}
              onPress={sendCallRequest}
            >
              <Ionicons 
                name={callType === 'video' ? "videocam" : "call"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.startCallButtonText}>
                Start {callType === 'video' ? 'Video' : 'Voice'} Call
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButtonPreCall: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  blueGradient: {
    backgroundColor: '#2563EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  professionalService: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  callTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  callTypeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  paymentDetails: {
    marginTop: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  transactionId: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  connectingCard: {
    alignItems: 'center',
    padding: 24,
  },
  connectingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  connectingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  connectingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  // ADDED: Professional Status Styles
  professionalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  professionalStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  professionalStatusText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  callRequestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  statusIndicator: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusRinging: {
    backgroundColor: '#FBBF24',
  },
  statusAccepted: {
    backgroundColor: '#10B981',
  },
  statusIndicatorText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
  },
  infoList: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  connectingFooter: {
    alignItems: 'center',
  },
  connectingFooterText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  cancelCallButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cancelCallButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  readyFooter: {
    alignItems: 'center',
  },
  readyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  startCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  startCallButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // ADDED: Status Banner Styles
  statusBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // In-call styles
  callControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Platform.OS === 'ios' ? 40 : 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  callDuration: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInfo: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -50 }],
  },
  professionalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  callTypeText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    minWidth: 70,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 4,
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleControlsButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleControlsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  callStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  endCallModalButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  endCallModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});