import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

/* --- Types based on your API response --- */
interface Professional {
  id: number;
  name: string;
  specialization: string;
  rate: number;
  available: boolean;
  online_status: boolean;
  category: string;  // Category name as string
  primary_category?: { id: number; name: string; };
  average_rating: number;
  total_sessions: number;
  experience_years: number;
  email?: string;
  phone?: string;
  is_favorite?: boolean;
  avg_response_time?: string;
}

interface ApiResponse {
  professionals: Professional[];
  count: number;
}

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

  // USE YOUR ACTUAL BACKEND URL
  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

  // Extract category from params
  useEffect(() => {
    console.log('📦 Received params:', params);
    
    // Try multiple parameter names
    const categoryName = params.category || params.categoryName || params.name || params.title || '';
    const categoryId = params.categoryId || params.id || '';
    
    if (categoryName) {
      // Clean up category name (remove extra spaces)
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

  /* ========== ALGORITHM: FIND AVAILABLE PROFESSIONAL ========== */
  const findAvailableProfessional = async () => {
    setLoading(true);
    setSearching(true);
    setError('');
    setMatchedProfessional(null);
    setProfessionalsList([]);

    try {
      console.log('🤖 Starting algorithm for:', selectedCategory);
      
      // ✅ CORRECT - use this:
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
      
      console.log(`✅ Found ${data.count} professionals`);
      setProfessionalsList(data.professionals);
      
      // Log all professionals for debugging
      console.log('👥 ALL PROFESSIONALS:');
      data.professionals.forEach(p => {
        console.log(`- ${p.name}: Category="${p.category}", Available=${p.available}, Online=${p.online_status}`);
      });
      
      // Find professionals in the selected category
      const categoryProfessionals = data.professionals.filter(pro => {
        // ✅ FIXED: Use correct field names
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
      
      // Separate available and unavailable professionals
      const availableProfessionals = categoryProfessionals.filter(p => p.available);
      const unavailableProfessionals = categoryProfessionals.filter(p => !p.available);
      
      console.log(`📊 Available: ${availableProfessionals.length}, Unavailable: ${unavailableProfessionals.length}`);
      
      // SELECTION ALGORITHM
      let selectedProfessional: Professional | null = null;
      let selectionReason = '';
      
      // 1. First priority: Online & Available
      const onlineAvailable = availableProfessionals.find(p => p.online_status);
      if (onlineAvailable) {
        selectedProfessional = onlineAvailable;
        selectionReason = 'Online & Available Now';
        console.log('🎯 Selected: Online available professional');
      }
      // 2. Second priority: Available but offline
      else if (availableProfessionals.length > 0) {
        selectedProfessional = availableProfessionals[0];
        selectionReason = 'Available (Currently Offline)';
        console.log('🎯 Selected: Available but offline professional');
      }
      // 3. Fallback: Show first professional (even if unavailable)
      else if (unavailableProfessionals.length > 0) {
        selectedProfessional = unavailableProfessionals[0];
        selectionReason = 'May be busy';
        console.log('⚠️ Selected: Professional marked as busy');
      }
      
      if (selectedProfessional) {
        setMatchedProfessional(selectedProfessional);
        console.log('✅ Selected:', selectedProfessional.name, selectionReason);
      } else {
        setError(`No ${selectedCategory} professionals available.`);
      }
      
    } catch (err) {
      console.error('❌ Algorithm error:', err);
      setError('Failed to connect to server. Please try again.');
      
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
      
      // Navigate to expert screen
      router.push({
        pathname: '/expert',
        params: {
          professional: JSON.stringify({
            ...matchedProfessional,
            selected_category: selectedCategory,
            match_timestamp: new Date().toISOString(),
            // ✅ FIXED: Use primary_category
            primary_category: matchedProfessional.primary_category || 
                             { id: 0, name: matchedProfessional.category }
          })
        }
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect. Please try again.');
      setAssigning(false);
    }
  };

  /* ========== UI HANDLERS ========== */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    findAvailableProfessional().then(() => setRefreshing(false));
  }, [selectedCategory]);

  const handleGoBack = () => {
    router.back();
  };

  /* ========== RENDER ========== */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          Finding {selectedCategory} professional...
        </Text>
        <Text style={styles.loadingSubtext}>
          Checking availability on our servers
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
        </View>

        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.searchingText}>
              Searching database...
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
                  <Text style={styles.statLabel}>Sessions</Text>
                  <Text style={styles.statValue}>
                    {matchedProfessional.total_sessions}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Response</Text>
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
                <Text style={styles.refreshButtonText}>Search Again</Text>
              </TouchableOpacity>
            </View>
            
            {/* Show all available professionals in this category */}
            {professionalsList.length > 0 && (
              <View style={styles.otherProfessionals}>
                <Text style={styles.otherProfessionalsTitle}>
                  Other {selectedCategory} Professionals
                </Text>
                {professionalsList
                  .filter(p => 
                    (p.category === selectedCategory || 
                     p.category?.trim() === selectedCategory) && 
                    p.id !== matchedProfessional.id
                  )
                  .map(pro => (
                    <View key={pro.id} style={styles.otherProfessionalItem}>
                      <Text style={styles.otherProfessionalName}>{pro.name}</Text>
                      <View style={styles.otherProfessionalStatus}>
                        <View style={[
                          styles.otherStatusDot,
                          { backgroundColor: pro.available ? '#10B981' : '#F59E0B' }
                        ]} />
                        <Text style={styles.otherProfessionalAvailable}>
                          {pro.available ? 'Available' : 'Busy'}
                        </Text>
                        {pro.online_status && (
                          <Text style={styles.otherProfessionalOnline}>● Online</Text>
                        )}
                      </View>
                    </View>
                  ))
                }
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
    fontSize: 24, 
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
    marginRight: 12
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
    alignItems: 'center'
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600'
  },
  
  otherProfessionals: {
    marginTop: 20,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  otherProfessionalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  otherProfessionalName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500'
  },
  otherProfessionalStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  otherStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4
  },
  otherProfessionalAvailable: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8
  },
  otherProfessionalOnline: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500'
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