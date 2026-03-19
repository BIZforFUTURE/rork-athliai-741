import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  AppState,
  type AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Play, Pause, MapPin, TrendingUp, Flame, X } from "lucide-react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";


import { useApp } from "@/providers/AppProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import { router } from "expo-router";
import RunMap from "@/components/RunMap";
import RunHistorySection from "@/components/RunHistorySection";

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface RunState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedTime: number;
  pauseStartTime?: number;
  elapsedTime: number;
  distance: number;
  routeCoordinates: RouteCoordinate[];
  currentLocation: Location.LocationObject | null;
}

const STORAGE_KEY = 'activeRunState';

export default function RunScreen() {
  const { addRun, recentRuns, subtractCaloriesFromRun, runStorage } = useApp();
  const { sendRunStartNotification, cancelRunNotification, sendRunCompletionNotification } = useNotifications();
  const { isPremium } = useRevenueCat();
  const insets = useSafeAreaInsets();

  // Core run state
  const [runState, setRunState] = useState<RunState>({
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    elapsedTime: 0,
    distance: 0,
    routeCoordinates: [],
    currentLocation: null,
  });

  // UI state
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [lastRunCalories, setLastRunCalories] = useState(0);
  const [runNotificationId, setRunNotificationId] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  // Calculate distance between two coordinates
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Calculate total route distance
  const calculateRouteDistance = useCallback((coordinates: RouteCoordinate[]): number => {
    if (coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const dist = calculateDistance(
        coordinates[i - 1].latitude,
        coordinates[i - 1].longitude,
        coordinates[i].latitude,
        coordinates[i].longitude
      );
      totalDistance += dist;
    }
    
    return totalDistance;
  }, [calculateDistance]);

  // Save run state to storage
  const saveRunState = useCallback(async (state: RunState) => {
    try {
      const stateJson = JSON.stringify(state);
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEY, stateJson);
      } else {
        await runStorage.setItem(STORAGE_KEY, stateJson);
      }
    } catch (error) {
      console.error('Error saving run state:', error);
    }
  }, [runStorage]);

  // Load run state from storage
  const loadRunState = useCallback(async () => {
    try {
      let stateJson: string | null = null;
      if (Platform.OS === 'web') {
        stateJson = localStorage.getItem(STORAGE_KEY);
      } else {
        stateJson = await runStorage.getItem(STORAGE_KEY);
      }

      if (stateJson) {
        const savedState: RunState = JSON.parse(stateJson);
        if (savedState.isRunning && savedState.startTime) {
          // Resume run
          const currentTime = Date.now();
          const elapsedTime = savedState.isPaused 
            ? savedState.elapsedTime
            : Math.floor((currentTime - savedState.startTime - savedState.pausedTime) / 1000);
          
          setRunState({
            ...savedState,
            elapsedTime,
          });

          // Resume timer only if not paused
          if (!savedState.isPaused) {
            timerRef.current = setInterval(() => {
              setRunState(prev => ({
                ...prev,
                elapsedTime: prev.elapsedTime + 1,
              }));
            }, 1000);

            // Resume location tracking
            await startLocationTracking();
          }
        }
      }
    } catch (error) {
      console.error('Error loading run state:', error);
    }
  }, [runStorage]);

  // Clear run state from storage
  const clearRunState = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        await runStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error clearing run state:', error);
    }
  }, [runStorage]);

  // Optimize route coordinates for performance
  const optimizeRouteCoordinates = useCallback((coordinates: RouteCoordinate[]): RouteCoordinate[] => {
    if (coordinates.length <= 100) return coordinates;
    
    // Keep first and last points, then sample every nth point for middle section
    const samplingRate = Math.ceil(coordinates.length / 80); // Target ~80 points max
    const optimized = [coordinates[0]]; // Always keep start
    
    for (let i = samplingRate; i < coordinates.length - 1; i += samplingRate) {
      optimized.push(coordinates[i]);
    }
    
    optimized.push(coordinates[coordinates.length - 1]); // Always keep end
    return optimized;
  }, []);

  // Start location tracking
  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web simulation
      let lat = 37.7749;
      let lng = -122.4194;
      
      const simulateLocation = () => {
        lat += (Math.random() - 0.5) * 0.0001;
        lng += (Math.random() - 0.5) * 0.0001;
        
        const newLocation: Location.LocationObject = {
          coords: {
            latitude: lat,
            longitude: lng,
            altitude: 0,
            accuracy: 5,
            altitudeAccuracy: 5,
            heading: 0,
            speed: 3,
          },
          timestamp: Date.now(),
        };

        setRunState(prev => {
          const newCoordinate = { latitude: lat, longitude: lng };
          const newRoute = [...prev.routeCoordinates, newCoordinate];
          const newDistance = calculateRouteDistance(newRoute);

          return {
            ...prev,
            currentLocation: newLocation,
            routeCoordinates: newRoute,
            distance: newDistance,
          };
        });
      };

      const interval = setInterval(simulateLocation, 2000);
      return () => clearInterval(interval);
    } else {
      // Real location tracking
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // Reduced from 1000ms to 2000ms
          distanceInterval: 3, // Increased from 1m to 3m
        },
        (newLocation: Location.LocationObject) => {
          setRunState(prev => {
            const newCoordinate = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };

            // Only add if we've moved significantly
            let newRoute = prev.routeCoordinates;
            if (prev.routeCoordinates.length === 0) {
              newRoute = [newCoordinate];
            } else {
              const lastCoordinate = prev.routeCoordinates[prev.routeCoordinates.length - 1];
              const distanceFromLast = calculateDistance(
                lastCoordinate.latitude,
                lastCoordinate.longitude,
                newCoordinate.latitude,
                newCoordinate.longitude
              );

              // Increased minimum distance to reduce coordinate density
              if (distanceFromLast > 0.003) { // ~5 meters instead of 1.6 meters
                newRoute = [...prev.routeCoordinates, newCoordinate];
              }
            }

            const newDistance = calculateRouteDistance(newRoute);

            return {
              ...prev,
              currentLocation: newLocation,
              routeCoordinates: newRoute,
              distance: newDistance,
            };
          });
        }
      );
    }
  }, [calculateDistance, calculateRouteDistance]);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  }, []);

  // Start run
  const startRun = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    // Request location permission
    if (Platform.OS !== "web") {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "We need location access to track your run.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Request background location permission
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Background Location Required',
            'Background location access is needed to continue tracking when the app is closed.',
            [{ text: 'OK' }]
          );
        }
      }
    }

    const startTime = Date.now();
    const newRunState: RunState = {
      isRunning: true,
      isPaused: false,
      startTime,
      pausedTime: 0,
      elapsedTime: 0,
      distance: 0,
      routeCoordinates: [],
      currentLocation: null,
    };

    setRunState(newRunState);
    await saveRunState(newRunState);

    // Start foreground timer (for UI updates)
    timerRef.current = setInterval(() => {
      setRunState(prev => {
        // Calculate elapsed time from start time for accuracy
        const currentTime = Date.now();
        const actualElapsedTime = Math.floor((currentTime - startTime - prev.pausedTime) / 1000);
        const updated = { ...prev, elapsedTime: actualElapsedTime };
        saveRunState(updated);
        return updated;
      });
    }, 1000);

    // Start location tracking
    await startLocationTracking();

    // Send notification
    const notificationId = await sendRunStartNotification();
    setRunNotificationId(notificationId);
  };

  // Stop run
  const stopRun = async () => {
    if (isStopping) return;
    setIsStopping(true);

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop location tracking
    stopLocationTracking();

    // Cancel notification
    if (runNotificationId) {
      await cancelRunNotification(runNotificationId);
      setRunNotificationId(null);
    }

    // Get final elapsed time from actual time difference
    const finalElapsedTime = runState.startTime 
      ? Math.floor((Date.now() - runState.startTime - runState.pausedTime) / 1000)
      : runState.elapsedTime;

    // Clear storage
    await clearRunState();

    if (finalElapsedTime > 0) {
      const pace = runState.distance > 0 ? finalElapsedTime / 60 / runState.distance : 0;
      const calories = Math.round(runState.distance * 112.5); // ~112.5 cal/mile for 150lb person

      // Save run
      addRun({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        distance: runState.distance,
        time: finalElapsedTime,
        pace,
        calories,
        routeCoordinates: runState.routeCoordinates,
      });

      setLastRunCalories(calories);
      setShowCalorieModal(true);

      // Send completion notification
      await sendRunCompletionNotification(runState.distance, finalElapsedTime / 60);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    // Reset state
    setRunState({
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedTime: 0,
      elapsedTime: 0,
      distance: 0,
      routeCoordinates: [],
      currentLocation: null,
    });

    setIsStopping(false);
  };

  // Pause run
  const pauseRun = async () => {
    if (!runState.isRunning || runState.isPaused) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop location tracking
    stopLocationTracking();

    // Update state to paused
    const pauseStartTime = Date.now();
    const updatedState = {
      ...runState,
      isPaused: true,
      pauseStartTime,
    };

    setRunState(updatedState);
    await saveRunState(updatedState);
  };

  // Resume run
  const resumeRun = async () => {
    if (!runState.isRunning || !runState.isPaused) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Calculate total paused time
    const pauseEndTime = Date.now();
    const pauseDuration = runState.pauseStartTime 
      ? pauseEndTime - runState.pauseStartTime 
      : 0;
    
    const updatedState = {
      ...runState,
      isPaused: false,
      pausedTime: runState.pausedTime + pauseDuration,
      pauseStartTime: undefined,
    };

    setRunState(updatedState);
    await saveRunState(updatedState);

    // Resume timer
    timerRef.current = setInterval(() => {
      setRunState(prev => {
        const currentTime = Date.now();
        const actualElapsedTime = Math.floor((currentTime - prev.startTime! - prev.pausedTime) / 1000);
        const updated = { ...prev, elapsedTime: actualElapsedTime };
        saveRunState(updated);
        return updated;
      });
    }, 1000);

    // Resume location tracking
    await startLocationTracking();
  };

  // Handle calorie subtraction
  const handleSubtractCalories = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    subtractCaloriesFromRun(lastRunCalories);
    setShowCalorieModal(false);
    Alert.alert(
      "Calories Subtracted",
      `${lastRunCalories} calories have been subtracted from your daily intake.`,
      [{ text: "OK" }]
    );
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format pace
  const formatPace = (paceValue: number): string => {
    if (!paceValue || paceValue === 0 || !isFinite(paceValue)) return "0:00";
    const cappedPace = Math.min(paceValue, 99.99);
    const mins = Math.floor(cappedPace);
    const secs = Math.round((cappedPace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate current pace
  const currentPace = runState.distance > 0 && runState.elapsedTime > 0 
    ? runState.elapsedTime / 60 / runState.distance 
    : 0;

  // Load saved state on mount
  useEffect(() => {
    loadRunState();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - sync timer with actual elapsed time
        setRunState(prev => {
          if (prev.isRunning && prev.startTime && !prev.isPaused) {
            const currentTime = Date.now();
            const actualElapsedTime = Math.floor((currentTime - prev.startTime - prev.pausedTime) / 1000);
            console.log('Syncing timer on foreground:', actualElapsedTime);
            return { ...prev, elapsedTime: actualElapsedTime };
          }
          return prev;
        });
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopLocationTracking();
      subscription?.remove();
    };
  }, []);

  // Sync timer periodically when app is active
  useEffect(() => {
    if (runState.isRunning && runState.startTime && !runState.isPaused) {
      const syncInterval = setInterval(() => {
        const currentTime = Date.now();
        const actualElapsedTime = Math.floor((currentTime - runState.startTime! - runState.pausedTime) / 1000);
        
        setRunState(prev => {
          if (Math.abs(prev.elapsedTime - actualElapsedTime) > 2) {
            console.log('Correcting timer drift:', actualElapsedTime);
            return { ...prev, elapsedTime: actualElapsedTime };
          }
          return prev;
        });
      }, 5000); // Check every 5 seconds

      return () => clearInterval(syncInterval);
    }
  }, [runState.isRunning, runState.startTime, runState.isPaused]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Run Tracker</Text>
        <Text style={styles.headerSubtitle}>Ready to run?</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text style={styles.timeLabel}>TIME</Text>
          <Text style={styles.timeValue}>{formatTime(runState.elapsedTime)}</Text>
          {runState.isPaused && (
            <View style={styles.pausedIndicator}>
              <Pause size={16} color="#F59E0B" />
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}
        </View>

        <RunMap
          currentLocation={runState.currentLocation}
          routeCoordinates={optimizeRouteCoordinates(runState.routeCoordinates)}
          showMap={runState.isRunning}
          isRunning={runState.isRunning && !runState.isPaused}
        />

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MapPin size={20} color="#00ADB5" />
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>{runState.distance.toFixed(2)}</Text>
            <Text style={styles.statUnit}>miles</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#14B8A6" />
            <Text style={styles.statLabel}>PACE</Text>
            <Text style={styles.statValue}>{formatPace(currentPace)}</Text>
            <Text style={styles.statUnit}>min/mi</Text>
          </View>
        </View>

        {runState.isRunning ? (
          <View style={styles.runningButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                runState.isPaused ? styles.resumeButton : styles.pauseButton
              ]}
              onPress={runState.isPaused ? resumeRun : pauseRun}
            >
              {runState.isPaused ? (
                <>
                  <Play size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>RESUME</Text>
                </>
              ) : (
                <>
                  <Pause size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>PAUSE</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.stopButton,
                isStopping && styles.disabledButton
              ]}
              onPress={stopRun}
              disabled={isStopping}
            >
              <Text style={styles.actionButtonText}>
                {isStopping ? 'STOPPING...' : 'STOP'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startRun}
          >
            <Play size={28} color="#FFFFFF" />
            <Text style={styles.startButtonText}>START RUN</Text>
          </TouchableOpacity>
        )}

        <RunHistorySection 
          runs={recentRuns}
          onRunPress={(runId) => router.push(`/run-details/${runId}`)}
          formatTime={formatTime}
          formatPace={formatPace}
        />
      </ScrollView>

      <Modal
        visible={showCalorieModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalorieModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCalorieModal(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            
            <View style={styles.modalIcon}>
              <Flame size={48} color="#F59E0B" />
            </View>
            
            <Text style={styles.modalTitle}>Great Run!</Text>
            <Text style={styles.modalText}>
              You burned {lastRunCalories} calories
            </Text>
            <Text style={styles.modalSubtext}>
              Would you like to subtract these calories from your daily intake?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowCalorieModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>No Thanks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSubtractCalories}
              >
                <Text style={styles.modalButtonTextPrimary}>Subtract</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: "#0D0F13",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#F9FAFB",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  mainCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timeLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    letterSpacing: 2,
    fontWeight: "500" as const,
  },
  timeValue: {
    fontSize: 64,
    fontWeight: "600" as const,
    color: "#F9FAFB",
    marginTop: 10,
  },
  pausedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1F2329",
    borderRadius: 20,
    gap: 6,
  },
  pausedText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#F59E0B",
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    letterSpacing: 1,
    marginTop: 10,
    fontWeight: "500" as const,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "600" as const,
    color: "#F9FAFB",
    marginTop: 5,
  },
  statUnit: {
    fontSize: 13,
    color: "#6B7280",
  },
  startButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    marginTop: 30,
    gap: 10,
  },
  runningButtonsContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 30,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  pauseButton: {
    backgroundColor: "#F59E0B",
  },
  resumeButton: {
    backgroundColor: "#00ADB5",
  },
  stopButton: {
    backgroundColor: "#EF4444",
  },
  disabledButton: {
    backgroundColor: "#6B7280",
    opacity: 0.7,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600" as const,
    letterSpacing: 1,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#171B22",
    borderRadius: 16,
    padding: 30,
    width: "85%",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600" as const,
    color: "#F9FAFB",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 18,
    color: "#F59E0B",
    fontWeight: "600" as const,
    marginBottom: 10,
  },
  modalSubtext: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonPrimary: {
    backgroundColor: "#00ADB5",
  },
  modalButtonSecondary: {
    backgroundColor: "#1F2329",
  },
  modalButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  modalButtonTextSecondary: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});