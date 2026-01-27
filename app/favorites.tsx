import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Professional Card Component
const ProfessionalCard = ({ professional, onRemoveFavorite }) => {
  const navigation = useNavigation();

  if (!professional) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Professional information not available</Text>
      </View>
    );
  }

  const {
    id = 0,
    name = 'Unknown Professional',
    specialization = 'General Consulting',
    rate = 50,
    available = false,
    category = 'General',
    average_rating = 0,
    total_sessions = 0,
    online_status = false,
    experience_years = 1,
    bio = '',
  } = professional;

  const handleViewProfile = () => {
    try {
      navigation.navigate('ProfessionalProfile', { professionalId: id });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to profile');
    }
  };

  const handleStartChat = () => {
    try {
      navigation.navigate('Chat', { professionalId: id, professionalName: name });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to start chat');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.specialization}>{specialization}</Text>
          <Text style={styles.category}>{category}</Text>
        </View>
        <View style={styles.status}>
          <View style={[
            styles.statusIndicator, 
            { backgroundColor: available ? '#10B981' : '#EF4444' }
          ]} />
          <Text style={styles.statusText}>
            {available ? 'Available' : 'Unavailable'}
          </Text>
          {online_status && (
            <View style={[styles.statusIndicator, { backgroundColor: '#10B981', marginTop: 4 }]} />
          )}
          <Text style={styles.statusText}>
            {online_status ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {bio ? (
        <View style={styles.bioContainer}>
          <Text style={styles.bioText} numberOfLines={2}>
            {bio}
          </Text>
        </View>
      ) : null}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rate:</Text>
          <Text style={styles.detailValue}>${rate}/min</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rating:</Text>
          <Text style={styles.detailValue}>{average_rating?.toFixed(1) || '0.0'} ⭐</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Sessions:</Text>
          <Text style={styles.detailValue}>{total_sessions || 0}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Experience:</Text>
          <Text style={styles.detailValue}>{experience_years} years</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleStartChat}
        >
          <Text style={styles.primaryButtonText}>Start Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleViewProfile}
        >
          <Text style={styles.secondaryButtonText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => onRemoveFavorite && onRemoveFavorite(id)}
        >
          <Text style={styles.favoriteButtonText}>❤️ Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Bottom Navigation Component
const BottomNav = ({ activeTab, onTabChange }) => {
  const navigation = useNavigation();

  const tabs = [
    { key: 'home', icon: '🏠', label: 'Home', screen: 'Home' },
    { key: 'search', icon: '🔍', label: 'Search', screen: 'Search' },
    { key: 'favorites', icon: '❤️', label: 'Favorites', screen: 'Favorites' },
    { key: 'profile', icon: '👤', label: 'Profile', screen: 'Profile' },
  ];

  const handleTabPress = (tab) => {
    try {
      onTabChange(tab.key);
      if (tab.key !== 'favorites') {
        navigation.navigate(tab.screen);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => (
        <TouchableOpacity 
          key={tab.key}
          style={styles.navItem}
          onPress={() => handleTabPress(tab)}
        >
          <Text style={[
            styles.navText, 
            activeTab === tab.key && styles.activeNavText
          ]}>
            {tab.icon}
          </Text>
          <Text style={[
            styles.navLabel, 
            activeTab === tab.key && styles.activeNavLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Main Favorites Screen Component
export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { 
    user, 
    token, 
    isAuthenticated, 
    favorites,
    removeFromFavorites,
    refreshFavorites,
    favoritesLoading,
    loading: authLoading 
  } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [activeTab, setActiveTab] = useState('favorites');

  // Convert favorites to professional array for display
  const favoritePros = favorites.map(fav => ({
    ...fav.professional,
    favorite_id: fav.id // Include favorite ID for removal
  }));

  const handleRemoveFavorite = async (professionalId: number) => {
    try {
      Alert.alert(
        'Remove Favorite',
        'Are you sure you want to remove this professional from favorites?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeFromFavorites(professionalId);
                Alert.alert('Success', 'Professional removed from favorites');
              } catch (error) {
                console.error('Error removing favorite:', error);
                Alert.alert(
                  'Error', 
                  error.message || 'Failed to remove from favorites. Please try again.'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in remove favorite flow:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    setApiError(null);
    try {
      await refreshFavorites();
    } catch (error) {
      setApiError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleLoginRedirect = () => {
    try {
      navigation.navigate('Login');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to login');
    }
  };

  const handleBrowseProfessionals = () => {
    try {
      navigation.navigate('Search');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to search');
    }
  };

  // Show loading state when favorites are being loaded
  if (authLoading || favoritesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved professionals</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>
            {favoritesLoading ? 'Loading favorites...' : 'Checking authentication...'}
          </Text>
        </View>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved professionals</Text>
        </View>
        
        <View style={styles.authRequired}>
          <Text style={styles.authIcon}>🔒</Text>
          <Text style={styles.authTitle}>Authentication Required</Text>
          <Text style={styles.authMessage}>
            Please log in to view and manage your favorite professionals
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLoginRedirect}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </SafeAreaView>
    );
  }

  if (user?.user_type === 'professional') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved professionals</Text>
        </View>
        
        <View style={styles.authRequired}>
          <Text style={styles.authIcon}>👨‍⚕️</Text>
          <Text style={styles.authTitle}>Professional Account</Text>
          <Text style={styles.authMessage}>
            Favorites feature is only available for client accounts
          </Text>
        </View>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>
          {favoritePros.length} saved professional{favoritePros.length !== 1 ? 's' : ''}
        </Text>
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
        {apiError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>API Error</Text>
            <Text style={styles.errorMessage}>{apiError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : favoritePros.length > 0 ? (
          <View style={styles.list}>
            {favoritePros.map((pro) => (
              <ProfessionalCard 
                key={pro.id} 
                professional={pro}
                onRemoveFavorite={handleRemoveFavorite}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>
              Save professionals you'd like to connect with again by clicking the heart icon on their profile
            </Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={handleBrowseProfessionals}
            >
              <Text style={styles.browseButtonText}>Browse Professionals</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
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
  list: { 
    marginBottom: 20 
  },
  
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: '#6B7280',
  },
  status: {
    alignItems: 'center',
    minWidth: 60,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 10,
    color: '#6B7280',
  },
  bioContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  bioText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  favoriteButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  favoriteButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
  },

  // Empty State
  empty: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  emptyIcon: { 
    fontSize: 64, 
    marginBottom: 16 
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 8 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    paddingHorizontal: 40,
    marginBottom: 20,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading State
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

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Authentication Required State
  authRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  authIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

	// Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 20,
    marginBottom: 4,
    color: '#6B7280',
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeNavText: {
    color: '#3B82F6',
  },
  activeNavLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});