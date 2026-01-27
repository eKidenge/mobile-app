import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

export default function SearchScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [featuredProfessionals, setFeaturedProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load categories and featured professionals
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading search screen data...');

      // Load categories
      const categoriesData = await apiService.getCategories();
      console.log('✅ Categories loaded:', categoriesData.length);
      setCategories(categoriesData);

      // Load featured professionals (approved and available)
      const professionalsData = await apiService.getProfessionalList({
        status: 'approved',
        available: true,
        page_size: 6
      });
      console.log('✅ Featured professionals loaded:', professionalsData.professionals.length);
      setFeaturedProfessionals(professionalsData.professionals);

    } catch (error) {
      console.error('❌ Error loading search data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Search professionals
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 Searching for:', query);
      
      const results = await apiService.searchProfessionals(query, {
        available: true,
        status: 'approved'
      });
      
      console.log('✅ Search results:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Search error:', error);
      Alert.alert('Search Error', 'Failed to search professionals. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle category selection
  const handleCategorySelect = async (category) => {
    try {
      console.log('📁 Selected category:', category.name);
      
      const professionals = await apiService.getProfessionalsByCategory(category.id.toString());
      
      if (professionals.length > 0) {
        Alert.alert(
          `${category.name} Professionals`,
          `Found ${professionals.length} professionals in ${category.name}. Professional list screen coming soon!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Professionals',
          `No professionals found in ${category.name} category yet.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error loading category professionals:', error);
      Alert.alert('Error', 'Failed to load professionals for this category.');
    }
  };

  // Handle professional selection
  const handleProfessionalSelect = (professional) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to view professional profiles.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    Alert.alert(
      'Professional Profile',
      `Viewing ${professional.name}'s profile. Profile screen coming soon!`,
      [{ text: 'OK' }]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    setSearchResults([]);
    loadData();
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

	return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, []);

  // Helper function to get icons for categories
  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Legal': '⚖️',
      'Medical': '🏥',
      'Mental Health': '🧠',
      'Business': '💼',
      'Technology': '💻',
      'Education': '🎓',
      'Finance': '💰',
      'Real Estate': '🏠',
      'Engineering': '⚙️',
      'Design': '🎨',
      'Marketing': '📢',
      'Consulting': '💡',
      'Health': '❤️',
      'Fitness': '💪',
      'Beauty': '💄',
      'Home': '🏡',
      'Auto': '🚗',
      'Pet': '🐾'
    };

    return iconMap[categoryName] || '👨‍💼';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Professionals</Text>
          <Text style={styles.subtitle}>Connect with experts in various fields</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading professionals...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Professionals</Text>
        <Text style={styles.subtitle}>Connect with experts in various fields</Text>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search professionals by name or specialization..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Search Results */}
        {isSearching && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Searching...</Text>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        )}

        {searchQuery && searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Search Results ({searchResults.length})
            </Text>
            <View style={styles.professionalsList}>
              {searchResults.map((professional) => (
                <TouchableOpacity
                  key={professional.id}
                  style={styles.professionalCard}
                  onPress={() => handleProfessionalSelect(professional)}
                >
                  <View style={styles.professionalHeader}>
                    <Text style={styles.professionalName}>{professional.name}</Text>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: professional.available ? '#10B981' : '#EF4444' }
                    ]} />
                  </View>
                  <Text style={styles.professionalSpecialization}>
                    {professional.specialization}
                  </Text>
                  <Text style={styles.professionalRate}>${professional.rate}/min</Text>
                  <View style={styles.professionalStats}>
                    <Text style={styles.professionalRating}>
                      ⭐ {professional.average_rating?.toFixed(1) || '0.0'}
                    </Text>
                    <Text style={styles.professionalSessions}>
                      {professional.total_sessions} sessions
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {searchQuery && !isSearching && searchResults.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>No Results Found</Text>
            <Text style={styles.noResultsText}>
              No professionals found for "{searchQuery}". Try different keywords.
            </Text>
          </View>
        )}

        {/* Categories - Only show when not searching */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoriesGrid}>
              {categories.filter(cat => cat.enabled).map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(category.name)}
                  </Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>
                    {category.professional_count || 0} pros
                  </Text>
                  <Text style={styles.categoryPrice}>
                    From ${category.base_price}/min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Featured Professionals - Only show when not searching */}
        {!searchQuery && featuredProfessionals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Professionals</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {featuredProfessionals.map((professional) => (
                <TouchableOpacity
                  key={professional.id}
                  style={styles.featuredProfessionalCard}
                  onPress={() => handleProfessionalSelect(professional)}
                >
                  <View style={styles.featuredProfessionalHeader}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {professional.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={[
                      styles.onlineIndicator,
                      { backgroundColor: professional.online_status ? '#10B981' : '#6B7280' }
                    ]} />
                  </View>
                  <Text style={styles.featuredProfessionalName} numberOfLines={1}>
                    {professional.name}
                  </Text>
                  <Text style={styles.featuredProfessionalSpecialization} numberOfLines={1}>
                    {professional.specialization}
                  </Text>
                  <View style={styles.featuredProfessionalStats}>
                    <Text style={styles.featuredProfessionalRating}>
                      ⭐ {professional.average_rating?.toFixed(1) || '0.0'}
                    </Text>
                    <Text style={styles.featuredProfessionalRate}>
                      ${professional.rate}/min
                    </Text>
                  </View>
                  <View style={[
                    styles.availabilityBadge,
                    { backgroundColor: professional.available ? '#D1FAE5' : '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.availabilityText,
                      { color: professional.available ? '#065F46' : '#991B1B' }
                    ]}>
                      {professional.available ? 'Available' : 'Busy'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Empty State for Categories */}
        {!searchQuery && categories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No Categories Available</Text>
            <Text style={styles.emptyText}>
              Categories will appear here once they are added to the system.
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  scroll: {
    flex: 1,
    padding: 20
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    fontSize: 16,
    color: '#111827',
    paddingVertical: 16,
  },
  section: {
    marginBottom: 32
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600'
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center'
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2
  },
  categoryPrice: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600'
  },
  horizontalScroll: {
    marginHorizontal: -4
  },
  featuredProfessionalCard: {
    width: 160,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
    alignItems: 'center'
  },
  featuredProfessionalHeader: {
    position: 'relative',
    marginBottom: 12
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff'
  },
  featuredProfessionalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center'
  },
  featuredProfessionalSpecialization: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center'
  },
  featuredProfessionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8
  },
  featuredProfessionalRating: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600'
  },
  featuredProfessionalRate: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600'
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600'
  },
  professionalsList: {
    gap: 12
  },
  professionalCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  professionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  professionalSpecialization: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 4
  },
  professionalRate: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 8
  },
  professionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  professionalRating: {
    fontSize: 12,
    color: '#6B7280'
  },
  professionalSessions: {
    fontSize: 12,
    color: '#6B7280'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  noResultsText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    padding: 20
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20
  }
});