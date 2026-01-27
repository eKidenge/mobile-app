// hooks/useVoiceCall.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import VoiceCallService from '../services/VoiceCallService';

export const useVoiceCall = () => {
	const [callState, setCallState] = useState({
	isInCall: false,
	isConnecting: false,
	isConnected: false,
    isMuted: false,
	isSpeakerOn: false,
	callDuration: 0,
    remoteUserJoined: false,
	connectionQuality: 'good',
	callError: null
	});

	const [currentSession, setCurrentSession] = useState(null);
	const appState = useRef(AppState.currentState);

  // Initialize voice call service
  useEffect(() => {
	initializeService();

    // Restore previous session if exists
    restorePreviousSession();
    
    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

	return () => {
		subscription.remove();
		VoiceCallService.setCallDurationCallback(null);
	};
	}, []);

	const initializeService = async () => {
    try {
		await VoiceCallService.initializeAgora();
      VoiceCallService.setCallDurationCallback(handleCallDurationUpdate);
	} catch (error) {
		console.error('Failed to initialize voice service:', error);
	}
	};

	const restorePreviousSession = async () => {
    const session = await VoiceCallService.restoreSession();
    if (session) {
		setCurrentSession(session);
      setCallState(prev => ({ ...prev, isInCall: true }));
    }
	};

  const handleAppStateChange = (nextAppState) => {
	if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
		// App came to foreground
		if (callState.isInCall) {
        // Reinitialize if needed
		initializeService();
      }
    }
	appState.current = nextAppState;
	};

	const handleCallDurationUpdate = useCallback((duration) => {
    setCallState(prev => ({ ...prev, callDuration: duration }));
	}, []);

	// Initiate a new call
  const initiateCall = async (professionalId, clientId, sessionType = 'audio') => {
    try {
      setCallState(prev => ({ ...prev, isConnecting: true, callError: null }));
      
      const result = await VoiceCallService.initiateCall(professionalId, clientId, sessionType);
      
      setCurrentSession(result);
		setCallState(prev => ({
		...prev,
		isInCall: true,
		isConnecting: false
      }));

		return result;
	} catch (error) {
		setCallState(prev => ({
        ...prev,
		isConnecting: false,
        callError: error.message
      }));
		throw error;
    }
	};

	// Join voice channel
	const joinChannel = async () => {
    try {
		setCallState(prev => ({ ...prev, isConnecting: true, callError: null }));

		await VoiceCallService.joinVoiceChannel(
		// onJoinSuccess
        (channel, uid, elapsed) => {
          setCallState(prev => ({
			...prev,
            isConnected: true,
            isConnecting: false,
            remoteUserJoined: false
			}));
		},
		// onUserJoined
        (uid, elapsed) => {
			setCallState(prev => ({
			...prev,
			remoteUserJoined: true
          }));
		},
        // onUserLeft
		(uid, reason) => {
			setCallState(prev => ({
            ...prev,
            remoteUserJoined: false
			}));
		},
        // onAudioVolume
		(speakers, totalVolume) => {
          // Handle audio volume updates if needed
		},
		// onError
		(error) => {
			setCallState(prev => ({
			...prev,
            callError: error.message,
            isConnecting: false
			}));
        }
		);

    } catch (error) {
      setCallState(prev => ({
		...prev,
		isConnecting: false,
		callError: error.message
      }));
      throw error;
    }
	};

	// End current call
	const endCall = async (endedBy = 'client', callQuality = 'good') => {
    try {
      const result = await VoiceCallService.endCall(endedBy, callQuality);

      setCallState({
        isInCall: false,
		isConnecting: false,
		isConnected: false,
        isMuted: false,
		isSpeakerOn: false,
        callDuration: 0,
		remoteUserJoined: false,
		connectionQuality: 'good',
		callError: null
      });

		setCurrentSession(null);

		return result;
	} catch (error) {
		setCallState(prev => ({
		...prev,
        callError: error.message
		}));
      throw error;
    }
	};

	// Toggle mute
	const toggleMute = async () => {
	try {
      const isMuted = await VoiceCallService.toggleMute();
		setCallState(prev => ({ ...prev, isMuted }));
      return isMuted;
	} catch (error) {
		console.error('Toggle mute error:', error);
		return callState.isMuted;
    }
	};

	// Toggle speaker
  const toggleSpeaker = async () => {
    try {
      const isSpeakerOn = await VoiceCallService.toggleSpeaker();
		setCallState(prev => ({ ...prev, isSpeakerOn }));
		return isSpeakerOn;
	} catch (error) {
      console.error('Toggle speaker error:', error);
		return callState.isSpeakerOn;
	}
	};

	// Check professional availability
	const checkAvailability = async (professionalId) => {
	try {
      return await VoiceCallService.checkProfessionalAvailability(professionalId);
	} catch (error) {
		throw error;
    }
	};

  // Accept incoming call (for professionals)
	const acceptCall = async (sessionId, professionalId) => {
	try {
		setCallState(prev => ({ ...prev, isConnecting: true, callError: null }));

      const result = await VoiceCallService.acceptCall(sessionId, professionalId);

		setCurrentSession(result);
      setCallState(prev => ({
		...prev,
		isInCall: true,
        isConnecting: false
		}));

		return result;
	} catch (error) {
      setCallState(prev => ({
		...prev,
		isConnecting: false,
        callError: error.message
      }));
      throw error;
    }
  };

  // Get current call info
	const getCallInfo = () => {
	return VoiceCallService.getCurrentCallState();
	};

	return {
	// State
	callState,
    currentSession,

    // Actions
	initiateCall,
	joinChannel,
    endCall,
	toggleMute,
    toggleSpeaker,
	checkAvailability,
	acceptCall,
	getCallInfo,

	// Utility
    initializeService: () => VoiceCallService.initializeAgora()
  };
};