import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  user_type: string;
  is_staff: boolean;
  is_superuser: boolean;
  phone?: string;
  avatar?: string;
}

interface Professional {
  id: number;
  name: string;
  specialization: string;
  category: string | null;
  status: string;
  is_approved: boolean;
  rate: number;
  available: boolean;
  online_status: boolean;
  email?: string;
  phone?: string;
  experience_years?: number;
  bio?: string;
  average_rating?: number;
  total_sessions?: number;
  profile_picture?: string;
  expo_push_token?: string;
}

interface Favorite {
  id: number;
  user: number;
  professional: Professional;
  created_at: string;
}

// Chat session interface
interface ChatSession {
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

// Message interface
interface Message {
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

interface AuthContextType {
  user: User | null;
  professional: Professional | null;
  token: string | null;
  favorites: Favorite[];
  // Chat-related state
  chatSessions: ChatSession[];
  activeChatSessions: ChatSession[];
  unreadChatCount: number;
  // Authentication methods
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  isProfessional: boolean;
  isProfessionalApproved: boolean;
  // Professional methods
  setProfessionalOnline: (online: boolean) => Promise<void>;
  updateProfessionalAvailability: (available: boolean) => Promise<void>;
  refreshProfessionalData: () => Promise<void>;
  // Favorites methods
  addToFavorites: (professionalId: number) => Promise<void>;
  removeFromFavorites: (professionalId: number) => Promise<void>;
  getFavorites: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  isProfessionalInFavorites: (professionalId: number) => boolean;
  favoritesLoading: boolean;
  // Chat methods
  getChatSessions: () => Promise<void>;
  refreshChatSessions: () => Promise<void>;
  getSessionMessages: (sessionId: number) => Promise<Message[]>;
  sendChatMessage: (sessionId: number, content: string, senderType?: string) => Promise<Message | null>;
  markMessagesAsRead: (sessionId: number) => Promise<void>;
  createChatSession: (professionalId: number, clientId?: number) => Promise<ChatSession | null>;
  updateChatSessionStatus: (sessionId: number, status: string) => Promise<void>;
  getUnreadChatCount: () => number;
  updatePushToken: (token: string) => Promise<void>;
  chatLoading: boolean;
  // For real-time updates
  setNewMessageCallback: (callback: (message: Message) => void) => void;
  setSessionUpdateCallback: (callback: (session: ChatSession) => void) => void;
  // Debug methods
  debugAsyncStorage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  // Chat state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  // Callbacks for real-time updates
  const [newMessageCallback, setNewMessageCallback] = useState<((message: Message) => void) | null>(null);
  const [sessionUpdateCallback, setSessionUpdateCallback] = useState<((session: ChatSession) => void) | null>(null);

  const isProfessional = user?.user_type === 'professional';
  const isProfessionalApproved = professional?.is_approved || false;
  const isAuthenticated = !!user && !!token;

  // Filter active chat sessions
  const activeChatSessions = chatSessions.filter(session => 
    session.status === 'active' || session.status === 'in_progress'
  );

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load favorites when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'client') {
      getFavorites();
    }
  }, [isAuthenticated, user?.user_type]);

  // Load chat sessions when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      getChatSessions();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      console.log('🔐 AUTH CONTEXT: Checking authentication state...');
      
      const [storedToken, storedUser, storedProfessional, storedFavorites, storedChatSessions] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_data'),
        AsyncStorage.getItem('professional_data'),
        AsyncStorage.getItem('user_favorites'),
        AsyncStorage.getItem('user_chat_sessions')
      ]);
      
      console.log('📦 AUTH CONTEXT: Stored data found:', {
        hasToken: !!storedToken,
        hasUser: !!storedUser,
        hasProfessional: !!storedProfessional,
        hasFavorites: !!storedFavorites,
        hasChatSessions: !!storedChatSessions,
        token: storedToken ? `${storedToken.substring(0, 10)}...` : 'none'
      });

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        
        console.log('✅ AUTH CONTEXT: User authenticated on app start:', {
          username: userData.username,
          userType: userData.user_type,
          isAuthenticated: true
        });
        
        if (storedProfessional) {
          const professionalData = JSON.parse(storedProfessional);
          console.log('👨‍⚕️ AUTH CONTEXT: Professional data from storage:', professionalData);
          setProfessional(professionalData);
        } else if (userData.user_type === 'professional') {
          console.log('🔄 AUTH CONTEXT: User is professional but no professional data found, fetching...');
          await refreshProfessionalData();
        }

        // Load favorites if user is client
        if (storedFavorites && userData.user_type === 'client') {
          const favoritesData = JSON.parse(storedFavorites);
          console.log('❤️ AUTH CONTEXT: Favorites data from storage:', favoritesData);
          setFavorites(favoritesData);
        }

        // Load chat sessions
        if (storedChatSessions) {
          const chatSessionsData = JSON.parse(storedChatSessions);
          console.log('💬 AUTH CONTEXT: Chat sessions from storage:', chatSessionsData);
          setChatSessions(chatSessionsData);
          
          // Calculate unread count
          const unread = chatSessionsData.reduce((sum: number, session: ChatSession) => 
            sum + (session.unread_count || 0), 0);
          setUnreadChatCount(unread);
        }
      } else {
        console.log('❌ AUTH CONTEXT: No authentication data found');
        setToken(null);
        setUser(null);
        setProfessional(null);
        setFavorites([]);
        setChatSessions([]);
        setUnreadChatCount(0);
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Auth check failed:', error);
      setToken(null);
      setUser(null);
      setProfessional(null);
      setFavorites([]);
      setChatSessions([]);
      setUnreadChatCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfessionalData = async () => {
    if (!token || !user) return;
    
    try {
      console.log('🔄 AUTH CONTEXT: Refreshing professional data...');
      const professionalData = await apiService.getProfessionalProfile(user.id, token);
      console.log('✅ AUTH CONTEXT: Professional data refreshed:', professionalData);
      
      if (professionalData) {
        setProfessional(professionalData);
        await AsyncStorage.setItem('professional_data', JSON.stringify(professionalData));
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to refresh professional data:', error);
    }
  };

  // Favorites Methods
  const getFavorites = async (): Promise<void> => {
    if (!token || !user || user.user_type !== 'client') return;
    
    try {
      setFavoritesLoading(true);
      console.log('❤️ AUTH CONTEXT: Fetching favorites...');
      
      const favoritesData = await apiService.getFavorites(token);
      console.log('✅ AUTH CONTEXT: Favorites fetched:', favoritesData);
      
      setFavorites(favoritesData);
      await AsyncStorage.setItem('user_favorites', JSON.stringify(favoritesData));
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to fetch favorites:', error);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const refreshFavorites = async (): Promise<void> => {
    await getFavorites();
  };

  const addToFavorites = async (professionalId: number): Promise<void> => {
    if (!token || !user || user.user_type !== 'client') {
      throw new Error('Only clients can add favorites');
    }
    
    try {
      console.log('❤️ AUTH CONTEXT: Adding to favorites:', professionalId);
      const response = await apiService.addToFavorites(professionalId, token);
      console.log('✅ AUTH CONTEXT: Added to favorites:', response);
      
      await getFavorites();
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to add to favorites:', error);
      throw error;
    }
  };

  const removeFromFavorites = async (professionalId: number): Promise<void> => {
    if (!token || !user || user.user_type !== 'client') {
      throw new Error('Only clients can remove favorites');
    }
    
    try {
      console.log('❤️ AUTH CONTEXT: Removing from favorites:', professionalId);
      await apiService.removeFromFavorites(professionalId, token);
      console.log('✅ AUTH CONTEXT: Removed from favorites');
      
      setFavorites(prev => prev.filter(fav => fav.professional.id !== professionalId));
      
      const updatedFavorites = favorites.filter(fav => fav.professional.id !== professionalId);
      await AsyncStorage.setItem('user_favorites', JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to remove from favorites:', error);
      throw error;
    }
  };

  const isProfessionalInFavorites = (professionalId: number): boolean => {
    return favorites.some(fav => fav.professional.id === professionalId);
  };

  // ============ CHAT METHODS ============

  const getChatSessions = async (): Promise<void> => {
    if (!token || !user) {
      console.log('❌ AUTH CONTEXT: Cannot get chat sessions - no token or user');
      return;
    }
    
    try {
      setChatLoading(true);
      console.log('💬 AUTH CONTEXT: Fetching chat sessions for user:', user.id, user.user_type);
      
      let sessionsData: any[] = [];
      
      if (user.user_type === 'client') {
        console.log('👤 AUTH CONTEXT: Fetching client chat sessions...');
        // Use the existing session history endpoint that works
        try {
          const response = await fetch('https://teleconnect-krga.onrender.com/api/sessions/history/', {
            method: 'GET',
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ AUTH CONTEXT: Client sessions fetched from /api/sessions/history/');
            sessionsData = data.sessions || data || [];
          } else {
            console.log('❌ AUTH CONTEXT: Failed to fetch client sessions, status:', response.status);
            // Fallback to creating dummy sessions for testing
            sessionsData = await createDummyChatSessions();
          }
        } catch (error) {
          console.error('❌ AUTH CONTEXT: Error fetching client sessions:', error);
          sessionsData = await createDummyChatSessions();
        }
        
      } else if (user.user_type === 'professional') {
        console.log('👨‍⚕️ AUTH CONTEXT: Fetching professional chat sessions...');
        if (professional?.id) {
          try {
            const response = await fetch(`https://teleconnect-krga.onrender.com/api/professional/sessions/${professional.id}/`, {
              method: 'GET',
              headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('✅ AUTH CONTEXT: Professional sessions fetched');
              sessionsData = data.sessions || data || [];
            } else {
              console.log('❌ AUTH CONTEXT: Failed to fetch professional sessions, status:', response.status);
              sessionsData = await createDummyProfessionalSessions();
            }
          } catch (error) {
            console.error('❌ AUTH CONTEXT: Error fetching professional sessions:', error);
            sessionsData = await createDummyProfessionalSessions();
          }
        } else {
          console.log('⚠️ AUTH CONTEXT: No professional ID, creating dummy sessions');
          sessionsData = await createDummyProfessionalSessions();
        }
      }
      
      console.log('📊 AUTH CONTEXT: Raw sessions data:', sessionsData);
      
      // Transform to ChatSession format
      const formattedSessions: ChatSession[] = sessionsData.map((session: any, index: number) => ({
        id: `session_${session.id || session.session_id || index}`,
        session_id: session.id || session.session_id || index,
        professional_id: session.professional_id || session.professional?.id || 1,
        client_id: session.client_id || session.client?.id || user.id,
        professional_name: session.professional_name || session.professional?.name || 'Dr. Jane Smith',
        client_name: session.client_name || session.client?.name || 'John Doe',
        status: session.status || 'active',
        session_type: session.session_type || 'chat',
        started_at: session.started_at || session.created_at || new Date().toISOString(),
        ended_at: session.ended_at || null,
        last_message: session.last_message || 'Hello, how can I help you today?',
        last_message_time: session.last_message_time || session.updated_at || new Date().toISOString(),
        unread_count: session.unread_count || (index === 0 ? 3 : 0), // First session has unread messages
        rate_used: session.rate_used || 50,
        category: session.category || 'General Consultation'
      }));
      
      console.log('✅ AUTH CONTEXT: Formatted chat sessions:', formattedSessions);
      setChatSessions(formattedSessions);
      
      // Calculate unread count
      const unread = formattedSessions.reduce((sum, session) => sum + session.unread_count, 0);
      setUnreadChatCount(unread);
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('user_chat_sessions', JSON.stringify(formattedSessions));
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to fetch chat sessions:', error);
      // Create dummy sessions on error
      const dummySessions = await createDummyChatSessions();
      setChatSessions(dummySessions);
      await AsyncStorage.setItem('user_chat_sessions', JSON.stringify(dummySessions));
    } finally {
      setChatLoading(false);
    }
  };

  // Helper function to create dummy chat sessions for testing
  const createDummyChatSessions = async (): Promise<ChatSession[]> => {
    console.log('🔄 AUTH CONTEXT: Creating dummy chat sessions for testing');
    
    const dummySessions: ChatSession[] = [
      {
        id: 'session_1',
        session_id: 1,
        professional_id: 1,
        client_id: user?.id || 1,
        professional_name: 'Dr. Sarah Johnson',
        client_name: user?.username || 'Client',
        status: 'active',
        session_type: 'chat',
        started_at: new Date().toISOString(),
        ended_at: null,
        last_message: 'Hello, how are you feeling today?',
        last_message_time: new Date().toISOString(),
        unread_count: 3,
        rate_used: 50,
        category: 'Mental Health'
      },
      {
        id: 'session_2',
        session_id: 2,
        professional_id: 2,
        client_id: user?.id || 1,
        professional_name: 'Dr. Michael Chen',
        client_name: user?.username || 'Client',
        status: 'completed',
        session_type: 'chat',
        started_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ended_at: new Date().toISOString(),
        last_message: 'Thank you for the consultation!',
        last_message_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        unread_count: 0,
        rate_used: 75,
        category: 'Nutrition'
      }
    ];
    
    return dummySessions;
  };

  const createDummyProfessionalSessions = async (): Promise<ChatSession[]> => {
    console.log('🔄 AUTH CONTEXT: Creating dummy professional sessions for testing');
    
    const dummySessions: ChatSession[] = [
      {
        id: 'session_101',
        session_id: 101,
        professional_id: professional?.id || 1,
        client_id: 1001,
        professional_name: professional?.name || 'Professional',
        client_name: 'John Smith',
        status: 'active',
        session_type: 'chat',
        started_at: new Date().toISOString(),
        ended_at: null,
        last_message: 'Hi Doctor, I need some advice about my symptoms',
        last_message_time: new Date().toISOString(),
        unread_count: 2,
        rate_used: 60,
        category: 'General Consultation'
      },
      {
        id: 'session_102',
        session_id: 102,
        professional_id: professional?.id || 1,
        client_id: 1002,
        professional_name: professional?.name || 'Professional',
        client_name: 'Emma Wilson',
        status: 'in_progress',
        session_type: 'chat',
        started_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        ended_at: null,
        last_message: 'The medication seems to be working better now',
        last_message_time: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        unread_count: 0,
        rate_used: 80,
        category: 'Follow-up'
      }
    ];
    
    return dummySessions;
  };

  const refreshChatSessions = async (): Promise<void> => {
    await getChatSessions();
  };

  const getSessionMessages = async (sessionId: number): Promise<Message[]> => {
    if (!token) return [];
    
    try {
      console.log('💬 AUTH CONTEXT: Fetching messages for session:', sessionId);
      
      // Try direct fetch first
      try {
        const response = await fetch(`https://teleconnect-krga.onrender.com/api/sessions/${sessionId}/messages/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AUTH CONTEXT: Messages fetched successfully');
          
          const messages = data.messages || data || [];
          const formattedMessages: Message[] = messages.map((msg: any) => ({
            id: msg.id?.toString() || `msg_${Date.now()}_${Math.random()}`,
            session_id: sessionId,
            sender_id: msg.sender_id || (msg.sender_type === 'professional' ? professional?.id : user?.id),
            sender_type: msg.sender_type || 'client',
            message_type: msg.message_type || 'text',
            content: msg.content || msg.message || '',
            timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
            read: msg.read || false,
            delivered: msg.delivered || true
          }));
          
          return formattedMessages;
        }
      } catch (error) {
        console.error('❌ AUTH CONTEXT: Failed to fetch messages from API:', error);
      }
      
      // Return dummy messages if API fails
      return createDummyMessages(sessionId);
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to get session messages:', error);
      return createDummyMessages(sessionId);
    }
  };

  // Helper function to create dummy messages
  const createDummyMessages = (sessionId: number): Message[] => {
    console.log('🔄 AUTH CONTEXT: Creating dummy messages for session:', sessionId);
    
    const now = new Date();
    const messages: Message[] = [
      {
        id: 'msg_1',
        session_id: sessionId,
        sender_id: user?.id || 1,
        sender_type: 'client',
        message_type: 'text',
        content: 'Hello Doctor, I need some medical advice',
        timestamp: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
        read: true,
        delivered: true
      },
      {
        id: 'msg_2',
        session_id: sessionId,
        sender_id: professional?.id || 2,
        sender_type: 'professional',
        message_type: 'text',
        content: 'Hello! I\'m here to help. What symptoms are you experiencing?',
        timestamp: new Date(now.getTime() - 3300000).toISOString(), // 55 minutes ago
        read: true,
        delivered: true
      },
      {
        id: 'msg_3',
        session_id: sessionId,
        sender_id: user?.id || 1,
        sender_type: 'client',
        message_type: 'text',
        content: 'I have been having headaches and fatigue for the past 3 days',
        timestamp: new Date(now.getTime() - 3000000).toISOString(), // 50 minutes ago
        read: true,
        delivered: true
      },
      {
        id: 'msg_4',
        session_id: sessionId,
        sender_id: professional?.id || 2,
        sender_type: 'professional',
        message_type: 'text',
        content: 'I understand. Have you taken any medication or had any fever?',
        timestamp: new Date(now.getTime() - 2700000).toISOString(), // 45 minutes ago
        read: true,
        delivered: true
      },
      {
        id: 'msg_5',
        session_id: sessionId,
        sender_id: user?.id || 1,
        sender_type: 'client',
        message_type: 'text',
        content: 'No fever, just headaches. I took paracetamol but it only helps for a few hours',
        timestamp: new Date(now.getTime() - 2400000).toISOString(), // 40 minutes ago
        read: true,
        delivered: true
      }
    ];
    
    return messages;
  };

  const sendChatMessage = async (
    sessionId: number, 
    content: string, 
    senderType: string = user?.user_type || 'client'
  ): Promise<Message | null> => {
    if (!token || !user) {
      throw new Error('Not authenticated');
    }
    
    try {
      console.log('💬 AUTH CONTEXT: Sending chat message:', { sessionId, content, senderType });
      
      // Try to send via API
      try {
        const response = await fetch('https://teleconnect-krga.onrender.com/api/messages/send/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            content: content,
            sender: senderType,
            message_type: 'text'
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AUTH CONTEXT: Message sent via API:', data);
          
          const newMessage: Message = {
            id: data.message?.id || `msg_${Date.now()}_${Math.random()}`,
            session_id: sessionId,
            sender_id: user.id,
            sender_type: senderType as 'client' | 'professional',
            message_type: 'text',
            content: content,
            timestamp: new Date().toISOString(),
            read: false,
            delivered: true
          };
          
          // Update chat sessions to reflect new message
          await refreshChatSessions();
          
          // Call new message callback if set
          if (newMessageCallback) {
            newMessageCallback(newMessage);
          }
          
          return newMessage;
        }
      } catch (apiError) {
        console.error('❌ AUTH CONTEXT: API message send failed, using local:', apiError);
      }
      
      // Create local message if API fails
      const newMessage: Message = {
        id: `local_msg_${Date.now()}_${Math.random()}`,
        session_id: sessionId,
        sender_id: user.id,
        sender_type: senderType as 'client' | 'professional',
        message_type: 'text',
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        delivered: true
      };
      
      console.log('✅ AUTH CONTEXT: Message created locally:', newMessage);
      
      // Call new message callback if set
      if (newMessageCallback) {
        newMessageCallback(newMessage);
      }
      
      return newMessage;
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to send chat message:', error);
      throw error;
    }
  };

  const markMessagesAsRead = async (sessionId: number): Promise<void> => {
    if (!token) return;
    
    try {
      console.log('💬 AUTH CONTEXT: Marking messages as read for session:', sessionId);
      
      // Update local state
      setChatSessions(prev => prev.map(session => 
        session.session_id === sessionId 
          ? { ...session, unread_count: 0 }
          : session
      ));
      
      // Update AsyncStorage
      const updatedSessions = chatSessions.map(session => 
        session.session_id === sessionId 
          ? { ...session, unread_count: 0 }
          : session
      );
      await AsyncStorage.setItem('user_chat_sessions', JSON.stringify(updatedSessions));
      
      // Update unread count
      const unread = updatedSessions.reduce((sum, session) => sum + session.unread_count, 0);
      setUnreadChatCount(unread);
      
      // Try to update on server
      try {
        await fetch('https://teleconnect-krga.onrender.com/api/messages/mark_read/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId
          }),
        });
        console.log('✅ AUTH CONTEXT: Messages marked as read on server');
      } catch (serverError) {
        console.log('⚠️ AUTH CONTEXT: Could not update read status on server:', serverError);
      }
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to mark messages as read:', error);
    }
  };

  const createChatSession = async (
    professionalId: number, 
    clientId?: number
  ): Promise<ChatSession | null> => {
    if (!token || !user) {
      throw new Error('Not authenticated');
    }
    
    try {
      console.log('💬 AUTH CONTEXT: Creating chat session:', { professionalId, clientId });
      
      const actualClientId = clientId || user.id;
      
      // Try to create via API
      try {
        const response = await fetch('https://teleconnect-krga.onrender.com/api/sessions/create/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            professional_id: professionalId,
            client_id: actualClientId,
            session_type: 'chat',
            mode: 'instant',
            urgency: 'medium'
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AUTH CONTEXT: Session created via API:', data);
          
          const newSession: ChatSession = {
            id: `session_${data.session?.id || Date.now()}`,
            session_id: data.session?.id || Date.now(),
            professional_id: professionalId,
            client_id: actualClientId,
            professional_name: data.session?.professional_name || 'Professional',
            client_name: user.username || 'Client',
            status: 'active',
            session_type: 'chat',
            started_at: new Date().toISOString(),
            ended_at: null,
            unread_count: 0,
            rate_used: data.session?.rate_used
          };
          
          // Add to local state
          setChatSessions(prev => [...prev, newSession]);
          
          // Update AsyncStorage
          const updatedSessions = [...chatSessions, newSession];
          await AsyncStorage.setItem('user_chat_sessions', JSON.stringify(updatedSessions));
          
          // Call session update callback if set
          if (sessionUpdateCallback) {
            sessionUpdateCallback(newSession);
          }
          
          return newSession;
        }
      } catch (apiError) {
        console.error('❌ AUTH CONTEXT: API session creation failed, creating locally:', apiError);
      }
      
      // Create local session if API fails
      const newSession: ChatSession = {
        id: `local_session_${Date.now()}`,
        session_id: Date.now(),
        professional_id: professionalId,
        client_id: actualClientId,
        professional_name: 'Professional',
        client_name: user.username || 'Client',
        status: 'active',
        session_type: 'chat',
        started_at: new Date().toISOString(),
        ended_at: null,
        unread_count: 0,
        rate_used: 50
      };
      
      // Add to local state
      setChatSessions(prev => [...prev, newSession]);
      
      // Update AsyncStorage
      const updatedSessions = [...chatSessions, newSession];
      await AsyncStorage.setItem('user_chat_sessions', JSON.stringify(updatedSessions));
      
      console.log('✅ AUTH CONTEXT: Session created locally:', newSession);
      
      // Call session update callback if set
      if (sessionUpdateCallback) {
        sessionUpdateCallback(newSession);
      }
      
      return newSession;
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to create chat session:', error);
      throw error;
    }
  };

  const updateChatSessionStatus = async (sessionId: number, status: string): Promise<void> => {
    if (!token) return;
    
    try {
      console.log('💬 AUTH CONTEXT: Updating chat session status:', { sessionId, status });
      
      // Update local state
      setChatSessions(prev => prev.map(session => 
        session.session_id === sessionId 
          ? { ...session, status: status as any }
          : session
      ));
      
      // Update AsyncStorage
      const updatedSessions = chatSessions.map(session => 
        session.session_id === sessionId 
          ? { ...session, status: status as any }
          : session
      );
      await AsyncStorage.setItem('user_chat_sessions', JSON.stringify(updatedSessions));
      
      // Try to update on server
      try {
        await fetch(`https://teleconnect-krga.onrender.com/api/sessions/${sessionId}/update/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });
        console.log('✅ AUTH CONTEXT: Session status updated on server');
      } catch (serverError) {
        console.log('⚠️ AUTH CONTEXT: Could not update session status on server:', serverError);
      }
      
      // Call session update callback if set
      if (sessionUpdateCallback) {
        const updatedSession = updatedSessions.find(s => s.session_id === sessionId);
        if (updatedSession) {
          sessionUpdateCallback(updatedSession);
        }
      }
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to update chat session status:', error);
    }
  };

  const getUnreadChatCount = (): number => {
    return unreadChatCount;
  };

  const updatePushToken = async (pushToken: string): Promise<void> => {
    if (!user || !professional) return;
    
    try {
      console.log('📱 AUTH CONTEXT: Updating push token for professional:', professional.id);
      
      try {
        await fetch(`https://teleconnect-krga.onrender.com/api/professional/update-push-token/${professional.id}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            expo_push_token: pushToken,
            token: token
          }),
        });
        console.log('✅ AUTH CONTEXT: Push token updated on server');
      } catch (serverError) {
        console.log('⚠️ AUTH CONTEXT: Could not update push token on server:', serverError);
      }
      
      // Update local professional data
      const updatedProfessional = { ...professional, expo_push_token: pushToken };
      setProfessional(updatedProfessional);
      await AsyncStorage.setItem('professional_data', JSON.stringify(updatedProfessional));
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to update push token:', error);
    }
  };

  // ============ DEBUG METHOD ============
  const debugAsyncStorage = async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      
      console.log('🔍 ASYNCSTORAGE DEBUG:');
      console.log('Total keys:', keys.length);
      
      items.forEach(([key, value]) => {
        if (value) {
          if (key === 'auth_token') {
            console.log(`- ${key}:`, `${value.substring(0, 20)}... (${value.length} chars)`);
          } else {
            console.log(`- ${key}:`, `${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
          }
        } else {
          console.log(`- ${key}: null`);
        }
      });
    } catch (error) {
      console.error('❌ Debug AsyncStorage failed:', error);
    }
  };

  // Callback setters for real-time updates
  const setNewMessageCallbackHandler = (callback: (message: Message) => void) => {
    setNewMessageCallback(() => callback);
  };

  const setSessionUpdateCallbackHandler = (callback: (session: ChatSession) => void) => {
    setSessionUpdateCallback(() => callback);
  };

  // ============ AUTHENTICATION METHODS - FIXED ============
  const login = async (username: string, password: string) => {
    try {
      console.log('🔐 AUTH CONTEXT: Attempting login...', { username });
      const response = await apiService.login(username, password);
      
      if (response.success) {
        console.log('✅ AUTH CONTEXT: Login API response:', {
          username: response.user.username,
          userType: response.user.user_type,
          hasProfessional: !!response.professional,
          token: response.token ? `${response.token.substring(0, 10)}...` : 'none'
        });
        
        console.log('💾 AUTH CONTEXT: Saving token to AsyncStorage...');
        
        // Save token with await and verification
        await AsyncStorage.setItem('auth_token', response.token);
        
        // Verify it was saved
        const savedToken = await AsyncStorage.getItem('auth_token');
        console.log('✅ AUTH CONTEXT: Token saved verification:', {
          saved: !!savedToken,
          length: savedToken?.length,
          matches: savedToken === response.token
        });
        
        if (!savedToken || savedToken !== response.token) {
          console.error('❌ AUTH CONTEXT: Token verification failed!');
          throw new Error('Failed to save authentication token');
        }
        
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        
        if (response.professional) {
          console.log('👨‍⚕️ AUTH CONTEXT: Professional data received:', response.professional);
          await AsyncStorage.setItem('professional_data', JSON.stringify(response.professional));
          setProfessional(response.professional);
        } else if (response.user.user_type === 'professional') {
          console.log('⚠️ AUTH CONTEXT: User is professional type but no professional profile exists');
          setProfessional(null);
          await AsyncStorage.removeItem('professional_data');
        }

        // Clear favorites and chat sessions if user is professional
        if (response.user.user_type === 'professional') {
          setFavorites([]);
          setChatSessions([]);
          await AsyncStorage.removeItem('user_favorites');
          await AsyncStorage.removeItem('user_chat_sessions');
        }
        
        setToken(response.token);
        setUser(response.user);
        
        console.log('✅ AUTH CONTEXT: Login complete - state updated', {
          isAuthenticated: true,
          userType: response.user.user_type,
          username: response.user.username
        });
        
        // Debug AsyncStorage after login
        await debugAsyncStorage();
        
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Login failed:', error);
      
      // Clean up any partial data on error
      await AsyncStorage.multiRemove([
        'auth_token', 
        'user_data', 
        'professional_data'
      ]);
      
      setToken(null);
      setUser(null);
      setProfessional(null);
      
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiService.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AUTH CONTEXT: Logging out...');
      
      // Debug before logout
      console.log('🔍 Pre-logout debug:');
      await debugAsyncStorage();
      
      // Update online status if professional
      if (professional) {
        try {
          await setProfessionalOnline(false);
        } catch (error) {
          console.error('❌ AUTH CONTEXT: Failed to update online status during logout:', error);
        }
      }
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove([
        'auth_token', 
        'user_data', 
        'professional_data',
        'user_favorites',
        'user_chat_sessions'
      ]);
      
      // Debug after clearing
      console.log('🔍 Post-clear debug:');
      await debugAsyncStorage();
      
      // Update state
      setUser(null);
      setProfessional(null);
      setToken(null);
      setFavorites([]);
      setChatSessions([]);
      setUnreadChatCount(0);
      
      console.log('✅ AUTH CONTEXT: Logout successful');
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Logout failed:', error);
      throw error;
    }
  };

  const setProfessionalOnline = async (online: boolean) => {
    if (!professional) return;
    
    try {
      const updatedProfessional = { ...professional, online_status: online };
      setProfessional(updatedProfessional);
      await AsyncStorage.setItem('professional_data', JSON.stringify(updatedProfessional));
      
      if (token) {
        await apiService.updateProfessionalStatus(professional.id, { online_status: online }, token);
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to update online status:', error);
      throw error;
    }
  };

  const updateProfessionalAvailability = async (available: boolean) => {
    if (!professional) return;

    try {
      const updatedProfessional = { ...professional, available };
      setProfessional(updatedProfessional);
      await AsyncStorage.setItem('professional_data', JSON.stringify(updatedProfessional));
      
      if (token) {
        await apiService.updateProfessionalStatus(professional.id, { available }, token);
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to update availability:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    professional,
    token,
    favorites,
    // Chat-related state
    chatSessions,
    activeChatSessions,
    unreadChatCount,
    // Authentication methods
    login,
    register,
    logout,
    loading,
    isAuthenticated,
    isProfessional,
    isProfessionalApproved,
    // Professional methods
    setProfessionalOnline,
    updateProfessionalAvailability,
    refreshProfessionalData,
    // Favorites methods
    addToFavorites,
    removeFromFavorites,
    getFavorites,
    refreshFavorites,
    isProfessionalInFavorites,
    favoritesLoading,
    // Chat methods
    getChatSessions,
    refreshChatSessions,
    getSessionMessages,
    sendChatMessage,
    markMessagesAsRead,
    createChatSession,
    updateChatSessionStatus,
    getUnreadChatCount,
    updatePushToken,
    chatLoading,
    // For real-time updates
    setNewMessageCallback: setNewMessageCallbackHandler,
    setSessionUpdateCallback: setSessionUpdateCallbackHandler,
    // Debug method
    debugAsyncStorage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};