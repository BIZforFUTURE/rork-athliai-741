import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { X, MapPin, Clock, TrendingUp, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RunMap from './RunMap';
import * as Location from 'expo-location';
import { useLanguage } from '@/providers/LanguageProvider';

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface RunNotificationOverlayProps {
  visible: boolean;
  onClose: () => void;
  distance: number;
  time: number;
  pace: number;
  calories: number;
  currentLocation: Location.LocationObject | null;
  routeCoordinates: RouteCoordinate[];
  isRunning: boolean;
}

export default function RunNotificationOverlay({
  visible,
  onClose,
  distance,
  time,
  pace,
  calories,
  currentLocation,
  routeCoordinates,
  isRunning,
}: RunNotificationOverlayProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceValue: number): string => {
    if (!paceValue || paceValue === 0 || !isFinite(paceValue)) return '0:00';
    const cappedPace = Math.min(paceValue, 99.99);
    const mins = Math.floor(cappedPace);
    const secs = Math.round((cappedPace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>
                {isRunning ? t('run_active') : t('run_complete')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isRunning ? t('run_live_tracking') : t('run_summary_label')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              testID="close-notification-overlay"
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MapPin size={24} color="#3B82F6" />
              <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
              <Text style={styles.statLabel}>{t('run_miles')}</Text>
            </View>
            <View style={styles.statCard}>
              <Clock size={24} color="#10B981" />
              <Text style={styles.statValue}>{formatTime(time)}</Text>
              <Text style={styles.statLabel}>{t('run_time')}</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{formatPace(pace)}</Text>
              <Text style={styles.statLabel}>{t('run_pace_upper')}</Text>
            </View>
            <View style={styles.statCard}>
              <Flame size={24} color="#EF4444" />
              <Text style={styles.statValue}>{calories}</Text>
              <Text style={styles.statLabel}>{t('run_calories_upper')}</Text>
            </View>
          </View>

          {/* Map Section */}
          <View style={styles.mapSection}>
            <RunMap
              currentLocation={currentLocation}
              routeCoordinates={routeCoordinates}
              showMap={true}
              isRunning={isRunning}
              title={isRunning ? t('run_live_route') : t('run_route_summary')}
            />
          </View>

          {/* Status Message */}
          <View style={styles.statusSection}>
            <Text style={styles.statusText}>
              {isRunning 
                ? t('run_tracking_msg')
                : t('run_complete_msg')
              }
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FEFCF9',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FEFCF9',
    opacity: 0.9,
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FEFCF9',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#5A5A5E',
    letterSpacing: 1,
    marginTop: 4,
  },
  mapSection: {
    flex: 1,
    marginBottom: 20,
  },
  statusSection: {
    backgroundColor: '#FEFCF9',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    color: '#5A5A5E',
    textAlign: 'center',
    lineHeight: 24,
  },
});