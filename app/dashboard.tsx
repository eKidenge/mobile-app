import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert
} from 'react-native';
import CategoryCard from '../components/CategoryCard';
import BottomNav from '../components/BottomNav';
import { useEffect, useState } from 'react';
import { apiService, Professional, Category } from '../services/api';
import { useRouter } from 'expo-router';

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingInProgress, setPairingInProgress] = useState<string | null>(null);
  const router = useRouter();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch categories from backend
      const categoriesResponse = await apiService.getCategories();
      
      // Transform backend categories to match your component props
      const transformedCategories = categoriesResponse.map((cat: Category) => {
        const categoryConfig: { [key: string]: { icon: string; color: string } } = {
          'Legal Advice': { icon: '⚖️', color: '#1E40AF' },
          'Mental Health': { icon: '🧠', color: '#059669' },
          'Career Guidance': { icon: '💼', color: '#7C3AED' },
          'Medical Help': { icon: '🏥', color: '#DC2626' },
          'Finance': { icon: '💰', color: '#D97706' },
          'Technology': { icon: '💻', color: '#0369A1' },
          'Education': { icon: '🎓', color: '#7C3AED' },
          'Business': { icon: '📊', color: '#059669' },
        };

        const config = categoryConfig[cat.name] || { icon: '💼', color: '#6B7280' };

        const calculateAvgResponse = (sessionCount: number): string => {
          if (sessionCount > 1000) return '1 min';
          if (sessionCount > 500) return '2 min';
          if (sessionCount > 100) return '3 min';
          return '5 min';
        };

        return {
          id: cat.id.toString(),
          title: cat.name,
          icon: config.icon,
          color: config.color,
          available: cat.professional_count || 0,
          rate: `KSH ${cat.base_price || 0}/min`,
          avgResponse: calculateAvgResponse(cat.session_count || 0),
        };
      });

      setCategories(transformedCategories);

      // Fetch all professionals (optional - for display only)
      await loadProfessionals();

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Unable to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProfessionals = async () => {
    try {
      const professionalsResponse = await apiService.getProfessionalList({ 
        status: 'approved', 
        available: true 
      });
      
      if (professionalsResponse.professionals && professionalsResponse.professionals.length > 0) {
        setProfessionals(professionalsResponse.professionals);
      } else {
        setProfessionals([]);
      }
    } catch (error) {
      console.error('Failed to load professionals:', error);
      setProfessionals([]);
    }
  };

  // SIMPLIFIED: Just pass category to algorithm-match
  const handleCategoryPress = async (category: any) => {
    try {
      setPairingInProgress(category.id);
      
      console.log('📤 Navigating to algorithm-match with category:', {
        title: category.title,
        id: category.id,
        name: category.title
      });

      // SIMPLE: Navigate to algorithm-match with category info
      router.push({
        pathname: '/algorithm-match',
        params: {
          category: category.title,          // Send as 'category'
          categoryId: category.id,           // Send as 'categoryId'
          categoryName: category.title,      // Send as 'categoryName'
          name: category.title,              // Send as 'name'
          id: category.id,                   // Send as 'id'
          // Add any other data you want to pass
          icon: category.icon,
          color: category.color,
          rate: category.rate,
          available: category.available?.toString() || '0'
        }
      });

    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to load matching algorithm. Please try again.');
    } finally {
      setPairingInProgress(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    try {
      router.push('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading DirectConnect...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>"Skip the search, get the answer."</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>Pull down to refresh</Text>
          </View>
        )}

        <View style={styles.categories}>
          {categories.length > 0 ? (
            categories.map((category) => (
              <TouchableOpacity 
                key={category.id}
                onPress={() => handleCategoryPress(category)}
                disabled={pairingInProgress !== null}
              >
                <CategoryCard 
                  {...category} 
                  isPairing={pairingInProgress === category.id}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No categories available</Text>
              <Text style={styles.emptyStateSubtext}>
                Check back later for available services
              </Text>
            </View>
          )}
        </View>

        {pairingInProgress && (
          <View style={styles.pairingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.pairingText}>
              🤖 AI is finding your perfect match...
            </Text>
          </View>
        )}

      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scroll: {
    flex: 1,
    padding: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 110,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    position: 'absolute',
    right: 0,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
  },
  categories: {
    marginBottom: 20
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  pairingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pairingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});