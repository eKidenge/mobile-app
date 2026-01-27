// hooks/useProfessionals.ts
import { useState, useEffect } from 'react';
import { professionalService, TransformedProfessional, TransformedCategory } from '../services/professionalService';

export const useProfessionals = () => {
  const [professionals, setProfessionals] = useState<TransformedProfessional[]>([]);
  const [categories, setCategories] = useState<TransformedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfessionals = async (filters?: { category?: string; search?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await professionalService.getAllProfessionals(filters);
      setProfessionals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load professionals');
      console.error('Error loading professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setError(null);
      const data = await professionalService.getAllCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      console.error('Error loading categories:', err);
    }
  };

  const loadProfessionalDetail = async (id: string): Promise<TransformedProfessional | null> => {
    try {
      setLoading(true);
      return await professionalService.getProfessionalById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load professional details');
      console.error('Error loading professional details:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const searchProfessionals = async (query: string, category?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await professionalService.searchProfessionals(query, category);
      setProfessionals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search professionals');
      console.error('Error searching professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadCategories();
      await loadProfessionals();
    };

    initializeData();
  }, []);

  return {
    professionals,
    categories,
    loading,
    error,
    loadProfessionals,
    loadProfessionalDetail,
    searchProfessionals,
    refetch: () => loadProfessionals(),
  };
};