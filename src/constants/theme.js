import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (iPhone 11/13/14)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Palette Definitions
export const LightColors = {
  primary: '#FF6D00',           // Deep Orange
  primaryLight: '#FFE0B2',
  primaryDark: '#E65100',

  secondary: '#222222',
  secondaryLight: '#444444',

  background: '#FFFFFF',        // Pure White
  backgroundLight: '#F9F9F9',
  cardBackground: '#FFFFFF',

  text: '#000000',
  textSecondary: '#444444',
  textLight: '#777777',

  success: '#000000',
  successLight: '#333333',
  danger: '#000000',
  dangerLight: '#333333',
  warning: '#000000',
  warningLight: '#333333',

  white: '#FFFFFF',
  gray: '#777777',
  lightGray: '#EEEEEE',
  border: '#E0E0E0',
};

export const DarkColors = {
  primary: '#FFB74D',           // Lighter Orange for Dark Mode
  primaryLight: '#FFCC80',
  primaryDark: '#F57C00',

  secondary: '#DDDDDD',
  secondaryLight: '#BBBBBB',

  background: '#121212',        // Deep Black/Gray
  backgroundLight: '#1E1E1E',
  cardBackground: '#2C2C2C',    // Lighter than background for card separation

  text: '#FFFFFF',              // White Text
  textSecondary: '#CCCCCC',     // Lighter Gray for subtext
  textLight: '#AAAAAA',

  success: '#81C784',           // Light Green
  successLight: '#1B5E20',
  danger: '#E57373',            // Light Red
  dangerLight: '#CCCCCC',
  warning: '#FFFFFF',
  warningLight: '#CCCCCC',

  white: '#000000',             // Inverted 'white' logic or keep strict colors? 
  // Better to keep 'white' as #FFFFFF for absolute values, but mapped functional colors.
  // Strategies: using semantic names is better.
  // For now, we allow specific overrides.

  // Specific absolutes if needed
  trueWhite: '#FFFFFF',
  trueBlack: '#000000',

  gray: '#999999',
  lightGray: '#333333',
  border: '#333333',
};

// Default export for backward compatibility
export const COLORS = LightColors;

// Gradient Definitions (Minimalist Grayscale)
// Gradient Definitions (Premium)
export const GRADIENTS = {
  sunrise: ['#FF6D00', '#FFAB40'], // Orange to Gold
  sky: ['#4FC3F7', '#2196F3'],     // Light Blue to Blue
  night: ['#2c3e50', '#000000'],   // Midnight Blue to Black
  sunset: ['#FF512F', '#DD2476'],  // Red-Orange to Pink (Vibrant)
  ocean: ['#2193b0', '#6dd5ed'],   // Blue-Green
  primary: ['#FF6D00', '#F57C00'], // Main Orange Gradient
  darkCard: ['#2C2C2C', '#1E1E1E'], // Subtle dark gradient
};

// Glassmorphism Constants
export const GLASS = {
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
  },
  dark: {
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  frost: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  },
};

export const SPACING = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

export const TYPOGRAPHY = {
  title: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: moderateScale(24),
    fontWeight: '600',
    color: COLORS.text,
  },
  subheading: {
    fontSize: moderateScale(18),
    fontWeight: '500',
    color: COLORS.text,
  },
  body: {
    fontSize: moderateScale(16),
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: moderateScale(24),
  },
  caption: {
    fontSize: moderateScale(14),
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20),
  },
  small: {
    fontSize: moderateScale(12),
    fontWeight: '400',
    color: COLORS.textLight,
  },
};

export const BORDER_RADIUS = {
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  full: 9999,
};

// Shadow Presets for Elevation
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};
