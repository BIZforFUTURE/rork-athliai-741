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
import { Play, Pause, TrendingUp, Flame, X, Zap, Route, Camera, ScanLine, Check, Edit3, Navigation, ChevronRight } from "lucide-react-native";

import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

import { useApp } from "@/providers/AppProvider";
import { XP_REWARDS } from "@/constants/xp";
import { estimateRunCalories } from "@/utils/healthScore";
import { useNotifications } from "@/providers/NotificationProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import { router, useLocalSearchParams } from "expo-router";
import RunMap from "@/components/RunMap";
import RunHistorySection from "@/components/RunHistorySection";
import { useLanguage } from "@/providers/LanguageProvider";

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
  const { addRun, deleteRun, recentRuns, subtractCaloriesFromRun, runStorage, xpInfo, personalStats, savedRoutes } = useApp();
  const { sendRunStartNotification, cancelRunNotification, sendRunCompletionNotification } = useNotifications();
  const { isPremium } = useRevenueCat();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ guideRouteId?: string }>();

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
  const { t, isSpanish } = useLanguage();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeGuideRoute, setActiveGuideRoute] = useState<RouteCoordinate[] | null>(null);
  const [activeGuideRouteName, setActiveGuideRouteName] = useState<string | null>(null);
  const pendingGuideRouteId = useRef<string | null>(null);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (params.guideRouteId && params.guideRouteId !== pendingGuideRouteId.current) {
      pendingGuideRouteId.current = params.guideRouteId;
      const route = savedRoutes.find(r => r.id === params.guideRouteId);
      if (route && route.routeCoordinates.length > 0) {
        console.log('Guide route loaded:', route.name, route.routeCoordinates.length, 'points');
        setActiveGuideRoute(route.routeCoordinates);
        setActiveGuideRouteName(route.name);
        setTimeout(() => {
          void startRunWithGuide(route.routeCoordinates, route.name);
        }, 300);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.guideRouteId, savedRoutes]);

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

  const initiateRun = async () => {
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

  const startRun = async () => {
    setActiveGuideRoute(null);
    setActiveGuideRouteName(null);
    await initiateRun();
  };

  const startRunWithGuide = async (guideCoords: RouteCoordinate[], guideName: string) => {
    setActiveGuideRoute(guideCoords);
    setActiveGuideRouteName(guideName);
    await initiateRun();
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
      const calories = estimateRunCalories(runState.distance, personalStats?.weight, finalElapsedTime);
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
    setActiveGuideRoute(null);
    setActiveGuideRouteName(null);
    pendingGuideRouteId.current = null;
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

  const currentCalories = estimateRunCalories(runState.distance, personalStats?.weight, runState.elapsedTime);

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
    const calories = estimateRunCalories(distance, personalStats?.weight, timeInSeconds);

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

  if (runState.isRunning) {
    return (
      <View style={styles.activeRunContainer}>
        <RunMap
          currentLocation={runState.currentLocation}
          routeCoordinates={optimizeRouteCoordinates(runState.routeCoordinates)}
          showMap={true}
          isRunning={!runState.isPaused}
          fullscreen={true}
          guideRoute={activeGuideRoute ?? undefined}
        />

        <View style={[styles.activeRunPanel, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.activeRunClose}
            onPress={confirmStopRun}
            activeOpacity={0.7}
          >
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.activeRunTimeWrap}>
            <Text style={styles.activeRunTime}>{formatTime(runState.elapsedTime)}</Text>
            <Text style={styles.activeRunTimeLabel}>{t('run_time')}</Text>
            {activeGuideRouteName && (
              <View style={styles.activeRunGuideChip}>
                <Navigation size={10} color="#8B5CF6" />
                <Text style={styles.activeRunGuideText}>{activeGuideRouteName}</Text>
              </View>
            )}
            {runState.isPaused && (
              <View style={styles.activeRunPausedChip}>
                <Pause size={10} color="#F59E0B" />
                <Text style={styles.activeRunPausedText}>{t('run_paused')}</Text>
              </View>
            )}
          </View>

          <View style={styles.activeRunStats}>
            <View style={styles.activeRunStat}>
              <Text style={styles.activeRunStatValue}>{runState.distance.toFixed(2)}</Text>
              <Text style={styles.activeRunStatLabel}>{t('run_miles')}</Text>
            </View>
            <View style={styles.activeRunStatDivider} />
            <View style={styles.activeRunStat}>
              <Text style={styles.activeRunStatValue}>{formatPace(currentPace)}</Text>
              <Text style={styles.activeRunStatLabel}>{t('run_min_mi')}</Text>
            </View>
            <View style={styles.activeRunStatDivider} />
            <View style={styles.activeRunStat}>
              <Text style={styles.activeRunStatValue}>{currentCalories}</Text>
              <Text style={styles.activeRunStatLabel}>{t('run_cal')}</Text>
            </View>
          </View>

          <View style={styles.activeRunControls}>
            <Pressable
              onPress={runState.isPaused ? resumeRun : pauseRun}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <Animated.View style={[styles.activeRunPauseBtn, { transform: [{ scale: buttonScale }] }]}>
                {runState.isPaused ? (
                  <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Pause size={24} color="#FFFFFF" fill="#FFFFFF" />
                )}
              </Animated.View>
            </Pressable>
            <Pressable
              onPress={confirmStopRun}
              disabled={isStopping}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <Animated.View style={[styles.activeRunStopBtn, isStopping && { opacity: 0.5 }, { transform: [{ scale: buttonScale }] }]}>
                <View style={styles.activeRunStopIcon} />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        <Modal
          visible={showCalorieModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCalorieModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowCalorieModal(false)}>
                <X size={20} color="#3A3A3C" />
              </TouchableOpacity>
              <View style={styles.modalIconWrap}>
                <Flame size={40} color="#FF6B35" />
              </View>
              <Text style={styles.modalTitle}>{t('run_great')}</Text>
              <Text style={styles.modalCalText}>{t('run_calories_burned', { cal: String(lastRunCalories) })}</Text>
              <Text style={styles.modalSubtext}>{t('run_subtract_question')}</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowCalorieModal(false)}>
                  <Text style={styles.modalBtnSecondaryText}>{t('run_no_thanks')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSubtractCalories}>
                  <Text style={styles.modalBtnPrimaryText}>{t('run_subtract')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.screenTitle}>{t('tab_run')}</Text>
          <Text style={styles.screenSubtitle}>Ready to go?</Text>
        </View>
        <View style={[styles.xpChip, { backgroundColor: xpInfo.rank.color + "20", borderColor: xpInfo.rank.color + "40" }]}>
          <Zap size={12} color={xpInfo.rank.color} />
          <Text style={[styles.xpChipText, { color: xpInfo.rank.color }]}>+25 XP</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
        <View style={styles.timerCard}>
          <View style={styles.timerDialWrap}>
            <View style={styles.timerRing} />
            <View style={styles.timerInner}>
              <Text style={styles.timerValue}>0:00</Text>
              <Text style={styles.timerLabel}>TIME</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(0,173,181,0.12)" }]}>
              <Route size={16} color="#00ADB5" />
            </View>
            <Text style={styles.statValue}>0.00</Text>
            <Text style={styles.statUnit}>{t('run_miles')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(191,255,0,0.12)" }]}>
              <TrendingUp size={16} color="#BFFF00" />
            </View>
            <Text style={styles.statValue}>0:00</Text>
            <Text style={styles.statUnit}>{t('run_min_mi')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(255,107,53,0.12)" }]}>
              <Flame size={16} color="#FF6B35" />
            </View>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statUnit}>{t('run_cal')}</Text>
          </View>
        </View>

        <Pressable
          onPress={startRun}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          testID="start-run-btn"
        >
          <Animated.View style={[styles.startBtn, { transform: [{ scale: buttonScale }] }]}>
            <View style={styles.startBtnInner}>
              <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startBtnText}>START RUN</Text>
            </View>
            <View style={styles.startBtnXp}>
              <Zap size={12} color="#00E5FF" fill="#00E5FF" />
              <Text style={styles.startBtnXpText}>+25 XP</Text>
            </View>
          </Animated.View>
        </Pressable>

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
              <Text style={styles.treadmillLogBtnTitle}>{t('run_log_treadmill_short')}</Text>
              <Text style={styles.treadmillLogBtnSub}>Snap your dashboard to log miles & time</Text>
            </View>
          </View>
          <View style={styles.treadmillLogBtnXp}>
            <Zap size={10} color="#BFFF00" fill="#BFFF00" />
            <Text style={styles.treadmillLogBtnXpText}>+XP</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.savedRoutesBtn}
          onPress={() => router.push('/saved-routes')}
          activeOpacity={0.7}
          testID="saved-routes-btn"
        >
          <View style={styles.savedRoutesBtnLeft}>
            <View style={styles.savedRoutesBtnIcon}>
              <Navigation size={20} color="#8B5CF6" />
            </View>
            <View style={styles.savedRoutesBtnTextWrap}>
              <Text style={styles.savedRoutesBtnTitle}>Saved Routes</Text>
              <Text style={styles.savedRoutesBtnSub}>
                {savedRoutes.length === 0
                  ? 'Save your favorite paths'
                  : `${savedRoutes.length} route${savedRoutes.length !== 1 ? 's' : ''} saved`}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#3A3A3C" />
        </TouchableOpacity>

        <RunHistorySection
          runs={recentRuns}
          onRunPress={(runId) => router.push(`/run-details/${runId}`)}
          onDeleteRun={deleteRun}
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
              <X size={20} color="#3A3A3C" />
            </TouchableOpacity>

            <View style={styles.treadmillModalHeader}>
              <View style={styles.treadmillModalIconWrap}>
                <ScanLine size={28} color="#00E5FF" />
              </View>
              <Text style={styles.treadmillModalTitle}>{t('run_treadmill')}</Text>
              <Text style={styles.treadmillModalSubtitle}>
                {treadmillParsing ? t('run_reading_dashboard') : treadmillParsed ? t('run_review_data') : t('run_analyzing')}
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
                      <Text style={styles.treadmillEditLabel}>{isSpanish ? 'Distancia (millas)' : 'Distance (miles)'}</Text>
                      <TextInput
                        style={styles.treadmillEditInput}
                        value={treadmillEditDistance}
                        onChangeText={setTreadmillEditDistance}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#3A3A3C"
                        placeholder="0.00"
                      />
                    </View>
                    <View style={styles.treadmillEditField}>
                      <Text style={styles.treadmillEditLabel}>{isSpanish ? 'Tiempo (min:seg)' : 'Time (min:sec)'}</Text>
                      <TextInput
                        style={styles.treadmillEditInput}
                        value={treadmillEditTime}
                        onChangeText={setTreadmillEditTime}
                        placeholderTextColor="#3A3A3C"
                        placeholder="0:00"
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.treadmillParsedRow}>
                    <View style={styles.treadmillParsedStat}>
                      <Route size={16} color="#00E5FF" />
                      <Text style={styles.treadmillParsedValue}>{treadmillEditDistance}</Text>
                      <Text style={styles.treadmillParsedUnit}>{isSpanish ? 'millas' : 'miles'}</Text>
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
                  <Edit3 size={14} color="#5A5A5E" />
                  <Text style={styles.treadmillEditToggleText}>
                    {treadmillEditing ? t('run_done_editing') : t('run_edit_values')}
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
              <X size={20} color="#3A3A3C" />
            </TouchableOpacity>
            <View style={styles.modalIconWrap}>
              <Flame size={40} color="#FF6B35" />
            </View>
            <Text style={styles.modalTitle}>Great Run!</Text>
            <Text style={styles.modalCalText}>{lastRunCalories} calories burned</Text>
            <Text style={styles.modalSubtext}>Subtract these from your daily intake?</Text>
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
  activeRunContainer: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  activeRunPanel: {
    backgroundColor: "#F3EDE4",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: "center" as const,
  },
  activeRunClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "absolute" as const,
    top: 16,
    left: 24,
    zIndex: 10,
  },
  activeRunTimeWrap: {
    alignItems: "center" as const,
    marginBottom: 24,
  },
  activeRunTime: {
    fontSize: 64,
    fontWeight: "200" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -2,
  },
  activeRunTimeLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#A8A8A0",
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    marginTop: -4,
  },
  activeRunGuideChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 20,
  },
  activeRunGuideText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#8B5CF6",
    letterSpacing: 0.5,
  },
  activeRunPausedChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 20,
  },
  activeRunPausedText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#F59E0B",
    letterSpacing: 1,
  },
  activeRunStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 32,
    gap: 0,
  },
  activeRunStat: {
    flex: 1,
    alignItems: "center" as const,
  },
  activeRunStatValue: {
    fontSize: 26,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -0.5,
  },
  activeRunStatLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#A8A8A0",
    letterSpacing: 1,
    marginTop: 2,
  },
  activeRunStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  activeRunControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 24,
  },
  activeRunPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activeRunStopBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activeRunStopIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#F3EDE4",
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#A8A8A0",
    marginTop: 1,
  },
  xpChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(74,124,89,0.2)",
    backgroundColor: "rgba(74,124,89,0.06)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  xpChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    color: "#4A7C59",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 160,
    gap: 10,
  },
  timerCard: {
    backgroundColor: "#FEFCF9",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center" as const,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  timerDialWrap: {
    width: 160,
    height: 160,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  timerRing: {
    position: "absolute" as const,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "rgba(74,124,89,0.15)",
  },
  timerInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  timerValue: {
    fontSize: 42,
    fontWeight: "300" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -2,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#A8A8A0",
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
    backgroundColor: "#FEFCF9",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    borderRadius: 20,
    padding: 14,
    alignItems: "center" as const,
    gap: 6,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
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
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#A8A8A0",
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
    backgroundColor: "#0A0A0C",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  controlBtnResume: {
    backgroundColor: "#0A0A0C",
    borderWidth: 1,
    borderColor: "rgba(0,173,181,0.3)",
  },
  controlBtnStop: {
    backgroundColor: "#0A0A0C",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  controlBtnDisabled: {
    backgroundColor: "#0A0A0C",
    borderColor: "rgba(55,65,81,0.3)",
    opacity: 0.5,
  },
  controlBtnText: {
    color: "#8E8E93",
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
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 4,
    marginTop: 6,
    shadowColor: "#4A7C59",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  startBtnInner: {
    backgroundColor: "#4A7C59",
    borderRadius: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 22,
    gap: 10,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800" as const,
    letterSpacing: 2,
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
    color: "#4A7C59",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalContent: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 28,
    width: "85%",
    alignItems: "center" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
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
    fontWeight: "400" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
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
    color: "#7A7A7A",
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
    backgroundColor: "#F0EBE3",
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    backgroundColor: "#4A7C59",
  },
  modalBtnSecondaryText: {
    color: "#7A7A7A",
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
    backgroundColor: "#FEFCF9",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
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
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -0.2,
  },
  treadmillLogBtnSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#A8A8A0",
  },
  treadmillLogBtnXp: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(74,124,89,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  treadmillLogBtnXpText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#4A7C59",
  },
  treadmillModalContent: {
    backgroundColor: "#FEFCF9",
    borderRadius: 28,
    padding: 24,
    width: "90%",
    maxHeight: "85%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
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
    fontWeight: "400" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.5,
  },
  treadmillModalSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#7A7A7A",
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
    backgroundColor: "#F0EBE3",
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
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -1,
  },
  treadmillParsedUnit: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#A8A8A0",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  treadmillParsedDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.06)",
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
    color: "#5A5A5E",
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
    color: "#5A5A5E",
  },
  treadmillEditInput: {
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#2C2C2C",
    textAlign: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(74,124,89,0.15)",
  },
  treadmillXpPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: "rgba(74,124,89,0.06)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  treadmillXpPreviewText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#4A7C59",
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
    backgroundColor: "#F0EBE3",
  },
  treadmillModalBtnCancelText: {
    color: "#7A7A7A",
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
    backgroundColor: "#4A7C59",
    gap: 8,
  },
  treadmillModalBtnConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  mapBackground: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapDarkOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  mapTopControls: {
    position: "absolute" as const,
    left: 16,
    right: 16,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    zIndex: 10,
  },
  mapTopBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  bottomPanel: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  statsPanel: {
    backgroundColor: "rgba(20,23,32,0.92)",
    marginHorizontal: 12,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statsPanelTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    textAlign: "center" as const,
    marginBottom: 14,
  },
  statsPanelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  statsPanelItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statsPanelValue: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  statsPanelLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#8E8E93",
    marginTop: 2,
    textAlign: "center" as const,
  },
  statsPanelDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  bottomGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 6,
  },
  controlsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(20,23,32,0.95)",
  },
  activityTypeBtn: {
    alignItems: "center" as const,
    gap: 6,
  },
  activityTypeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activityTypeActive: {
    backgroundColor: "rgba(255,107,53,0.2)",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  activityTypeActiveRide: {
    backgroundColor: "rgba(255,107,53,0.2)",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  activityTypeActiveWalk: {
    backgroundColor: "rgba(255,107,53,0.2)",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  activityCheckBadge: {
    position: "absolute" as const,
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF6B35",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activityTypeLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  startBtnCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF6B35",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    alignSelf: "center" as const,
  },
  startBtnLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FF6B35",
    textAlign: "center" as const,
    marginTop: 6,
  },
  treadmillBtn: {
    alignItems: "center" as const,
    gap: 6,
  },
  treadmillBtnIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  treadmillBtnLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#8E8E93",
  },

  savedRoutesBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "#FEFCF9",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  savedRoutesBtnLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    flex: 1,
  },
  savedRoutesBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  savedRoutesBtnTextWrap: {
    flex: 1,
    gap: 3,
  },
  savedRoutesBtnTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -0.2,
  },
  savedRoutesBtnSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#A8A8A0",
  },
});
