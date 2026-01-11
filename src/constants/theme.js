import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (iPhone 11/13/14)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export const COLORS = {
  // Grayscale Palette
  primary: '#000000',           // Pure Black
  primaryLight: '#333333',
  primaryDark: '#000000',

  // Secondary Palette (Kept as darker gray)
  secondary: '#222222',
  secondaryLight: '#444444',

  // Background Colors
  background: '#FFFFFF',        // Pure White
  backgroundLight: '#F9F9F9',   // Very light gray for contrast
  cardBackground: '#FFFFFF',

  // Text Colors
  text: '#000000',              // Pure Black for text
  textSecondary: '#444444',     // Dark gray for subtext
  textLight: '#777777',         // Medium gray

  // Functional Colors (High Contrast)
  success: '#000000',           // Using black for success in B&W theme
  successLight: '#333333',
  danger: '#000000',            // Using black for danger (minimalist)
  dangerLight: '#333333',
  warning: '#000000',           // Using black for warning
  warningLight: '#333333',

  // UI Elements
  white: '#FFFFFF',
  gray: '#777777',
  lightGray: '#EEEEEE',
  border: '#E0E0E0',
};

// Gradient Definitions (Minimalist Grayscale)
export const GRADIENTS = {
  sunrise: ['#000000', '#444444'],
  sky: ['#222222', '#666666'],
  warm: ['#333333', '#777777'],
  success: ['#000000', '#333333'],
  danger: ['#000000', '#333333'],
  soft: ['#FFFFFF', '#F9F9F9'],
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
