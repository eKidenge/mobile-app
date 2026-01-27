import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

interface Professional {
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
  experience?: string;
  photo?: string;
  reviews_count?: number;
  online_status?: boolean;
  is_approved?: boolean;
  user_id?: number;
  is_favorite?: boolean;
}

export default function Professionals() {
  const { categoryId, categoryTitle } = useLocalSearchParams();
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading professionals for category:', categoryId, categoryTitle);
      
      // Get all professionals from your API
      const response = await apiService.getProfessionalList({ 
        available: true,
        status: 'approved'
      });
      
      console.log('📊 API Response:', response);
      
      if (response.professionals && Array.isArray(response.professionals)) {
        const professionalsData = response.professionals;
        console.log('✅ Professionals loaded:', professionalsData.length);
        
        // Since all professionals have "General" category, we'll show all for now
        // In the future, you can implement proper category filtering in the backend
        setProfessionals(professionalsData);

        if (professionalsData.length === 0) {
          setError('No professionals found. Please check back later.');
        }
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (error) {
      console.error('❌ Failed to load professionals:', error);
      setError('Unable to load professionals. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalPress = async (professional: Professional) => {
    try {
      console.log('🔒 Attempting to lock professional:', professional.id);
      
      // Try to lock the professional for connection
      const lockResult = await apiService.lockProfessional(
        professional.id.toString(), 
        categoryId as string
      );

      console.log('🔒 Lock result:', lockResult);

      if (lockResult.success) {
        // Navigate to professional details/connection screen
        router.push({
          pathname: '/professional-details',
          params: { 
            professionalId: professional.id.toString(),
            categoryId: categoryId as string,
            categoryTitle: categoryTitle as string,
            lockId: lockResult.lockId,
            professionalName: professional.name,
            professionalSpecialization: professional.specialization,
            professionalRate: professional.rate.toString(),
            professionalPhoto: professional.photo || '',
            professionalExperience: professional.experience || '5+ years',
            professionalRating: professional.average_rating?.toString() || '4.8',
            professionalSessions: professional.total_sessions?.toString() || '0'
          }
        });
      } else {
        Alert.alert(
          'Professional Busy',
          'This professional is currently busy. Please try another one.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Failed to lock professional:', error);
      // If locking fails, still navigate but show a warning
      Alert.alert(
        'Note',
        'Professional might be busy. Connecting without lock.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => {
              router.push({
                pathname: '/professional-details',
                params: { 
                  professionalId: professional.id.toString(),
                  categoryId: categoryId as string,
                  categoryTitle: categoryTitle as string,
                  professionalName: professional.name,
                  professionalSpecialization: professional.specialization,
                  professionalRate: professional.rate.toString(),
                  professionalPhoto: professional.photo || '',
                  professionalExperience: professional.experience || '5+ years',
                  professionalRating: professional.average_rating?.toString() || '4.8',
                  professionalSessions: professional.total_sessions?.toString() || '0'
                }
              });
            }
          }
        ]
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    loadProfessionals();
  };

  useEffect(() => {
    if (categoryId) {
      loadProfessionals();
    }
  }, [categoryId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading professionals...</Text>
          <Text style={styles.loadingSubtext}>
            Finding the best {categoryTitle} specialists for you
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {categoryTitle || 'Available Professionals'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Professionals Count */}
        <View style={styles.countSection}>
          <Text style={styles.countText}>
            {professionals.length} {professionals.length === 1 ? 'Professional' : 'Professionals'} Available
          </Text>
          <Text style={styles.categoryNote}>
            Showing all approved professionals
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Professionals List */}
        <View style={styles.professionalsList}>
          {professionals.length > 0 ? (
            professionals.map((professional) => (
              <TouchableOpacity
                key={professional.id}
                style={styles.professionalCard}
                onPress={() => handleProfessionalPress(professional)}
                activeOpacity={0.7}
              >
                <View style={styles.professionalHeader}>
                  <Image 
                    source={{ 
                      uri: professional.photo || 'https://via.placeholder.com/60/3B82F6/FFFFFF?text=PRO' 
                    }}
                    style={styles.avatar}
                    defaultSource={{ uri: 'https://via.placeholder.com/60/3B82F6/FFFFFF?text=PRO' }}
                  />
                  <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>
                      {professional.name || 'Professional Name'}
                    </Text>
                    <Text style={styles.professionalSpecialization}>
                      {professional.specialization || 'General Consulting'}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.rating}>
                        ⭐ {professional.average_rating ? professional.average_rating.toFixed(1) : 'New'}
                      </Text>
                      <Text style={styles.reviews}>
                        ({professional.total_sessions || 0} sessions)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <View 
                      style={[
                        styles.statusDot, 
                        { 
                          backgroundColor: professional.available ? '#10B981' : '#6B7280'
                        }
                      ]} 
                    />
                    <Text style={styles.statusText}>
                      {professional.available ? 'Available' : 'Busy'}
                    </Text>
                  </View>
                </View>

                <View style={styles.professionalDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>
                      {professional.category || 'General'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Rate</Text>
                    <Text style={styles.detailValue}>
                      KSH {professional.rate || 50}/min
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Experience</Text>
                    <Text style={styles.detailValue}>
                      {professional.experience || '5+ years'}
                    </Text>
                  </View>
                </View>

                <View style={[
                  styles.availabilityBadge,
                  { 
                    backgroundColor: professional.available ? '#D1FAE5' : '#F3F4F6' 
                  }
                ]}>
                  <Text style={[
                    styles.availabilityText,
                    { 
                      color: professional.available ? '#059669' : '#6B7280' 
                    }
                  ]}>
                    {professional.available ? 'Available Now' : 'Currently Busy'}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.connectButton}
                  onPress={() => handleProfessionalPress(professional)}
                >
                  <Text style={styles.connectButtonText}>Connect Now</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>👨‍💼</Text>
              <Text style={styles.emptyStateText}>No Professionals Available</Text>
              <Text style={styles.emptyStateSubtext}>
                There are no professionals available at the moment.
              </Text>
              <Text style={styles.emptyStateHint}>
                Please check back later or try a different category.
              </Text>
              <TouchableOpacity style={styles.backButtonPrimary} onPress={handleBack}>
                <Text style={styles.backButtonPrimaryText}>← Back to Categories</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 40,
  },
  countSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  professionalsList: {
    padding: 16,
  },
  professionalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  professionalSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#F59E0B',
    marginRight: 8,
    fontWeight: '600',
  },
  reviews: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  professionalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  backButtonPrimary: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});