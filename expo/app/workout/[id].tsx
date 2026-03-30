import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { 
  X, 
  SkipForward, 
  Plus, 
  CheckCircle,
  Hand
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { getWorkoutById, WorkoutLog, calculateWorkoutCalories, Exercise } from "@/constants/workouts";
import { useLanguage } from "@/providers/LanguageProvider";
import { WORKOUT_NAME_TRANSLATION_KEYS } from "@/constants/xp";

interface SetData {
  reps: number;
  weight: number;
}

interface ExerciseProgress {
  exerciseId: string;
  sets: SetData[];
  currentSet: number;
  completed: boolean;
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addWorkoutLog } = useApp();
  const insets = useSafeAreaInsets();
  const { t, isSpanish } = useLanguage();
  const translateWorkoutName = useCallback((name: string): string => {
    const key = WORKOUT_NAME_TRANSLATION_KEYS[name];
    return key ? t(key) : name;
  }, [t]);
  

  
  // Check for custom workout first, then fallback to predefined workouts
  const customWorkout = (global as any).customWorkout;
  const workout = (customWorkout && customWorkout.id === id) ? customWorkout : getWorkoutById(id);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([]);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [showAutoFill, setShowAutoFill] = useState(false);


  // Initialize exercise progress
  useEffect(() => {
    if (workout) {
      const initialProgress = workout.exercises.map((exercise: Exercise) => ({
        exerciseId: exercise.id,
        sets: Array(exercise.sets).fill(null).map(() => ({ reps: 0, weight: 0 })),
        currentSet: 0,
        completed: false
      }));
      setExerciseProgress(initialProgress);
      setWorkoutStartTime(new Date());
    }
  }, [workout]);

  // Clean up custom workout when component unmounts
  useEffect(() => {
    return () => {
      if ((global as any).customWorkout && (global as any).customWorkout.id === id) {
        delete (global as any).customWorkout;
      }
    };
  }, [id]);

  // Rest timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isResting && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentExercise = workout?.exercises[currentExerciseIndex];
  const currentProgress = exerciseProgress[currentExerciseIndex];

  const updateSetData = (setIndex: number, field: 'reps' | 'weight', value: string) => {
    const numValue = parseInt(value) || 0;
    setExerciseProgress(prev => {
      const updated = [...prev];
      updated[currentExerciseIndex] = {
        ...updated[currentExerciseIndex],
        sets: updated[currentExerciseIndex].sets.map((set, idx) => 
          idx === setIndex ? { ...set, [field]: numValue } : set
        )
      };
      return updated;
    });
  };

  const completeSet = () => {
    if (!currentProgress || !currentExercise) return;

    const currentSet = currentProgress.sets[currentProgress.currentSet];
    if (currentSet.reps === 0) {
      Alert.alert("Enter Reps", "Please enter the number of reps completed for this set.");
      return;
    }

    setExerciseProgress(prev => {
      const updated = [...prev];
      const nextSet = updated[currentExerciseIndex].currentSet + 1;
      
      updated[currentExerciseIndex] = {
        ...updated[currentExerciseIndex],
        currentSet: nextSet,
        completed: nextSet >= currentExercise.sets
      };
      return updated;
    });

    // Start rest timer if not the last set
    if (currentProgress.currentSet + 1 < currentExercise.sets) {
      // Use 60-90 seconds rest time (randomized between 60-90 seconds)
      const restTime = Math.floor(Math.random() * 31) + 60; // 60-90 seconds
      setRestTimeLeft(restTime);
      setIsResting(true);
    }
  };

  const addSet = () => {
    setExerciseProgress(prev => {
      const updated = [...prev];
      updated[currentExerciseIndex] = {
        ...updated[currentExerciseIndex],
        sets: [...updated[currentExerciseIndex].sets, { reps: 0, weight: 0 }]
      };
      return updated;
    });
  };

  const nextExercise = () => {
    if (currentExerciseIndex < (workout?.exercises.length || 0) - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setIsResting(false);
      setRestTimeLeft(0);
    }
  };

  const previousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setIsResting(false);
      setRestTimeLeft(0);
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimeLeft(0);
  };



  const finishWorkout = useCallback(() => {
    if (!workout || !workoutStartTime) return;

    const completedExercises = exerciseProgress.filter(progress => 
      progress.sets.some(set => set.reps > 0)
    );

    if (completedExercises.length === 0) {
      Alert.alert("No Progress", "You haven't completed any sets. Are you sure you want to finish?", [
        { text: "Cancel", style: "cancel" },
        { text: "Finish Anyway", onPress: () => router.back() }
      ]);
      return;
    }

    const workoutLog: WorkoutLog = {
      id: `workout-${Date.now()}`,
      workoutPlanId: workout.id,
      date: new Date().toISOString(),
      exercises: exerciseProgress.map(progress => ({
        exerciseId: progress.exerciseId,
        sets: progress.sets.filter(set => set.reps > 0)
      })).filter(exercise => exercise.sets.length > 0),
      duration: Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 1000),
      completed: exerciseProgress.every(progress => progress.completed)
    };

    addWorkoutLog(workoutLog);
    
    // Navigate to celebration screen
    router.push({
      pathname: "/workout-complete" as any,
      params: { 
        workoutName: translateWorkoutName(workout.name),
        exerciseCount: completedExercises.length.toString(),
        duration: Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 60000).toString(), // minutes
        calories: calculateWorkoutCalories(workoutLog).toString()
      }
    });
  }, [workout, workoutStartTime, exerciseProgress, addWorkoutLog, translateWorkoutName]);

  const autoFillSets = () => {
    if (!currentProgress) return;
    
    const lastCompletedSet = currentProgress.sets
      .slice(0, currentProgress.currentSet)
      .reverse()
      .find(set => set.reps > 0 && set.weight > 0);

    if (lastCompletedSet) {
      setExerciseProgress(prev => {
        const updated = [...prev];
        updated[currentExerciseIndex] = {
          ...updated[currentExerciseIndex],
          sets: updated[currentExerciseIndex].sets.map((set, idx) => 
            idx >= currentProgress.currentSet ? { ...lastCompletedSet } : set
          )
        };
        return updated;
      });
    }
    setShowAutoFill(false);
  };

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Workout not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color="#A1A1AA" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.workoutTitle}>{translateWorkoutName(workout.name)}</Text>
            <Text style={styles.exerciseCounter}>
              {currentExerciseIndex + 1} of {workout.exercises.length}
            </Text>
          </View>
          <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Rest Timer */}
        {isResting && (
          <View style={styles.restTimer}>
            <Hand size={24} color="#FBBF24" />
            <Text style={styles.restText}>Rest for {formatTime(restTimeLeft)}</Text>
            <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}
        {currentExercise && currentProgress && (
          <>
            {/* Exercise Info */}
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitle}>
                <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              </View>
              <Text style={styles.exerciseDetails}>
                {currentExercise.sets} sets × {currentExercise.reps} reps
              </Text>
              <Text style={styles.exerciseEquipment}>
                Equipment: {currentExercise.equipment}
              </Text>
              <Text style={styles.exerciseDescription}>
                {currentExercise.description}
              </Text>
            </View>

            {/* Auto Fill Toggle */}
            <View style={styles.autoFillContainer}>
              <Text style={styles.autoFillLabel}>Auto fill stats</Text>
              <TouchableOpacity
                style={[styles.toggle, showAutoFill && styles.toggleActive]}
                onPress={() => setShowAutoFill(!showAutoFill)}
              >
                <View style={[styles.toggleThumb, showAutoFill && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            {/* Sets */}
            <View style={styles.setsContainer}>
              {currentProgress.sets.map((set, setIndex) => (
                <View key={`${currentExercise.id}-set-${setIndex}`} style={styles.setRow}>
                  <Text style={styles.setLabel}>SET {setIndex + 1}</Text>
                  
                  <View style={styles.setInputs}>
                    <View style={styles.inputGroup}>
                      <TextInput
                        style={styles.input}
                        placeholder="reps"
                        value={set.reps > 0 ? set.reps.toString() : ''}
                        onChangeText={(value) => updateSetData(setIndex, 'reps', value)}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.inputLabel}>×</Text>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <TextInput
                        style={styles.input}
                        placeholder={isSpanish ? "kg" : "lbs"}
                        value={set.weight > 0 ? set.weight.toString() : ''}
                        onChangeText={(value) => updateSetData(setIndex, 'weight', value)}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                      <Text style={styles.inputLabel}>{isSpanish ? 'kg' : 'lbs'}</Text>
                    </View>
                  </View>

                  {setIndex === currentProgress.currentSet && !currentProgress.completed && (() => {
                    const currentSet = currentProgress.sets[currentProgress.currentSet];
                    return (
                      <View style={styles.setActions}>
                        {showAutoFill && setIndex > 0 && (
                          <TouchableOpacity style={styles.autoFillButton} onPress={autoFillSets}>
                            <Text style={styles.autoFillButtonText}>Auto Fill</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={[
                            styles.restButton,
                            (currentSet.reps === 0) && styles.restButtonDisabled
                          ]} 
                          onPress={completeSet}
                          disabled={currentSet.reps === 0}
                        >
                          <Hand size={16} color="#FFFFFF" />
                          <Text style={styles.restButtonText}>
                            {currentProgress.currentSet + 1 >= currentExercise.sets 
                              ? 'Complete Exercise' 
                              : 'Rest 1-1.5 min'
                            }
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  {setIndex < currentProgress.currentSet && (
                    <View style={styles.completedIndicator}>
                      <CheckCircle size={20} color="#10B981" />
                    </View>
                  )}
                </View>
              ))}

              {/* Add Set Button */}
              <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
                <Plus size={20} color="#6366F1" />
                <Text style={styles.addSetText}>ADD NEW SET</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>



      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentExerciseIndex === 0 && styles.navButtonDisabled]}
          onPress={previousExercise}
          disabled={currentExerciseIndex === 0}
        >
          <Text style={[styles.navButtonText, currentExerciseIndex === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={nextExercise}
          disabled={currentExerciseIndex >= workout.exercises.length - 1}
        >
          <Text style={styles.nextButtonText}>
            {currentExerciseIndex >= workout.exercises.length - 1 ? 'Last Exercise' : 'Next'}
          </Text>
          <SkipForward size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080808",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#171B22",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2329",
    marginHorizontal: 0,
  },
  closeButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#F9FAFB",
  },
  exerciseCounter: {
    fontSize: 14,
    color: "#A1A1AA",
    marginTop: 2,
  },
  finishButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#10B981",
    borderRadius: 20,
  },
  finishButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  restTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 15,
    gap: 10,
  },
  restText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FBBF24",
  },
  skipButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "#FBBF24",
    borderRadius: 15,
  },
  skipButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  exerciseHeader: {
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 20,
  },
  exerciseTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#F9FAFB",
    flex: 1,
  },

  exerciseDetails: {
    fontSize: 16,
    color: "#A1A1AA",
    marginBottom: 8,
  },
  exerciseEquipment: {
    fontSize: 14,
    color: "#71717A",
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    color: "#71717A",
    lineHeight: 20,
  },
  autoFillContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171B22",
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    marginHorizontal: 20,
  },
  autoFillLabel: {
    fontSize: 16,
    color: "#F9FAFB",
  },
  toggle: {
    width: 50,
    height: 30,
    backgroundColor: "#1F2329",
    borderRadius: 15,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "#CCFF00",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  setsContainer: {
    marginTop: 20,
    marginBottom: 100,
    marginHorizontal: 20,
  },
  setRow: {
    backgroundColor: "#171B22",
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: "#F9FAFB",
    marginBottom: 15,
  },
  setInputs: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 15,
  },
  inputGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1F2329",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: "center" as const,
    backgroundColor: "#080808",
    color: "#F9FAFB",
  },
  inputLabel: {
    fontSize: 16,
    color: "#A1A1AA",
    minWidth: 30,
  },
  setActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  autoFillButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#1F2329",
    borderRadius: 20,
  },
  autoFillButtonText: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  restButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBBF24",
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  restButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  completedIndicator: {
    alignItems: "center",
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#CCFF00",
    borderStyle: "dashed",
    borderRadius: 15,
    paddingVertical: 20,
    gap: 10,
  },
  addSetText: {
    color: "#CCFF00",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  navigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#171B22",
    borderTopWidth: 1,
    borderTopColor: "#1F2329",
    gap: 15,
  },
  navButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: "#1F2329",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#A1A1AA",
  },
  navButtonTextDisabled: {
    color: "#71717A",
  },
  nextButton: {
    backgroundColor: "#CCFF00",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  restButtonDisabled: {
    backgroundColor: "#A1A1AA",
    opacity: 0.6,
  },

});