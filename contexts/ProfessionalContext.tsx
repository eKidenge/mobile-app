import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Professional {
  id: string;
  name: string;
  email: string;
  category: string;
  is_verified: boolean;
  is_approved: boolean;
  specialization: string;
  rate: number;
  available: boolean;
  online_status: boolean;
}

interface ProfessionalContextType {
  professional: Professional | null;
  setProfessional: (professional: Professional | null) => void;
  isLoading: boolean;
  updateAvailability: (available: boolean) => Promise<void>;
  updateOnlineStatus: (online: boolean) => Promise<void>;
  refreshProfessional: () => Promise<void>;
}

const ProfessionalContext = createContext<ProfessionalContextType | undefined>(undefined);

export function ProfessionalProvider({ children }: { children: ReactNode }) {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load professional data from storage
  const loadProfessional = async () => {
    try {
      const savedProfessional = await AsyncStorage.getItem('professional');
      if (savedProfessional) {
        const professionalData = JSON.parse(savedProfessional);
        setProfessional(professionalData);
        
        // Verify with server
        await refreshProfessional();
      }
    } catch (error) {
      console.error('Error loading professional:', error);
    } finally {
      setIsLoading(false);
    }
  };

	// Refresh professional data from server
  const refreshProfessional = async () => {
    if (!professional?.id) return;
    
    try {
      const response = await fetch(`https://teleconnect-krga.onrender.com/professionals/${professional.id}/`);
      if (response.ok) {
        const data = await response.json();
        setProfessional(data);
        await AsyncStorage.setItem('professional', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error refreshing professional data:', error);
    }
  };

  const updateAvailability = async (available: boolean) => {
    if (!professional?.id) return;
    
    try {
      const updatedProfessional = { ...professional, available };
      setProfessional(updatedProfessional);
      await AsyncStorage.setItem('professional', JSON.stringify(updatedProfessional));
      
      // Update on server
      await fetch(`https://teleconnect-krga.onrender.com/professionals/${professional.id}/availability/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ available }),
      });
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const updateOnlineStatus = async (online: boolean) => {
    if (!professional?.id) return;
    
    try {
      const updatedProfessional = { ...professional, online_status: online };
      setProfessional(updatedProfessional);
      await AsyncStorage.setItem('professional', JSON.stringify(updatedProfessional));
      
      // Update on server
      await fetch(`https://teleconnect-krga.onrender.com/professionals/${professional.id}/online-status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ online_status: online }),
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  useEffect(() => {
    loadProfessional();
  }, []);

  return (
    <ProfessionalContext.Provider value={{ 
      professional, 
      setProfessional, 
      isLoading,
      updateAvailability,
      updateOnlineStatus,
      refreshProfessional
    }}>
      {children}
    </ProfessionalContext.Provider>
  );
}

export function useProfessional() {
  const context = useContext(ProfessionalContext);
  if (context === undefined) {
    throw new Error('useProfessional must be used within a ProfessionalProvider');
  }
  return context;
}