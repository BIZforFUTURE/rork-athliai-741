import { Platform } from 'react-native';

export const GLASS = {
  bg: {
    base: '#0A0E1A',
    deep: '#060A14',
    card: 'rgba(255,255,255,0.05)',
    cardSolid: '#121828',
    inner: 'rgba(255,255,255,0.03)',
    elevated: 'rgba(255,255,255,0.08)',
  },
  border: {
    glass: 'rgba(255,255,255,0.10)',
    glassLight: 'rgba(255,255,255,0.15)',
    accent: 'rgba(0,229,255,0.2)',
    subtle: 'rgba(255,255,255,0.06)',
  },
  accent: {
    cyan: '#00E5FF',
    cyanDark: '#0097A7',
    teal: '#4ECDC4',
    tealDark: '#2A9D8F',
    green: '#22C55E',
    greenPrimary: '#22C55E',
    orange: '#F97316',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
  text: {
    primary: '#F0F4FF',
    secondary: '#8B95B0',
    tertiary: '#5A6480',
    muted: '#3D4560',
  },
  radius: {
    card: 24,
    hero: 28,
    button: 24,
    pill: 14,
    inner: 18,
  },
  shadow: {
    glassGlow: {
      shadowColor: '#00E5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
    },
    tealGlow: {
      shadowColor: '#4ECDC4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
    },
    tealButtonGlow: {
      shadowColor: 'rgba(78,205,196,0.35)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 20,
      ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
    },
    greenGlow: {
      shadowColor: 'rgba(34,197,94,0.3)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
    },
    cardSoft: {
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
  },
} as const;

export const THEME = GLASS;
