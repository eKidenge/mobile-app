import { Alert, Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { router } from 'expo-router';

let soundObject: Audio.Sound | null = null;

export async function playRingtone() {
  try {
    // Stop any existing sound
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
    }

    // Create new sound
    soundObject = new Audio.Sound();
    
    // Play ringtone - you can use different sounds for different platforms
    const soundFile = Platform.OS === 'ios' 
      ? require('../assets/sounds/ringtone.mp3')
      : require('../assets/sounds/ringtone.wav');
    
    await soundObject.loadAsync(soundFile);
    await soundObject.setIsLoopingAsync(true);
    await soundObject.playAsync();

    // Vibrate on Android
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 1000, 500, 1000], true); // Vibrate pattern
    }
  } catch (error) {
    console.error('Error playing ringtone:', error);
  }
}

export async function stopRingtone() {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
    
    // Stop vibration
    Vibration.cancel();
  } catch (error) {
    console.error('Error stopping ringtone:', error);
  }
}

export async function showIncomingCallPopup(
  clientName: string,
  sessionId: string,
  clientId: string,
  mode: 'chat' | 'audio' | 'video',
  callId?: string
) {
  // Play ringtone
  await playRingtone();

  // Show notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📞 Incoming ${mode === 'audio' ? 'Voice' : mode === 'video' ? 'Video' : 'Chat'} Call`,
      body: `${clientName} is calling you`,
      data: { 
        type: 'call',
        sessionId,
        clientId,
        mode,
        callId
      },
      sound: 'ringtone.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'call',
      autoDismiss: false,
      sticky: true,
    },
    trigger: null,
  });

  // Show in-app alert
  Alert.alert(
    `📞 Incoming ${mode === 'audio' ? 'Voice' : mode === 'video' ? 'Video' : 'Chat'} Call`,
    `${clientName} is calling you`,
    [
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          await stopRingtone();
          // Call your decline API here
          console.log('Call declined');
        }
      },
      {
        text: 'Accept',
        style: 'default',
        onPress: async () => {
          await stopRingtone();
          // Navigate to session screen
          router.push({
            pathname: '/professional/professional-session',
            params: { 
              sessionId,
              clientId,
              mode,
              callId
            }
          });
        }
      }
    ],
    { cancelable: false }
  );
}

// Polling function to check for incoming calls
export async function checkForIncomingCalls(
  professionalId: number,
  token: string,
  onCallReceived: (callData: any) => void
): Promise<NodeJS.Timeout> {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(
        `https://teleconnect-krga.onrender.com/api/professional/incoming-calls/${professionalId}/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.active_calls && data.active_calls.length > 0) {
          const activeCall = data.active_calls[0];
          console.log('📞 Active call detected:', activeCall);
          
          // Stop polling since we have a call
          clearInterval(interval);
          
          // Trigger the call popup
          onCallReceived(activeCall);
        }
      }
    } catch (error) {
      console.error('Error checking incoming calls:', error);
    }
  }, 5000); // Check every 5 seconds

  return interval;
}