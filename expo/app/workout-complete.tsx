import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useNotifications } from "@/providers/NotificationProvider";
import { LinearGradient } from "expo-linear-gradient";
import { 
  Trophy, 
  Flame, 
  Clock, 
  Target,
  CheckCircle,
  ArrowRight
} from "lucide-react-native";
import { useLanguage } from "@/providers/LanguageProvider";

export default function WorkoutCompleteScreen() {
  const { workoutName, exerciseCount, duration, calories } = useLocalSearchParams<{
    workoutName: string;
    exerciseCount: string;
    duration: string;
    calories: string;
  }>();
  const { scheduleWorkoutReminder } = useNotifications();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Celebration animation sequence
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Schedule a motivational notification for tomorrow
    const scheduleMotivationalNotification = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      
      await scheduleWorkoutReminder(
        'Yesterday\'s Victory!',
        `Great job completing ${workoutName || 'your workout'} yesterday! Ready for another amazing session today?`,
        tomorrow
      );
    };
    
    scheduleMotivationalNotification();
  }, [workoutName, scheduleWorkoutReminder]);

  const handleContinue = () => {
    router.push('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#10B981", "#059669", "#047857"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Celebration Header */}
        <View style={styles.celebrationHeader}>
          <Animated.View 
            style={[
              styles.trophyContainer,
              {
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <Trophy size={80} color="#FFFFFF" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.congratsText}>{t('workout_complete_title')}</Text>
            <Text style={styles.completedText}>{t('workout_complete_great')}</Text>
            <Text style={styles.workoutNameText}>{workoutName}</Text>
          </Animated.View>
        </View>

        {/* Stats Cards */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Target size={24} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>{exerciseCount}</Text>
              <Text style={styles.statLabel}>{t('workout_complete_exercises')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Clock size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{duration}</Text>
              <Text style={styles.statLabel}>{t('workout_complete_duration')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Flame size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{calories}</Text>
              <Text style={styles.statLabel}>{t('workout_complete_calories')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Achievement Messages */}
        <Animated.View 
          style={[
            styles.achievementContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.achievementCard}>
            <CheckCircle size={32} color="#10B981" />
            <View style={styles.achievementText}>
              <Text style={styles.achievementTitle}>Great Job!</Text>
              <Text style={styles.achievementDescription}>
                You&apos;ve completed another step towards your fitness goals. Keep up the amazing work!
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>{t('workout_complete_done')}</Text>
            <ArrowRight size={20} color="#10B981" />
          </TouchableOpacity>
        </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  celebrationHeader: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  trophyContainer: {
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  titleContainer: {
    alignItems: "center",
  },
  congratsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  completedText: {
    fontSize: 20,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 12,
    textAlign: "center",
  },
  workoutNameText: {
    fontSize: 18,
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "center",
    fontStyle: "italic",
  },
  statsContainer: {
    marginBottom: 40,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  achievementContainer: {
    marginBottom: 40,
  },
  achievementCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 25,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonText: {
    color: "#10B981",
    fontSize: 18,
    fontWeight: "bold",
  },
});