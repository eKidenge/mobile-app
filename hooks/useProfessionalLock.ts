import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface LockResult {
  success: boolean;
  message?: string;
  lockId?: string;
}

export const useProfessionalLock = () => {
  const [activeLocks, setActiveLocks] = useState<Set<string>>(new Set());

  const lockProfessional = async (professionalId: string, categoryId: string): Promise<boolean> => {
    try {
      const result: LockResult = await apiService.lockProfessional(professionalId, categoryId);
      
      if (result.success && result.lockId) {
        setActiveLocks(prev => new Set(prev).add(professionalId));
        // Store lock ID for later release
        localStorage.setItem(`lock_${professionalId}`, result.lockId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to lock professional:', error);
      return false;
    }
  };

  const releaseProfessional = async (professionalId: string): Promise<void> => {
    try {
      const lockId = localStorage.getItem(`lock_${professionalId}`);
      if (lockId) {
        await apiService.releaseProfessionalLock(professionalId, lockId);
        localStorage.removeItem(`lock_${professionalId}`);
      }
      setActiveLocks(prev => {
        const newLocks = new Set(prev);
        newLocks.delete(professionalId);
        return newLocks;
      });
    } catch (error) {
      console.error('Failed to release professional lock:', error);
    }
  };

  const isProfessionalLocked = (professionalId: string): boolean => {
    return activeLocks.has(professionalId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeLocks.forEach(professionalId => {
        releaseProfessional(professionalId);
      });
    };
  }, []);

  return {
    lockProfessional,
    releaseProfessional,
    isProfessionalLocked,
    activeLocks: Array.from(activeLocks)
  };
};