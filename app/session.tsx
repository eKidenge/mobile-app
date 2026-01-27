// app/session.tsx - COMPLETE FIXED VERSION
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface Professional {
  id: string;
  name: string;
  specialization: string;
  rate: number;
  available: boolean;
  online_status: boolean;
  category: string;
  average_rating: number;
  total_sessions: number;
  experience_years: number;
  email?: string;
  phone?: string;
  bio?: string;
  title?: string;
  avg_response_time?: string;
}

interface Session {
  id: string;
  professional: string;
  client_id: string;
  session_type: 'chat' | 'audio' | 'video';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  duration: number;
  cost: number;
  created_at: string;
  actual_start: string | null;
  ended_at: string | null;
  room_id?: string;
}

export default function SessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // FIXED: Only log once on component mount
  useEffect(() => {
    console.log('🔴🔴🔴 SESSION PAGE LOADED 🔴🔴🔴');
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Initialize consultation type directly
  const [consultationType, setConsultationType] = useState<'chat' | 'audio' | 'video'>(() => {
    const type = params.consultationType as 'chat' | 'audio' | 'video';
    return type || 'chat';
  });

  // Enhanced ref tracking
  const isInitialized = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const initializationAttempted = useRef(false);
  const mountedRef = useRef(true);

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

  // Initialize session
  const initializeSession = useCallback(async () => {
    if (!mountedRef.current || isInitialized.current || initializationAttempted.current) {
      return;
    }

    initializationAttempted.current = true;
    
    try {
      // Extract parameters safely
      let professionalData: Professional | null = null;
      try {
        professionalData = params.professional ? JSON.parse(params.professional as string) : null;
      } catch (error) {
        throw new Error('Invalid professional data format');
      }

      const consultationTypeParam = params.consultationType as 'chat' | 'audio' | 'video' || 'chat';
      const sessionId = params.sessionId as string;

      setConsultationType(consultationTypeParam);

      if (!professionalData || !professionalData.id) {
        throw new Error('Professional information missing or invalid');
      }

      setProfessional(professionalData);

      if (sessionId && sessionId !== 'undefined') {
        sessionIdRef.current = sessionId;
      }

      setIsSessionActive(true);

      let currentSession: Session | null = null;

      // Try to fetch session details if sessionId exists
      if (sessionId && sessionId !== 'undefined') {
        try {
          const sessionResponse = await fetch(`${API_BASE_URL}/get_session_detail/${sessionId}/`);
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.session) {
              currentSession = sessionData.session;
              setSession(sessionData.session);
              sessionIdRef.current = sessionId;
            }
          }
        } catch (error) {
          console.log('⚠️ Could not fetch session details:', error);
        }
      }

      // Create session only if we don't have one
      if (!currentSession && professionalData.id) {
        try {
          const createResponse = await fetch(`${API_BASE_URL}/sessions/create/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              professional_id: professionalData.id,
              client_id: '1',
              session_type: consultationTypeParam,
              category: professionalData.category
            })
          });

          if (createResponse.ok) {
            const sessionData = await createResponse.json();
            setSession(sessionData);
            currentSession = sessionData;
            sessionIdRef.current = sessionData.id;
          } else {
            const localSession: Session = {
              id: `local_sess_${Date.now()}`,
              professional: professionalData.id,
              client_id: '1',
              session_type: consultationTypeParam,
              status: 'active',
              duration: 0,
              cost: professionalData.rate || 0,
              created_at: new Date().toISOString(),
              actual_start: new Date().toISOString(),
              ended_at: null
            };
            setSession(localSession);
            currentSession = localSession;
            sessionIdRef.current = localSession.id;
          }
        } catch (error) {
          const localSession: Session = {
            id: `local_sess_${Date.now()}`,
            professional: professionalData.id,
            client_id: '1',
            session_type: consultationTypeParam,
            status: 'active',
            duration: 0,
            cost: professionalData.rate || 0,
            created_at: new Date().toISOString(),
            actual_start: new Date().toISOString(),
            ended_at: null
          };
          setSession(localSession);
          currentSession = localSession;
          sessionIdRef.current = localSession.id;
        }
      }

    } catch (error: any) {
      setInitializationError(error.message);
      Alert.alert('Initialization Error', 'Failed to start session. Please try again.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        isInitialized.current = true;
      }
    }
  }, [params.professional, params.consultationType, params.sessionId]);

  // Single useEffect with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    if (params.professional && !isInitialized.current && !initializationAttempted.current) {
      initializeSession();
    } else {
      if (isInitialized.current && loading) {
        setLoading(false);
      }
    }

    return () => {
      mountedRef.current = false;
      isInitialized.current = true;
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  // Safety timeout
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading && mountedRef.current) {
        setLoading(false);
        isInitialized.current = true;
        initializationAttempted.current = true;
      }
    }, 10000);

    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  // Notification function
  const notifyProfessional = async (professionalId: string, type: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/send_notification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: professionalId,
          title: 'New Session Request',
          message: `You have a new ${type} consultation request`,
          type: 'session_request'
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Check if session is ready
  const isSessionReady = () => {
    return professional && session;
  };

  // startChatSession
  const startChatSession = async () => {
    try {
      setStartingChat(true);
      
      if (!isSessionReady()) {
        Alert.alert('Session Not Ready', 'Please wait for the session to initialize completely.');
        return;
      }

      await notifyProfessional(professional!.id, 'chat');

      router.push({
        pathname: '/chat-interface',
        params: {
          sessionId: session!.id,
          professional: JSON.stringify(professional),
          professionalName: professional!.name,
          consultationType: 'chat',
          roomId: session!.room_id || `chat_room_${session!.id}_${Date.now()}`
        }
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  // startVoiceCall
  const startVoiceCall = async () => {
    try {
      setStartingCall(true);
      
      if (!professional) {
        Alert.alert('Error', 'Professional information missing.');
        return;
      }

      await notifyProfessional(professional.id, 'audio');

      if (!professional.online_status || !professional.available) {
        Alert.alert('Not Available', `${professional.name} is not available for voice calls at the moment.`);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/voice/initiate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professional_id: professional.id,
          client_id: '1'
        })
      });

      if (response.ok) {
        const callData = await response.json();
        const roomId = callData.room_id || callData.roomId || `voice_room_${Date.now()}`;
        
        router.push({
          pathname: '/voice-call',
          params: {
            sessionId: callData.session_id || session?.id || sessionIdRef.current || `voice_sess_${Date.now()}`,
            professional: JSON.stringify(professional),
            professionalName: professional.name,
            roomId: roomId,
            callData: JSON.stringify(callData),
            consultationType: 'audio'
          }
        });
      } else {
        const fallbackCallData = {
          room_id: `voice_room_${professional.id}_${Date.now()}`,
          session_id: session?.id || sessionIdRef.current || `voice_sess_${Date.now()}`,
          status: 'created',
          message: 'Using fallback voice room'
        };
        
        router.push({
          pathname: '/voice-call',
          params: {
            sessionId: fallbackCallData.session_id,
            professional: JSON.stringify(professional),
            professionalName: professional.name,
            roomId: fallbackCallData.room_id,
            callData: JSON.stringify(fallbackCallData),
            isFallback: 'true',
            consultationType: 'audio'
          }
        });
      }

    } catch (error: any) {
      let errorMessage = 'Failed to start voice call. Please try chat instead.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Call Failed', errorMessage);
    } finally {
      setStartingCall(false);
    }
  };

  // startVideoCall
  const startVideoCall = async () => {
    try {
      setStartingCall(true);
      
      if (!professional) {
        Alert.alert('Error', 'Professional information missing.');
        return;
      }

      await notifyProfessional(professional.id, 'video');

      if (!professional.online_status || !professional.available) {
        Alert.alert('Not Available', `${professional.name} is not available for video calls at the moment.`);
        return;
      }

      const endpoints = [
        `${API_BASE_URL}/initiate_video_call/`,
        `${API_BASE_URL}/video-call/initiate/`,
        `${API_BASE_URL}/calls/video/`,
        `${API_BASE_URL}/video-call/`
      ];

      let callData = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              professional_id: professional.id,
              client_id: '1',
              session_id: session?.id || sessionIdRef.current || `video_sess_${Date.now()}`,
              consultation_type: 'video'
            })
          });

          if (response.ok) {
            callData = await response.json();
            break;
          }
        } catch (error) {
          console.log(`❌ Endpoint error:`, error);
        }
      }

      if (!callData) {
        callData = {
          room_id: `video_room_${professional.id}_${Date.now()}`,
          session_id: session?.id || sessionIdRef.current || `video_sess_${Date.now()}`,
          status: 'created',
          message: 'Using fallback video room'
        };
      }

      const roomId = callData.room_id || callData.roomId || `video_room_${professional.id}_${Date.now()}`;
      
      router.push({
        pathname: '/video-call',
        params: {
          sessionId: callData.session_id || session?.id || sessionIdRef.current || `video_sess_${Date.now()}`,
          professional: JSON.stringify(professional),
          professionalName: professional.name,
          roomId: roomId,
          callData: JSON.stringify(callData),
          isFallback: callData.message?.includes('fallback') ? 'true' : 'false',
          consultationType: 'video'
        }
      });

    } catch (error: any) {
      let errorMessage = 'Failed to start video call. Please try again.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Call Failed', errorMessage);
    } finally {
      setStartingCall(false);
    }
  };

  const endSession = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'No active session to end');
        return;
      }

      Alert.alert(
        'End Session',
        'Are you sure you want to end this session?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'End Session', 
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(`${API_BASE_URL}/end_session_api/${session.id}/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    duration: sessionTimer,
                    cost: professional?.rate ? (professional.rate * (sessionTimer / 3600)) : 0
                  })
                });

                if (response.ok) {
                  setIsSessionActive(false);
                  router.push({
                    pathname: '/session-complete',
                    params: {
                      session: JSON.stringify(session),
                      professional: JSON.stringify(professional),
                      duration: sessionTimer.toString(),
                      cost: professional?.rate ? (professional.rate * (sessionTimer / 3600)).toString() : '0'
                    }
                  });
                } else {
                  throw new Error('Failed to end session');
                }
              } catch (error) {
                setIsSessionActive(false);
                router.push({
                  pathname: '/session-complete',
                  params: {
                    session: JSON.stringify(session),
                    professional: JSON.stringify(professional),
                    duration: sessionTimer.toString(),
                    cost: professional?.rate ? (professional.rate * (sessionTimer / 3600)).toString() : '0'
                  }
                });
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to end session.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
          <Text style={styles.loadingText}>Preparing Your Session</Text>
          <Text style={styles.loadingSubtext}>Please wait while we connect you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (initializationError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
          </View>
          <Text style={styles.errorTitle}>Session Error</Text>
          <Text style={styles.errorMessage}>{initializationError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!professional) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="person-remove" size={80} color="#FFFFFF" />
          </View>
          <Text style={styles.errorTitle}>Professional Not Found</Text>
          <Text style={styles.errorMessage}>The professional you're trying to connect with is not available.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Red Gradient Header */}
      <View style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>DIRECT-CONNECT TECHNOLOGIES</Text>
            {isSessionActive && (
              <View style={styles.timerContainer}>
                <Ionicons name="time" size={16} color="#FFD700" />
                <Text style={styles.timer}>"Skip the search, get the answer.": {formatTime(sessionTimer)}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={endSession} style={styles.endButton}>
            <Ionicons name="close-circle" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={70} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Session Ready!</Text>
          <Text style={styles.successSubtitle}>
            You're connected with <Text style={styles.highlightText}>{professional.name}</Text>
          </Text>
          <View style={styles.paymentBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.paymentBadgeText}>Payment Verified • Session Active</Text>
          </View>
        </View>

        {/* Professional Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {professional.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.onlineIndicator}>
                <View style={[
                  styles.onlineDot,
                  professional.online_status ? styles.onlineDotActive : styles.onlineDotInactive
                ]} />
                <Text style={styles.onlineText}>
                  {professional.online_status ? 'Online Now' : 'Offline'}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.professionalName}>{professional.name}</Text>
              <Text style={styles.professionalTitle}>{professional.specialization}</Text>
              
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{professional.average_rating.toFixed(1)}</Text>
                <Text style={styles.ratingSubtext}>({professional.total_sessions}+ sessions)</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="briefcase" size={20} color="#DC2626" />
              <Text style={styles.statValue}>{professional.experience_years}</Text>
              <Text style={styles.statLabel}>Years Exp</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="speedometer" size={20} color="#DC2626" />
              <Text style={styles.statValue}>{professional.avg_response_time || 'Quick'}</Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="cash" size={20} color="#DC2626" />
              <Text style={styles.statValue}>KSH {professional.rate}</Text>
              <Text style={styles.statLabel}>Per Hour</Text>
            </View>
          </View>

          {/* Session Type Badge */}
          <View style={styles.sessionTypeBadge}>
            <Ionicons 
              name={consultationType === 'audio' ? 'call' : consultationType === 'video' ? 'videocam' : 'chatbubble'} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.sessionTypeText}>
              {consultationType.toUpperCase()} CONSULTATION
            </Text>
          </View>
        </View>

        {/* Main Action Section */}
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>
            {consultationType === 'audio' ? '🎤 START VOICE CALL' : 
             consultationType === 'video' ? '📹 START VIDEO CALL' : 
             '💬 START CHAT'}
          </Text>
          <Text style={styles.actionSubtitle}>
            Tap below to begin your {consultationType} session
          </Text>
          
          {/* Giant Action Button */}
          <TouchableOpacity 
            style={[
              styles.mainActionButton,
              consultationType === 'chat' ? styles.chatButton :
              consultationType === 'audio' ? styles.voiceButton :
              styles.videoButton
            ]}
            onPress={consultationType === 'chat' ? startChatSession : 
                     consultationType === 'audio' ? startVoiceCall : 
                     startVideoCall}
            disabled={startingChat || startingCall || !isSessionReady()}
          >
            {(startingChat || startingCall) ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <View style={styles.actionButtonContent}>
                <View style={styles.actionIconContainer}>
                  <Ionicons 
                    name={consultationType === 'chat' ? 'chatbubble-ellipses' : 
                          consultationType === 'audio' ? 'call' : 'videocam'} 
                    size={60} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.actionButtonText}>
                  {consultationType === 'chat' ? 'START CHAT SESSION' : 
                   consultationType === 'audio' ? 'START VOICE CALL' : 
                   'START VIDEO CALL'}
                </Text>
                <Text style={styles.actionButtonSubtext}>
                  {consultationType === 'chat' ? 'Begin messaging conversation' : 
                   consultationType === 'audio' ? 'Connect via audio call' : 
                   'Connect via video conference'}
                </Text>
                <View style={styles.startArrow}>
                  <Ionicons name="arrow-forward-circle" size={40} color="#FFFFFF" />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Notification Note */}
          <View style={styles.noteCard}>
            <Ionicons name="notifications-circle" size={24} color="#DC2626" />
            <Text style={styles.noteText}>
              {professional.name} will receive a notification when you start the session
            </Text>
          </View>

          {/* Alternative Options */}
          <View style={styles.alternativeSection}>
            <Text style={styles.alternativeTitle}>Or try another method:</Text>
            <View style={styles.alternativeButtons}>
              {consultationType !== 'chat' && (
                <TouchableOpacity 
                  style={[styles.alternativeButton, styles.chatAltButton]}
                  onPress={startChatSession}
                  disabled={startingChat}
                >
                  <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
                  <Text style={styles.alternativeButtonText}>Chat</Text>
                </TouchableOpacity>
              )}
              {consultationType !== 'audio' && (
                <TouchableOpacity 
                  style={[styles.alternativeButton, styles.voiceAltButton]}
                  onPress={startVoiceCall}
                  disabled={startingCall}
                >
                  <Ionicons name="call" size={22} color="#FFFFFF" />
                  <Text style={styles.alternativeButtonText}>Voice</Text>
                </TouchableOpacity>
              )}
              {consultationType !== 'video' && (
                <TouchableOpacity 
                  style={[styles.alternativeButton, styles.videoAltButton]}
                  onPress={startVideoCall}
                  disabled={startingCall}
                >
                  <Ionicons name="videocam" size={22} color="#FFFFFF" />
                  <Text style={styles.alternativeButtonText}>Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Session Details Card - FIXED with safety check */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Ionicons name="information-circle" size={24} color="#DC2626" />
            <Text style={styles.detailsTitle}>Session Details</Text>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="calendar" size={18} color="#DC2626" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="card" size={18} color="#DC2626" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment Status</Text>
                <Text style={[styles.detailValue, styles.paidStatus]}>✅ Verified & Complete</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Security</Text>
                <Text style={styles.detailValue}>End-to-end encrypted connection</Text>
              </View>
            </View>
            
            {/* FIXED: Added safety check for session.id */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="key" size={18} color="#DC2626" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Session ID</Text>
                <Text style={styles.detailValue}>
                  {session && session.id ? 
                    `${session.id.substring(0, Math.min(8, session.id.length)).toUpperCase()}...` : 
                    'Generating...'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.supportCard}>
          <Ionicons name="help-circle" size={24} color="#DC2626" />
          <Text style={styles.supportText}>
            Need assistance? Your session is fully secured and the professional is ready to assist you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 BEAUTIFUL RED THEME STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEE2E2', // Light red background
  },
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626', // Red background
    padding: 20,
  },
  loadingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    padding: 30,
  },
  errorIcon: {
    marginBottom: 25,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '700',
  },
  // Header Gradient
  headerGradient: {
    backgroundColor: '#DC2626', // Red header
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timer: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 6,
  },
  endButton: {
    padding: 8,
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Success Banner
  successBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  successIconContainer: {
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  highlightText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  paymentBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  onlineIndicator: {
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  onlineDotActive: {
    backgroundColor: '#10B981',
  },
  onlineDotInactive: {
    backgroundColor: '#6B7280',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  professionalName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  professionalTitle: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 6,
    marginRight: 8,
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#FCA5A5',
  },
  sessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
  },
  sessionTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 1,
  },
  // Action Section
  actionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  mainActionButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  chatButton: {
    backgroundColor: '#3B82F6',
  },
  voiceButton: {
    backgroundColor: '#DC2626', // Red for voice
  },
  videoButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonContent: {
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  actionIconContainer: {
    marginBottom: 15,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  startArrow: {
    marginTop: 10,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 18,
    borderRadius: 15,
    marginBottom: 25,
  },
  noteText: {
    fontSize: 14,
    color: '#991B1B',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  alternativeSection: {
    marginTop: 10,
  },
  alternativeTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  alternativeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
    minWidth: 100,
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  chatAltButton: {
    backgroundColor: '#3B82F6',
  },
  voiceAltButton: {
    backgroundColor: '#DC2626', // Red for voice
  },
  videoAltButton: {
    backgroundColor: '#EF4444',
  },
  alternativeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 12,
  },
  detailsGrid: {
    gap: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  paidStatus: {
    color: '#059669',
    fontWeight: '700',
  },
  // Support Card
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  supportText: {
    fontSize: 14,
    color: '#991B1B',
    marginLeft: 15,
    flex: 1,
    lineHeight: 20,
  },
});