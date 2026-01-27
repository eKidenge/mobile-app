// Add this at the top of your video-call.tsx file, after the imports
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;
const IS_MEDIUM_DEVICE = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const IS_LARGE_DEVICE = SCREEN_WIDTH >= 414;
const IS_IPHONE_X = Platform.OS === 'ios' && (SCREEN_HEIGHT >= 812 || SCREEN_WIDTH >= 812);

const TYPOGRAPHY_SIZES = {
  h1: IS_SMALL_DEVICE ? 28 : 32,
  h2: IS_SMALL_DEVICE ? 22 : 24,
  h3: IS_SMALL_DEVICE ? 18 : 20,
  h4: IS_SMALL_DEVICE ? 16 : 18,
  body: IS_SMALL_DEVICE ? 14 : 16,
  caption: IS_SMALL_DEVICE ? 12 : 13,
  micro: 10,
};

const THEME = {
  colors: {
    primary: '#007AFF',
    primaryDark: '#0056CC',
	primaryLight: '#4DA3FF',
    secondary: '#5856D6',
    secondaryDark: '#3634A3',
    secondaryLight: '#7D7CFF',
    success: '#34C759',
    successDark: '#1E7D34',
    successLight: '#5CD983',
    warning: '#FF9500',
    warningDark: '#CC7700',
    warningLight: '#FFB340',
    danger: '#FF3B30',
    dangerDark: '#D70015',
    dangerLight: '#FF6960',
    info: '#5AC8FA',
    infoDark: '#0077CC',
    infoLight: '#87D4FF',
    background: {
      primary: '#000000',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      quaternary: '#3A3A3C',
      overlay: 'rgba(0,0,0,0.7)',
      blur: 'rgba(28,28,30,0.8)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#EBEBF5',
      tertiary: '#EBEBF599',
      quaternary: '#EBEBF54D',
      disabled: '#EBEBF533',
      inverse: '#000000',
    },
    border: {
      light: '#38383A',
      medium: '#48484A',
      dark: '#282828',
    },
    gradient: {
      primary: ['#007AFF', '#0056CC'],
      secondary: ['#5856D6', '#3634A3'],
      success: ['#34C759', '#1E7D34'],
      warning: ['#FF9500', '#CC7700'],
      danger: ['#FF3B30', '#D70015'],
      premium: ['#FF2D55', '#5856D6'],
      night: ['#000000', '#1C1C1E'],
    },
    shadows: {
      small: '0 2px 8px rgba(0,0,0,0.3)',
      medium: '0 4px 16px rgba(0,0,0,0.4)',
      large: '0 8px 32px rgba(0,0,0,0.5)',
    },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  typography: {
    h1: { 
      fontSize: TYPOGRAPHY_SIZES.h1,
      fontWeight: '700',
      lineHeight: TYPOGRAPHY_SIZES.h1 + 6,
      letterSpacing: -0.5,
    },
    h2: { 
      fontSize: TYPOGRAPHY_SIZES.h2,
      fontWeight: '600',
      lineHeight: TYPOGRAPHY_SIZES.h2 + 8,
      letterSpacing: -0.3,
    },
    h3: { 
      fontSize: TYPOGRAPHY_SIZES.h3,
      fontWeight: '600',
      lineHeight: TYPOGRAPHY_SIZES.h3 + 6,
      letterSpacing: -0.2,
    },
    h4: { 
      fontSize: TYPOGRAPHY_SIZES.h4,
      fontWeight: '600',
      lineHeight: TYPOGRAPHY_SIZES.h4 + 6,
    },
    body: { 
      fontSize: TYPOGRAPHY_SIZES.body,
      fontWeight: '400',
      lineHeight: TYPOGRAPHY_SIZES.body + 6,
    },
    bodyBold: { 
      fontSize: TYPOGRAPHY_SIZES.body,
      fontWeight: '600',
      lineHeight: TYPOGRAPHY_SIZES.body + 6,
    },
    caption: { 
      fontSize: TYPOGRAPHY_SIZES.caption,
      fontWeight: '400',
      lineHeight: TYPOGRAPHY_SIZES.caption + 4,
    },
    captionBold: { 
      fontSize: TYPOGRAPHY_SIZES.caption,
      fontWeight: '600',
      lineHeight: TYPOGRAPHY_SIZES.caption + 4,
    },
    micro: { 
      fontSize: TYPOGRAPHY_SIZES.micro,
      fontWeight: '400',
      lineHeight: 12,
    },
    microBold: { 
      fontSize: TYPOGRAPHY_SIZES.micro,
      fontWeight: '600',
      lineHeight: 12,
    },
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 9999,
  },
  animations: {
    duration: {
      quick: 150,
      standard: 300,
      slow: 500,
      verySlow: 800,
    },
    easing: {
      standard: Easing.bezier(0.4, 0.0, 0.2, 1),
      decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
      accelerate: Easing.bezier(0.4, 0.0, 1, 1),
      sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
    },
  },
  layout: {
    headerHeight: IS_IPHONE_X ? 88 : 64,
    tabBarHeight: IS_IPHONE_X ? 83 : 49,
    buttonSize: {
      small: 44,
      medium: 56,
      large: 64,
      xlarge: 80,
    },
    iconSize: {
      small: 16,
      medium: 24,
      large: 32,
      xlarge: 48,
    },
  },
};