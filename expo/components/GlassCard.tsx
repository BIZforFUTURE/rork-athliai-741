import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderColor?: string;
  highlight?: boolean;
  testID?: string;
}

const GlassCard = React.memo(({
  children,
  style,
  intensity = 40,
  tint = 'dark',
  borderColor = 'rgba(255,255,255,0.12)',
  highlight = true,
  testID,
}: GlassCardProps) => {
  if (Platform.OS === 'web') {
    return (
      <View
        testID={testID}
        style={[
          glassStyles.container,
          {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor,
            borderWidth: 1,
            // @ts-ignore - web only
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
          style,
        ]}
      >
        {highlight && <View style={glassStyles.topHighlight} />}
        {children}
      </View>
    );
  }

  return (
    <View testID={testID} style={[glassStyles.outerWrap, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFill, glassStyles.blur]}
      />
      <View style={[glassStyles.innerBorder, { borderColor }]} />
      {highlight && (
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)', 'transparent']}
          style={glassStyles.topSheen}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
      )}
      <View style={glassStyles.content}>
        {children}
      </View>
    </View>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;

const glassStyles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  outerWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: 24,
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  content: {
    padding: 20,
  },
});
