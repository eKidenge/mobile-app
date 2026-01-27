import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* --- Types based on your API response --- */
interface Professional {
  id: number;
  name: string;
  specialization: string;
  rate: number;
  available: boolean;
  online_status: boolean;
  category: string;
  primary_category?: { id: number; name: string; };
  average_rating: number;
  total_sessions: number;
  experience_years: number;
  email?: string;
  phone?: string;
  is_favorite?: boolean;
  avg_response_time?: string;
  current_sessions?: number; // Add this for load balancing
  last_assigned?: string; // Timestamp of last assignment
}

interface ApiResponse {
  professionals: Professional[];
  count: number;
}

/* --- Load Balancing Config --- */
const LOAD_BALANCING_CONFIG = {
  MAX_SESSIONS_PER_PRO: 5, // Maximum sessions a professional should handle concurrently
  COOLDOWN_MINUTES: 30, // Minimum time before assigning same professional again
  PRIORITY_WEIGHTS: {
    ONLINE: 50,
    AVAILABLE: 30,
    LOW_LOAD: 20,
    RECENTLY_AVAILABLE: 10,
    EXPERIENCE: 5
  }
};

/* --- Component --- */
export default function AlgorithmMatch() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [matchedProfessional, setMatchedProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [professionalsList, setProfessionalsList] = useState<Professional[]>([]);
  const [algorithmDebug, setAlgorithmDebug] = useState<string>('');
  
  // Store session history for round-robin
  const sessionHistoryRef = useRef<Map<string, string>>(new Map()); // category -> lastProfessionalId

  // USE YOUR ACTUAL BACKEND URL
  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

  // Extract category from params
  useEffect(() => {
    console.log('📦 Received params:', params);
    
    const categoryName = params.category || params.categoryName || params.name || params.title || '';
    const categoryId = params.categoryId || params.id || '';
    
    if (categoryName) {
      const cleanName = categoryName.toString().trim();
      setSelectedCategory(cleanName);
      console.log('🎯 Category selected:', cleanName);
    }
    if (categoryId) setSelectedCategoryId(categoryId as string);
    
  }, [params]);

  // Start matching when category is set
  useEffect(() => {
    if (selectedCategory) {
      console.log('🚀 Starting match for category:', selectedCategory);
      findAvailableProfessional();
    }
  }, [selectedCategory]);

  /* ========== LOAD BALANCING FUNCTIONS ========== */
  
  // Get last assigned professional for this category
  const getLastAssignedProId = useCallback((category: string): string | null => {
    return sessionHistoryRef.current.get(category) || null;
  }, []);

  // Save last assigned professional for round-robin
  const saveLastAssigned = useCallback((category: string, proId: string) => {
    sessionHistoryRef.current.set(category, proId);
    // Also save to persistent storage
    AsyncStorage.setItem(`last_assigned_${category}`, proId);
  }, []);

  // Load session history from storage on mount
  useEffect(() => {
    const loadSessionHistory = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const categoryKeys = keys.filter(key => key.startsWith('last_assigned_'));
        
        const entries = await AsyncStorage.multiGet(categoryKeys);
        entries.forEach(([key, value]) => {
          if (value) {
            const category = key.replace('last_assigned_', '');
            sessionHistoryRef.current.set(category, value);
          }
        });
      } catch (err) {
        console.log('⚠️ Could not load session history:', err);
      }
    };
    
    loadSessionHistory();
  }, []);

  /* ========== ENHANCED SELECTION ALGORITHM ========== */
  const selectBestProfessional = useCallback((
    professionals: Professional[],
    category: string
  ): Professional | null => {
    if (professionals.length === 0) return null;
    
    const now = new Date();
    const lastAssignedId = getLastAssignedProId(category);
    
    // Calculate scores for each professional
    const scoredProfessionals = professionals.map(pro => {
      let score = 0;
      const reasons: string[] = [];
      
      // 1. Online status (highest priority)
      if (pro.online_status) {
        score += LOAD_BALANCING_CONFIG.PRIORITY_WEIGHTS.ONLINE;
        reasons.push('online');
      }
      
      // 2. Availability
      if (pro.available) {
        score += LOAD_BALANCING_CONFIG.PRIORITY_WEIGHTS.AVAILABLE;
        reasons.push('available');
      }
      
      // 3. Load balancing (current sessions)
      const currentLoad = pro.current_sessions || 0;
      if (currentLoad < LOAD_BALANCING_CONFIG.MAX_SESSIONS_PER_PRO) {
        const loadScore = Math.max(0, 
          LOAD_BALANCING_CONFIG.PRIORITY_WEIGHTS.LOW_LOAD * 
          (1 - currentLoad / LOAD_BALANCING_CONFIG.MAX_SESSIONS_PER_PRO)
        );
        score += loadScore;
        reasons.push(`low-load:${currentLoad}`);
      }
      
      // 4. Round-robin: Penalize recently assigned
      if (lastAssignedId && pro.id.toString() === lastAssignedId) {
        score -= 15; // Penalty for being last assigned
        reasons.push('recently-assigned');
      }
      
      // 5. Experience bonus (minor factor)
      if (pro.experience_years > 5) {
        score += LOAD_BALANCING_CONFIG.PRIORITY_WEIGHTS.EXPERIENCE;
        reasons.push('experienced');
      }
      
      return {
        professional: pro,
        score,
        reasons,
        currentLoad
      };
    });
    
    // Sort by score (descending)
    scoredProfessionals.sort((a, b) => b.score - a.score);
    
    console.log('📊 Professional Scores:', scoredProfessionals.map(sp => ({
      name: sp.professional.name,
      score: sp.score,
      reasons: sp.reasons,
      load: sp.currentLoad
    })));
    
    // Get top 3 professionals with similar scores
    const topScore = scoredProfessionals[0].score;
    const topCandidates = scoredProfessionals.filter(sp => 
      sp.score >= topScore * 0.8 // Within 20% of top score
    );
    
    console.log(`🎯 Top candidates: ${topCandidates.length} professionals`);
    
    // If multiple top candidates, apply additional fairness rules
    let selectedCandidate;
    if (topCandidates.length > 1) {
      // Rule 1: Avoid picking the same professional consecutively
      if (lastAssignedId) {
        const notLastAssigned = topCandidates.filter(sp => 
          sp.professional.id.toString() !== lastAssignedId
        );
        if (notLastAssigned.length > 0) {
          selectedCandidate = notLastAssigned[0];
          console.log('🔄 Round-robin: Avoiding last assigned professional');
        }
      }
      
      // Rule 2: If still multiple, pick one with lowest current load
      if (!selectedCandidate) {
        selectedCandidate = topCandidates.reduce((prev, curr) => 
          curr.currentLoad < prev.currentLoad ? curr : prev
        );
        console.log('⚖️ Load balancing: Selected lowest load');
      }
    } else {
      selectedCandidate = topCandidates[0];
    }
    
    if (selectedCandidate) {
      console.log(`✅ Selected: ${selectedCandidate.professional.name} (Score: ${selectedCandidate.score})`);
      console.log(`📋 Reasons: ${selectedCandidate.reasons.join(', ')}`);
      return selectedCandidate.professional;
    }
    
    return scoredProfessionals[0]?.professional || null;
  }, [getLastAssignedProId]);

  /* ========== ENHANCED MATCHING ALGORITHM ========== */
  const findAvailableProfessional = async () => {
    setLoading(true);
    setSearching(true);
    setError('');
    setMatchedProfessional(null);
    setProfessionalsList([]);
    setAlgorithmDebug('');

    try {
      console.log('🤖 Starting ENHANCED algorithm for:', selectedCategory);
      
      // ✅ Fetch all available professionals
      const url = `${API_BASE_URL}/professionals/?available=true&status=approved`;
      console.log('🌐 Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('📊 Full API Data:', data);
      
      if (!data.professionals || data.professionals.length === 0) {
        setError('No professionals found in system.');
        setLoading(false);
        setSearching(false);
        return;
      }
      
      console.log(`✅ Found ${data.count} professionals total`);
      setProfessionalsList(data.professionals);
      
      // Log all professionals for debugging
      console.log('👥 ALL PROFESSIONALS:');
      data.professionals.forEach(p => {
        console.log(`- ${p.name}: Category="${p.category}", Available=${p.available}, Online=${p.online_status}, Sessions=${p.current_sessions || 0}`);
      });
      
      // Find professionals in the selected category
      const categoryProfessionals = data.professionals.filter(pro => {
        // Match by category name
        return pro.category === selectedCategory || 
               pro.category?.trim() === selectedCategory ||
               (pro.primary_category && pro.primary_category.name?.trim() === selectedCategory);
      });
      
      console.log(`📊 Found ${categoryProfessionals.length} professionals in "${selectedCategory}" category`);
      
      if (categoryProfessionals.length === 0) {
        setError(`No "${selectedCategory}" professionals found.`);
        console.log('Available categories:', [...new Set(data.professionals.map(p => p.category))]);
        setLoading(false);
        setSearching(false);
        return;
      }
      
      // Separate into available and unavailable
      const availableProfessionals = categoryProfessionals.filter(p => p.available);
      const unavailableProfessionals = categoryProfessionals.filter(p => !p.available);
      
      console.log(`📊 Available: ${availableProfessionals.length}, Unavailable: ${unavailableProfessionals.length}`);
      
      // Use enhanced selection algorithm
      let selectedProfessional: Professional | null = null;
      let selectionType = '';
      
      if (availableProfessionals.length > 0) {
        // Use intelligent selection from available professionals
        selectedProfessional = selectBestProfessional(availableProfessionals, selectedCategory);
        selectionType = 'intelligent-match';
        
        if (selectedProfessional) {
          // Save this assignment for round-robin
          saveLastAssigned(selectedCategory, selectedProfessional.id.toString());
          
          // Update algorithm debug info
          setAlgorithmDebug(`"Skip the search, get the answer." ${availableProfessionals.length - 1} other ${availableProfessionals.length - 1 === 1 ? 'professional' : 'professionals'} available in this category.`);
        }
      } 
      
      // Fallback: If no available professionals, check unavailable ones
      if (!selectedProfessional && unavailableProfessionals.length > 0) {
        // Still use selection algorithm but with lower priority
        selectedProfessional = selectBestProfessional(unavailableProfessionals, selectedCategory);
        selectionType = 'fallback-match';
        
        if (selectedProfessional) {
          setAlgorithmDebug('No available professionals. Showing a busy professional as fallback.');
        }
      }
      
      if (selectedProfessional) {
        setMatchedProfessional(selectedProfessional);
        console.log(`✅ Final selection: ${selectedProfessional.name} (${selectionType})`);
      } else {
        setError(`No ${selectedCategory} professionals available.`);
        setAlgorithmDebug('Could not find any matching professionals.');
      }
      
    } catch (err) {
      console.error('❌ Algorithm error:', err);
      setError('Failed to connect to server. Please try again.');
      setAlgorithmDebug('Network error occurred.');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  /* ========== CONNECTION HANDLER ========== */
  const handleConnectProfessional = async () => {
    if (!matchedProfessional || assigning) return;
    
    setAssigning(true);
    
    try {
      console.log('🔗 Connecting to:', matchedProfessional.name);
      
      // Simulate session assignment (in real app, would update backend)
      // Update professional's session count
      const updatedPro = {
        ...matchedProfessional,
        current_sessions: (matchedProfessional.current_sessions || 0) + 1
      };
      
      // Navigate to expert screen
      router.push({
        pathname: '/expert',
        params: {
          professional: JSON.stringify({
            ...updatedPro,
            selected_category: selectedCategory,
            match_timestamp: new Date().toISOString(),
            primary_category: updatedPro.primary_category || 
                             { id: 0, name: updatedPro.category },
            algorithm_used: 'load-balanced-round-robin'
          })
        }
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect. Please try again.');
      setAssigning(false);
    }
  };

  /* ========== MANUAL SELECTION ========== */
  const handleSelectProfessional = (professional: Professional) => {
    Alert.alert(
      'Select Professional',
      `Do you want to connect with ${professional.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Connect', 
          onPress: () => {
            setMatchedProfessional(professional);
            saveLastAssigned(selectedCategory, professional.id.toString());
          }
        }
      ]
    );
  };

  /* ========== UI HANDLERS ========== */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    findAvailableProfessional().then(() => setRefreshing(false));
  }, [selectedCategory]);

  const handleGoBack = () => {
    router.back();
  };

  const handleResetHistory = async () => {
    try {
      sessionHistoryRef.current.clear();
      const keys = await AsyncStorage.getAllKeys();
      const categoryKeys = keys.filter(key => key.startsWith('last_assigned_'));
      await AsyncStorage.multiRemove(categoryKeys);
      Alert.alert('Success', 'Session history cleared. Next search will start fresh.');
    } catch (err) {
      Alert.alert('Error', 'Failed to clear history');
    }
  };

  /* ========== RENDER ========== */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          Finding best {selectedCategory} professional...
        </Text>
        <Text style={styles.loadingSubtext}>
          Using load-balanced algorithm
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>DIRECT-CONNECT TECHNOLOGIES</Text>
          <Text style={styles.headerSubtitle}>
            {selectedCategory}
          </Text>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          {algorithmDebug ? (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>ℹ️ {algorithmDebug}</Text>
            </View>
          ) : null}
        </View>

        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.searchingText}>
              Running intelligent matching...
            </Text>
          </View>
        )}

        {matchedProfessional ? (
          <View style={styles.matchContainer}>
            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              matchedProfessional.online_status ? styles.onlineBadge : 
              matchedProfessional.available ? styles.availableBadge : styles.busyBadge
            ]}>
              <Text style={styles.statusBadgeText}>
                {matchedProfessional.online_status ? 'ONLINE NOW' : 
                 matchedProfessional.available ? 'AVAILABLE' : 'MAY BE BUSY'}
              </Text>
            </View>

            <View style={styles.matchCard}>
              {/* Professional Info */}
              <View style={styles.professionalHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {matchedProfessional.name.charAt(0)}
                  </Text>
                </View>
                
                <View style={styles.professionalDetails}>
                  <Text style={styles.professionalName}>
                    {matchedProfessional.name}
                  </Text>
                  <Text style={styles.professionalCategory}>
                    {selectedCategory}
                  </Text>
                  <Text style={styles.professionalSpecialization}>
                    {matchedProfessional.specialization}
                  </Text>
                  
                  {/* Status indicators */}
                  <View style={styles.statusIndicators}>
                    <View style={styles.statusItem}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: matchedProfessional.available ? '#10B981' : '#F59E0B' }
                      ]} />
                      <Text style={styles.statusText}>
                        {matchedProfessional.available ? 'Available' : 'Check Availability'}
                      </Text>
                    </View>
                    
                    {matchedProfessional.online_status && (
                      <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.statusText, { color: '#059669' }]}>
                          ● Online
                        </Text>
                      </View>
                    )}
                    
                    {(matchedProfessional.current_sessions || 0) > 0 && (
                      <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#8B5CF6' }]} />
                        <Text style={styles.statusText}>
                          {matchedProfessional.current_sessions} active session{matchedProfessional.current_sessions !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Professional Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Experience</Text>
                  <Text style={styles.statValue}>
                    {matchedProfessional.experience_years} year{matchedProfessional.experience_years !== 1 ? 's' : ''}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Sessions</Text>
                  <Text style={styles.statValue}>
                    {matchedProfessional.total_sessions}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Response Time</Text>
                  <Text style={styles.statValue}>
                    {matchedProfessional.avg_response_time || '< 4 hours'}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Rate</Text>
                  <Text style={[styles.statValue, { color: '#059669' }]}>
                    ${matchedProfessional.rate}/session
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity 
                style={[
                  styles.connectButton,
                  assigning && styles.connectButtonDisabled
                ]} 
                onPress={handleConnectProfessional}
                disabled={assigning}
              >
                <LinearGradient
                  colors={matchedProfessional.online_status ? ['#10B981', '#059669'] : ['#3B82F6', '#1D4ED8']}
                  style={styles.connectButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.connectButtonText}>
                    {assigning ? 'Connecting...' : 
                     matchedProfessional.online_status ? 'Connect Instantly' : 'Start Session'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
              >
                <Text style={styles.refreshButtonText}>Find Another Professional</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetHistory}
              >
                <Text style={styles.resetButtonText}>"Skip the search, get the answer."</Text>
              </TouchableOpacity>
            </View>
            
            {/* Show all available professionals with selection option */}
            {professionalsList.length > 0 && (
              <View style={styles.otherProfessionals}>
                <Text style={styles.otherProfessionalsTitle}>
                  Available {selectedCategory} Professionals ({professionalsList.filter(p => 
                    (p.category === selectedCategory || p.category?.trim() === selectedCategory) && 
                    p.id !== matchedProfessional.id
                  ).length})
                </Text>
                
                <Text style={styles.otherProfessionalsSubtitle}>
                  Tap any to select manually:
                </Text>
                
                {professionalsList
                  .filter(p => 
                    (p.category === selectedCategory || p.category?.trim() === selectedCategory) && 
                    p.id !== matchedProfessional.id
                  )
                  .map(pro => (
                    <TouchableOpacity
                      key={pro.id}
                      style={[
                        styles.otherProfessionalItem,
                        !pro.available && styles.otherProfessionalItemBusy
                      ]}
                      onPress={() => handleSelectProfessional(pro)}
                    >
                      <View style={styles.otherProfessionalInfo}>
                        <Text style={styles.otherProfessionalName}>{pro.name}</Text>
                        <Text style={styles.otherProfessionalSpecialty}>
                          {pro.specialization}
                        </Text>
                      </View>
                      
                      <View style={styles.otherProfessionalStatus}>
                        <View style={[
                          styles.otherStatusDot,
                          { 
                            backgroundColor: pro.online_status ? '#10B981' : 
                                           pro.available ? '#3B82F6' : '#F59E0B' 
                          }
                        ]} />
                        <Text style={[
                          styles.otherProfessionalAvailable,
                          !pro.available && { color: '#F59E0B' }
                        ]}>
                          {pro.online_status ? 'Online' : 
                           pro.available ? 'Available' : 'Busy'}
                        </Text>
                        {(pro.current_sessions || 0) > 0 && (
                          <Text style={styles.otherProfessionalSessions}>
                            ({pro.current_sessions || 0})
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                }
                
                {professionalsList.filter(p => 
                  (p.category === selectedCategory || p.category?.trim() === selectedCategory) && 
                  p.id !== matchedProfessional.id
                ).length === 0 && (
                  <Text style={styles.noOtherProfessionals}>
                    No other professionals in this category
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noMatchContainer}>
            <Text style={styles.noMatchTitle}>
              No Match Found
            </Text>
            
            <Text style={styles.noMatchText}>
              {error || `Could not find ${selectedCategory} professionals.`}
            </Text>
            
            {professionalsList.length > 0 && (
              <View style={styles.availableCategories}>
                <Text style={styles.availableCategoriesTitle}>
                  Available Categories:
                </Text>
                {[...new Set(professionalsList.map(p => p.category).filter(Boolean))].map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryChip}
                    onPress={() => {
                      setSelectedCategory(category.trim());
                      findAvailableProfessional();
                    }}
                  >
                    <Text style={styles.categoryChipText}>{category.trim()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={onRefresh}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButtonAlt}
              onPress={handleGoBack}
            >
              <Text style={styles.backButtonAltText}>← Back to Categories</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ========== STYLES ========== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa', 
    padding: 20 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1F2937', 
    textAlign: 'center' 
  },
  loadingSubtext: { 
    marginTop: 8, 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center' 
  },
  
  header: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  backButton: { 
    alignSelf: 'flex-start', 
    marginBottom: 12, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8 
  },
  backButtonText: { 
    color: '#374151', 
    fontWeight: '600', 
    fontSize: 14 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1F2937', 
    marginBottom: 4 
  },
  headerSubtitle: { 
    fontSize: 16, 
    color: '#3B82F6', 
    fontWeight: '600', 
    marginBottom: 8 
  },
  debugContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9'
  },
  debugText: {
    fontSize: 13,
    color: '#0369A1',
    fontStyle: 'italic'
  },
  errorText: { 
    fontSize: 14, 
    color: '#EF4444', 
    marginTop: 8, 
    fontWeight: '500',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6
  },
  
  searchingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    backgroundColor: '#EFF6FF', 
    marginHorizontal: 20, 
    marginTop: 16, 
    borderRadius: 12 
  },
  searchingText: { 
    marginLeft: 8, 
    color: '#007AFF', 
    fontWeight: '500' 
  },

  matchContainer: { 
    padding: 20 
  },
  statusBadge: { 
    alignSelf: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginBottom: -10, 
    zIndex: 1 
  },
  onlineBadge: { 
    backgroundColor: '#10B981' 
  },
  availableBadge: { 
    backgroundColor: '#3B82F6' 
  },
  busyBadge: { 
    backgroundColor: '#F59E0B' 
  },
  statusBadgeText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  
  matchCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3 
  },
  
  professionalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  avatarContainer: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: '#3B82F6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  professionalDetails: { 
    flex: 1 
  },
  professionalName: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1F2937', 
    marginBottom: 4 
  },
  professionalCategory: { 
    fontSize: 15, 
    color: '#3B82F6', 
    fontWeight: '600', 
    marginBottom: 2 
  },
  professionalSpecialization: { 
    fontSize: 14, 
    color: '#6B7280',
    marginBottom: 12
  },
  statusIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500'
  },
  statValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600'
  },
  
  connectButton: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden'
  },
  connectButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  connectButtonDisabled: {
    opacity: 0.7
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  
  refreshButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600'
  },
  
  resetButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  resetButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500'
  },
  
  otherProfessionals: {
    marginTop: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  otherProfessionalsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  otherProfessionalsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12
  },
  otherProfessionalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 8,
    borderRadius: 6
  },
  otherProfessionalItemBusy: {
    opacity: 0.8,
    backgroundColor: '#FEF3C7'
  },
  otherProfessionalInfo: {
    flex: 1
  },
  otherProfessionalName: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 2
  },
  otherProfessionalSpecialty: {
    fontSize: 13,
    color: '#6B7280'
  },
  otherProfessionalStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  otherStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  otherProfessionalAvailable: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginRight: 6
  },
  otherProfessionalSessions: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  noOtherProfessionals: {
    textAlign: 'center',
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 16
  },
  
  noMatchContainer: {
    alignItems: 'center',
    padding: 30
  },
  noMatchTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center'
  },
  noMatchText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  
  availableCategories: {
    width: '100%',
    marginBottom: 24
  },
  availableCategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center'
  },
  categoryChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  categoryChipText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600'
  },
  
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%'
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  
  backButtonAlt: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%'
  },
  backButtonAltText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600'
  }
});