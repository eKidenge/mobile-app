import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

interface Professional {
  id: string;
  name: string;
  specialization: string;
  rate: number;
  available: boolean;
  online_status: boolean;
  category: string;
  average_rating: number;
  total_sessions: number;
  experience_years: number;
  email?: string;
  phone?: string;
  bio?: string;
  title?: string;
  languages?: string[];
  education?: string[];
  certifications?: string[];
  avg_response_time?: string;
  success_rate?: number;
  current_workload?: number;
  max_workload?: number;
  last_active?: string;
  profile_picture?: string;
  is_favorite?: boolean;
  categories?: Array<{
    id: string;
    name: string;
    is_primary: boolean;
  }>;
  // Additional fields from matching algorithm
  matchScore?: number;
  aiConfidence?: number;
  matchReason?: string;
  breakdown?: any;
  availability?: any;
}

export default function ExpertProfile() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  // Responsive values
  const isSmallScreen = width < 375;
  const isLargeScreen = width > 768;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  // Responsive style calculations
  const responsiveStyles = createResponsiveStyles(
    isSmallScreen, 
    isLargeScreen, 
    isTablet, 
    isLandscape,
    width,
    height
  );

  useEffect(() => {
    if (params.professional) {
      try {
        console.log('📊 Parsing professional data...');
        const professionalData = JSON.parse(params.professional as string);
        console.log('✅ Professional data loaded:', professionalData.name);
        setProfessional(professionalData);
      } catch (error) {
        console.error('❌ Error parsing professional data:', error);
        Alert.alert('Error', 'Failed to load professional profile');
      } finally {
        setLoading(false);
      }
    } else {
      console.error('❌ No professional data provided');
      Alert.alert('Error', 'No professional data available');
      setLoading(false);
    }
  }, [params.professional]);

  const handleConnectOption = (option: 'chat' | 'audio' | 'video') => {
    if (!professional) return;

    console.log(`📱 Selected ${option} session with ${professional.name}`);
    
    // Navigate directly to payment screen
    router.push({
      pathname: '/payment',
      params: { 
        professional: JSON.stringify(professional),
        consultationType: option
      }
    });
  };

  const addToFavorites = async () => {
    if (!professional) return;

    try {
      const response = await fetch(`https://teleconnect-krga.onrender.com/api/manage-favorites/${professional.id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: '1', // Replace with actual user ID
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message);
        // Update local state
        setProfessional(prev => prev ? { ...prev, is_favorite: true } : null);
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('Error', 'Failed to add to favorites');
    }
  };

  const removeFromFavorites = async () => {
    if (!professional) return;

    try {
      const response = await fetch(`https://teleconnect-krga.onrender.com/api/manage-favorites/${professional.id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: '1', // Replace with actual user ID
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message);
        // Update local state
        setProfessional(prev => prev ? { ...prev, is_favorite: false } : null);
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      Alert.alert('Error', 'Failed to remove from favorites');
    }
  };

  const getSkillsFromProfessional = (pro: Professional): string[] => {
    const skills: string[] = [];
    
    if (pro.specialization) {
      skills.push(pro.specialization);
    }
    
    if (pro.bio) {
      // Extract key skills from bio
      const skillKeywords = ['consulting', 'development', 'design', 'strategy', 'management', 'analysis', 'planning'];
      skillKeywords.forEach(keyword => {
        if (pro.bio?.toLowerCase().includes(keyword)) {
          skills.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    }
    
    if (pro.categories && pro.categories.length > 0) {
      pro.categories.forEach(cat => {
        if (!skills.includes(cat.name)) {
          skills.push(cat.name);
        }
      });
    }
    
    return skills.length > 0 ? skills : ['Professional', 'Expert', 'Consultant'];
  };

  const getSpecializations = (pro: Professional): string[] => {
    const specializations: string[] = [];
    
    if (pro.specialization) {
      specializations.push(pro.specialization);
    }
    
    if (pro.categories && pro.categories.length > 0) {
      pro.categories.forEach(cat => {
        if (cat.is_primary && !specializations.includes(cat.name)) {
          specializations.push(cat.name);
        }
      });
    }
    
    return specializations.length > 0 ? specializations : [pro.category || 'General Consulting'];
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, responsiveStyles.centerContainer]}>
        <ActivityIndicator size={responsiveStyles.activityIndicator.size} color="#007AFF" />
        <Text style={[styles.loadingText, responsiveStyles.loadingText]}>
          Loading professional profile...
        </Text>
      </View>
    );
  }

  if (!professional) {
    return (
      <View style={[styles.centerContainer, responsiveStyles.centerContainer]}>
        <Text style={[styles.errorText, responsiveStyles.errorText]}>
          No professional data found
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, responsiveStyles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, responsiveStyles.backButtonText]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const skills = getSkillsFromProfessional(professional);
  const specializations = getSpecializations(professional);
  const successRate = professional.success_rate || Math.min((professional.total_sessions / (professional.total_sessions + 10)) * 100, 95);
  const responseTime = professional.avg_response_time || '< 4 hours';

  return (
    <View style={[styles.container, responsiveStyles.container]}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={[styles.header, responsiveStyles.header]}
      >
        <TouchableOpacity 
          style={[styles.backButtonHeader, responsiveStyles.backButtonHeader]}
          onPress={() => router.back()}
        >
          <Ionicons 
            name="arrow-back" 
            size={responsiveStyles.headerIcon.size} 
            color="#fff" 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, responsiveStyles.headerTitle]}>
          DIRECT-CONNECT TECHNOLOGIES
        </Text>
        <TouchableOpacity 
          style={[styles.favoriteButton, responsiveStyles.favoriteButton]}
          onPress={professional.is_favorite ? removeFromFavorites : addToFavorites}
        >
          <Ionicons 
            name={professional.is_favorite ? "heart" : "heart-outline"} 
            size={responsiveStyles.headerIcon.size} 
            color="#fff" 
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={[styles.scrollContent, responsiveStyles.scrollContent]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={responsiveStyles.scrollContentContainer}
      >
        {/* Expert Profile Card */}
        <View style={[styles.profileCard, responsiveStyles.profileCard]}>
          <View style={[styles.profileHeader, responsiveStyles.profileHeader]}>
            <Image
              source={{ uri: professional.profile_picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }}
              style={[styles.profileImage, responsiveStyles.profileImage]}
            />
            <View style={[styles.profileInfo, responsiveStyles.profileInfo]}>
              <Text style={[styles.expertName, responsiveStyles.expertName]}>
                {professional.name}
              </Text>
              <Text style={[styles.expertTitle, responsiveStyles.expertTitle]}>
                {professional.title || professional.specialization || professional.category} Specialist
              </Text>
              <View style={[styles.ratingContainer, responsiveStyles.ratingContainer]}>
                <Ionicons 
                  name="star" 
                  size={responsiveStyles.ratingIcon.size} 
                  color="#F59E0B" 
                />
                <Text style={[styles.rating, responsiveStyles.rating]}>
                  {professional.average_rating.toFixed(1)}
                </Text>
                <Text style={[styles.reviews, responsiveStyles.reviews]}>
                  ({professional.total_sessions} sessions)
                </Text>
              </View>
              <View style={[styles.statusContainer, responsiveStyles.statusContainer]}>
                <View style={[
                  styles.statusDot,
                  professional.online_status ? styles.onlineDot : styles.offlineDot,
                  responsiveStyles.statusDot
                ]} />
                <Text style={[styles.statusText, responsiveStyles.statusText]}>
                  {professional.online_status ? 'Online Now' : `Last Active ${professional.last_active ? 'Recently' : ''}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Match Score if available */}
          {professional.matchScore && (
            <View style={[styles.matchContainer, responsiveStyles.matchContainer]}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={[styles.matchBadge, responsiveStyles.matchBadge]}
              >
                <Text style={[styles.matchScore, responsiveStyles.matchScore]}>
                  {professional.matchScore}% Match
                </Text>
                <Text style={[styles.matchSubtext, responsiveStyles.matchSubtext]}>
                  AI Recommended
                </Text>
              </LinearGradient>
              {professional.matchReason && (
                <Text style={[styles.matchReason, responsiveStyles.matchReason]}>
                  {professional.matchReason}
                </Text>
              )}
            </View>
          )}

          {/* Rate and Availability */}
          <View style={[styles.rateContainer, responsiveStyles.rateContainer]}>
            <Text style={[styles.rate, responsiveStyles.rate]}>
              ${professional.rate}/hour
            </Text>
            <Text style={[styles.availability, responsiveStyles.availability]}>
              {professional.available ? '🟢 Available' : '🔴 Busy'}
            </Text>
          </View>
        </View>

        {/* Expertise Section */}
        <View style={[styles.section, responsiveStyles.section]}>
          <Text style={[styles.sectionTitle, responsiveStyles.sectionTitle]}>
            Expertise & Skills
          </Text>
          <View style={[styles.skillsContainer, responsiveStyles.skillsContainer]}>
            {skills.map((skill, index) => (
              <View key={index} style={[styles.skillTag, responsiveStyles.skillTag]}>
                <Text style={[styles.skillText, responsiveStyles.skillText]}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Professional Details */}
        <View style={[styles.section, responsiveStyles.section]}>
          <Text style={[styles.sectionTitle, responsiveStyles.sectionTitle]}>
            Professional Details
          </Text>
          
          <View style={[styles.detailRow, responsiveStyles.detailRow]}>
            <Ionicons 
              name="briefcase" 
              size={responsiveStyles.detailIcon.size} 
              color="#6B7280" 
            />
            <Text style={[styles.detailLabel, responsiveStyles.detailLabel]}>
              Experience:
            </Text>
            <Text style={[styles.detailValue, responsiveStyles.detailValue]}>
              {professional.experience_years}+ years
            </Text>
          </View>

          <View style={[styles.detailRow, responsiveStyles.detailRow]}>
            <Ionicons 
              name="checkmark-circle" 
              size={responsiveStyles.detailIcon.size} 
              color="#6B7280" 
            />
            <Text style={[styles.detailLabel, responsiveStyles.detailLabel]}>
              Success Rate:
            </Text>
            <Text style={[styles.detailValue, responsiveStyles.detailValue]}>
              {Math.round(successRate)}%
            </Text>
          </View>

          <View style={[styles.detailRow, responsiveStyles.detailRow]}>
            <Ionicons 
              name="time" 
              size={responsiveStyles.detailIcon.size} 
              color="#6B7280" 
            />
            <Text style={[styles.detailLabel, responsiveStyles.detailLabel]}>
              Response Time:
            </Text>
            <Text style={[styles.detailValue, responsiveStyles.detailValue]}>
              {responseTime}
            </Text>
          </View>

          <View style={[styles.detailRow, responsiveStyles.detailRow]}>
            <Ionicons 
              name="document-text" 
              size={responsiveStyles.detailIcon.size} 
              color="#6B7280" 
            />
            <Text style={[styles.detailLabel, responsiveStyles.detailLabel]}>
              Total Sessions:
            </Text>
            <Text style={[styles.detailValue, responsiveStyles.detailValue]}>
              {professional.total_sessions}+
            </Text>
          </View>

          {professional.current_workload && professional.max_workload && (
            <View style={[styles.detailRow, responsiveStyles.detailRow]}>
              <Ionicons 
                name="speedometer" 
                size={responsiveStyles.detailIcon.size} 
                color="#6B7280" 
              />
              <Text style={[styles.detailLabel, responsiveStyles.detailLabel]}>
                Current Workload:
              </Text>
              <Text style={[styles.detailValue, responsiveStyles.detailValue]}>
                {professional.current_workload}/{professional.max_workload}
              </Text>
            </View>
          )}
        </View>

        {/* About Section */}
        <View style={[styles.section, responsiveStyles.section]}>
          <Text style={[styles.sectionTitle, responsiveStyles.sectionTitle]}>
            About {professional.name}
          </Text>
          <Text style={[styles.bio, responsiveStyles.bio]}>
            {professional.bio || `Experienced ${professional.category} specialist with ${professional.experience_years} years of proven expertise. Successfully completed ${professional.total_sessions} sessions with a ${Math.round(successRate)}% satisfaction rate. Known for ${responseTime.toString().toLowerCase()} response times and professional approach.`}
          </Text>
        </View>

        {/* Specializations */}
        {specializations.length > 0 && (
          <View style={[styles.section, responsiveStyles.section]}>
            <Text style={[styles.sectionTitle, responsiveStyles.sectionTitle]}>
              Specializations
            </Text>
            <View style={[styles.specializationsContainer, responsiveStyles.specializationsContainer]}>
              {specializations.map((spec, index) => (
                <View key={index} style={[styles.specTag, responsiveStyles.specTag]}>
                  <Ionicons 
                    name="ribbon" 
                    size={responsiveStyles.specIcon.size} 
                    color="#007AFF" 
                  />
                  <Text style={[styles.specText, responsiveStyles.specText]}>
                    {spec}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Languages */}
        {professional.languages && professional.languages.length > 0 && (
          <View style={[styles.section, responsiveStyles.section]}>
            <Text style={[styles.sectionTitle, responsiveStyles.sectionTitle]}>
              Languages
            </Text>
            <View style={[styles.languagesContainer, responsiveStyles.languagesContainer]}>
              {professional.languages.map((language, index) => (
                <View key={index} style={[styles.languageTag, responsiveStyles.languageTag]}>
                  <Ionicons 
                    name="language" 
                    size={responsiveStyles.languageIcon.size} 
                    color="#007AFF" 
                  />
                  <Text style={[styles.languageText, responsiveStyles.languageText]}>
                    {language}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Education & Certifications */}
        {(professional.education || professional.certifications) && (
          <View style={[styles.section, responsiveStyles.section]}>
            <Text style={[styles.sectionTitle, responsiveStyles.sectionTitle]}>
              Qualifications
            </Text>
            
            {professional.education && professional.education.map((edu, index) => (
              <View key={`edu-${index}`} style={[styles.qualificationItem, responsiveStyles.qualificationItem]}>
                <Ionicons 
                  name="school" 
                  size={responsiveStyles.qualificationIcon.size} 
                  color="#007AFF" 
                />
                <Text style={[styles.qualificationText, responsiveStyles.qualificationText]}>
                  {edu}
                </Text>
              </View>
            ))}
            
            {professional.certifications && professional.certifications.map((cert, index) => (
              <View key={`cert-${index}`} style={[styles.qualificationItem, responsiveStyles.qualificationItem]}>
                <Ionicons 
                  name="medal" 
                  size={responsiveStyles.qualificationIcon.size} 
                  color="#007AFF" 
                />
                <Text style={[styles.qualificationText, responsiveStyles.qualificationText]}>
                  {cert}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Spacer for bottom buttons */}
        <View style={[styles.spacer, responsiveStyles.spacer]} />
      </ScrollView>

      {/* Connect Options Footer */}
      <View style={[styles.footer, responsiveStyles.footer]}>
        <Text style={[styles.footerTitle, responsiveStyles.footerTitle]}>
          Connect via
        </Text>
        <View style={[styles.connectButtonsContainer, responsiveStyles.connectButtonsContainer]}>
          <TouchableOpacity 
            style={[styles.connectButton, responsiveStyles.connectButton]}
            onPress={() => handleConnectOption('chat')}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={[styles.buttonGradient, responsiveStyles.buttonGradient]}
            >
              <Ionicons 
                name="chatbubble-ellipses" 
                size={responsiveStyles.connectIcon.size} 
                color="#fff" 
              />
              <Text style={[styles.buttonText, responsiveStyles.buttonText]}>
                Chat
              </Text>
              <Text style={[styles.buttonSubtext, responsiveStyles.buttonSubtext]}>
                Text consultation
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.connectButton, responsiveStyles.connectButton]}
            onPress={() => handleConnectOption('audio')}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={[styles.buttonGradient, responsiveStyles.buttonGradient]}
            >
              <Ionicons 
                name="call" 
                size={responsiveStyles.connectIcon.size} 
                color="#fff" 
              />
              <Text style={[styles.buttonText, responsiveStyles.buttonText]}>
                Voice Call
              </Text>
              <Text style={[styles.buttonSubtext, responsiveStyles.buttonSubtext]}>
                Audio consultation
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.connectButton, responsiveStyles.connectButton]}
            onPress={() => handleConnectOption('video')}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={[styles.buttonGradient, responsiveStyles.buttonGradient]}
            >
              <Ionicons 
                name="videocam" 
                size={responsiveStyles.connectIcon.size} 
                color="#fff" 
              />
              <Text style={[styles.buttonText, responsiveStyles.buttonText]}>
                Video Call
              </Text>
              <Text style={[styles.buttonSubtext, responsiveStyles.buttonSubtext]}>
                Video consultation
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Responsive style generator
const createResponsiveStyles = (
  isSmallScreen: boolean,
  isLargeScreen: boolean,
  isTablet: boolean,
  isLandscape: boolean,
  width: number,
  height: number
) => {
  const baseScale = Math.min(width / 375, height / 812);
  const responsiveSize = (size: number) => Math.round(size * baseScale);
  
  return {
    container: {
      paddingHorizontal: isTablet ? responsiveSize(40) : responsiveSize(0),
    },
    centerContainer: {
      padding: responsiveSize(20),
    },
    activityIndicator: {
      size: responsiveSize(40) as unknown as number,
    },
    loadingText: {
      fontSize: responsiveSize(16),
      marginTop: responsiveSize(16),
    },
    errorText: {
      fontSize: responsiveSize(16),
    },
    backButton: {
      paddingHorizontal: responsiveSize(20),
      paddingVertical: responsiveSize(12),
      borderRadius: responsiveSize(8),
    },
    backButtonText: {
      fontSize: responsiveSize(16),
    },
    header: {
      paddingTop: isSmallScreen ? responsiveSize(50) : responsiveSize(60),
      paddingBottom: responsiveSize(20),
      paddingHorizontal: responsiveSize(20),
    },
    backButtonHeader: {
      padding: responsiveSize(8),
    },
    headerTitle: {
      fontSize: responsiveSize(20),
    },
    favoriteButton: {
      padding: responsiveSize(8),
    },
    headerIcon: {
      size: responsiveSize(24),
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: responsiveSize(150),
    },
    profileCard: {
      margin: responsiveSize(20),
      marginTop: responsiveSize(-40),
      padding: responsiveSize(20),
      borderRadius: responsiveSize(20),
    },
    profileHeader: {
      flexDirection: isSmallScreen ? 'column' : 'row',
      alignItems: isSmallScreen ? 'center' : 'flex-start',
    },
    profileImage: {
      width: responsiveSize(80),
      height: responsiveSize(80),
      borderRadius: responsiveSize(40),
      marginRight: isSmallScreen ? 0 : responsiveSize(16),
      marginBottom: isSmallScreen ? responsiveSize(12) : 0,
    },
    profileInfo: {
      flex: 1,
      alignItems: isSmallScreen ? 'center' : 'flex-start',
    },
    expertName: {
      fontSize: responsiveSize(22),
      textAlign: isSmallScreen ? 'center' : 'left',
    },
    expertTitle: {
      fontSize: responsiveSize(16),
      textAlign: isSmallScreen ? 'center' : 'left',
    },
    ratingContainer: {
      marginBottom: responsiveSize(8),
    },
    ratingIcon: {
      size: responsiveSize(16),
    },
    rating: {
      fontSize: responsiveSize(14),
      marginLeft: responsiveSize(4),
      marginRight: responsiveSize(8),
    },
    reviews: {
      fontSize: responsiveSize(12),
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: responsiveSize(8),
      height: responsiveSize(8),
      borderRadius: responsiveSize(4),
      marginRight: responsiveSize(6),
    },
    statusText: {
      fontSize: responsiveSize(12),
    },
    matchContainer: {
      marginTop: responsiveSize(8),
      marginBottom: responsiveSize(12),
    },
    matchBadge: {
      paddingHorizontal: responsiveSize(16),
      paddingVertical: responsiveSize(8),
      borderRadius: responsiveSize(20),
      marginBottom: responsiveSize(8),
    },
    matchScore: {
      fontSize: responsiveSize(14),
    },
    matchSubtext: {
      fontSize: responsiveSize(10),
    },
    matchReason: {
      fontSize: responsiveSize(12),
    },
    rateContainer: {
      paddingTop: responsiveSize(12),
    },
    rate: {
      fontSize: responsiveSize(18),
    },
    availability: {
      fontSize: responsiveSize(14),
    },
    section: {
      marginHorizontal: responsiveSize(20),
      marginBottom: responsiveSize(16),
      padding: responsiveSize(20),
      borderRadius: responsiveSize(16),
    },
    sectionTitle: {
      fontSize: responsiveSize(18),
      marginBottom: responsiveSize(12),
    },
    skillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: responsiveSize(8),
    },
    skillTag: {
      paddingHorizontal: responsiveSize(12),
      paddingVertical: responsiveSize(6),
      borderRadius: responsiveSize(16),
    },
    skillText: {
      fontSize: responsiveSize(12),
    },
    detailRow: {
      marginBottom: responsiveSize(12),
    },
    detailIcon: {
      size: responsiveSize(20),
    },
    detailLabel: {
      fontSize: responsiveSize(14),
      marginLeft: responsiveSize(8),
      marginRight: responsiveSize(8),
      width: responsiveSize(120),
    },
    detailValue: {
      fontSize: responsiveSize(14),
    },
    bio: {
      fontSize: responsiveSize(14),
      lineHeight: responsiveSize(20),
    },
    specializationsContainer: {
      gap: responsiveSize(8),
    },
    specTag: {
      paddingHorizontal: responsiveSize(12),
      paddingVertical: responsiveSize(8),
      borderRadius: responsiveSize(8),
    },
    specIcon: {
      size: responsiveSize(16),
    },
    specText: {
      fontSize: responsiveSize(12),
      marginLeft: responsiveSize(6),
    },
    languagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: responsiveSize(8),
    },
    languageTag: {
      paddingHorizontal: responsiveSize(12),
      paddingVertical: responsiveSize(6),
      borderRadius: responsiveSize(16),
    },
    languageIcon: {
      size: responsiveSize(16),
    },
    languageText: {
      fontSize: responsiveSize(12),
      marginLeft: responsiveSize(4),
    },
    qualificationItem: {
      marginBottom: responsiveSize(8),
    },
    qualificationIcon: {
      size: responsiveSize(16),
    },
    qualificationText: {
      fontSize: responsiveSize(14),
      marginLeft: responsiveSize(8),
    },
    spacer: {
      height: responsiveSize(120),
    },
    footer: {
      padding: responsiveSize(20),
    },
    footerTitle: {
      fontSize: responsiveSize(16),
      marginBottom: responsiveSize(12),
    },
    connectButtonsContainer: {
      flexDirection: isSmallScreen ? 'column' : 'row',
      gap: responsiveSize(8),
    },
    connectButton: {
      flex: isSmallScreen ? 0 : 1,
      marginBottom: isSmallScreen ? responsiveSize(8) : 0,
    },
    buttonGradient: {
      padding: responsiveSize(16),
      borderRadius: responsiveSize(12),
    },
    connectIcon: {
      size: responsiveSize(24),
    },
    buttonText: {
      fontSize: responsiveSize(14),
      marginTop: responsiveSize(8),
      marginBottom: responsiveSize(2),
    },
    buttonSubtext: {
      fontSize: responsiveSize(10),
    },
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    color: '#6B7280',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonHeader: {},
  headerTitle: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  favoriteButton: {},
  scrollContent: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {},
  profileInfo: {},
  expertName: {
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  expertTitle: {
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontWeight: '600',
    color: '#1F2937',
  },
  reviews: {
    color: '#9CA3AF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    color: '#6B7280',
  },
  matchContainer: {
    alignItems: 'center',
  },
  matchBadge: {
    alignItems: 'center',
  },
  matchScore: {
    color: '#fff',
    fontWeight: 'bold',
  },
  matchSubtext: {
    color: 'rgba(255,255,255,0.8)',
  },
  matchReason: {
    color: '#059669',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rate: {
    fontWeight: 'bold',
    color: '#059669',
  },
  availability: {
    color: '#059669',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  skillsContainer: {},
  skillTag: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  skillText: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6B7280',
  },
  detailValue: {
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  bio: {
    color: '#6B7280',
  },
  specializationsContainer: {},
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  specText: {
    color: '#0369A1',
    fontWeight: '500',
  },
  languagesContainer: {},
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF7CD',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  languageText: {
    color: '#92400E',
    fontWeight: '500',
  },
  qualificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualificationText: {
    color: '#6B7280',
    flex: 1,
  },
  spacer: {},
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  footerTitle: {
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  connectButtonsContainer: {
    justifyContent: 'space-between',
  },
  connectButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonGradient: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});