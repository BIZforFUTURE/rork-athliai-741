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
  Animated,
  Pressable,
  Image,
  type AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Play, Pause, TrendingUp, Flame, X, Zap, Route, Camera } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useApp } from "@/providers/AppProvider";
import { XP_REWARDS } from "@/constants/xp";
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
  const { addRun, recentRuns, subtractCaloriesFromRun, runStorage, xpInfo } = useApp();
  const { sendRunStartNotification, cancelRunNotification, sendRunCompletionNotification } = useNotifications();
  const { isPremium } = useRevenueCat();
  const insets = useSafeAreaInsets();

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

  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [lastRunCalories, setLastRunCalories] = useState(0);
  const [runNotificationId, setRunNotificationId] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [treadmillPhoto, setTreadmillPhoto] = useState<string | null>(null);
  const [_showPhotoPreview, setShowPhotoPreview] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  useEffect(() => {
    if (runState.isRunning && !runState.isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [runState.isRunning, runState.isPaused, pulseAnim]);

  const handleButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [buttonScale]);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

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
          const currentTime = Date.now();
          const elapsedTime = savedState.isPaused
            ? savedState.elapsedTime
            : Math.floor((currentTime - savedState.startTime - savedState.pausedTime) / 1000);

          setRunState({
            ...savedState,
            elapsedTime,
          });

          if (!savedState.isPaused) {
            timerRef.current = setInterval(() => {
              setRunState(prev => ({
                ...prev,
                elapsedTime: prev.elapsedTime + 1,
              }));
            }, 1000);
            await startLocationTracking();
          }
        }
      }
    } catch (error) {
      console.error('Error loading run state:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStorage]);

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

  const optimizeRouteCoordinates = useCallback((coordinates: RouteCoordinate[]): RouteCoordinate[] => {
    if (coordinates.length <= 100) return coordinates;
    const samplingRate = Math.ceil(coordinates.length / 80);
    const optimized = [coordinates[0]];
    for (let i = samplingRate; i < coordinates.length - 1; i += samplingRate) {
      optimized.push(coordinates[i]);
    }
    optimized.push(coordinates[coordinates.length - 1]);
    return optimized;
  }, []);

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === 'web') {
      let lat = 37.7749;
      let lng = -122.4194;
      const simulateLocation = () => {
        lat += (Math.random() - 0.5) * 0.0001;
        lng += (Math.random() - 0.5) * 0.0001;
        const newLocation: Location.LocationObject = {
          coords: { latitude: lat, longitude: lng, altitude: 0, accuracy: 5, altitudeAccuracy: 5, heading: 0, speed: 3 },
          timestamp: Date.now(),
        };
        setRunState(prev => {
          const newCoordinate = { latitude: lat, longitude: lng };
          const newRoute = [...prev.routeCoordinates, newCoordinate];
          const newDistance = calculateRouteDistance(newRoute);
          return { ...prev, currentLocation: newLocation, routeCoordinates: newRoute, distance: newDistance };
        });
      };
      const interval = setInterval(simulateLocation, 2000);
      return () => clearInterval(interval);
    } else {
      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
        (newLocation: Location.LocationObject) => {
          setRunState(prev => {
            const newCoordinate = { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude };
            let newRoute = prev.routeCoordinates;
            if (prev.routeCoordinates.length === 0) {
              newRoute = [newCoordinate];
            } else {
              const lastCoordinate = prev.routeCoordinates[prev.routeCoordinates.length - 1];
              const distanceFromLast = calculateDistance(lastCoordinate.latitude, lastCoordinate.longitude, newCoordinate.latitude, newCoordinate.longitude);
              if (distanceFromLast > 0.003) {
                newRoute = [...prev.routeCoordinates, newCoordinate];
              }
            }
            const newDistance = calculateRouteDistance(newRoute);
            return { ...prev, currentLocation: newLocation, routeCoordinates: newRoute, distance: newDistance };
          });
        }
      );
    }
  }, [calculateDistance, calculateRouteDistance]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  }, []);

  const startRun = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (Platform.OS !== "web") {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Permission Required", "We need location access to track your run.", [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Location.requestForegroundPermissionsAsync() }
        ]);
        return;
      }
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Background Location Required', 'Background location access is needed to continue tracking when the app is closed.', [{ text: 'OK' }]);
        }
      }
    }

    const startTime = Date.now();
    const newRunState: RunState = {
      isRunning: true, isPaused: false, startTime, pausedTime: 0,
      elapsedTime: 0, distance: 0, routeCoordinates: [], currentLocation: null,
    };
    setRunState(newRunState);
    await saveRunState(newRunState);

    timerRef.current = setInterval(() => {
      setRunState(prev => {
        const currentTime = Date.now();
        const actualElapsedTime = Math.floor((currentTime - startTime - prev.pausedTime) / 1000);
        const updated = { ...prev, elapsedTime: actualElapsedTime };
        void saveRunState(updated);
        return updated;
      });
    }, 1000);

    void startLocationTracking();
    const notificationId = await sendRunStartNotification();
    setRunNotificationId(notificationId);
  };

  const stopRun = async () => {
    if (isStopping) return;
    setIsStopping(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopLocationTracking();
    if (runNotificationId) { await cancelRunNotification(runNotificationId); setRunNotificationId(null); }

    const finalElapsedTime = runState.startTime
      ? Math.floor((Date.now() - runState.startTime - runState.pausedTime) / 1000)
      : runState.elapsedTime;

    await clearRunState();

    if (finalElapsedTime > 0) {
      const pace = runState.distance > 0 ? finalElapsedTime / 60 / runState.distance : 0;
      const calories = Math.round(runState.distance * 112.5);
      addRun({
        id: Date.now().toString(), date: new Date().toISOString(),
        distance: runState.distance, time: finalElapsedTime,
        pace, calories, routeCoordinates: runState.routeCoordinates,
        photos: treadmillPhoto ? [treadmillPhoto] : undefined,
        treadmillVerified: !!treadmillPhoto,
      });
      setLastRunCalories(calories);
      setShowCalorieModal(true);
      await sendRunCompletionNotification(runState.distance, finalElapsedTime / 60);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    setRunState({
      isRunning: false, isPaused: false, startTime: null, pausedTime: 0,
      elapsedTime: 0, distance: 0, routeCoordinates: [], currentLocation: null,
    });
    setTreadmillPhoto(null);
    setIsStopping(false);
  };

  const pauseRun = async () => {
    if (!runState.isRunning || runState.isPaused) return;
    if (Platform.OS !== 'web') { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopLocationTracking();
    const pauseStartTime = Date.now();
    const updatedState = { ...runState, isPaused: true, pauseStartTime };
    setRunState(updatedState);
    await saveRunState(updatedState);
  };

  const resumeRun = async () => {
    if (!runState.isRunning || !runState.isPaused) return;
    if (Platform.OS !== 'web') { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
    const pauseEndTime = Date.now();
    const pauseDuration = runState.pauseStartTime ? pauseEndTime - runState.pauseStartTime : 0;
    const updatedState = { ...runState, isPaused: false, pausedTime: runState.pausedTime + pauseDuration, pauseStartTime: undefined };
    setRunState(updatedState);
    await saveRunState(updatedState);

    timerRef.current = setInterval(() => {
      setRunState(prev => {
        const currentTime = Date.now();
        const actualElapsedTime = Math.floor((currentTime - prev.startTime! - prev.pausedTime) / 1000);
        const updated = { ...prev, elapsedTime: actualElapsedTime };
        void saveRunState(updated);
        return updated;
      });
    }, 1000);
    void startLocationTracking();
  };

  const handleSubtractCalories = async () => {
    if (Platform.OS !== 'web') { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
    subtractCaloriesFromRun(lastRunCalories);
    setShowCalorieModal(false);
    Alert.alert("Calories Subtracted", `${lastRunCalories} calories have been subtracted from your daily intake.`, [{ text: "OK" }]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPace = (paceValue: number): string => {
    if (!paceValue || paceValue === 0 || !isFinite(paceValue)) return "0:00";
    const cappedPace = Math.min(paceValue, 99.99);
    const mins = Math.floor(cappedPace);
    const secs = Math.round((cappedPace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentPace = runState.distance > 0 && runState.elapsedTime > 0
    ? runState.elapsedTime / 60 / runState.distance
    : 0;

  const currentCalories = Math.round(runState.distance * 112.5);

  const handleTreadmillPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const showOptions = () => {
      Alert.alert(
        "Snap Treadmill",
        "Take a photo of your treadmill display to verify your run and earn bonus XP!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Take Photo", onPress: handleCameraCapture },
          { text: "Choose from Library", onPress: handleLibraryPick },
        ]
      );
    };

    const handleCameraCapture = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to snap your treadmill.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          setTreadmillPhoto(result.assets[0].uri);
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      } catch (error) {
        console.error("Error taking treadmill photo:", error);
        Alert.alert("Error", "Failed to take photo. Please try again.");
      }
    };

    const handleLibraryPick = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Photo library access is needed.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          setTreadmillPhoto(result.assets[0].uri);
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      } catch (error) {
        console.error("Error picking treadmill photo:", error);
        Alert.alert("Error", "Failed to pick photo. Please try again.");
      }
    };

    showOptions();
  }, []);

  useEffect(() => {
    void loadRunState();
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setRunState(prev => {
          if (prev.isRunning && prev.startTime && !prev.isPaused) {
            const currentTime = Date.now();
            const actualElapsedTime = Math.floor((currentTime - prev.startTime - prev.pausedTime) / 1000);
            return { ...prev, elapsedTime: actualElapsedTime };
          }
          return prev;
        });
      }
      appState.current = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); }
      stopLocationTracking();
      subscription?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (runState.isRunning && runState.startTime && !runState.isPaused) {
      const syncInterval = setInterval(() => {
        const currentTime = Date.now();
        const actualElapsedTime = Math.floor((currentTime - runState.startTime! - runState.pausedTime) / 1000);
        setRunState(prev => {
          if (Math.abs(prev.elapsedTime - actualElapsedTime) > 2) {
            return { ...prev, elapsedTime: actualElapsedTime };
          }
          return prev;
        });
      }, 5000);
      return () => clearInterval(syncInterval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runState.isRunning, runState.startTime, runState.isPaused]);

  const timeDialSize = 140;
  const timeStroke = 6;
  const timeR = (timeDialSize - timeStroke) / 2;
  const timeCirc = 2 * Math.PI * timeR;
  const maxRunTime = 3600;
  const timeProgress = Math.min(runState.elapsedTime / maxRunTime, 1);
  const timeOffset = timeCirc * (1 - timeProgress);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.screenTitle}>Run</Text>
          <Text style={styles.screenSubtitle}>
            {runState.isRunning ? (runState.isPaused ? "Paused" : "Running...") : "Ready to go?"}
          </Text>
        </View>
        <View style={[styles.xpChip, { backgroundColor: xpInfo.rank.color + "15", borderColor: xpInfo.rank.color + "30" }]}>
          <Zap size={12} color={xpInfo.rank.color} />
          <Text style={[styles.xpChipText, { color: xpInfo.rank.color }]}>+25 XP</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.timerCard, { opacity: fadeIn, transform: [{ translateY: slideUp }, { scale: pulseAnim }] }]}>
          <View style={styles.timerDialWrap}>
            <Svg width={timeDialSize} height={timeDialSize}>
              <Circle
                cx={timeDialSize / 2} cy={timeDialSize / 2} r={timeR}
                stroke="rgba(0,229,255,0.06)" strokeWidth={timeStroke} fill="none"
              />
              {runState.isRunning && (
                <Circle
                  cx={timeDialSize / 2} cy={timeDialSize / 2} r={timeR}
                  stroke="#00E5FF" strokeWidth={timeStroke} fill="none"
                  strokeDasharray={`${timeCirc}`} strokeDashoffset={timeOffset}
                  strokeLinecap="round" transform={`rotate(-90 ${timeDialSize / 2} ${timeDialSize / 2})`}
                />
              )}
            </Svg>
            <View style={styles.timerInner}>
              <Text style={styles.timerValue}>{formatTime(runState.elapsedTime)}</Text>
              <Text style={styles.timerLabel}>TIME</Text>
            </View>
          </View>

          {runState.isPaused && (
            <View style={styles.pausedChip}>
              <Pause size={12} color="#F59E0B" />
              <Text style={styles.pausedChipText}>PAUSED</Text>
            </View>
          )}
        </Animated.View>

        <RunMap
          currentLocation={runState.currentLocation}
          routeCoordinates={optimizeRouteCoordinates(runState.routeCoordinates)}
          showMap={runState.isRunning}
          isRunning={runState.isRunning && !runState.isPaused}
        />

        <Animated.View style={[styles.statsRow, { opacity: fadeIn }]}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(0,229,255,0.08)" }]}>
              <Route size={14} color="#00E5FF" />
            </View>
            <Text style={styles.statValue}>{runState.distance.toFixed(2)}</Text>
            <Text style={styles.statUnit}>miles</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(191,255,0,0.08)" }]}>
              <TrendingUp size={14} color="#BFFF00" />
            </View>
            <Text style={styles.statValue}>{formatPace(currentPace)}</Text>
            <Text style={styles.statUnit}>min/mi</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(255,107,53,0.08)" }]}>
              <Flame size={14} color="#FF6B35" />
            </View>
            <Text style={styles.statValue}>{currentCalories}</Text>
            <Text style={styles.statUnit}>cal</Text>
          </View>
        </Animated.View>

        {runState.isRunning && (
          <View style={styles.treadmillSection}>
            {treadmillPhoto ? (
              <TouchableOpacity
                style={styles.treadmillPhotoPreview}
                onPress={() => setShowPhotoPreview(true)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: treadmillPhoto }} style={styles.treadmillThumb} />
                <View style={styles.treadmillPhotoInfo}>
                  <View style={styles.treadmillVerifiedBadge}>
                    <Camera size={12} color="#00E5FF" />
                    <Text style={styles.treadmillVerifiedText}>Treadmill Verified</Text>
                  </View>
                  <Text style={styles.treadmillXpText}>+{XP_REWARDS.TREADMILL_PHOTO} XP earned</Text>
                </View>
                <TouchableOpacity
                  style={styles.treadmillPhotoRemove}
                  onPress={() => {
                    setTreadmillPhoto(null);
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <X size={14} color="#9CA3AF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.treadmillBtn}
                onPress={handleTreadmillPhoto}
                activeOpacity={0.7}
              >
                <View style={styles.treadmillBtnIcon}>
                  <Camera size={18} color="#00E5FF" />
                </View>
                <View style={styles.treadmillBtnTextWrap}>
                  <Text style={styles.treadmillBtnTitle}>Snap Treadmill</Text>
                  <Text style={styles.treadmillBtnSub}>Photo your machine for +{XP_REWARDS.TREADMILL_PHOTO} XP</Text>
                </View>
                <View style={styles.treadmillBtnXp}>
                  <Zap size={10} color="#00E5FF" fill="#00E5FF" />
                  <Text style={styles.treadmillBtnXpText}>+{XP_REWARDS.TREADMILL_PHOTO}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {runState.isRunning ? (
          <View style={styles.runningControls}>
            <Pressable
              style={styles.controlBtnWrap}
              onPress={runState.isPaused ? resumeRun : pauseRun}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <Animated.View style={[
                styles.controlBtn,
                runState.isPaused ? styles.controlBtnResume : styles.controlBtnPause,
                { transform: [{ scale: buttonScale }] }
              ]}>
                <View style={[styles.controlIconCircle, runState.isPaused ? styles.controlIconResume : styles.controlIconPauseCircle]}>
                  {runState.isPaused ? (
                    <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Pause size={22} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.controlBtnText}>{runState.isPaused ? 'RESUME' : 'PAUSE'}</Text>
              </Animated.View>
            </Pressable>
            <Pressable
              style={styles.controlBtnWrap}
              onPress={stopRun}
              disabled={isStopping}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <Animated.View style={[
                styles.controlBtn, styles.controlBtnStop,
                isStopping && styles.controlBtnDisabled,
                { transform: [{ scale: buttonScale }] }
              ]}>
                <View style={[styles.controlIconCircle, styles.controlIconStopCircle]}>
                  <View style={styles.stopIcon} />
                </View>
                <Text style={styles.controlBtnText}>{isStopping ? 'STOPPING...' : 'STOP'}</Text>
              </Animated.View>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={startRun}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
          >
            <Animated.View style={[styles.startBtn, { transform: [{ scale: buttonScale }] }]}>
              <View style={styles.startBtnInner}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.startBtnText}>START RUN</Text>
              </View>
              <View style={styles.startBtnXp}>
                <Zap size={10} color="#00E5FF" fill="#00E5FF" />
                <Text style={styles.startBtnXpText}>+25 XP</Text>
              </View>
            </Animated.View>
          </Pressable>
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
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowCalorieModal(false)}>
              <X size={20} color="#4B5563" />
            </TouchableOpacity>

            <View style={styles.modalIconWrap}>
              <Flame size={40} color="#FF6B35" />
            </View>

            <Text style={styles.modalTitle}>Great Run!</Text>
            <Text style={styles.modalCalText}>
              {lastRunCalories} calories burned
            </Text>
            <Text style={styles.modalSubtext}>
              Subtract these from your daily intake?
            </Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowCalorieModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>No Thanks</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSubtractCalories}>
                <Text style={styles.modalBtnPrimaryText}>Subtract</Text>
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
    backgroundColor: "#08090C",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#08090C",
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.8,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginTop: 1,
  },
  xpChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  xpChipText: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 10,
  },
  timerCard: {
    backgroundColor: "#0E1015",
    borderRadius: 24,
    padding: 28,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  timerDialWrap: {
    width: 140,
    height: 140,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  timerInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  timerValue: {
    fontSize: 38,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#4B5563",
    letterSpacing: 3,
    marginTop: -2,
  },
  pausedChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 20,
  },
  pausedChipText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#F59E0B",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0E1015",
    borderRadius: 18,
    padding: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    gap: 6,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  runningControls: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 10,
  },
  controlBtnWrap: {
    flex: 1,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  controlIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  controlIconPauseCircle: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  controlIconResume: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  controlIconStopCircle: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  controlBtnPause: {
    backgroundColor: "#0E1015",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  controlBtnResume: {
    backgroundColor: "#0E1015",
    borderWidth: 1,
    borderColor: "rgba(0,173,181,0.3)",
  },
  controlBtnStop: {
    backgroundColor: "#0E1015",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  controlBtnDisabled: {
    backgroundColor: "#0E1015",
    borderColor: "rgba(55,65,81,0.3)",
    opacity: 0.5,
  },
  controlBtnText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
  },
  stopIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  startBtn: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.15)",
    marginTop: 6,
  },
  startBtnInner: {
    backgroundColor: "#00ADB5",
    borderRadius: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 18,
    gap: 10,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800" as const,
    letterSpacing: 1,
  },
  startBtnXp: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    paddingVertical: 8,
  },
  startBtnXpText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalContent: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 28,
    width: "85%",
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modalClose: {
    position: "absolute" as const,
    top: 14,
    right: 14,
    padding: 4,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    marginBottom: 6,
  },
  modalCalText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FF6B35",
    marginBottom: 6,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 24,
  },
  modalBtns: {
    flexDirection: "row" as const,
    gap: 10,
    width: "100%",
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    backgroundColor: "#00ADB5",
  },
  modalBtnSecondaryText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  modalBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  treadmillSection: {
    marginTop: 2,
  },
  treadmillBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#0E1015",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.12)",
    gap: 12,
  },
  treadmillBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,229,255,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  treadmillBtnTextWrap: {
    flex: 1,
    gap: 2,
  },
  treadmillBtnTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#F3F4F6",
    letterSpacing: -0.2,
  },
  treadmillBtnSub: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  treadmillBtnXp: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(0,229,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  treadmillBtnXpText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#00E5FF",
  },
  treadmillPhotoPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#0E1015",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    gap: 12,
  },
  treadmillThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  treadmillPhotoInfo: {
    flex: 1,
    gap: 4,
  },
  treadmillVerifiedBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  treadmillVerifiedText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  treadmillXpText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#4B5563",
  },
  treadmillPhotoRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
