import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Animated,
  ActivityIndicator,
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
  Dumbbell,
  PersonStanding,
  Footprints,
  Bike,
  Flame,
  Target,
  Zap,
  Camera,
  Sparkles,
} from "lucide-react-native";
import { 
  ExerciseTemplate, 
  BodyPart, 
  exercisesByBodyPart 
} from "@/constants/exercises";
import { WorkoutPlan } from "@/constants/workouts";
import { useApp } from "@/providers/AppProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import * as ImagePicker from "expo-image-picker";
import { callOpenAIWithVision } from "@/utils/openai";

interface SelectedExercise extends ExerciseTemplate {
  sets: number;
  reps: string;
  restTime: number;
}

const BODY_PART_ICONS: Record<BodyPart, React.ReactNode> = {
  chest: <PersonStanding size={20} color="#8E8E93" />,
  back: <PersonStanding size={20} color="#8E8E93" />,
  legs: <PersonStanding size={20} color="#8E8E93" />,
  shoulders: <PersonStanding size={20} color="#8E8E93" />,
  arms: <Zap size={20} color="#8E8E93" />,
  core: <Target size={20} color="#8E8E93" />,
  cardio: <Footprints size={20} color="#8E8E93" />,
};

const CARDIO_EXERCISES = ['treadmill', 'elliptical', 'rowing-machine', 'jump-rope', 'stair-climber'];

function getExerciseIcon(exercise: ExerciseTemplate) {
  if (CARDIO_EXERCISES.includes(exercise.id)) {
    if (exercise.id === 'treadmill') return <Footprints size={18} color="#00ADB5" />;
    if (exercise.id === 'elliptical') return <Bike size={18} color="#00ADB5" />;
    if (exercise.id === 'jump-rope') return <Flame size={18} color="#00ADB5" />;
    if (exercise.id === 'stair-climber') return <Footprints size={18} color="#00ADB5" />;
    return <Dumbbell size={18} color="#00ADB5" />;
  }
  return <Dumbbell size={18} color="#00ADB5" />;
}

export default function WorkoutBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { savedWorkouts, saveCustomWorkout, deleteSavedWorkout } = useApp();
  const { t } = useLanguage();
  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showSavedWorkouts, setShowSavedWorkouts] = useState(true);
  const [isScanningGym, setIsScanningGym] = useState(false);
  const scanPulseAnim = useRef(new Animated.Value(0.4)).current;

  const bodyParts: BodyPart[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];

  const bodyPartTranslationKeys: Record<BodyPart, string> = {
    chest: 'body_part_chest',
    back: 'body_part_back',
    shoulders: 'body_part_shoulders',
    arms: 'body_part_arms',
    legs: 'body_part_legs',
    core: 'body_part_core',
    cardio: 'body_part_cardio',
  };

  const exerciseNameKeys: Record<string, string> = {
    'bench-press': 'ex_bench_press',
    'incline-dumbbell-press': 'ex_incline_bench_press',
    'push-ups': 'ex_push_up',
    'dips': 'ex_chest_dip',
    'cable-flyes': 'ex_cable_crossover',
    'dumbbell-fly': 'ex_dumbbell_fly',
    'deadlift': 'ex_deadlift',
    'bent-over-row': 'ex_barbell_row',
    'pull-ups': 'ex_pull_up',
    'lat-pulldown': 'ex_lat_pulldown',
    'cable-row': 'ex_seated_row',
    'face-pull': 'ex_face_pull',
    'overhead-press': 'ex_overhead_press',
    'lateral-raise': 'ex_lateral_raise',
    'front-raise': 'ex_front_raise',
    'reverse-fly': 'ex_reverse_fly',
    'arnold-press': 'ex_arnold_press',
    'bicep-curl': 'ex_bicep_curl',
    'hammer-curl': 'ex_hammer_curl',
    'tricep-pushdown': 'ex_tricep_pushdown',
    'skull-crusher': 'ex_skull_crusher',
    'preacher-curl': 'ex_preacher_curl',
    'overhead-tricep-extension': 'ex_overhead_tricep_extension',
    'squat': 'ex_squat',
    'leg-press': 'ex_leg_press',
    'romanian-deadlift': 'ex_romanian_deadlift',
    'leg-extension': 'ex_leg_extension',
    'leg-curl': 'ex_leg_curl',
    'calf-raise': 'ex_calf_raise',
    'lunge': 'ex_lunge',
    'bulgarian-split-squat': 'ex_bulgarian_split_squat',
    'plank': 'ex_plank',
    'crunch': 'ex_crunch',
    'russian-twist': 'ex_russian_twist',
    'leg-raise': 'ex_leg_raise',
    'ab-wheel': 'ex_ab_wheel_rollout',
    'mountain-climber': 'ex_mountain_climber',
    'treadmill': 'ex_treadmill',
    'elliptical': 'ex_elliptical',
    'rowing-machine': 'ex_rowing_machine',
    'jump-rope': 'ex_jump_rope',
    'stair-climber': 'ex_stair_climber',
    'battle-ropes': 'ex_battle_ropes',
  };

  const targetMuscleKeys: Record<string, string> = {
    'Chest': 'muscle_chest',
    'Upper Chest': 'muscle_upper_chest',
    'Lower Chest': 'muscle_lower_chest',
    'Lower Back': 'muscle_lower_back',
    'Back': 'muscle_back',
    'Lats': 'muscle_lats',
    'Mid Back': 'muscle_mid_back',
    'Rear Delts': 'muscle_rear_delts',
    'Shoulders': 'muscle_shoulders',
    'Side Delts': 'muscle_side_delts',
    'Front Delts': 'muscle_front_delts',
    'Biceps': 'muscle_biceps',
    'Triceps': 'muscle_triceps',
    'Quads': 'muscle_quads',
    'Hamstrings': 'muscle_hamstrings',
    'Calves': 'muscle_calves',
    'Core': 'muscle_core',
    'Abs': 'muscle_abs',
    'Obliques': 'muscle_obliques',
    'Lower Abs': 'muscle_lower_abs',
    'Cardio': 'muscle_cardio',
  };

  const equipmentKeys: Record<string, string> = {
    'Barbell': 'equip_barbell',
    'Dumbbells': 'equip_dumbbells',
    'Dumbbell': 'equip_dumbbell',
    'Bodyweight': 'equip_bodyweight',
    'Dip Station': 'equip_dip_station',
    'Cable Machine': 'equip_cable_machine',
    'Pull-up Bar': 'equip_pull_up_bar',
    'Leg Press Machine': 'equip_leg_press_machine',
    'Leg Extension Machine': 'equip_leg_extension_machine',
    'Leg Curl Machine': 'equip_leg_curl_machine',
    'Machine': 'equip_machine',
    'Ab Wheel': 'equip_ab_wheel',
    'Treadmill': 'equip_treadmill',
    'Elliptical': 'equip_elliptical',
    'Rowing Machine': 'equip_rowing_machine',
    'Jump Rope': 'equip_jump_rope',
    'Stair Climber': 'equip_stair_climber',
    'Battle Ropes': 'equip_battle_ropes',
  };

  const translateExerciseName = (exercise: ExerciseTemplate) => {
    const key = exerciseNameKeys[exercise.id];
    return key ? t(key as any) : exercise.name;
  };

  const translateTarget = (target: string) => {
    const key = targetMuscleKeys[target];
    return key ? t(key as any) : target;
  };

  const translateEquipment = (equipment: string) => {
    const key = equipmentKeys[equipment];
    return key ? t(key as any) : equipment;
  };

  const translateBodyPart = (bp: BodyPart) => {
    return t(bodyPartTranslationKeys[bp] as any);
  };

  const addExercise = useCallback((exercise: ExerciseTemplate) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const newExercise: SelectedExercise = {
      ...exercise,
      sets: 3,
      reps: "8-12",
      restTime: 90
    };
    
    setSelectedExercises(prev => [...prev, newExercise]);
  }, []);

  const removeExercise = useCallback((index: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateExercise = useCallback((index: number, field: keyof SelectedExercise, value: string | number) => {
    setSelectedExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const moveExercise = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    setSelectedExercises(prev => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
      return updated;
    });
  }, []);

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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setWorkoutName(workout.name);
    setSelectedExercises(workout.exercises.map((ex: any) => ({
      ...ex,
      id: `exercise-${Date.now()}-${Math.random()}`,
      targetMuscle: ex.targetMuscle ?? 'general',
      difficulty: 'intermediate' as const,
    })));
    setShowSavedWorkouts(false);
  };

  const handleScanGym = async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to scan your gym equipment.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.base64) {
        console.log('Camera cancelled or no base64 data');
        return;
      }

      setIsScanningGym(true);

      const scanPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scanPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(scanPulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      scanPulse.start();

      const base64Image = result.assets[0].base64;

      const allExerciseNames = bodyParts.flatMap(bp => exercisesByBodyPart[bp].map(e => e.name));

      const prompt = `You are analyzing a photo of a gym or workout space. Look at all visible equipment.

Based on the equipment you see, recommend 4-8 exercises from this list that the user can do:
${allExerciseNames.join(', ')}

For each recommended exercise, provide sets, reps, and rest time appropriate for a general fitness workout.

Respond in JSON format:
{"exercises": [{"name": "exact exercise name from list", "sets": 3, "reps": "8-12", "restTime": 90}]}

Return ONLY valid JSON. Use exact exercise names from the provided list.`;

      console.log('Analyzing gym for workout builder...');
      const aiResponse = await callOpenAIWithVision(prompt, base64Image);
      console.log('AI workout scan result:', aiResponse);

      scanPulse.stop();
      scanPulseAnim.setValue(0.4);

      let cleaned = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleaned);
      const recommendedExercises: SelectedExercise[] = [];

      if (Array.isArray(parsed.exercises)) {
        for (const rec of parsed.exercises) {
          const allExercises = bodyParts.flatMap(bp => exercisesByBodyPart[bp]);
          const match = allExercises.find(
            e => e.name.toLowerCase() === rec.name?.toLowerCase()
          );
          if (match) {
            recommendedExercises.push({
              ...match,
              sets: typeof rec.sets === 'number' ? rec.sets : 3,
              reps: rec.reps ?? '8-12',
              restTime: typeof rec.restTime === 'number' ? rec.restTime : 90,
            });
          }
        }
      }

      setIsScanningGym(false);

      if (recommendedExercises.length > 0) {
        setSelectedExercises(prev => [...prev, ...recommendedExercises]);
        if (!workoutName.trim()) {
          setWorkoutName('Scanned Workout');
        }
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Equipment Detected', `Added ${recommendedExercises.length} exercises based on your available equipment.`);
      } else {
        Alert.alert('No Match', 'Could not match detected equipment to exercises. Try adding exercises manually.');
      }
    } catch (error) {
      console.error('Error scanning gym:', error);
      setIsScanningGym(false);
      scanPulseAnim.setValue(0.4);
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    }
  };

  const closePicker = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExercisePicker(false);
  }, []);

  const openPicker = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowExercisePicker(true);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.back();
          }}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('builder_title')}</Text>
        <TouchableOpacity 
          style={[styles.saveButton, (!workoutName.trim() || selectedExercises.length === 0) && styles.saveButtonDisabled]}
          onPress={saveWorkout}
          disabled={!workoutName.trim() || selectedExercises.length === 0}
        >
          <Play size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{t('builder_start')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {savedWorkouts.length > 0 && (
          <View style={styles.savedWorkoutsSection}>
            <TouchableOpacity 
              style={styles.savedWorkoutsHeader}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowSavedWorkouts(!showSavedWorkouts);
              }}
            >
              <Text style={styles.savedWorkoutsTitle}>{t('builder_load_past')} ({savedWorkouts.length})</Text>
              <Text style={styles.savedWorkoutsToggle}>{showSavedWorkouts ? t('builder_hide') : t('builder_show')}</Text>
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
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <Text style={styles.label}>{t('builder_workout_name')}</Text>
          <TextInput
            style={styles.nameInput}
            placeholder={t('builder_name_placeholder')}
            placeholderTextColor="#5A5A5E"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>

        <TouchableOpacity
          style={styles.scanGymButton}
          activeOpacity={0.7}
          onPress={() => void handleScanGym()}
          disabled={isScanningGym}
        >
          {isScanningGym ? (
            <Animated.View style={[styles.scanGymIconWrap, { opacity: scanPulseAnim }]}>
              <Camera size={22} color="#00ADB5" />
            </Animated.View>
          ) : (
            <View style={styles.scanGymIconWrap}>
              <Camera size={22} color="#00ADB5" />
            </View>
          )}
          <View style={styles.scanGymTextWrap}>
            <Text style={styles.scanGymTitle}>
              {isScanningGym ? 'Analyzing your gym...' : 'Scan your gym'}
            </Text>
            <Text style={styles.scanGymSubtitle}>
              {isScanningGym ? 'AI is detecting equipment' : 'Auto-add exercises based on equipment'}
            </Text>
          </View>
          {isScanningGym ? (
            <ActivityIndicator size="small" color="#00ADB5" />
          ) : (
            <Sparkles size={20} color="#00ADB5" />
          )}
        </TouchableOpacity>

        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('builder_exercises')} ({selectedExercises.length})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openPicker}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>{t('builder_add_exercise')}</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={40} color="#2C2C2E" />
              <Text style={styles.emptyStateText}>{t('builder_no_exercises')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('builder_add_to_start')}</Text>
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
                        <GripVertical size={20} color={index === 0 ? "#3A3A3C" : "#8E8E93"} />
                      </TouchableOpacity>
                      <Text style={styles.exerciseNumber}>{index + 1}</Text>
                      <TouchableOpacity 
                        onPress={() => moveExercise(index, 'down')}
                        disabled={index === selectedExercises.length - 1}
                        style={[styles.reorderButton, index === selectedExercises.length - 1 && styles.reorderButtonDisabled]}
                      >
                        <GripVertical size={20} color={index === selectedExercises.length - 1 ? "#3A3A3C" : "#8E8E93"} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{translateExerciseName(exercise)}</Text>
                      <Text style={styles.exerciseEquipment}>{translateEquipment(exercise.equipment)}</Text>
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
                      <Text style={styles.paramLabel}>{t('builder_sets')}</Text>
                      <View style={styles.paramControls}>
                        <TouchableOpacity 
                          style={styles.paramButton}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            updateExercise(index, 'sets', exercise.sets + 1);
                          }}
                        >
                          <Text style={styles.paramButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.paramGroup}>
                      <Text style={styles.paramLabel}>{t('builder_reps')}</Text>
                      <TextInput
                        style={styles.repsInput}
                        value={exercise.reps}
                        onChangeText={(value) => updateExercise(index, 'reps', value)}
                        placeholder="8-12"
                        placeholderTextColor="#5A5A5E"
                      />
                    </View>

                    <View style={styles.paramGroup}>
                      <Text style={styles.paramLabel}>{t('builder_rest')}</Text>
                      <View style={styles.paramControls}>
                        <TouchableOpacity 
                          style={styles.paramButton}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePicker}
      >
        <View style={[styles.pickerContainer, { paddingTop: insets.top }]}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={closePicker}
            >
              <Text style={styles.cancelButtonText}>{t('builder_cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>{t('builder_choose_exercises')}</Text>
            <View style={styles.cancelButton} />
          </View>

          <ScrollView 
            style={styles.pickerContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerScrollContent}
          >
            {bodyParts.map((bodyPart) => {
              const exercises = exercisesByBodyPart[bodyPart];
              return (
                <View key={bodyPart} style={styles.bodyPartSection}>
                  <View style={styles.bodyPartHeader}>
                    {BODY_PART_ICONS[bodyPart]}
                    <Text style={styles.bodyPartTitle}>{translateBodyPart(bodyPart)}</Text>
                  </View>

                  <View style={styles.exerciseGroupCard}>
                    {exercises.map((exercise, idx) => {
                      const isSelected = selectedExercises.some(se => se.id === exercise.id);
                      return (
                        <React.Fragment key={exercise.id}>
                          <TouchableOpacity
                            style={[
                              styles.exercisePickerRow,
                              isSelected && styles.exercisePickerRowSelected,
                            ]}
                            onPress={() => addExercise(exercise)}
                            activeOpacity={0.6}
                          >
                            <View style={styles.exercisePickerIcon}>
                              {getExerciseIcon(exercise)}
                            </View>
                            <View style={styles.exercisePickerInfo}>
                              <Text style={[
                                styles.exercisePickerName,
                                isSelected && styles.exercisePickerNameSelected,
                              ]}>
                                {translateExerciseName(exercise)}
                              </Text>
                              <Text style={styles.exercisePickerTarget}>
                                {translateTarget(exercise.targetMuscle)}
                              </Text>
                            </View>
                            {isSelected && (
                              <View style={styles.selectedBadge}>
                                <Text style={styles.selectedBadgeText}>{t('builder_added')}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          {idx < exercises.length - 1 && (
                            <View style={styles.exerciseDivider} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FEFCF9",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#2C2C2C",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A7C59",
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
    fontWeight: "600" as const,
  },
  content: {
    flex: 1,
  },
  nameSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: "#FEFCF9",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#2C2C2C",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  scanGymButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(0, 173, 181, 0.06)",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1.5,
    borderColor: "rgba(0, 173, 181, 0.25)",
    borderStyle: "dashed" as const,
    gap: 12,
  },
  scanGymIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0, 173, 181, 0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  scanGymTextWrap: {
    flex: 1,
  },
  scanGymTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#00ADB5",
    marginBottom: 2,
  },
  scanGymSubtitle: {
    fontSize: 12,
    color: "#64748B",
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
    fontWeight: "bold" as const,
    color: "#2C2C2C",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A7C59",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  emptyState: {
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    padding: 50,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#2C2C2C",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#5A5A5E",
  },
  exercisesList: {
    gap: 15,
  },
  exerciseCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
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
    fontWeight: "bold" as const,
    color: "#4A7C59",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    marginBottom: 4,
  },
  exerciseEquipment: {
    fontSize: 12,
    color: "#5A5A5E",
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
    color: "#5A5A5E",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  paramControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EBE3",
    borderRadius: 8,
    padding: 5,
    gap: 10,
  },
  paramButton: {
    width: 30,
    height: 30,
    backgroundColor: "#E8E2D9",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  paramButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#2C2C2C",
  },
  paramValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    minWidth: 30,
    textAlign: "center" as const,
  },
  repsInput: {
    backgroundColor: "#F0EBE3",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#2C2C2C",
    textAlign: "center" as const,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FEFCF9",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  cancelButton: {
    minWidth: 70,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#7A7A7A",
    fontWeight: "500" as const,
    backgroundColor: "#F0EBE3",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#2C2C2C",
  },
  pickerContent: {
    flex: 1,
  },
  pickerScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bodyPartSection: {
    marginBottom: 20,
  },
  bodyPartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  bodyPartTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2C2C2C",
  },
  exerciseGroupCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  exercisePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  exercisePickerRowSelected: {
    backgroundColor: "rgba(0, 173, 181, 0.08)",
  },
  exercisePickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0, 173, 181, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exercisePickerInfo: {
    flex: 1,
  },
  exercisePickerName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#4A7C59",
    marginBottom: 2,
  },
  exercisePickerNameSelected: {
    color: "#3A6247",
  },
  exercisePickerTarget: {
    fontSize: 13,
    color: "#5A5A5E",
  },
  selectedBadge: {
    backgroundColor: "rgba(74, 124, 89, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  selectedBadgeText: {
    fontSize: 11,
    color: "#4A7C59",
    fontWeight: "600" as const,
  },
  exerciseDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginLeft: 60,
    marginRight: 16,
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
    fontWeight: "bold" as const,
    color: "#2C2C2C",
  },
  savedWorkoutsToggle: {
    fontSize: 14,
    color: "#4A7C59",
    fontWeight: "600" as const,
  },
  savedWorkoutsList: {
    gap: 10,
  },
  savedWorkoutCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  savedWorkoutInfo: {
    flex: 1,
  },
  savedWorkoutName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    marginBottom: 4,
  },
  savedWorkoutMeta: {
    fontSize: 12,
    color: "#5A5A5E",
  },
  savedWorkoutActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  deleteWorkoutButton: {
    padding: 5,
  },
});
