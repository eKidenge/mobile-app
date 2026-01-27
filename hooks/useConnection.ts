import { useState } from 'react';
import { apiService } from '../services/api';

interface ConnectionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export const useConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const initiateConnection = async (
    professionalId: string,
    categoryId: string,
    connectionType: 'chat' | 'voice' | 'video'
  ): Promise<ConnectionResult> => {
    try {
      setConnectionStatus('connecting');
      
      const result = await apiService.initiateSession({
        professionalId,
        categoryId,
        connectionType,
        timestamp: new Date().toISOString()
      });

      if (result.success && result.sessionId) {
        setConnectionStatus('connected');
        setActiveSession(result.sessionId);
        return { success: true, sessionId: result.sessionId };
      } else {
        setConnectionStatus('failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      setConnectionStatus('failed');
      console.error('Connection initiation failed:', error);
      return { success: false, error: 'Connection failed' };
    }
  };

  const endConnection = async (sessionId: string): Promise<void> => {
    try {
      await apiService.endSession(sessionId);
      setActiveSession(null);
      setConnectionStatus('idle');
    } catch (error) {
      console.error('Failed to end connection:', error);
    }
  };

  return {
    initiateConnection,
    endConnection,
    connectionStatus,
    activeSession
  };
};