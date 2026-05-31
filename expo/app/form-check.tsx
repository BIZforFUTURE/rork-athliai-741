import React, { useState, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  Animated,
  Easing,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system";
import {
  X,
  Search,
  Sparkles,
  ChevronRight,
  Video,
  Upload,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react-native";
import { getAllExercises, BodyPart, ExerciseTemplate } from "@/constants/exercises";
import { analyzeExerciseForm, FormAnalysis } from "@/utils/openai";

const CATEGORIES: { key: "all" | BodyPart; label: string }[] = [
  { key: "all", label: "All" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
  { key: "cardio", label: "Cardio" },
];

const DIFFICULTY_STYLES: Record<
  ExerciseTemplate["difficulty"],
  { bg: string; text: string; label: string }
> = {
  beginner: { bg: "rgba(74,124,89,0.12)", text: "#4A7C59", label: "Beginner" },
  intermediate: { bg: "rgba(245,158,11,0.15)", text: "#B45309", label: "Intermediate" },
  advanced: { bg: "rgba(196,101,78,0.15)", text: "#B23A1F", label: "Advanced" },
};

type AnalysisStage = "idle" | "extracting" | "analyzing" | "done" | "error";

export default function FormCheckScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>("");
  const [category, setCategory] = useState<"all" | BodyPart>("all");
  const [activeExercise, setActiveExercise] = useState<ExerciseTemplate | null>(null);
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [stageText, setStageText] = useState<string>("");
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  const allExercises = useMemo(() => getAllExercises(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allExercises.filter((ex) => {
      if (category !== "all" && ex.bodyPart !== category) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.targetMuscle.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q)
      );
    });
  }, [allExercises, query, category]);

  const startSpinner = () => {
    spin.setValue(0);
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const extractFrames = async (videoUri: string, durationMs: number): Promise<string[]> => {
    const frameCount = 6;
    const safeDuration = Math.max(durationMs || 0, 1500);
    const start = Math.min(200, safeDuration * 0.05);
    const end = safeDuration - Math.min(200, safeDuration * 0.05);
    const step = (end - start) / (frameCount - 1);

    const frames: string[] = [];
    const errors: string[] = [];
    for (let i = 0; i < frameCount; i++) {
      const time = Math.max(0, Math.round(start + step * i));
      setStageText(`Extracting frame ${i + 1} of ${frameCount}…`);
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.5,
        });
        // Verify the thumbnail file exists before reading
        const fileInfo = await FileSystem.getInfoAsync(thumbUri);
        if (!fileInfo.exists) {
          errors.push(`Frame ${i + 1}: thumbnail file not found`);
          continue;
        }
        const base64 = await FileSystem.readAsStringAsync(thumbUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64 && base64.length > 100) {
          frames.push(base64);
        } else {
          errors.push(`Frame ${i + 1}: base64 too small (${base64?.length ?? 0} chars)`);
        }
      } catch (e: any) {
        const errMsg = e?.message ?? String(e);
        errors.push(`Frame ${i + 1}: ${errMsg}`);
        console.warn(`[FormCheck] Frame ${i + 1} extract failed:`, errMsg);
      }
    }
    if (errors.length > 0 && frames.length < 2) {
      console.error("[FormCheck] Frame extraction errors:", errors);
    }
    return frames;
  };

  const handleCheck = async (exercise: ExerciseTemplate) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setActiveExercise(exercise);
    setAnalysis(null);
    setErrorMsg("");
    setStage("idle");

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission needed", "Allow media access to pick a video.");
        setActiveExercise(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        quality: 0.7,
        videoMaxDuration: 30,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        setActiveExercise(null);
        return;
      }

      const asset = result.assets[0];
      const originalUri = asset.uri;
      const duration = asset.duration ?? 5000;

      if (Platform.OS === "web") {
        Alert.alert("Not supported", "Form check video analysis isn't supported on web. Try on your device.");
        setActiveExercise(null);
        return;
      }

      // Copy video to local cache so we always have a file:// URI
      // (iOS returns ph:// URIs which VideoThumbnails can't reliably read)
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      const localVideoUri = `${cacheDir}formcheck_${Date.now()}.mp4`;
      let videoUri: string;
      try {
        await FileSystem.copyAsync({ from: originalUri, to: localVideoUri });
        videoUri = localVideoUri;
      } catch (copyErr) {
        console.warn("Video copy failed, using original URI", copyErr);
        videoUri = originalUri;
      }

      // Generate a thumbnail right away so the user sees their clip
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: Math.min(300, (duration ?? 5000) * 0.1),
          quality: 0.7,
        });
        setThumbnailUri(thumb.uri);
      } catch {
        setThumbnailUri(null);
      }

      setStage("extracting");
      setStageText("Sampling frames from your video…");
      startSpinner();

      const frames = await extractFrames(videoUri, duration);

      // Clean up the copied video
      if (videoUri !== originalUri) {
        FileSystem.deleteAsync(videoUri, { idempotent: true }).catch(() => {});
      }
      if (frames.length < 2) {
        throw new Error(
          "Could not extract enough frames from the video. Try a shorter clip (under 15 seconds) with clear, steady footage of the exercise."
        );
      }

      setStage("analyzing");
      setStageText("AI is reviewing your form…");

      const result2 = await analyzeExerciseForm(exercise.name, frames);
      setAnalysis(result2);
      setStage("done");
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[FormCheck] error:", msg);
      // Surface a user-friendly message
      if (msg.includes("OpenAI") || msg.includes("API key") || msg.includes("401") || msg.includes("429")) {
        setErrorMsg("The AI service is temporarily unavailable. Please try again in a moment.");
      } else if (msg.includes("timed out") || msg.includes("AbortError")) {
        setErrorMsg("The analysis took too long. Try a shorter video clip (under 15 seconds).");
      } else if (msg.includes("extract enough frames")) {
        setErrorMsg(msg);
      } else if (msg.includes("No person detected")) {
        setErrorMsg("No person was detected in the video. Make sure the lifter is clearly visible in frame.");
      } else {
        setErrorMsg(msg);
      }
      setStage("error");
      setThumbnailUri(null);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const closeModal = () => {
    setActiveExercise(null);
    setStage("idle");
    setAnalysis(null);
    setErrorMsg("");
    setThumbnailUri(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.back();
          }}
          testID="form-check-close"
        >
          <X size={22} color="#5A5A5E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Form Check</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color="#A8A8A0" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor="#A8A8A0"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS !== "web") {
                  void Haptics.selectionAsync();
                }
                setCategory(c.key);
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.countLabel}>{filtered.length} EXERCISES</Text>
        {filtered.map((ex) => {
          const diff = DIFFICULTY_STYLES[ex.difficulty];
          return (
            <View key={ex.id} style={styles.row}>
              <View style={styles.rowAccent} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{ex.name}</Text>
                <View style={styles.rowMeta}>
                  <View style={[styles.diffPill, { backgroundColor: diff.bg }]}>
                    <Text style={[styles.diffText, { color: diff.text }]}>{diff.label}</Text>
                  </View>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {ex.targetMuscle} · {ex.equipment}
                  </Text>
                </View>
                <Text style={styles.rowDesc} numberOfLines={2}>
                  {ex.description}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.checkBtn}
                activeOpacity={0.85}
                onPress={() => void handleCheck(ex)}
                testID={`check-${ex.id}`}
              >
                <Sparkles size={14} color="#4A7C59" />
                <Text style={styles.checkBtnText}>Check</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No exercises match your search.</Text>
          </View>
        )}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      <Modal
        visible={!!activeExercise && stage !== "idle"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={[styles.modal, { paddingTop: 12 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{activeExercise?.name ?? "Form Check"}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {(stage === "extracting" || stage === "analyzing") && (
              <View style={styles.loadingBlock}>
                {thumbnailUri ? (
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: thumbnailUri }} style={styles.thumbImage} />
                    <View style={styles.thumbOverlay}>
                      <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                        <View style={styles.loadingRingSmall} />
                      </Animated.View>
                    </View>
                  </View>
                ) : (
                  <>
                    <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                      <View style={styles.loadingRing} />
                    </Animated.View>
                    <View style={styles.loadingIcon}>
                      {stage === "extracting" ? (
                        <Video size={26} color="#4A7C59" />
                      ) : (
                        <Sparkles size={26} color="#4A7C59" />
                      )}
                    </View>
                  </>
                )}
                <Text style={styles.loadingTitle}>
                  {stage === "extracting" ? "Preparing your video" : "Analyzing your form"}
                </Text>
                <Text style={styles.loadingSub}>{stageText}</Text>
              </View>
            )}

            {stage === "error" && (
              <View style={styles.errorBlock}>
                <View style={styles.errorIconWrap}>
                  <AlertTriangle size={28} color="#B23A1F" />
                </View>
                <Text style={styles.errorTitle}>Couldn&apos;t analyze that clip</Text>
                <Text style={styles.errorMsg}>{errorMsg}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  activeOpacity={0.85}
                  onPress={() => activeExercise && void handleCheck(activeExercise)}
                >
                  <Upload size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Try another video</Text>
                </TouchableOpacity>
              </View>
            )}

            {stage === "done" && analysis && (
              <View>
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreLabel}>FORM SCORE</Text>
                  <Text style={styles.scoreValue}>{analysis.score}</Text>
                  <View style={styles.scoreBarBg}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          width: `${analysis.score}%`,
                          backgroundColor:
                            analysis.score >= 80
                              ? "#4A7C59"
                              : analysis.score >= 55
                              ? "#D97706"
                              : "#B23A1F",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.summaryText}>{analysis.summary}</Text>
                </View>

                {analysis.good.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <CheckCircle2 size={16} color="#4A7C59" />
                      <Text style={styles.sectionTitle}>What you&apos;re doing well</Text>
                    </View>
                    {analysis.good.map((g, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: "#4A7C59" }]} />
                        <Text style={styles.bulletText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {analysis.fixes.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <AlertTriangle size={16} color="#B45309" />
                      <Text style={styles.sectionTitle}>Fix this next set</Text>
                    </View>
                    {analysis.fixes.map((f, i) => {
                      const sevColor =
                        f.severity === "high"
                          ? "#B23A1F"
                          : f.severity === "medium"
                          ? "#D97706"
                          : "#7A7A7A";
                      return (
                        <View key={i} style={styles.fixCard}>
                          <View style={styles.fixHeader}>
                            <View style={[styles.sevDot, { backgroundColor: sevColor }]} />
                            <Text style={styles.fixIssue}>{f.issue}</Text>
                          </View>
                          <Text style={styles.fixCorrection}>{f.correction}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {analysis.cues.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <TrendingUp size={16} color="#4A7C59" />
                      <Text style={styles.sectionTitle}>Mental cues</Text>
                    </View>
                    <View style={styles.cueWrap}>
                      {analysis.cues.map((c, i) => (
                        <View key={i} style={styles.cuePill}>
                          <Text style={styles.cueText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.againBtn}
                  activeOpacity={0.85}
                  onPress={() => activeExercise && void handleCheck(activeExercise)}
                >
                  <Upload size={16} color="#FFFFFF" />
                  <Text style={styles.againBtnText}>Check another video</Text>
                </TouchableOpacity>

                <View style={{ height: insets.bottom + 24 }} />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3EDE4" },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#E8E1D6",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2C2C2C",
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#E8E1D6",
    borderRadius: 22,
  },
  chipActive: {
    backgroundColor: "#4A7C59",
  },
  chipText: {
    fontSize: 14,
    color: "#5A5A5E",
    fontWeight: "600" as const,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  countLabel: {
    fontSize: 12,
    color: "#A8A8A0",
    fontWeight: "700" as const,
    letterSpacing: 1,
    marginVertical: 12,
  },
  row: {
    flexDirection: "row" as const,
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  rowAccent: {
    width: 4,
    backgroundColor: "#C4654E",
  },
  rowBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  rowName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  rowMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flexWrap: "wrap" as const,
  },
  diffPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  metaText: {
    fontSize: 12,
    color: "#7A7A7A",
    flex: 1,
  },
  rowDesc: {
    fontSize: 12.5,
    color: "#8A8A85",
    lineHeight: 17,
  },
  checkBtn: {
    paddingHorizontal: 14,
    backgroundColor: "rgba(74,124,89,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 5,
    margin: 10,
    borderRadius: 12,
    alignSelf: "flex-start" as const,
    paddingVertical: 8,
  },
  checkBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#4A7C59",
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center" as const,
  },
  emptyText: {
    color: "#A8A8A0",
    fontSize: 14,
  },
  modal: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "center" as const,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#2C2C2C",
    flex: 1,
    letterSpacing: -0.3,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingBlock: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
  },
  loadingRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "rgba(74,124,89,0.2)",
    borderTopColor: "#4A7C59",
  },
  loadingIcon: {
    position: "absolute" as const,
    top: 60 + 25,
  },
  loadingTitle: {
    marginTop: 24,
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  loadingSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#7A7A7A",
  },
  errorBlock: {
    alignItems: "center" as const,
    paddingVertical: 40,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(178,58,31,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  errorTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  errorMsg: {
    marginTop: 6,
    fontSize: 13,
    color: "#7A7A7A",
    textAlign: "center" as const,
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "#4A7C59",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700" as const, fontSize: 14 },
  scoreCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 20,
    alignItems: "center" as const,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#A8A8A0",
    letterSpacing: 1.5,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: "900" as const,
    color: "#2C2C2C",
    marginTop: 4,
    letterSpacing: -2,
  },
  scoreBarBg: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden" as const,
    marginTop: 12,
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  summaryText: {
    marginTop: 14,
    fontSize: 14,
    color: "#3A3A3C",
    textAlign: "center" as const,
    lineHeight: 20,
  },
  section: { marginTop: 4, marginBottom: 14 },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  bulletRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    paddingVertical: 5,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#3A3A3C",
    lineHeight: 20,
  },
  fixCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  fixHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 6,
  },
  sevDot: { width: 8, height: 8, borderRadius: 4 },
  fixIssue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  fixCorrection: {
    fontSize: 13.5,
    color: "#5A5A5E",
    lineHeight: 19,
  },
  cueWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  cuePill: {
    backgroundColor: "rgba(74,124,89,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  cueText: {
    fontSize: 13,
    color: "#4A7C59",
    fontWeight: "600" as const,
  },
  thumbWrap: {
    width: 180,
    height: 180,
    borderRadius: 20,
    overflow: "hidden" as const,
    marginBottom: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  loadingRingSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    borderTopColor: "#FFFFFF",
  },
  againBtn: {
    marginTop: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "#4A7C59",
    paddingVertical: 14,
    borderRadius: 16,
  },
  againBtnText: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
    fontSize: 15,
  },
});
