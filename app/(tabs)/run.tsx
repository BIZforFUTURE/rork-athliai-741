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
  ActivityIndicator,
  TextInput,
  RefreshControl,
  type AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Play, Pause, TrendingUp, Flame, X, Zap, Route, Camera, ScanLine, Check, Edit3 } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

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
  const [showTreadmillModal, setShowTreadmillModal] = useState(false);
  const [treadmillParsing, setTreadmillParsing] = useState(false);
  const [treadmillParsed, setTreadmillParsed] = useState<{ distance: number; time: number } | null>(null);
  const [treadmillEditDistance, setTreadmillEditDistance] = useState('');
  const [treadmillEditTime, setTreadmillEditTime] = useState('');
  const [treadmillEditing, setTreadmillEditing] = useState(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

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

  const confirmStopRun = () => {
    Alert.alert(
      'End Run?',
      'Are you sure you want to stop this run? This action cannot be undone.',
      [
        { text: 'Keep Running', style: 'cancel' },
        { text: 'End Run', style: 'destructive', onPress: stopRun },
      ]
    );
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

  const getBase64FromUri = useCallback(async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return base64;
  }, []);

  const parseTreadmillPhoto = useCallback(async (photoUri: string) => {
    setTreadmillParsing(true);
    setTreadmillParsed(null);
    setTreadmillEditing(false);
    try {
      console.log('Parsing treadmill photo with AI...');
      const base64 = await getBase64FromUri(photoUri);
      const imageDataUri = `data:image/jpeg;base64,${base64}`;

      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Look at this treadmill dashboard photo. Extract the total distance (in miles) and total time (in seconds). If the display shows kilometers, convert to miles (1 km = 0.621371 mi). If you see minutes:seconds format for time, convert to total seconds. If you cannot read the values clearly, make your best estimate from what is visible. Return distance in miles and time in seconds.',
              },
              {
                type: 'image',
                image: imageDataUri,
              },
            ],
          },
        ],
        schema: z.object({
          distance: z.number().describe('Total distance in miles'),
          time: z.number().describe('Total time in seconds'),
          confidence: z.enum(['high', 'medium', 'low']).describe('How confident you are in the reading'),
        }),
      });

      console.log('Treadmill AI result:', result);

      if (result.distance <= 0 && result.time <= 0) {
        Alert.alert('Could Not Read Display', 'We couldn\'t extract run data from the photo. Please try again with a clearer photo, or enter the values manually.', [
          { text: 'Try Again', style: 'cancel' },
          { text: 'Enter Manually', onPress: () => {
            setTreadmillParsed({ distance: 0, time: 0 });
            setTreadmillEditDistance('0');
            setTreadmillEditTime('0:00');
            setTreadmillEditing(true);
          }},
        ]);
        setTreadmillParsing(false);
        return;
      }

      setTreadmillParsed({ distance: result.distance, time: result.time });
      setTreadmillEditDistance(result.distance.toFixed(2));
      const mins = Math.floor(result.time / 60);
      const secs = result.time % 60;
      setTreadmillEditTime(`${mins}:${secs.toString().padStart(2, '0')}`);

      if (result.confidence === 'low') {
        Alert.alert('Low Confidence', 'The reading may not be accurate. Please verify the values and edit if needed.');
      }

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error parsing treadmill photo:', error);
      Alert.alert('Parsing Error', 'Failed to analyze the photo. You can enter the values manually.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enter Manually', onPress: () => {
          setTreadmillParsed({ distance: 0, time: 0 });
          setTreadmillEditDistance('0');
          setTreadmillEditTime('0:00');
          setTreadmillEditing(true);
        }},
      ]);
    } finally {
      setTreadmillParsing(false);
    }
  }, [getBase64FromUri]);

  const handleTreadmillCapture = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const takePhoto = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to snap your treadmill.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          setTreadmillPhoto(result.assets[0].uri);
          setShowTreadmillModal(true);
          await parseTreadmillPhoto(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Error taking treadmill photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    };

    const pickFromLibrary = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed.');
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
          setShowTreadmillModal(true);
          await parseTreadmillPhoto(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Error picking treadmill photo:', error);
        Alert.alert('Error', 'Failed to pick photo. Please try again.');
      }
    };

    Alert.alert(
      'Log Treadmill Run',
      'Take a photo of your treadmill dashboard showing distance and time. We\'ll read it and log your run!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
      ]
    );
  }, [parseTreadmillPhoto]);

  const confirmTreadmillRun = useCallback(() => {
    let distance = parseFloat(treadmillEditDistance) || 0;
    let timeInSeconds = 0;

    const timeParts = treadmillEditTime.split(':');
    if (timeParts.length === 2) {
      timeInSeconds = (parseInt(timeParts[0]) || 0) * 60 + (parseInt(timeParts[1]) || 0);
    } else if (timeParts.length === 1) {
      timeInSeconds = (parseInt(timeParts[0]) || 0) * 60;
    }

    if (distance <= 0 && timeInSeconds <= 0) {
      Alert.alert('Invalid Data', 'Please enter valid distance and time values.');
      return;
    }

    const pace = distance > 0 ? timeInSeconds / 60 / distance : 0;
    const calories = Math.round(distance * 112.5);

    addRun({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      distance,
      time: timeInSeconds,
      pace,
      calories,
      photos: treadmillPhoto ? [treadmillPhoto] : undefined,
      treadmillVerified: true,
    });

    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setShowTreadmillModal(false);
    setTreadmillPhoto(null);
    setTreadmillParsed(null);
    setTreadmillEditing(false);

    setLastRunCalories(calories);
    setShowCalorieModal(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treadmillEditDistance, treadmillEditTime, treadmillPhoto, addRun]);

  const closeTreadmillModal = useCallback(() => {
    setShowTreadmillModal(false);
    setTreadmillPhoto(null);
    setTreadmillParsed(null);
    setTreadmillEditing(false);
    setTreadmillParsing(false);
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00E5FF"
            colors={["#00E5FF"]}
            progressBackgroundColor="#1A1D24"
          />
        }
      >
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
              onPress={confirmStopRun}
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

        {!runState.isRunning && (
          <TouchableOpacity
            style={styles.treadmillLogBtn}
            onPress={handleTreadmillCapture}
            activeOpacity={0.7}
            testID="treadmill-log-btn"
          >
            <View style={styles.treadmillLogBtnLeft}>
              <View style={styles.treadmillLogBtnIcon}>
                <Camera size={20} color="#00E5FF" />
              </View>
              <View style={styles.treadmillLogBtnTextWrap}>
                <Text style={styles.treadmillLogBtnTitle}>Log Treadmill Run</Text>
                <Text style={styles.treadmillLogBtnSub}>Snap your dashboard to log miles & time</Text>
              </View>
            </View>
            <View style={styles.treadmillLogBtnXp}>
              <Zap size={10} color="#BFFF00" fill="#BFFF00" />
              <Text style={styles.treadmillLogBtnXpText}>+XP</Text>
            </View>
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
        visible={showTreadmillModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeTreadmillModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.treadmillModalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeTreadmillModal}>
              <X size={20} color="#4B5563" />
            </TouchableOpacity>

            <View style={styles.treadmillModalHeader}>
              <View style={styles.treadmillModalIconWrap}>
                <ScanLine size={28} color="#00E5FF" />
              </View>
              <Text style={styles.treadmillModalTitle}>Treadmill Run</Text>
              <Text style={styles.treadmillModalSubtitle}>
                {treadmillParsing ? 'Reading your dashboard...' : treadmillParsed ? 'Review your run data' : 'Analyzing photo...'}
              </Text>
            </View>

            {treadmillPhoto && (
              <View style={styles.treadmillModalPhotoWrap}>
                <Image source={{ uri: treadmillPhoto }} style={styles.treadmillModalPhoto} />
                {treadmillParsing && (
                  <View style={styles.treadmillModalPhotoOverlay}>
                    <ActivityIndicator size="large" color="#00E5FF" />
                    <Text style={styles.treadmillModalScanText}>Scanning display...</Text>
                  </View>
                )}
              </View>
            )}

            {treadmillParsed && !treadmillParsing && (
              <View style={styles.treadmillParsedSection}>
                {treadmillEditing ? (
                  <View style={styles.treadmillEditFields}>
                    <View style={styles.treadmillEditField}>
                      <Text style={styles.treadmillEditLabel}>Distance (miles)</Text>
                      <TextInput
                        style={styles.treadmillEditInput}
                        value={treadmillEditDistance}
                        onChangeText={setTreadmillEditDistance}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#4B5563"
                        placeholder="0.00"
                      />
                    </View>
                    <View style={styles.treadmillEditField}>
                      <Text style={styles.treadmillEditLabel}>Time (min:sec)</Text>
                      <TextInput
                        style={styles.treadmillEditInput}
                        value={treadmillEditTime}
                        onChangeText={setTreadmillEditTime}
                        placeholderTextColor="#4B5563"
                        placeholder="0:00"
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.treadmillParsedRow}>
                    <View style={styles.treadmillParsedStat}>
                      <Route size={16} color="#00E5FF" />
                      <Text style={styles.treadmillParsedValue}>{treadmillEditDistance}</Text>
                      <Text style={styles.treadmillParsedUnit}>miles</Text>
                    </View>
                    <View style={styles.treadmillParsedDivider} />
                    <View style={styles.treadmillParsedStat}>
                      <TrendingUp size={16} color="#BFFF00" />
                      <Text style={styles.treadmillParsedValue}>{treadmillEditTime}</Text>
                      <Text style={styles.treadmillParsedUnit}>time</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.treadmillEditToggle}
                  onPress={() => setTreadmillEditing(!treadmillEditing)}
                >
                  <Edit3 size={14} color="#6B7280" />
                  <Text style={styles.treadmillEditToggleText}>
                    {treadmillEditing ? 'Done editing' : 'Edit values'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.treadmillXpPreview}>
                  <Zap size={14} color="#BFFF00" fill="#BFFF00" />
                  <Text style={styles.treadmillXpPreviewText}>
                    +{XP_REWARDS.RUN_BASE + Math.floor((parseFloat(treadmillEditDistance) || 0) * 4) * XP_REWARDS.RUN_PER_QUARTER_MILE + XP_REWARDS.TREADMILL_PHOTO} XP
                  </Text>
                </View>

                <View style={styles.treadmillModalBtns}>
                  <TouchableOpacity style={styles.treadmillModalBtnCancel} onPress={closeTreadmillModal}>
                    <Text style={styles.treadmillModalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.treadmillModalBtnConfirm} onPress={confirmTreadmillRun}>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.treadmillModalBtnConfirmText}>Log Run</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
  treadmillLogBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "#0E1015",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.12)",
    marginTop: 4,
  },
  treadmillLogBtnLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    flex: 1,
  },
  treadmillLogBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0,229,255,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  treadmillLogBtnTextWrap: {
    flex: 1,
    gap: 3,
  },
  treadmillLogBtnTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#F3F4F6",
    letterSpacing: -0.2,
  },
  treadmillLogBtnSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  treadmillLogBtnXp: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(191,255,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  treadmillLogBtnXpText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#BFFF00",
  },
  treadmillModalContent: {
    backgroundColor: "#141720",
    borderRadius: 28,
    padding: 24,
    width: "90%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  treadmillModalHeader: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  treadmillModalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(0,229,255,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
  },
  treadmillModalTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  treadmillModalSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#6B7280",
    marginTop: 4,
  },
  treadmillModalPhotoWrap: {
    borderRadius: 16,
    overflow: "hidden" as const,
    marginBottom: 20,
    position: "relative" as const,
  },
  treadmillModalPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  treadmillModalPhotoOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    borderRadius: 16,
  },
  treadmillModalScanText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#00E5FF",
  },
  treadmillParsedSection: {
    gap: 16,
  },
  treadmillParsedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 20,
    gap: 24,
  },
  treadmillParsedStat: {
    alignItems: "center" as const,
    gap: 6,
  },
  treadmillParsedValue: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  treadmillParsedUnit: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  treadmillParsedDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  treadmillEditToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 8,
  },
  treadmillEditToggleText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  treadmillEditFields: {
    flexDirection: "row" as const,
    gap: 12,
  },
  treadmillEditField: {
    flex: 1,
    gap: 6,
  },
  treadmillEditLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  treadmillEditInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    textAlign: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.15)",
  },
  treadmillXpPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: "rgba(191,255,0,0.08)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  treadmillXpPreviewText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#BFFF00",
  },
  treadmillModalBtns: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 4,
  },
  treadmillModalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  treadmillModalBtnCancelText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  treadmillModalBtnConfirm: {
    flex: 1.5,
    flexDirection: "row" as const,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#00ADB5",
    gap: 8,
  },
  treadmillModalBtnConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
