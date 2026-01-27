// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

// Type definitions (keep your existing types)
export interface Professional {
  id: number;
  name: string;
  specialization: string;
  rate: number;
  available: boolean;
  category: string;
  average_rating: number;
  total_sessions: number;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  experience?: string;
  photo?: string;
  reviews_count?: number;
  created_at: string;
  online_status?: boolean;
  is_approved?: boolean;
  user_id?: number;
  // AI Pairing additional fields
  response_time?: string;
  success_rate?: number;
  languages?: string[];
  expertise?: string[];
}

export interface Category {
  id: number;
  name: string;
  description: string;
  base_price: number;
  enabled: boolean;
  professional_count: number;
  session_count: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  professional: Professional;
  client_id: number;
  session_type: 'chat' | 'call' | 'video';
  status: 'active' | 'completed' | 'cancelled';
  duration: number;
  cost: number;
  created_at: string;
  ended_at?: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  sender_type: 'client' | 'professional';
  message: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
}

export interface Favorite {
  id: number;
  user: number;
  professional: Professional;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  total_pages: number;
  current_page: number;
}

// AI Pairing Interfaces
export interface AIPairingRequest {
  category_id: string;
  category_name: string;
  client_id?: number;
  preferences?: {
    max_rate?: number;
    min_rating?: number;
    languages?: string[];
  };
}

export interface AIPairingResponse {
  success: boolean;
  professional: Professional;
  session_data?: any;
  match_score: number;
  reasoning: string;
}

export interface ProfessionalLockRequest {
  category: string;
  selected_professional_id: string;
  client_id?: number;
}

// NEW: Chat Session Interface
export interface ChatSession {
  id: string;
  session_id: number;
  professional_id: number;
  client_id: number;
  professional_name: string;
  client_name: string;
  status: 'pending' | 'active' | 'in_progress' | 'completed' | 'ended' | 'cancelled';
  session_type: 'chat' | 'audio' | 'video';
  started_at: string;
  ended_at: string | null;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  rate_used?: number;
  category?: string;
}

// NEW: Message Interface
export interface Message {
  id: string;
  session_id: number;
  sender_id: number;
  sender_type: 'client' | 'professional' | 'system';
  message_type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';
  content: string;
  timestamp: string;
  read: boolean;
  delivered: boolean;
}

class ApiService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error:', response.status, errorData);
      throw new Error(`API error: ${response.status} - ${errorData}`);
    }
    return response.json();
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...await this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // =====================
  // CHAT SESSION METHODS - NEW (ADDED)
  // =====================

  /**
   * Get client chat sessions
   */
  async getClientChatSessions(token?: string): Promise<any[]> {
    try {
      console.log('💬 API: Getting client chat sessions...');
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        '/sessions/history/',
        '/user/sessions/',
        '/client/sessions/',
        '/chat_sessions/'
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying chat session endpoint: ${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers,
          });
          
          console.log(`📡 ${endpoint} status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Chat sessions fetched via ${endpoint}:`, data);
            
            // Handle different response structures
            if (Array.isArray(data)) {
              return data;
            } else if (data.sessions && Array.isArray(data.sessions)) {
              return data.sessions;
            } else if (data.results && Array.isArray(data.results)) {
              return data.results;
            } else if (data.data && Array.isArray(data.data)) {
              return data.data;
            } else {
              console.log('❓ Unexpected chat session response structure:', data);
              return [];
            }
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('❌ API: Failed to get client chat sessions:', error);
      return [];
    }
  }

  /**
   * Get professional chat sessions
   */
  async getProfessionalChatSessions(professionalId: number, token?: string): Promise<any[]> {
    try {
      console.log('💬 API: Getting professional chat sessions for:', professionalId);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        `/professional/sessions/${professionalId}/`,
        `/professional/sessions/`,
        `/professionals/${professionalId}/sessions/`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying professional session endpoint: ${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers,
          });
          
          console.log(`📡 ${endpoint} status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Professional sessions fetched via ${endpoint}:`, data);
            
            // Handle different response structures
            if (Array.isArray(data)) {
              return data;
            } else if (data.sessions && Array.isArray(data.sessions)) {
              return data.sessions;
            } else if (data.results && Array.isArray(data.results)) {
              return data.results;
            } else if (data.data && Array.isArray(data.data)) {
              return data.data;
            } else {
              console.log('❓ Unexpected professional session response structure:', data);
              return [];
            }
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('❌ API: Failed to get professional chat sessions:', error);
      return [];
    }
  }

  /**
   * Get session messages for chat
   */
  async getSessionChatMessages(sessionId: number, token?: string): Promise<any[]> {
    try {
      console.log('💬 API: Getting messages for chat session:', sessionId);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        `/sessions/${sessionId}/messages/`,
        `/sessions/${sessionId}/with-messages/`,
        `/chat_messages/${sessionId}/`,
        `/messages/${sessionId}/`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying messages endpoint: ${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers,
          });
          
          console.log(`📡 ${endpoint} status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Messages fetched via ${endpoint}:`, data);
            
            // Handle different response structures
            if (Array.isArray(data)) {
              return data;
            } else if (data.messages && Array.isArray(data.messages)) {
              return data.messages;
            } else if (data.results && Array.isArray(data.results)) {
              return data.results;
            } else if (data.data && Array.isArray(data.data)) {
              return data.data;
            } else {
              console.log('❓ Unexpected messages response structure:', data);
              return [];
            }
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error('❌ API: Failed to get session chat messages:', error);
      return [];
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(sessionId: number, content: string, senderType: string, token?: string): Promise<any> {
    try {
      console.log('💬 API: Sending chat message to session:', sessionId, content);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        '/messages/send/',
        '/chat_messages/send/',
        '/sessions/send-message/'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              session_id: sessionId,
              content: content,
              sender: senderType,
              message_type: 'text'
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Chat message sent via ${endpoint}:`, data);
            return data;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      throw new Error('Failed to send chat message through all endpoints');
    } catch (error) {
      console.error('❌ API: Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Mark chat messages as read
   */
  async markChatMessagesAsRead(sessionId: number, token?: string): Promise<void> {
    try {
      console.log('💬 API: Marking chat messages as read for session:', sessionId);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        '/messages/mark_read/',
        '/messages/read/',
        '/chat_messages/mark_read/'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              session_id: sessionId
            }),
          });
          
          if (response.ok) {
            console.log(`✅ Chat messages marked as read via ${endpoint}`);
            return;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      console.warn('⚠️ API: Could not mark chat messages as read');
    } catch (error) {
      console.error('❌ API: Failed to mark chat messages as read:', error);
    }
  }

  /**
   * Create chat session
   */
  async createChatSession(sessionData: any, token?: string): Promise<any> {
    try {
      console.log('💬 API: Creating new chat session:', sessionData);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        '/sessions/create/',
        '/sessions/',
        '/create_session/'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(sessionData),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Chat session created via ${endpoint}:`, data);
            return data;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      throw new Error('Failed to create chat session through all endpoints');
    } catch (error) {
      console.error('❌ API: Failed to create chat session:', error);
      throw error;
    }
  }

  /**
   * Update chat session status
   */
  async updateChatSessionStatus(sessionId: number, status: string, token?: string): Promise<void> {
    try {
      console.log('💬 API: Updating chat session status:', { sessionId, status });
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        `/sessions/${sessionId}/update/`,
        `/update_session_status/${sessionId}/`,
        `/sessions/${sessionId}/status/`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ status }),
          });
          
          if (response.ok) {
            console.log(`✅ Chat session status updated via ${endpoint}`);
            return;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          continue;
        }
      }

      console.warn('⚠️ API: Could not update chat session status');
    } catch (error) {
      console.error('❌ API: Failed to update chat session status:', error);
    }
  }

  /**
   * Update professional push token for notifications
   */
  async updateProfessionalPushToken(professionalId: number, pushToken: string, authToken?: string): Promise<void> {
    try {
      console.log('📱 API: Updating push token for professional:', professionalId);
      
      const token = authToken || await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/professional/update-push-token/${professionalId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expo_push_token: pushToken,
          token: token
        }),
      });
      
      if (response.ok) {
        console.log('✅ API: Push token updated');
      } else {
        console.warn('⚠️ API: Could not update push token');
      }
    } catch (error) {
      console.error('❌ API: Failed to update push token:', error);
    }
  }

  // =====================
  // AI PAIRING & PROFESSIONAL LOCKING METHODS - EXISTING
  // =====================

  /**
   * AI-powered professional pairing for a category
   */
  async aiPairProfessional(pairingData: AIPairingRequest): Promise<AIPairingResponse> {
    try {
      console.log('🤖 Starting AI pairing for category:', pairingData.category_name);
      
      // Try the AI pairing endpoint first
      try {
        const response = await this.post('/ai/pair-professional/', pairingData);
        console.log('✅ AI pairing successful:', response);
        return response;
      } catch (aiError) {
        console.log('❌ AI endpoint not available, using fallback algorithm:', aiError);
        
        // Fallback: Use client-side AI algorithm
        return await this.fallbackAIPairing(pairingData);
      }
    } catch (error) {
      console.error('❌ AI pairing failed:', error);
      throw new Error('Failed to find suitable professional');
    }
  }

  /**
   * Client-side fallback AI pairing algorithm
   */
  private async fallbackAIPairing(pairingData: AIPairingRequest): Promise<AIPairingResponse> {
    try {
      // Get all available professionals in this category
      const professionals = await this.getProfessionalList({ 
        category: pairingData.category_name,
        available: true,
        status: 'approved'
      });

      if (professionals.professionals.length === 0) {
        throw new Error('No available professionals in this category');
      }

      // AI Scoring Algorithm
      const scoredProfessionals = professionals.professionals.map(prof => {
        let score = 0;
        const reasoning: string[] = [];

        // 1. Rating (40% weight)
        score += (prof.average_rating || 4.0) * 10; // Convert to 0-40 scale
        reasoning.push(`Rating: ${prof.average_rating || 4.0}`);

        // 2. Response Time (25% weight)
        const responseTimeScore = this.calculateResponseTimeScore(prof.response_time || '5 min');
        score += responseTimeScore * 25;
        reasoning.push(`Response time: ${prof.response_time || '5 min'}`);

        // 3. Experience (15% weight)
        const expYears = this.extractExperience(prof.experience || '0 years');
        score += Math.min(expYears, 10) * 1.5;
        reasoning.push(`Experience: ${expYears} years`);

        // 4. Success Rate (10% weight) - based on session completion
        const successRate = this.calculateSuccessRate(prof);
        score += successRate * 10;
        reasoning.push(`Success rate: ${successRate}%`);

        // 5. Session Count (5% weight) - platform experience
        const sessionExp = Math.min((prof.total_sessions || 0) / 20, 5);
        score += sessionExp;
        reasoning.push(`Sessions completed: ${prof.total_sessions || 0}`);

        // 6. Online Status Bonus (5% weight)
        if (prof.online_status) {
          score += 5;
          reasoning.push('Currently online');
        }

        return {
          professional: prof,
          score,
          reasoning: reasoning.join(', ')
        };
      });

      // Sort by score and select the best one
      scoredProfessionals.sort((a, b) => b.score - a.score);
      const bestMatch = scoredProfessionals[0];

      console.log('🎯 AI selected professional:', {
        name: bestMatch.professional.name,
        score: bestMatch.score,
        reasoning: bestMatch.reasoning
      });

      return {
        success: true,
        professional: bestMatch.professional,
        match_score: bestMatch.score,
        reasoning: bestMatch.reasoning
      };
    } catch (error) {
      console.error('Fallback AI pairing failed:', error);
      throw error;
    }
  }

  /**
   * Calculate response time score (0-1 scale)
   */
  private calculateResponseTimeScore(responseTime: string): number {
    const timeMap: { [key: string]: number } = {
      '1 min': 1.0,
      '2 min': 0.9,
      '3 min': 0.8,
      '5 min': 0.6,
      '10 min': 0.4,
      '15+ min': 0.2
    };
    return timeMap[responseTime] || 0.5;
  }

  /**
   * Extract years from experience string
   */
  private extractExperience(experience: string): number {
    const match = experience.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Calculate success rate based on professional data
   */
  private calculateSuccessRate(professional: Professional): number {
    // Simple heuristic based on rating and session count
    const baseRate = (professional.average_rating || 4.0) * 20; // 80% for 4.0 rating
    const sessionBonus = Math.min((professional.total_sessions || 0) * 0.1, 10); // Max 10% bonus
    return Math.min(baseRate + sessionBonus, 95); // Cap at 95%
  }

  /**
   * Lock other professionals in the same category when one is selected
   */
  async lockProfessionals(lockData: ProfessionalLockRequest): Promise<{ success: boolean }> {
    try {
      console.log('🔒 Locking professionals for category:', lockData.category);
      
      // Try the professional locking endpoint
      try {
        const response = await this.post('/professionals/lock-category/', lockData);
        console.log('✅ Professionals locked successfully');
        return { success: true };
      } catch (lockError) {
        console.log('❌ Professional locking endpoint not available:', lockError);
        
        // Fallback: Update professional availability locally
        await this.updateProfessionalAvailabilityFallback(lockData.category, lockData.selected_professional_id);
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Professional locking failed:', error);
      return { success: false };
    }
  }

  /**
   * Fallback method to update professional availability
   */
  private async updateProfessionalAvailabilityFallback(category: string, selectedProfessionalId: string): Promise<void> {
    try {
      // This would typically update the backend, but for fallback we'll just log
      console.log(`🔄 Setting other ${category} professionals as unavailable`);
      console.log(`✅ Keeping professional ${selectedProfessionalId} available`);
      
      // In a real implementation, you would make API calls to update each professional's status
      // For now, we'll rely on the frontend state management
    } catch (error) {
      console.error('Error updating professional availability:', error);
    }
  }

  /**
   * Create session with AI-paired professional
   */
  async createAISession(sessionData: {
    professional_id: number;
    category_id: string;
    category_name: string;
    client_id?: number;
    session_type: 'chat' | 'call' | 'video';
    ai_match_data?: {
      match_score: number;
      reasoning: string;
    };
  }) {
    try {
      console.log('🎯 Creating AI-paired session:', sessionData);
      
      const response = await this.post('/sessions/create-ai/', sessionData);
      console.log('✅ AI session created successfully');
      return response;
    } catch (error) {
      console.error('❌ AI session creation failed:', error);
      
      // Fallback to regular session creation
      return await this.createSession({
        professional_id: sessionData.professional_id,
        client_id: sessionData.client_id,
        session_type: sessionData.session_type
      });
    }
  }

  /**
   * Get AI pairing history for a user
   */
  async getAIPairingHistory(userId?: number): Promise<any[]> {
    try {
      const endpoint = userId ? `/ai/pairing-history/?user_id=${userId}` : '/ai/pairing-history/';
      const response = await this.get(endpoint);
      return response.pairing_history || [];
    } catch (error) {
      console.error('Failed to fetch AI pairing history:', error);
      return [];
    }
  }

  // =====================
  // PROFESSIONAL STATUS METHODS - EXISTING
  // =====================

  /**
   * Update professional online status using the correct endpoint
   */
  async updateProfessionalOnlineStatus(professionalId: number, isOnline: boolean): Promise<any> {
    try {
      console.log('🔄 Updating professional online status:', { professionalId, isOnline });
      return await this.patch(`/professional/online-status/${professionalId}/`, {
        is_online: isOnline
      });
    } catch (error) {
      console.error('❌ Failed to update professional online status:', error);
      throw error;
    }
  }

  /**
   * Update professional availability using the correct endpoint
   */
  async updateProfessionalAvailability(professionalId: number, isAvailable: boolean): Promise<any> {
    try {
      console.log('🔄 Updating professional availability:', { professionalId, isAvailable });
      return await this.patch(`/professional/availability/${professionalId}/`, {
        is_available: isAvailable
      });
    } catch (error) {
      console.error('❌ Failed to update professional availability:', error);
      throw error;
    }
  }

  /**
   * Set professional online status and availability together
   */
  async setProfessionalOnline(professionalId: number, isOnline: boolean): Promise<any> {
    try {
      console.log('🎯 Setting professional online status:', { professionalId, isOnline });
      
      const onlineStatusResponse = await this.updateProfessionalOnlineStatus(professionalId, isOnline);
      const availabilityResponse = await this.updateProfessionalAvailability(professionalId, isOnline);

      return {
        success: true,
        onlineStatus: onlineStatusResponse,
        availability: availabilityResponse
      };
    } catch (error) {
      console.error('❌ Failed to set professional online status:', error);
      throw error;
    }
  }

  /**
   * Update professional profile (general updates)
   */
  async updateProfessionalProfile(professionalId: number, profileData: any): Promise<any> {
    try {
      console.log('🔄 Updating professional profile:', { professionalId, profileData });
      return await this.patch(`/professionals/${professionalId}/`, profileData);
    } catch (error) {
      console.error('❌ Failed to update professional profile:', error);
      throw error;
    }
  }

  /**
   * Legacy updateProfessionalStatus method with correct endpoints
   */
  async updateProfessionalStatus(professionalId: number, statusData: any, token?: string): Promise<any> {
    try {
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      console.log('🔄 Updating professional status for ID:', professionalId, 'Data:', statusData);

      // Use the correct endpoints that exist in your Django URLs
      const endpoints = [
        // Professional-specific endpoints (these exist based on your URL patterns)
        `/professional/online-status/${professionalId}/`,
        `/professional/availability/${professionalId}/`,
        // Generic professional update endpoint
        `/professionals/${professionalId}/`,
      ];

      let success = false;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(statusData),
          });
          
          console.log(`📡 ${endpoint} status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Professional status updated via ${endpoint}:`, data);
            success = true;
            return { success: true, data };
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found, trying next endpoint...`);
            continue;
          } else {
            const errorText = await response.text();
            console.log(`❌ ${endpoint} failed:`, response.status, errorText);
            lastError = new Error(`Server error: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          lastError = error;
          // Continue to next endpoint
        }
      }

      if (!success) {
        console.error('❌ All professional status update endpoints failed');
        throw lastError || new Error('No working professional status endpoints found');
      }

      return { success: false };
    } catch (error) {
      console.error('❌ Failed to update professional status:', error);
      return { success: false, error: error.message };
    }
  }

  async getProfessionalProfile(userId?: number, token?: string): Promise<Professional | null> {
    try {
      console.log('🔄 Fetching professional profile for user:', userId);
      
      // Use provided token or get from storage
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints to find the professional profile
      let professionalData = null;

      // Method 1: Try the professional profile endpoint
      try {
        const endpoint = userId 
          ? `/professional/profile/?user_id=${userId}`
          : '/professional/profile/';
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
        
        if (response.ok) {
          professionalData = await response.json();
          console.log('✅ Professional profile found via profile endpoint:', professionalData);
        } else {
          console.log('❌ Professional profile endpoint returned:', response.status);
        }
      } catch (error) {
        console.log('❌ Professional profile endpoint failed:', error);
      }

      // Method 2: If no data found, try to get from professionals list
      if (!professionalData) {
        try {
          const response = await fetch(`${API_BASE_URL}/professionals/`, { headers });
          if (response.ok) {
            const data = await response.json();
            // Find the professional that belongs to this user
            if (data.professionals && Array.isArray(data.professionals)) {
              const userProfessional = data.professionals.find((prof: any) => 
                prof.user_id === userId
              );
              if (userProfessional) {
                professionalData = userProfessional;
                console.log('✅ Professional found via professionals list:', professionalData);
              }
            }
          }
        } catch (error) {
          console.log('❌ Professionals list endpoint failed:', error);
        }
      }

      return professionalData;
    } catch (error) {
      console.error('❌ Failed to fetch professional profile:', error);
      return null;
    }
  }

  // =====================
  // AUTHENTICATION METHODS - EXISTING
  // =====================

  async login(username: string, password: string) {
    try {
      console.log('🔐 API Service - Attempting login...');
      const response = await this.post('/login/', { username, password });
      
      console.log('📨 API Service - Raw login response:', response);
      
      // Transform the response to match what AuthContext expects
      if (response.token && response.user) {
        const transformedResponse = {
          success: true,
          token: response.token,
          user: response.user,
          professional: response.professional || null
        };
        console.log('✅ API Service - Transformed login response:', transformedResponse);
        return transformedResponse;
      } else {
        console.log('❌ API Service - Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ API Service - Login failed:', error);
      throw error;
    }
  }

  async register(userData: any) {
    return this.post('/register/', userData);
  }

  async logout() {
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
  }

  async getCurrentUser() {
    return this.get('/user/profile/');
  }

  // =====================
  // FAVORITES METHODS - EXISTING
  // =====================

  async getFavorites(token?: string): Promise<Favorite[]> {
    try {
      console.log('❤️ API Service: Fetching favorites...');
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints with fallbacks
      const endpoints = [
        '/user/favorites/',
        '/user/favorites',
        '/favorites/',
        '/favorites'
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying favorites endpoint: ${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers,
          });
          
          console.log(`📡 ${endpoint} status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${endpoint} SUCCESS:`, data);
            
            // Handle different response structures
            if (Array.isArray(data)) {
              return data;
            } else if (data.favorites && Array.isArray(data.favorites)) {
              return data.favorites;
            } else if (data.results && Array.isArray(data.results)) {
              return data.results;
            } else {
              console.log('❓ Unexpected favorites response structure:', data);
              return [];
            }
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          } else {
            console.log(`❌ ${endpoint} failed:`, response.status);
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          // Continue to next endpoint
        }
      }

      throw new Error('No favorites endpoints found on server');
    } catch (error) {
      console.error('❌ API Service: Failed to fetch favorites:', error);
      throw error;
    }
  }

  async addToFavorites(professionalId: number, token?: string): Promise<any> {
    try {
      console.log('❤️ API Service: Adding to favorites:', professionalId);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple endpoints
      const endpoints = [
        '/user/favorites/',
        '/favorites/'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              professional_id: professionalId
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Added to favorites via ${endpoint}:`, data);
            return data;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          // Continue to next endpoint
        }
      }

      throw new Error('No add favorite endpoints found on server');
    } catch (error) {
      console.error('❌ API Service: Failed to add to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(professionalId: number, token?: string): Promise<void> {
    try {
      console.log('❤️ API Service: Removing from favorites:', professionalId);
      
      const authToken = token || await AsyncStorage.getItem('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Token ${authToken}`;
      }

      // Try multiple DELETE endpoints
      const endpoints = [
        `/user/favorites/${professionalId}/`,
        `/user/favorites/${professionalId}`,
        `/favorites/${professionalId}/`,
        `/favorites/${professionalId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers,
          });

          if (response.ok) {
            console.log(`✅ Removed from favorites via ${endpoint}`);
            return;
          } else if (response.status === 404) {
            console.log(`❌ ${endpoint} not found`);
            continue;
          }
        } catch (error) {
          console.log(`💥 ${endpoint} error:`, error.message);
          // Continue to next endpoint
        }
      }

      throw new Error('No remove favorite endpoints found on server');
    } catch (error) {
      console.error('❌ API Service: Failed to remove from favorites:', error);
      throw error;
    }
  }

  // =====================
  // SESSION & CHAT METHODS - EXISTING
  // =====================

  async createSession(sessionData: {
    professional_id: number;
    client_id?: number;
    session_type: 'chat' | 'call' | 'video';
  }) {
    try {
      const response = await this.post('/sessions/create/', sessionData);
      return response;
    } catch (error) {
      console.error('API Service Error - createSession:', error);
      throw error;
    }
  }

  async getSessionMessages(sessionId: string): Promise<{ messages: ChatMessage[] }> {
    try {
      const response = await this.get(`/sessions/${sessionId}/messages/`);
      return {
        messages: response.messages || [],
      };
    } catch (error) {
      console.error('API Service Error - getSessionMessages:', error);
      throw error;
    }
  }

  async sendMessage(messageData: {
    session_id: string;
    sender_type: 'client' | 'professional';
    message: string;
    message_type?: 'text' | 'image' | 'file';
  }) {
    try {
      const response = await this.post('/messages/send/', messageData);
      return response;
    } catch (error) {
      console.error('API Service Error - sendMessage:', error);
      throw error;
    }
  }

  async endSession(sessionId: string, sessionData: {
    duration: number;
    cost: number;
  }) {
    try {
      const response = await this.post(`/sessions/${sessionId}/end/`, sessionData);
      return response;
    } catch (error) {
      console.error('API Service Error - endSession:', error);
      throw error;
    }
  }

  async getSessionDetail(sessionId: string): Promise<Session> {
    try {
      const response = await this.get(`/sessions/${sessionId}/`);
      return response;
    } catch (error) {
      console.error('API Service Error - getSessionDetail:', error);
      throw error;
    }
  }

  // =====================
  // PROFESSIONAL METHODS - EXISTING
  // =====================

  async getProfessional(professionalId: string): Promise<Professional> {
    try {
      const response = await this.get(`/professionals/${professionalId}/`);
      return response;
    } catch (error) {
      console.error('API Service Error - getProfessional:', error);
      throw error;
    }
  }

  async getProfessionalList(params?: {
    category?: string;
    specialization?: string;
    available?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
    status?: string;
  }): Promise<{ professionals: Professional[]; count: number }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.category) queryParams.append('category', params.category);
      if (params?.specialization) queryParams.append('specialization', params.specialization);
      if (params?.available !== undefined) queryParams.append('available', params.available.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
		if (params?.status) queryParams.append('status', params.status);

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/professionals/?${queryString}` : '/professionals/';
      
      const response = await this.get(endpoint);
      return {
        professionals: response.professionals || [],
        count: response.count || 0,
      };
    } catch (error) {
      console.error('Failed to fetch professionals from database:', error);
      throw new Error('Unable to fetch professionals from server');
    }
  }

  async getProfessionalDetail(id: string): Promise<Professional> {
    try {
      const response = await this.get(`/professionals/${id}/`);
      return response;
    } catch (error) {
      console.error('Failed to fetch professional details:', error);
      throw error;
    }
  }

  async getProfessionalsByCategory(categoryId: string): Promise<Professional[]> {
    try {
      const response = await this.getProfessionalList({ category: categoryId });
      return response.professionals;
    } catch (error) {
      console.error('Failed to fetch professionals by category:', error);
      throw error;
    }
  }

  async getApprovedProfessionals(): Promise<Professional[]> {
    try {
      const response = await this.getProfessionalList({ status: 'approved', available: true });
      return response.professionals;
    } catch (error) {
      console.error('Failed to fetch approved professionals:', error);
      throw error;
    }
  }

  async getProfessionalDashboard(id: string) {
    return this.get(`/professional/dashboard/${id}/`);
  }

  async professionalSignup(professionalData: any) {
    return this.post('/professional/signup/', professionalData);
  }

  async uploadLicenseFile(formData: FormData) {
    const token = await AsyncStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/upload/license/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
      },
      body: formData,
    });
    return this.handleResponse(response);
  }

  // =====================
  // USER PROFILE METHODS - EXISTING
  // =====================

  async updateProfile(userId: number, profileData: any) {
    return this.put(`/user/${userId}/profile/`, profileData);
  }

  async uploadProfileImage(formData: FormData) {
    const token = await AsyncStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/upload/profile-image/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
      },
      body: formData,
    });
    return this.handleResponse(response);
  }

  // =====================
  // CATEGORY METHODS - EXISTING
  // =====================

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.get('/categories/');
      return response.categories || [];
    } catch (error) {
      console.error('Failed to fetch categories from database:', error);
      throw new Error('Unable to fetch categories from server');
    }
  }

  async getCategoryDetail(categoryId: string): Promise<Category> {
    try {
      const response = await this.get(`/categories/${categoryId}/`);
      return response;
    } catch (error) {
      console.error('Failed to fetch category details:', error);
      throw error;
    }
  }

  // =====================
  // FAVORITES METHODS - EXISTING
  // =====================

  async getFavoritesLegacy(): Promise<{ favorites: Professional[]; count: number }> {
    try {
      const response = await this.get('/user/favorites/');
      return {
        favorites: response.favorites || [],
        count: response.count || 0,
      };
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      throw error;
    }
  }

  async addToFavoritesLegacy(professionalId: string) {
    return this.post(`/user/favorites/${professionalId}/`, {});
  }

  async removeFromFavoritesLegacy(professionalId: string) {
    return this.delete(`/user/favorites/${professionalId}/`);
  }

  async manageFavorites(professionalId: string, action: 'add' | 'remove') {
    if (action === 'add') {
      return this.addToFavoritesLegacy(professionalId);
    } else {
      return this.removeFromFavoritesLegacy(professionalId);
    }
  }

  // =====================
  // SESSION HISTORY METHODS - EXISTING
  // =====================

  async getSessionHistory(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.get(`/sessions/history/${queryString}`);
  }

  async updateSessionStatus(sessionId: string, status: string) {
    return this.patch(`/sessions/${sessionId}/status/`, { status });
  }

  async completeSession(sessionId: string, rating?: number, review?: string) {
    return this.post(`/sessions/${sessionId}/complete/`, { rating, review });
  }

  // =====================
  // PAYMENT METHODS - EXISTING
  // =====================

  async createPayment(sessionId: string, paymentData: any) {
    return this.post(`/sessions/${sessionId}/payment/`, paymentData);
  }

  async getPaymentHistory(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.get(`/payments/history/${queryString}`);
  }

  async getPaymentDetail(paymentId: string) {
    return this.get(`/payments/${paymentId}/`);
  }

  // =====================
  // SEARCH METHODS - EXISTING
  // =====================

  async searchProfessionals(query: string, filters?: any): Promise<Professional[]> {
    try {
      const params = new URLSearchParams({ q: query, ...filters });
      const response = await this.get(`/search/professionals/?${params}`);
      return response.professionals || [];
    } catch (error) {
      console.error('Failed to search professionals:', error);
      throw error;
    }
  }

  async searchUsers(query: string, filters?: any) {
    const params = new URLSearchParams({ q: query, ...filters });
    return this.get(`/admin/search/users/?${params}`);
  }

  // =====================
  // ADMIN METHODS - EXISTING
  // =====================

  async getAdminStats() {
    return this.get('/admin/dashboard/stats/');
  }

  async getAdminRecentActivity() {
    return this.get('/admin/dashboard/recent-activity/');
  }

  async getAdminRevenueChart() {
    return this.get('/admin/dashboard/revenue-chart/');
  }

  async getAdminProfessionals(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.get(`/admin/professionals/all/${queryString}`);
  }

  async getAdminProfessionalDetail(professionalId: string) {
    return this.get(`/admin/professionals/${professionalId}/detail/`);
  }

  async approveProfessional(id: number) {
    return this.post(`/admin/professionals/${id}/approve/`, {});
  }

  async rejectProfessional(id: number, reason: string) {
    return this.post(`/admin/professionals/${id}/reject/`, { reason });
  }

  async updateProfessionalAdminStatus(id: number, status: string, data?: any) {
    return this.patch(`/admin/professionals/${id}/status/`, { status, ...data });
  }

  async getAdminCategories() {
    return this.get('/admin/categories/');
  }

  async createCategory(categoryData: any) {
    return this.post('/admin/categories/', categoryData);
  }

  async updateCategory(id: number, categoryData: any) {
    return this.post(`/admin/categories/${id}/update/`, categoryData);
  }

  async patchCategory(id: number, categoryData: any) {
    return this.patch(`/admin/categories/${id}/`, categoryData);
  }

  async deleteCategory(id: number) {
    return this.post(`/admin/categories/${id}/delete/`, {});
  }

  // =====================
  // ADMIN USER MANAGEMENT - EXISTING
  // =====================

  async getAdminUsers(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.get(`/admin/users/${queryString}`);
  }

  async getAdminUserDetail(userId: string) {
    return this.get(`/admin/users/${userId}/`);
  }

  async updateUserStatus(userId: number, status: string) {
    return this.post(`/admin/users/${userId}/status/`, { status });
  }

  async updateUserRole(userId: number, role: string) {
    return this.post(`/admin/users/${userId}/role/`, { role });
  }

  async deleteUser(userId: number) {
    return this.post(`/admin/users/${userId}/delete/`, {});
  }

  // =====================
  // ADMIN ANALYTICS - EXISTING
  // =====================

  async getAdminUserAnalytics() {
    return this.get('/admin/analytics/users/');
  }

  async getAdminSessionAnalytics() {
    return this.get('/admin/analytics/sessions/');
  }

  async getAdminFinancialAnalytics() {
    return this.get('/admin/analytics/financial/');
  }

  // =====================
  // NOTIFICATIONS - EXISTING
  // =====================

  async getNotifications() {
    return this.get('/notifications/');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.post(`/notifications/${notificationId}/read/`, {});
  }

  async markAllNotificationsAsRead() {
    return this.post('/notifications/mark-all-read/', {});
  }

  // =====================
  // ERROR HANDLING UTILS - EXISTING
  // =====================

  async handleApiError(error: any, defaultMessage = 'An error occurred') {
    if (error instanceof Error) {
      if (error.message.includes('Network request failed')) {
        throw new Error('Network error: Please check your internet connection');
      } else if (error.message.includes('401')) {
        await this.logout();
        throw new Error('Session expired. Please login again.');
      } else if (error.message.includes('403')) {
        throw new Error('Access denied. You do not have permission for this action.');
      } else if (error.message.includes('404')) {
        throw new Error('Resource not found.');
      } else if (error.message.includes('500')) {
        throw new Error('Server error. Please try again later.');
      }
    }
    throw new Error(defaultMessage);
  }

  // =====================
  // OFFLINE SUPPORT - EXISTING
  // =====================

  async cacheData(key: string, data: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData(key: string) {
    try {
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  async clearCache(key?: string) {
    try {
      if (key) {
        await AsyncStorage.removeItem(key);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith('cache_'));
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // =====================
  // REAL-TIME COMMUNICATION - EXISTING
  // =====================

  async startSessionPolling(sessionId: string, onMessage: (message: ChatMessage) => void) {
    const pollInterval = setInterval(async () => {
      try {
        const response = await this.getSessionMessages(sessionId);
        if (response.messages && response.messages.length > 0) {
          const latestMessage = response.messages[response.messages.length - 1];
          onMessage(latestMessage);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }

  // =====================
  // CALL & VIDEO SESSION MANAGEMENT - EXISTING
  // =====================

  async initiateCall(sessionId: string, callType: 'audio' | 'video') {
    return this.post(`/sessions/${sessionId}/initiate-call/`, { call_type: callType });
  }

  async endCall(sessionId: string) {
    return this.post(`/sessions/${sessionId}/end-call/`, {});
  }

  async getCallStatus(sessionId: string) {
    return this.get(`/sessions/${sessionId}/call-status/`);
  }
}

// Create a singleton instance
export const apiService = new ApiService();

// Utility function for API endpoints - UPDATED WITH CORRECT ENDPOINTS
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/login/',
  REGISTER: '/register/',
  LOGOUT: '/logout/',
  
  // User
  USER_PROFILE: '/user/profile/',
  USER_FAVORITES: '/user/favorites/',
  MANAGE_FAVORITES: '/user/favorites/:id/',
  
  // Professional - CORRECTED ENDPOINTS
  PROFESSIONALS: '/professionals/',
  PROFESSIONAL_DETAIL: '/professionals/:id/',
  PROFESSIONAL_DASHBOARD: '/professional/dashboard/:id/',
  PROFESSIONAL_PROFILE: '/professional/profile/',
  PROFESSIONAL_ONLINE_STATUS: '/professional/online-status/:id/',
  PROFESSIONAL_AVAILABILITY: '/professional/availability/:id/',
  
  // AI Pairing - NEW
  AI_PAIR_PROFESSIONAL: '/ai/pair-professional/',
  AI_PAIRING_HISTORY: '/ai/pairing-history/',
  PROFESSIONALS_LOCK_CATEGORY: '/professionals/lock-category/',
  SESSIONS_CREATE_AI: '/sessions/create-ai/',
  
  // Sessions & Chat
  SESSIONS_CREATE: '/sessions/create/',
  SESSIONS_HISTORY: '/sessions/history/',
  SESSION_DETAIL: '/sessions/:id/',
  SESSION_END: '/sessions/:id/end/',
  SESSION_MESSAGES: '/sessions/:id/messages/',
  MESSAGES_SEND: '/messages/send/',
  
  // NEW: Chat specific endpoints
  CLIENT_SESSIONS: '/client/sessions/',
  CHAT_SESSIONS: '/chat_sessions/',
  CHAT_MESSAGES: '/chat_messages/',
  CHAT_MESSAGES_SEND: '/chat_messages/send/',
  MESSAGES_MARK_READ: '/messages/mark_read/',
  
  // Categories
  CATEGORIES: '/categories/',
  
  // Admin
  ADMIN_STATS: '/admin/dashboard/stats/',
  ADMIN_ACTIVITY: '/admin/dashboard/recent-activity/',
  ADMIN_REVENUE: '/admin/dashboard/revenue-chart/',
  ADMIN_PROFESSIONALS_ALL: '/admin/professionals/all/',
  ADMIN_PROFESSIONALS_PENDING: '/admin/professionals/pending/',
  ADMIN_PROFESSIONAL_DETAIL: '/admin/professionals/:id/detail/',
  ADMIN_PROFESSIONAL_APPROVE: '/admin/professionals/:id/approve/',
  ADMIN_PROFESSIONAL_REJECT: '/admin/professionals/:id/reject/',
  ADMIN_CATEGORIES: '/admin/categories/',
  ADMIN_CATEGORY_UPDATE: '/admin/categories/:id/update/',
  ADMIN_CATEGORY_DELETE: '/admin/categories/:id/delete/',
  ADMIN_USERS: '/admin/users/',
  ADMIN_USER_DETAIL: '/admin/users/:id/',
  ADMIN_USER_STATUS: '/admin/users/:id/status/',
  ADMIN_USER_ROLE: '/admin/users/:id/role/',
  ADMIN_USER_DELETE: '/admin/users/:id/delete/',
  ADMIN_ANALYTICS_USERS: '/admin/analytics/users/',
  ADMIN_ANALYTICS_SESSIONS: '/admin/analytics/sessions/',
  ADMIN_ANALYTICS_FINANCIAL: '/admin/analytics/financial/',
  
  // Upload
  UPLOAD_PROFILE_IMAGE: '/upload/profile-image/',
  UPLOAD_LICENSE: '/upload/license/',
  
  // Debug
  DEBUG_PROFESSIONALS: '/debug/professionals-direct/',
  
  // Push Notifications
  UPDATE_PUSH_TOKEN: '/professional/update-push-token/:id/',
};

// Custom hook for API calls
export const useApi = () => {
  return apiService;
};

export default apiService;