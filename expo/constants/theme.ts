import { Platform } from 'react-native';

export const THEME = {
  bg: {
    base: '#F3EDE4',
    card: '#FEFCF9',
    inner: '#F0EBE3',
    elevated: '#E8E2D9',
  },
  border: {
    subtle: 'rgba(0,0,0,0.05)',
    accent: 'rgba(74,124,89,0.15)',
  },
  accent: {
    sage: '#4A7C59',
    sageDark: '#3A6247',
    coral: '#C4654E',
    coralPrimary: '#C4654E',
    teal: '#4A7C59',
    tealDark: '#3A6247',
    green: '#4A7C59',
    greenPrimary: '#4A7C59',
  },
  text: {
    primary: '#2C2C2C',
    secondary: '#7A7A7A',
    tertiary: '#A8A8A0',
    muted: '#C2BDB4',
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
