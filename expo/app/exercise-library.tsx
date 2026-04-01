import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  X,
  Search,
  Sparkles,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  exercisesByBodyPart,
  BodyPart,
  ExerciseTemplate,
  bodyPartColors,
  getAllExercises,
} from "@/constants/exercises";
import { useLanguage } from "@/providers/LanguageProvider";

const BODY_PART_LABELS_EN: Record<BodyPart, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
  cardio: "Cardio",
};

const BODY_PART_LABELS_ES: Record<BodyPart, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  arms: "Brazos",
  legs: "Piernas",
  core: "Core",
  cardio: "Cardio",
};

export default function ExerciseLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { isSpanish } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | "all">("all");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const bodyPartLabels = isSpanish ? BODY_PART_LABELS_ES : BODY_PART_LABELS_EN;

  const filteredExercises = useMemo(() => {
    let exercises: ExerciseTemplate[] = [];

    if (selectedBodyPart === "all") {
      exercises = getAllExercises();
    } else {
      exercises = exercisesByBodyPart[selectedBodyPart] || [];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      exercises = exercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.targetMuscle.toLowerCase().includes(query) ||
          ex.equipment.toLowerCase().includes(query)
      );
    }

    return exercises;
  }, [selectedBodyPart, searchQuery]);

  const bodyParts: (BodyPart | "all")[] = ["all", "chest", "back", "shoulders", "arms", "legs", "core", "cardio"];

  const navigateToFormCheck = (exercise: ExerciseTemplate) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: "/form-check" as any,
      params: { exerciseName: exercise.name },
    });
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case "beginner": return "#10B981";
      case "intermediate": return "#F59E0B";
      case "advanced": return "#EF4444";
      default: return "#7A7A7A";
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    if (isSpanish) {
      switch (difficulty) {
        case "beginner": return "Principiante";
        case "intermediate": return "Intermedio";
        case "advanced": return "Avanzado";
        default: return difficulty;
      }
    }
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={22} color="#5A5A5E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSpanish ? "Revisión de Forma con IA" : "AI Form Check"}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#A8A8A0" />
          <TextInput
            style={styles.searchInput}
            placeholder={isSpanish ? "Buscar ejercicios..." : "Search exercises..."}
            placeholderTextColor="#A8A8A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#A8A8A0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {bodyParts.map((part) => {
            const isActive = selectedBodyPart === part;
            const label = part === "all"
              ? (isSpanish ? "Todos" : "All")
              : bodyPartLabels[part];
            return (
              <TouchableOpacity
                key={part}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setSelectedBodyPart(part);
                }}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          <Text style={styles.resultCount}>
            {filteredExercises.length} {isSpanish ? "ejercicios" : "exercises"}
          </Text>

          {filteredExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseCard}
              activeOpacity={0.85}
              onPress={() => navigateToFormCheck(exercise)}
            >
              <View style={styles.exerciseCardLeft}>
                <View style={[styles.exerciseColorBar, { backgroundColor: bodyPartColors[exercise.bodyPart] }]} />
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <View style={[styles.difficultyBadge, { backgroundColor: `${getDifficultyColor(exercise.difficulty)}15` }]}>
                      <Text style={[styles.difficultyText, { color: getDifficultyColor(exercise.difficulty) }]}>
                        {getDifficultyLabel(exercise.difficulty)}
                      </Text>
                    </View>
                    <Text style={styles.exerciseTarget}>{exercise.targetMuscle}</Text>
                    <Text style={styles.exerciseEquip}>• {exercise.equipment}</Text>
                  </View>
                  <Text style={styles.exerciseDesc} numberOfLines={2}>{exercise.description}</Text>
                </View>
              </View>
              <View style={styles.exerciseCardRight}>
                <View style={styles.formCheckBadge}>
                  <Sparkles size={14} color="#4A7C59" />
                  <Text style={styles.formCheckText}>
                    {isSpanish ? "Revisar" : "Check"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#A8A8A0" />
              </View>
            </TouchableOpacity>
          ))}

          {filteredExercises.length === 0 && (
            <View style={styles.emptyState}>
              <Search size={36} color="#A8A8A0" />
              <Text style={styles.emptyText}>
                {isSpanish ? "No se encontraron ejercicios" : "No exercises found"}
              </Text>
              <Text style={styles.emptySubtext}>
                {isSpanish ? "Intenta con otra búsqueda" : "Try a different search"}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
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
    paddingVertical: 14,
    backgroundColor: "#FEFCF9",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FEFCF9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2C2C2C",
    padding: 0,
  },
  filterContainer: {
    backgroundColor: "#FEFCF9",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0EBE3",
  },
  filterChipActive: {
    backgroundColor: "#4A7C59",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#7A7A7A",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#A8A8A0",
    marginBottom: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  exerciseCardLeft: {
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  exerciseColorBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseCardName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#2C2C2C",
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  exerciseTarget: {
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "500" as const,
  },
  exerciseEquip: {
    fontSize: 12,
    color: "#A8A8A0",
  },
  exerciseDesc: {
    fontSize: 12,
    color: "#A8A8A0",
    lineHeight: 18,
  },
  exerciseCardRight: {
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  formCheckBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,124,89,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  formCheckText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4A7C59",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#7A7A7A",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#A8A8A0",
  },
});
