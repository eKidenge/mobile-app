import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Platform,
  I18nManager,
  StatusBar,
  SafeAreaView,
  LayoutAnimation,
  UIManager,
  Pressable,
  GestureResponderEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  AccessibilityInfo,
  AccessibilityRole,
  AccessibilityState,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Types and Interfaces
interface CategoryCardProps {
  id: string;
  title: string;
  icon: string;
  color: string;
  available: number;
  rate: string;
  isPairing?: boolean;
  isFeatured?: boolean;
  popularity?: number;
  tags?: string[];
  description?: string;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
  testID?: string;
}

interface CategoriesGridProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearchChange?: (text: string) => void;
  style?: any;
  contentContainerStyle?: any;
  scrollEnabled?: boolean;
  showsVerticalScrollIndicator?: boolean;
}

interface CategoryMetrics {
  impressions: number;
  clicks: number;
  lastAccessed: Date;
}

// Constants
const CONSTANTS = {
  ANIMATION: {
    DURATION: 300,
    DURATION_LONG: 500,
    EASING: Easing.bezier(0.4, 0.0, 0.2, 1),
    EASING_OUT: Easing.out(Easing.cubic),
  },
  LAYOUT: {
    CARD_HEIGHT: 120,
    CARD_MARGIN: 16,
    GRID_GUTTER: 16,
    MAX_WIDTH: 600,
  },
  COLORS: {
    LIGHT: {
      BACKGROUND: '#FFFFFF',
      SURFACE: '#F8FAFC',
      PRIMARY: '#2563EB',
      SECONDARY: '#64748B',
      ACCENT: '#8B5CF6',
      ERROR: '#DC2626',
      SUCCESS: '#059669',
      WARNING: '#D97706',
      INFO: '#0891B2',
      TEXT_PRIMARY: '#0F172A',
      TEXT_SECONDARY: '#475569',
      TEXT_TERTIARY: '#94A3B8',
      BORDER: '#E2E8F0',
      SHADOW: 'rgba(0, 0, 0, 0.08)',
    },
    DARK: {
      BACKGROUND: '#0F172A',
      SURFACE: '#1E293B',
      PRIMARY: '#3B82F6',
      SECONDARY: '#94A3B8',
      ACCENT: '#A78BFA',
      ERROR: '#EF4444',
      SUCCESS: '#10B981',
      WARNING: '#F59E0B',
      INFO: '#06B6D4',
      TEXT_PRIMARY: '#F1F5F9',
      TEXT_SECONDARY: '#CBD5E1',
      TEXT_TERTIARY: '#64748B',
      BORDER: '#334155',
      SHADOW: 'rgba(0, 0, 0, 0.3)',
    },
  },
  TYPOGRAPHY: {
    FAMILY: {
      PRIMARY: Platform.select({ ios: 'System', android: 'Roboto' }),
      SECONDARY: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
    },
    WEIGHT: {
		LIGHT: '300',
      REGULAR: '400',
      MEDIUM: '500',
      SEMIBOLD: '600',
      BOLD: '700',
      EXTRABOLD: '800',
    },
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  BORDER_RADIUS: {
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 20,
    XXL: 24,
    ROUND: 9999,
  },
  SHADOW: {
    SM: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    MD: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    LG: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  BREAKPOINTS: {
    PHONE: 480,
    TABLET: 768,
    DESKTOP: 1024,
  },
} as const;

// Utility Functions
const Utility = {
  // Color manipulation
  lightenColor: (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return `#${(
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)}`;
  },

  darkenColor: (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return `#${(
      0x1000000 +
      (R > 0 ? (R > 255 ? 255 : R) : 0) * 0x10000 +
      (G > 0 ? (G > 255 ? 255 : G) : 0) * 0x100 +
      (B > 0 ? (B > 255 ? 255 : B) : 0)
    )
      .toString(16)
      .slice(1)}`;
  },

  // Animation helpers
  createSpringAnimation: (value: Animated.Value, toValue: number) => {
    return Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    });
  },

  createTimingAnimation: (value: Animated.Value, toValue: number, duration: number = CONSTANTS.ANIMATION.DURATION) => {
    return Animated.timing(value, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: CONSTANTS.ANIMATION.EASING,
    });
  },

  // Layout helpers
  getGridColumns: (): number => {
    const { width } = Dimensions.get('window');
    if (width >= CONSTANTS.BREAKPOINTS.DESKTOP) return 4;
    if (width >= CONSTANTS.BREAKPOINTS.TABLET) return 3;
    if (width >= CONSTANTS.BREAKPOINTS.PHONE) return 2;
    return 1;
  },

  // Formatting
  formatNumber: (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  },

  // Accessibility
  setAccessibilityFocus: (ref: React.RefObject<any>) => {
    if (ref.current) {
      AccessibilityInfo.announceForAccessibility('Category selected');
      ref.current.focus();
    }
  },
};

// Custom Hooks
const useCategoryMetrics = (categoryId: string) => {
  const [metrics, setMetrics] = useState<CategoryMetrics>({
    impressions: 0,
    clicks: 0,
    lastAccessed: new Date(),
  });

  const recordImpression = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      impressions: prev.impressions + 1,
    }));
  }, []);

  const recordClick = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      clicks: prev.clicks + 1,
      lastAccessed: new Date(),
    }));
  }, []);

  return { metrics, recordImpression, recordClick };
};

const useHoverAnimation = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Utility.createSpringAnimation(scaleAnim, 1.02),
      Utility.createSpringAnimation(translateYAnim, -2),
    ]).start();
  }, [scaleAnim, translateYAnim]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Utility.createSpringAnimation(scaleAnim, 1),
      Utility.createSpringAnimation(translateYAnim, 0),
    ]).start();
  }, [scaleAnim, translateYAnim]);

  return {
    hoverStyles: {
      transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
    },
    animateIn,
    animateOut,
  };
};

const usePressAnimation = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animatePressIn = useCallback(() => {
    Utility.createSpringAnimation(scaleAnim, 0.98).start();
  }, [scaleAnim]);

  const animatePressOut = useCallback(() => {
    Utility.createSpringAnimation(scaleAnim, 1).start();
  }, [scaleAnim]);

  return {
    pressStyles: {
      transform: [{ scale: scaleAnim }],
    },
    animatePressIn,
    animatePressOut,
  };
};

// Main CategoryCard Component
const CategoryCard = memo<CategoryCardProps>(({
  id,
  title,
  icon,
  color,
  available,
  rate,
  isPairing = false,
  isFeatured = false,
  popularity = 0,
  tags = [],
  description,
  onPress,
  onLongPress,
  testID,
}) => {
  const router = useRouter();
  const { metrics, recordImpression, recordClick } = useCategoryMetrics(id);
  const { hoverStyles, animateIn, animateOut } = useHoverAnimation();
  const { pressStyles, animatePressIn, animatePressOut } = usePressAnimation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const cardRef = useRef<View>(null);
  const isMounted = useRef(true);

  // Animation sequences
  useEffect(() => {
    if (isMounted.current) {
      // Entry animation
      Animated.parallel([
        Utility.createTimingAnimation(fadeAnim, 1, 600),
        Utility.createTimingAnimation(slideAnim, 0, 500),
      ]).start();

      // Record impression after animation
      const timer = setTimeout(() => {
        recordImpression();
      }, 1000);

      return () => {
        clearTimeout(timer);
        isMounted.current = false;
      };
    }
  }, [fadeAnim, slideAnim, recordImpression]);

  // Pulsing animation for featured cards
  useEffect(() => {
    if (isFeatured) {
      const pulse = Animated.loop(
        Animated.sequence([
          Utility.createTimingAnimation(pulseAnim, 1.05, 1000),
          Utility.createTimingAnimation(pulseAnim, 1, 1000),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isFeatured, pulseAnim]);

  // Glow animation for high popularity
  useEffect(() => {
    if (popularity > 80) {
      Animated.loop(
        Animated.sequence([
          Utility.createTimingAnimation(glowAnim, 1, 1500),
          Utility.createTimingAnimation(glowAnim, 0.3, 1500),
        ])
      ).start();
    }
  }, [popularity, glowAnim]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
      ReactNativeHapticFeedback.trigger('impactLight');
    } else {
      Vibration.vibrate(50);
    }

    recordClick();
    animatePressOut();

    if (onPress) {
      onPress(id);
    } else {
      // Navigate to algorithm-match with category parameters
      router.push({
        pathname: '/algorithm-match',
        params: {
          category: title,
          categoryId: id,
          categoryName: title,
          name: title,
          id: id,
          icon: icon,
          color: color,
          rate: rate,
          available: available.toString()
        }
      });
    }

    // Layout animation for smooth transition
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [id, title, icon, color, rate, available, onPress, router, recordClick, animatePressOut]);

  const handleLongPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
      ReactNativeHapticFeedback.trigger('impactHeavy');
    } else {
      Vibration.vibrate(100);
    }

    onLongPress?.(id);
  }, [id, onLongPress]);

  const handlePressIn = useCallback(() => {
    animatePressIn();
  }, [animatePressIn]);

  const handlePressOut = useCallback(() => {
    animatePressOut();
  }, [animatePressOut]);

  // Accessibility
  const accessibilityState: AccessibilityState = {
    disabled: isPairing,
    selected: false,
    busy: isPairing,
  };

  const accessibilityRole: AccessibilityRole = 'button';
  const accessibilityLabel = `${title}. ${available} available. Rate: ${rate} per minute. ${isPairing ? 'Currently pairing' : 'Available for pairing'}`;
  const accessibilityHint = `Double tap to explore ${title} category`;

  // Render popularity indicator
  const renderPopularity = useCallback(() => {
    if (popularity === 0) return null;

    const getPopularityColor = () => {
      if (popularity >= 80) return CONSTANTS.COLORS.LIGHT.SUCCESS;
      if (popularity >= 60) return CONSTANTS.COLORS.LIGHT.WARNING;
      return CONSTANTS.COLORS.LIGHT.ERROR;
    };

    return (
      <View style={styles.popularityContainer}>
        <View style={styles.popularityBackground}>
          <View 
            style={[
              styles.popularityFill,
              { 
                width: `${popularity}%`,
                backgroundColor: getPopularityColor(),
              }
            ]} 
          />
        </View>
        <Text style={styles.popularityText}>{popularity}%</Text>
      </View>
    );
  }, [popularity]);

  // Render tags
  const renderTags = useCallback(() => {
    if (tags.length === 0) return null;

    return (
      <View style={styles.tagsContainer}>
        {tags.slice(0, 2).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {tags.length > 2 && (
          <View style={styles.moreTag}>
            <Text style={styles.moreTagText}>+{tags.length - 2}</Text>
          </View>
        )}
      </View>
    );
  }, [tags]);

  const animatedStyle = {
    ...hoverStyles,
    ...pressStyles,
    opacity: fadeAnim,
    transform: [
      ...hoverStyles.transform,
      ...pressStyles.transform,
      { translateY: slideAnim },
    ],
  };

  const featuredGlowStyle = isFeatured ? {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.8],
    }),
    shadowRadius: 20,
    elevation: 15,
  } : {};

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        animatedStyle,
        featuredGlowStyle,
        isFeatured && { transform: [...animatedStyle.transform, { scale: pulseAnim }] },
      ]}
    >
      <Pressable
        ref={cardRef}
        style={styles.pressable}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isPairing}
        delayLongPress={500}
        testID={testID}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
      >
        <LinearGradient
          colors={[
            Utility.lightenColor(color, 20),
            color,
            Utility.darkenColor(color, 10),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBackground,
            isPairing && styles.disabledCard,
          ]}
        >
          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusIndicator,
                { backgroundColor: isPairing ? CONSTANTS.COLORS.LIGHT.WARNING : CONSTANTS.COLORS.LIGHT.SUCCESS }
              ]} 
            />
            <Text style={styles.statusText}>
              {isPairing ? 'Pairing...' : 'Available'}
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Icon Section */}
            <View style={styles.iconSection}>
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${color}30` },
                ]}
              >
                <Text style={styles.iconText}>{icon}</Text>
                {isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Ionicons name="star" size={12} color="#FFFFFF" />
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Text Content */}
            <View style={styles.textContent}>
              <Text 
                style={styles.title}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              
              {description && (
                <Text 
                  style={styles.description}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {description}
                </Text>
              )}

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Ionicons name="people-outline" size={14} color={CONSTANTS.COLORS.LIGHT.TEXT_SECONDARY} />
                  <Text style={styles.statText}>{available}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={14} color={CONSTANTS.COLORS.LIGHT.TEXT_SECONDARY} />
                  <Text style={styles.statText}>{rate}session</Text>
                </View>
              </View>

              {renderPopularity()}
              {renderTags()}
            </View>

            {/* Action Indicator */}
            <View style={styles.actionIndicator}>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={CONSTANTS.COLORS.LIGHT.TEXT_TERTIARY} 
              />
            </View>
          </View>

          {/* Loading Overlay for Pairing */}
          {isPairing && (
            <BlurView intensity={80} style={styles.loadingOverlay}>
              <Animated.View style={styles.loadingSpinner}>
                <Ionicons name="sync" size={24} color="#FFFFFF" />
              </Animated.View>
              <Text style={styles.loadingText}>Finding match...</Text>
            </BlurView>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

CategoryCard.displayName = 'CategoryCard';

// CategoriesGrid Component
const CategoriesGrid = memo<CategoriesGridProps>(({
  children,
  title = 'Available Categories',
  subtitle,
  showSearch = false,
  onSearchChange,
  style,
  contentContainerStyle,
  scrollEnabled = true,
  showsVerticalScrollIndicator = false,
}) => {
  const { height, width } = Dimensions.get('window');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [columns, setColumns] = useState(Utility.getGridColumns());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setColumns(Utility.getGridColumns());
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    return () => subscription?.remove();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  return (
    <SafeAreaView style={[styles.gridSafeArea, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={CONSTANTS.COLORS.LIGHT.BACKGROUND} />
      
      <View style={styles.gridContainer}>
        {/* Animated Header */}
        <Animated.View 
          style={[
            styles.gridHeader,
            {
              opacity: headerOpacity,
              transform: [{ scale: headerScale }],
            },
          ]}
        >
          <Text style={styles.gridTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.gridSubtitle}>{subtitle}</Text>
          )}
        </Animated.View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={CONSTANTS.COLORS.LIGHT.TEXT_TERTIARY} />
            <Text style={styles.searchPlaceholder}>Search categories...</Text>
          </View>
        )}

        {/* Categories Grid */}
        <Animated.ScrollView
          style={styles.gridScrollView}
          contentContainerStyle={[
            styles.gridContent,
            { minHeight: height * 0.8 },
            contentContainerStyle,
          ]}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={CONSTANTS.COLORS.LIGHT.PRIMARY}
              colors={[CONSTANTS.COLORS.LIGHT.PRIMARY]}
            />
          }
        >
          <View style={[styles.categoriesContainer, { gridTemplateColumns: `repeat(${columns}, 1fr)` }]}>
            {children}
          </View>
          
          {/* Empty State */}
          {React.Children.count(children) === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={64} color={CONSTANTS.COLORS.LIGHT.TEXT_TERTIARY} />
              <Text style={styles.emptyStateTitle}>No Categories Available</Text>
              <Text style={styles.emptyStateText}>
                Check back later for new categories or adjust your search criteria.
              </Text>
            </View>
          )}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
});

CategoriesGrid.displayName = 'CategoriesGrid';

// Enhanced Styles
const styles = StyleSheet.create({
  // Card Styles
  cardContainer: {
    margin: CONSTANTS.SPACING.SM,
    borderRadius: CONSTANTS.BORDER_RADIUS.LG,
    ...CONSTANTS.SHADOW.MD,
  },
  pressable: {
    borderRadius: CONSTANTS.BORDER_RADIUS.LG,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: CONSTANTS.SPACING.MD,
    borderRadius: CONSTANTS.BORDER_RADIUS.LG,
    minHeight: CONSTANTS.LAYOUT.CARD_HEIGHT,
  },
  disabledCard: {
    opacity: 0.7,
  },
  
  // Status Styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CONSTANTS.SPACING.SM,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: CONSTANTS.BORDER_RADIUS.ROUND,
    marginRight: CONSTANTS.SPACING.XS,
  },
  statusText: {
    fontSize: 12,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.MEDIUM,
    color: CONSTANTS.COLORS.LIGHT.TEXT_PRIMARY,
    opacity: 0.8,
  },
  
  // Main Content Styles
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconSection: {
    marginRight: CONSTANTS.SPACING.MD,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: CONSTANTS.BORDER_RADIUS.MD,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconText: {
    fontSize: 28,
  },
  featuredBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: CONSTANTS.COLORS.LIGHT.ACCENT,
    borderRadius: CONSTANTS.BORDER_RADIUS.ROUND,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...CONSTANTS.SHADOW.SM,
  },
  
  // Text Content Styles
  textContent: {
    flex: 1,
    marginRight: CONSTANTS.SPACING.SM,
  },
  title: {
    fontSize: 18,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.BOLD,
    color: CONSTANTS.COLORS.LIGHT.TEXT_PRIMARY,
    marginBottom: CONSTANTS.SPACING.XS,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.REGULAR,
    color: CONSTANTS.COLORS.LIGHT.TEXT_SECONDARY,
    marginBottom: CONSTANTS.SPACING.SM,
    lineHeight: 18,
  },
  
  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    marginBottom: CONSTANTS.SPACING.SM,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: CONSTANTS.SPACING.MD,
  },
  statText: {
    fontSize: 12,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.MEDIUM,
    color: CONSTANTS.COLORS.LIGHT.TEXT_SECONDARY,
    marginLeft: CONSTANTS.SPACING.XS,
  },
  
  // Popularity Styles
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CONSTANTS.SPACING.SM,
  },
  popularityBackground: {
    flex: 1,
    height: 4,
    backgroundColor: CONSTANTS.COLORS.LIGHT.BORDER,
    borderRadius: CONSTANTS.BORDER_RADIUS.ROUND,
    marginRight: CONSTANTS.SPACING.SM,
    overflow: 'hidden',
  },
  popularityFill: {
    height: '100%',
    borderRadius: CONSTANTS.BORDER_RADIUS.ROUND,
  },
  popularityText: {
    fontSize: 10,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.BOLD,
    color: CONSTANTS.COLORS.LIGHT.TEXT_TERTIARY,
    minWidth: 24,
    textAlign: 'right',
  },
  
  // Tags Styles
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: CONSTANTS.SPACING.SM,
    paddingVertical: CONSTANTS.SPACING.XS,
    borderRadius: CONSTANTS.BORDER_RADIUS.SM,
    marginRight: CONSTANTS.SPACING.XS,
    marginBottom: CONSTANTS.SPACING.XS,
  },
  tagText: {
    fontSize: 10,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.MEDIUM,
    color: CONSTANTS.COLORS.LIGHT.TEXT_PRIMARY,
  },
  moreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: CONSTANTS.SPACING.SM,
    paddingVertical: CONSTANTS.SPACING.XS,
    borderRadius: CONSTANTS.BORDER_RADIUS.SM,
  },
  moreTagText: {
    fontSize: 10,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.MEDIUM,
    color: CONSTANTS.COLORS.LIGHT.TEXT_TERTIARY,
  },
  
  // Action Indicator
  actionIndicator: {
    marginLeft: 'auto',
  },
  
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: CONSTANTS.BORDER_RADIUS.LG,
  },
  loadingSpinner: {
    marginBottom: CONSTANTS.SPACING.SM,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.MEDIUM,
    color: '#FFFFFF',
  },
  
  // Grid Styles
  gridSafeArea: {
    flex: 1,
    backgroundColor: CONSTANTS.COLORS.LIGHT.BACKGROUND,
  },
  gridContainer: {
    flex: 1,
    maxWidth: CONSTANTS.LAYOUT.MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  gridHeader: {
    paddingHorizontal: CONSTANTS.SPACING.LG,
    paddingTop: CONSTANTS.SPACING.XL,
    paddingBottom: CONSTANTS.SPACING.MD,
  },
  gridTitle: {
    fontSize: 32,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.EXTRABOLD,
    color: CONSTANTS.COLORS.LIGHT.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: CONSTANTS.SPACING.XS,
  },
  gridSubtitle: {
    fontSize: 16,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.REGULAR,
    color: CONSTANTS.COLORS.LIGHT.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CONSTANTS.COLORS.LIGHT.SURFACE,
    marginHorizontal: CONSTANTS.SPACING.LG,
    marginBottom: CONSTANTS.SPACING.LG,
    padding: CONSTANTS.SPACING.MD,
    borderRadius: CONSTANTS.BORDER_RADIUS.LG,
    borderWidth: 1,
    borderColor: CONSTANTS.COLORS.LIGHT.BORDER,
  },
  searchPlaceholder: {
    fontSize: 16,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.REGULAR,
    color: CONSTANTS.COLORS.LIGHT.TEXT_TERTIARY,
    marginLeft: CONSTANTS.SPACING.MD,
  },
  gridScrollView: {
    flex: 1,
  },
  gridContent: {
    padding: CONSTANTS.SPACING.MD,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: CONSTANTS.SPACING.XXL,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.SEMIBOLD,
    color: CONSTANTS.COLORS.LIGHT.TEXT_PRIMARY,
    marginTop: CONSTANTS.SPACING.MD,
    marginBottom: CONSTANTS.SPACING.SM,
	},
  emptyStateText: {
    fontSize: 14,
    fontWeight: CONSTANTS.TYPOGRAPHY.WEIGHT.REGULAR,
    color: CONSTANTS.COLORS.LIGHT.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
});

// Export components
export default CategoryCard;
export { CategoriesGrid, CONSTANTS, Utility };
export type { CategoryCardProps, CategoriesGridProps, CategoryMetrics };