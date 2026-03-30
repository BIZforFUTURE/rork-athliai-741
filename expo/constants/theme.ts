import { Platform } from 'react-native';

export const DS = {
  bg: {
    base: '#080808',
    card: '#121214',
    cardHover: '#1A1A1C',
    inner: '#0E0E10',
    elevated: '#1E1E20',
    overlay: 'rgba(0,0,0,0.7)',
  },
  border: {
    default: 'rgba(255,255,255,0.10)',
    subtle: 'rgba(255,255,255,0.06)',
    accent: 'rgba(204,255,0,0.15)',
    periwinkle: 'rgba(129,140,248,0.15)',
  },
  accent: {
    lime: '#CCFF00',
    limeDim: '#99BF00',
    periwinkle: '#818CF8',
    periwinkleDim: '#6366F1',
    orange: '#FB923C',
    cyan: '#22D3EE',
    red: '#EF4444',
    green: '#22C55E',
    amber: '#FBBF24',
  },
  text: {
    primary: '#E8E8E8',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#52525B',
    inverse: '#080808',
  },
  slate: {
    deep: '#27272A',
    mid: '#3F3F46',
    light: '#52525B',
  },
  radius: {
    card: 16,
    hero: 20,
    button: 12,
    pill: 8,
    inner: 10,
    sm: 6,
  },
  shadow: {
    limeGlow: {
      shadowColor: '#CCFF00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
    },
    limeButtonGlow: {
      shadowColor: '#CCFF00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
    },
    periwinkleGlow: {
      shadowColor: '#818CF8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
    },
    cardSoft: {
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
  },
  stroke: {
    icon: 1.2,
    iconThin: 1,
  },
} as const;

export const GLASS = DS;
export const THEME = DS;
