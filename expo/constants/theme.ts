import { Platform } from 'react-native';

export const THEME = {
  bg: {
    base: '#050505',
    card: '#121214',
    inner: '#1A1A1C',
    elevated: '#222224',
  },
  border: {
    subtle: 'rgba(255,255,255,0.10)',
    accent: 'rgba(204,255,0,0.2)',
  },
  accent: {
    lime: '#CCFF00',
    limeDark: '#99CC00',
    orange: '#FF4D00',
    orangePrimary: '#FF4D00',
    teal: '#CCFF00',
    tealDark: '#99CC00',
    green: '#34D058',
    greenPrimary: '#34D058',
  },
  text: {
    primary: '#E8E8E8',
    secondary: '#8E8E93',
    tertiary: '#5A5A5E',
    muted: '#3A3A3C',
  },
  radius: {
    card: 24,
    hero: 28,
    button: 24,
    pill: 12,
    inner: 16,
  },
  shadow: {
    limeGlow: {
      shadowColor: '#CCFF00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
    },
    limeButtonGlow: {
      shadowColor: 'rgba(204,255,0,0.35)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 16,
      ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
    },
    orangeGlow: {
      shadowColor: 'rgba(255,77,0,0.3)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 8,
      ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
    },
    cardSoft: {
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
  },
} as const;
