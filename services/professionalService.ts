// services/professionalService.ts
import { apiService, Professional, Category } from './api';

export interface TransformedProfessional {
  id: string;
  name: string;
  category: string;
  specialization: string;
  rating: number;
  reviews: number;
  experience: string;
  rate: number;
  available: boolean;
  photo?: string;
  email: string;
  phone: string;
  status: string;
  total_sessions: number;
}

export interface TransformedCategory {
  id: string;
  title: string;
  description: string;
  base_price: number;
  professional_count: number;
  session_count: number;
  enabled: boolean;
}

class ProfessionalService {
  // Transform database professional to app format
  private transformProfessional(pro: Professional): TransformedProfessional {
    return {
      id: pro.id.toString(),
      name: pro.name,
      category: pro.category || 'General',
      specialization: pro.specialization,
      rating: pro.average_rating || 0,
      reviews: pro.reviews_count || 0,
      experience: this.calculateExperience(pro.created_at),
      rate: pro.rate,
      available: pro.available && pro.status === 'approved',
      photo: pro.photo,
      email: pro.email,
      phone: pro.phone,
      status: pro.status,
      total_sessions: pro.total_sessions,
    };
  }

  // Transform database category to app format
  private transformCategory(cat: Category): TransformedCategory {
    return {
      id: cat.id.toString(),
      title: cat.name,
      description: cat.description,
      base_price: cat.base_price,
      professional_count: cat.professional_count,
      session_count: cat.session_count,
      enabled: cat.enabled,
    };
  }

  private calculateExperience(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const years = now.getFullYear() - created.getFullYear();
    return `${years} years`;
  }

  // =====================
  // PUBLIC METHODS
  // =====================

  async getAllCategories(): Promise<TransformedCategory[]> {
    try {
      const categories = await apiService.getCategories();
      return categories
        .filter(cat => cat.enabled)
        .map(cat => this.transformCategory(cat));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getCategoryById(categoryId: string): Promise<TransformedCategory | null> {
    try {
      const categories = await this.getAllCategories();
      return categories.find(cat => cat.id === categoryId) || null;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  async getAllProfessionals(filters?: {
    category?: string;
    available?: boolean;
    search?: string;
  }): Promise<TransformedProfessional[]> {
    try {
      const response = await apiService.getProfessionals({
        ...filters,
        status: 'approved', // Only get approved professionals
      });
      
      return response.professionals.map(pro => this.transformProfessional(pro));
    } catch (error) {
      console.error('Error fetching professionals:', error);
      throw error;
    }
  }

  async getProfessionalsByCategory(categoryId: string): Promise<TransformedProfessional[]> {
    try {
      const category = await this.getCategoryById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      const professionals = await this.getAllProfessionals({ category: category.title });
      return professionals;
    } catch (error) {
      console.error('Error fetching professionals by category:', error);
      throw error;
    }
  }

  async getProfessionalById(professionalId: string): Promise<TransformedProfessional | null> {
    try {
      const professional = await apiService.getProfessionalDetail(professionalId);
      return this.transformProfessional(professional);
    } catch (error) {
      console.error('Error fetching professional details:', error);
      throw error;
    }
  }

  async searchProfessionals(query: string, category?: string): Promise<TransformedProfessional[]> {
    try {
      const professionals = await apiService.searchProfessionals(query, { category });
      return professionals.map(pro => this.transformProfessional(pro));
    } catch (error) {
      console.error('Error searching professionals:', error);
      throw error;
    }
  }

  async getAvailableProfessionals(): Promise<TransformedProfessional[]> {
    try {
      return await this.getAllProfessionals({ available: true });
    } catch (error) {
      console.error('Error fetching available professionals:', error);
      throw error;
    }
  }

  async getFeaturedProfessionals(): Promise<TransformedProfessional[]> {
    try {
      const allProfessionals = await this.getAllProfessionals();
      // Sort by rating and session count to get featured professionals
      return allProfessionals
        .sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.total_sessions - a.total_sessions;
        })
        .slice(0, 8); // Top 8 professionals
    } catch (error) {
      console.error('Error fetching featured professionals:', error);
      throw error;
    }
  }
}

export const professionalService = new ProfessionalService();