import { Platform } from 'react-native';

export const THEME = {
  bg: {
    base: '#FFFFFF',
    card: '#FFFFFF',
    inner: '#F8F8FA',
    elevated: '#F0F0F2',
  },
  border: {
    subtle: 'rgba(0,0,0,0.04)',
    accent: 'rgba(74,124,89,0.15)',
  },
  accent: {
    sage: '#4A7C59',
    sageDark: '#3A6247',
    coral: '#E8725A',
    coralPrimary: '#E8725A',
    teal: '#4A7C59',
    tealDark: '#3A6247',
    green: '#34A853',
    greenPrimary: '#34A853',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#6E6E73',
    tertiary: '#A1A1A6',
    muted: '#C7C7CC',
  },
  radius: {
    card: 20,
    hero: 24,
    button: 20,
    pill: 12,
    inner: 14,
  },
  shadow: {
    cardSoft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
    },
    cardMedium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
    buttonSoft: {
      shadowColor: '#4A7C59',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
    },
  },
} as const;
