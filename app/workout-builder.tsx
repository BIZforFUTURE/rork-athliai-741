import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { 
  X, 
  Plus, 
  Trash2,
  GripVertical,
  Play,
  Search,
} from "lucide-react-native";
import { 
  ExerciseTemplate, 
  BodyPart, 
  bodyPartLabels, 
  bodyPartColors,
  exercisesByBodyPart 
} from "@/constants/exercises";
import { WorkoutPlan } from "@/constants/workouts";
import { useApp } from "@/providers/AppProvider";

interface SelectedExercise extends ExerciseTemplate {
  sets: number;
  reps: string;
  restTime: number;
}

export default function WorkoutBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { savedWorkouts, saveCustomWorkout, deleteSavedWorkout } = useApp();
  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedWorkouts, setShowSavedWorkouts] = useState(true);

  const bodyParts: BodyPart[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];

  const addExercise = (exercise: ExerciseTemplate) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const newExercise: SelectedExercise = {
      ...exercise,
      sets: 3,
      reps: "8-12",
      restTime: 90
    };
    
    setSelectedExercises([...selectedExercises, newExercise]);
    setShowExercisePicker(false);
    setSelectedBodyPart(null);
    setSearchQuery("");
  };

  const removeExercise = (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof SelectedExercise, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const moveExercise = (fromIndex: number, direction: 'up' | 'down') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= selectedExercises.length) return;

    const updated = [...selectedExercises];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    setSelectedExercises(updated);
  };

  const saveWorkout = () => {
    if (!workoutName.trim()) {
      Alert.alert("Missing Name", "Please enter a name for your workout");
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert("No Exercises", "Please add at least one exercise to your workout");
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const customWorkout: WorkoutPlan = {
      id: `custom-${Date.now()}`,
      name: workoutName,
      goal: 'hypertrophy',
      duration: selectedExercises.length * 15,
      exercises: selectedExercises.map((exercise, index) => ({
        id: `${exercise.id}-${index}`,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restTime: exercise.restTime,
        imageUrl: exercise.imageUrl,
        equipment: exercise.equipment,
        description: exercise.description
      }))
    };

    saveCustomWorkout({
      name: workoutName,
      exercises: selectedExercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restTime: ex.restTime,
        equipment: ex.equipment,
        description: ex.description,
        imageUrl: ex.imageUrl,
      }))
    });

    (global as any).customWorkout = customWorkout;
    
    router.push({
      pathname: "/workout/[id]" as any,
      params: { id: customWorkout.id }
    });
  };
  
  const loadSavedWorkout = (workout: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setWorkoutName(workout.name);
    setSelectedExercises(workout.exercises.map((ex: any) => ({
      ...ex,
      id: `exercise-${Date.now()}-${Math.random()}`,
      targetMuscle: 'general' as any,
      difficulty: 'intermediate' as any,
    })));
    setShowSavedWorkouts(false);
  };

  const getFilteredExercises = () => {
    if (!selectedBodyPart) return [];
    
    let exercises = exercisesByBodyPart[selectedBodyPart];
    
    if (searchQuery.trim()) {
      exercises = exercises.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return exercises;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.back();
          }}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Workout</Text>
        <TouchableOpacity 
          style={[styles.saveButton, (!workoutName.trim() || selectedExercises.length === 0) && styles.saveButtonDisabled]}
          onPress={saveWorkout}
          disabled={!workoutName.trim() || selectedExercises.length === 0}
        >
          <Play size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Start</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {savedWorkouts.length > 0 && (
          <View style={styles.savedWorkoutsSection}>
            <TouchableOpacity 
              style={styles.savedWorkoutsHeader}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowSavedWorkouts(!showSavedWorkouts);
              }}
            >
              <Text style={styles.savedWorkoutsTitle}>Load Past Workout ({savedWorkouts.length})</Text>
              <Text style={styles.savedWorkoutsToggle}>{showSavedWorkouts ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            
            {showSavedWorkouts && (
              <View style={styles.savedWorkoutsList}>
                {savedWorkouts.map((workout) => (
                  <TouchableOpacity 
                    key={workout.id} 
                    style={styles.savedWorkoutCard}
                    onPress={() => loadSavedWorkout(workout)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.savedWorkoutInfo}>
                      <Text style={styles.savedWorkoutName}>{workout.name}</Text>
                      <Text style={styles.savedWorkoutMeta}>
                        {workout.exercises.length} exercises • {new Date(workout.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.savedWorkoutActions}>
                      <TouchableOpacity
                        style={styles.deleteWorkoutButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          Alert.alert(
                            'Delete Workout',
                            `Are you sure you want to delete "${workout.name}"?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Delete', 
                                style: 'destructive',
                                onPress: () => deleteSavedWorkout(workout.id)
                              }
                            ]
                          );
                        }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.nameSection}>
          <Text style={styles.label}>Workout Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Upper Body Blast"
            placeholderTextColor="#9CA3AF"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>

        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises ({selectedExercises.length})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setShowExercisePicker(true);
              }}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap &quot;Add Exercise&quot; to get started</Text>
            </View>
          ) : (
            <View style={styles.exercisesList}>
              {selectedExercises.map((exercise, index) => (
                <View key={`${exercise.id}-${index}`} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseReorder}>
                      <TouchableOpacity 
                        onPress={() => moveExercise(index, 'up')}
                        disabled={index === 0}
                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                      >
                        <GripVertical size={20} color={index === 0 ? "#4B5563" : "#9CA3AF"} />
                      </TouchableOpacity>
                      <Text style={styles.exerciseNumber}>{index + 1}</Text>
                      <TouchableOpacity 
                        onPress={() => moveExercise(index, 'down')}
                        disabled={index === selectedExercises.length - 1}
                        style={[styles.reorderButton, index === selectedExercises.length - 1 && styles.reorderButtonDisabled]}
                      >
                        <GripVertical size={20} color={index === selectedExercises.length - 1 ? "#4B5563" : "#9CA3AF"} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseEquipment}>{exercise.equipment}</Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => removeExercise(index)}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.exerciseParams}>
                    <View style={styles.paramGroup}>
                      <Text style={styles.paramLabel}>Sets</Text>
                      <View style={styles.paramControls}>
                        <TouchableOpacity 
                          style={styles.paramButton}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            updateExercise(index, 'sets', Math.max(1, exercise.sets - 1));
                          }}
                        >
                          <Text style={styles.paramButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.paramValue}>{exercise.sets}</Text>
                        <TouchableOpacity 
                          style={styles.paramButton}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            updateExercise(index, 'sets', exercise.sets + 1);
                          }}
                        >
                          <Text style={styles.paramButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.paramGroup}>
                      <Text style={styles.paramLabel}>Reps</Text>
                      <TextInput
                        style={styles.repsInput}
                        value={exercise.reps}
                        onChangeText={(value) => updateExercise(index, 'reps', value)}
                        placeholder="8-12"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={styles.paramGroup}>
                      <Text style={styles.paramLabel}>Rest (s)</Text>
                      <View style={styles.paramControls}>
                        <TouchableOpacity 
                          style={styles.paramButton}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            updateExercise(index, 'restTime', Math.max(30, exercise.restTime - 15));
                          }}
                        >
                          <Text style={styles.paramButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.paramValue}>{exercise.restTime}</Text>
                        <TouchableOpacity 
                          style={styles.paramButton}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            updateExercise(index, 'restTime', exercise.restTime + 15);
                          }}
                        >
                          <Text style={styles.paramButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {showExercisePicker && (
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {selectedBodyPart ? bodyPartLabels[selectedBodyPart] : 'Select Body Part'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowExercisePicker(false);
                  setSelectedBodyPart(null);
                  setSearchQuery("");
                }}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {!selectedBodyPart ? (
              <ScrollView style={styles.pickerContent} showsVerticalScrollIndicator={false}>
                <View style={styles.bodyPartsGrid}>
                  {bodyParts.map((bodyPart) => (
                    <TouchableOpacity
                      key={bodyPart}
                      style={[
                        styles.bodyPartCard,
                        { backgroundColor: bodyPartColors[bodyPart] }
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        setSelectedBodyPart(bodyPart);
                      }}
                    >
                      <Text style={styles.bodyPartLabel}>{bodyPartLabels[bodyPart]}</Text>
                      <Text style={styles.bodyPartCount}>
                        {exercisesByBodyPart[bodyPart].length} exercises
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <>
                <View style={styles.searchContainer}>
                  <Search size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setSelectedBodyPart(null);
                      setSearchQuery("");
                    }}
                  >
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.pickerContent} showsVerticalScrollIndicator={false}>
                  {getFilteredExercises().length === 0 ? (
                    <View style={styles.emptyExerciseState}>
                      <Text style={styles.emptyStateText}>No exercises found</Text>
                      <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
                    </View>
                  ) : (
                    <View style={styles.exercisesGrid}>
                      {getFilteredExercises().map((exercise) => (
                      <TouchableOpacity
                        key={exercise.id}
                        style={styles.exercisePickerCard}
                        onPress={() => addExercise(exercise)}
                      >
                        <Image 
                          source={{ uri: exercise.imageUrl }} 
                          style={styles.exerciseImage}
                        />
                        <View style={styles.exercisePickerInfo}>
                          <Text style={styles.exercisePickerName}>{exercise.name}</Text>
                          <Text style={styles.exercisePickerEquipment}>{exercise.equipment}</Text>
                          <View style={[
                            styles.difficultyBadge,
                            { backgroundColor: 
                              exercise.difficulty === 'beginner' ? '#10B981' :
                              exercise.difficulty === 'intermediate' ? '#F59E0B' :
                              '#EF4444'
                            }
                          ]}>
                            <Text style={styles.difficultyText}>
                              {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#171B22",
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00ADB5",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  nameSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#0D0F13",
  },
  exercisesSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00ADB5",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  exercisesList: {
    gap: 15,
  },
  exerciseCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  exerciseReorder: {
    alignItems: "center",
    gap: 5,
  },
  reorderButton: {
    padding: 2,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ADB5",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  exerciseEquipment: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  deleteButton: {
    padding: 5,
  },
  exerciseParams: {
    flexDirection: "row",
    gap: 10,
  },
  paramGroup: {
    flex: 1,
  },
  paramLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
    textAlign: "center",
  },
  paramControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0F13",
    borderRadius: 8,
    padding: 5,
    gap: 10,
  },
  paramButton: {
    width: 30,
    height: 30,
    backgroundColor: "#171B22",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  paramButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  paramValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    minWidth: 30,
    textAlign: "center",
  },
  repsInput: {
    backgroundColor: "#0D0F13",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#F9FAFB",
    textAlign: "center",
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    backgroundColor: "#171B22",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  pickerContent: {
    maxHeight: 500,
  },
  bodyPartsGrid: {
    padding: 20,
    gap: 15,
  },
  bodyPartCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  bodyPartLabel: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  bodyPartCount: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    padding: 12,
    margin: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#F9FAFB",
  },
  backText: {
    fontSize: 14,
    color: "#00ADB5",
    fontWeight: "600",
  },
  exercisesGrid: {
    padding: 20,
    gap: 15,
  },
  exercisePickerCard: {
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#1F2937",
  },
  exercisePickerInfo: {
    padding: 15,
  },
  exercisePickerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 5,
  },
  exercisePickerEquipment: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 10,
  },
  difficultyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  savedWorkoutsSection: {
    padding: 20,
    paddingBottom: 0,
  },
  savedWorkoutsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  savedWorkoutsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  savedWorkoutsToggle: {
    fontSize: 14,
    color: "#00ADB5",
    fontWeight: "600",
  },
  savedWorkoutsList: {
    gap: 10,
  },
  savedWorkoutCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00ADB5",
  },
  savedWorkoutInfo: {
    flex: 1,
  },
  savedWorkoutName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  savedWorkoutMeta: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  savedWorkoutActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  deleteWorkoutButton: {
    padding: 5,
  },
  emptyExerciseState: {
    padding: 40,
    alignItems: "center",
  },
});
