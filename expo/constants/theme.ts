import { Platform } from 'react-native';

export const THEME = {
  bg: {
    base: '#091517',
    card: '#0F2224',
    inner: '#152C2E',
    elevated: '#1A3335',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    accent: 'rgba(78,205,196,0.2)',
  },
  accent: {
    teal: '#4ECDC4',
    tealDark: '#2A9D8F',
    green: '#22C55E',
    greenPrimary: '#22C55E',
    orange: '#F97316',
  },
  text: {
    primary: '#F5F5F5',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    muted: '#374151',
  },
  radius: {
    card: 20,
    hero: 24,
    button: 20,
    pill: 12,
    inner: 16,
  },
  shadow: {
    tealGlow: {
      shadowColor: '#4ECDC4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
    },
    tealButtonGlow: {
      shadowColor: 'rgba(78,205,196,0.35)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 16,
      ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
    },
    greenGlow: {
      shadowColor: 'rgba(34,197,94,0.3)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 8,
      ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
    },
    cardSoft: {
      shadowColor: 'rgba(0,0,0,0.4)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
  },
} as const;
