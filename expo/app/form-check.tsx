import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  X,
  Camera,
  Video,
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react-native";
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { callOpenAI, callOpenAIWithMultipleFrames } from "@/utils/openai";
import { useApp } from "@/providers/AppProvider";
import { useLanguage } from "@/providers/LanguageProvider";

interface FormFeedback {
  overall: string;
  score: number;
  strengths: string[];
  improvements: string[];
  tips: string[];
}

export default function FormCheckScreen() {
  const { exerciseName } = useLocalSearchParams<{ exerciseName: string }>();
  const insets = useSafeAreaInsets();
  const { addFormCheckEntry } = useApp();
  const { isSpanish } = useLanguage();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [frameBase64List, setFrameBase64List] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [_rawFeedback, setRawFeedback] = useState<string>("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (isAnalyzing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isAnalyzing, pulseAnim]);

  const extractFrames = async (uri: string) => {
    if (Platform.OS === 'web') {
      setThumbnailUri(uri);
      setFrameBase64List([]);
      console.log('Web platform: using video URI as thumbnail fallback');
      return;
    }

    const timestamps = [500, 2000, 5000, 8000];
    const base64Frames: string[] = [];
    let firstThumbUri: string | null = null;

    for (const time of timestamps) {
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time, quality: 0.8 });
        console.log(`Frame extracted at ${time}ms: ${thumbUri.substring(0, 60)}`);
        if (!firstThumbUri) firstThumbUri = thumbUri;

        const base64 = await FileSystem.readAsStringAsync(thumbUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64 && base64.length > 100) {
          base64Frames.push(base64);
          console.log(`Base64 frame at ${time}ms: ${base64.length} chars`);
        }
      } catch (err) {
        console.warn(`Failed to extract frame at ${time}ms:`, err);
      }
    }

    if (base64Frames.length === 0) {
      try {
        const { uri: fallbackUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.8 });
        firstThumbUri = fallbackUri;
        const base64 = await FileSystem.readAsStringAsync(fallbackUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (base64 && base64.length > 100) {
          base64Frames.push(base64);
          console.log('Fallback frame extracted successfully');
        }
      } catch (err) {
        console.error('Fallback frame extraction also failed:', err);
      }
    }

    setThumbnailUri(firstThumbUri || uri);
    setFrameBase64List(base64Frames);
    console.log(`Total frames extracted: ${base64Frames.length}`);
  };

  const pickVideo = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            isSpanish ? "Permiso necesario" : "Permission needed",
            isSpanish ? "Se requiere permiso de cámara para grabar video." : "Camera permission is required to record video."
          );
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["videos"],
            videoMaxDuration: 30,
            videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["videos"],
            videoMaxDuration: 30,
            allowsEditing: true,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        setFeedback(null);
        setRawFeedback("");
        console.log("Video selected for form check:", asset.uri.substring(0, 50));
        await extractFrames(asset.uri);
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert(
        isSpanish ? "Error" : "Error",
        isSpanish ? "No se pudo seleccionar el video. Inténtalo de nuevo." : "Failed to pick video. Please try again."
      );
    }
  };

  const analyzeForm = async () => {
    if (!videoUri) {
      Alert.alert(
        isSpanish ? "Sin Video" : "No Video",
        isSpanish ? "Por favor graba o selecciona un video primero." : "Please record or select a video first."
      );
      return;
    }

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAnalyzing(true);
    console.log("analyzeForm called. frames available:", frameBase64List.length, "Platform:", Platform.OS);

    try {
      const langInstruction = isSpanish
        ? "\nIMPORTANT: Respond entirely in Spanish."
        : "";

      const hasFrames = frameBase64List.length > 0;
      console.log("Has frames for vision:", hasFrames, "count:", frameBase64List.length);

      const frameContext = hasFrames
        ? frameBase64List.length > 1
          ? `Analyze these ${frameBase64List.length} frames captured at different moments from a video of someone performing the exercise "${exerciseName || "an exercise"}". These frames show different phases of the movement.`
          : `Analyze this frame captured from a video of someone performing the exercise "${exerciseName || "an exercise"}".`
        : `The user has uploaded a video of themselves performing "${exerciseName || "an exercise"}". Since the image could not be processed, provide general expert-level form guidance for this specific exercise.`;

      const basePrompt = `You are an expert fitness coach and movement specialist. ${frameContext}${langInstruction}

Evaluate their form and provide detailed feedback. ${hasFrames ? "Look at:" : "Cover these key areas:"}
- Body alignment and posture
- Joint positions and angles
- Range of motion
- Common mistakes for this exercise
- Safety concerns

Respond in this exact JSON format:
{
  "overall": "A 2-3 sentence overall assessment",
  "score": 7,
  "strengths": ["Specific thing 1", "Specific thing 2"],
  "improvements": ["Specific improvement 1", "Specific improvement 2"],
  "tips": ["Pro tip 1", "Pro tip 2"]
}

The score should be 1-10. Be encouraging but honest. Give specific, actionable feedback.
Return ONLY valid JSON.`;

      let aiResponse: string;

      if (hasFrames) {
        console.log("Analyzing exercise form with AI vision from", frameBase64List.length, "video frames...");
        aiResponse = await callOpenAIWithMultipleFrames(basePrompt, frameBase64List);
      } else {
        console.log("No frames available, using text-only analysis for:", exerciseName);
        aiResponse = await callOpenAI(basePrompt);
      }

      console.log("AI form analysis response:", aiResponse.substring(0, 200));
      setRawFeedback(aiResponse);

      let cleaned = aiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleaned) as FormFeedback;
      setFeedback({
        overall: parsed.overall || "Analysis complete.",
        score: typeof parsed.score === "number" ? Math.min(10, Math.max(1, parsed.score)) : 7,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      });

      addFormCheckEntry({
        exerciseName: exerciseName || "Unknown Exercise",
        imageUri: thumbnailUri || videoUri || "",
        feedback: aiResponse,
        date: new Date().toISOString(),
      });

      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("Error analyzing form:", error?.message || error);
      Alert.alert(
        isSpanish ? "Análisis Fallido" : "Analysis Failed",
        isSpanish ? "No se pudo analizar tu forma. Inténtalo de nuevo con un video más claro." : "Could not analyze your form. Please try again with a clearer video."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCheck = () => {
    setVideoUri(null);
    setThumbnailUri(null);
    setFrameBase64List([]);
    setFeedback(null);
    setRawFeedback("");
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return "#10B981";
    if (score >= 6) return "#F59E0B";
    return "#EF4444";
  };

  const getScoreLabel = (score: number): string => {
    if (isSpanish) {
      if (score >= 9) return "Excelente";
      if (score >= 7) return "Buena";
      if (score >= 5) return "Necesita Trabajo";
      return "Necesita Mejora";
    }
    if (score >= 9) return "Excellent";
    if (score >= 7) return "Good Form";
    if (score >= 5) return "Needs Work";
    return "Needs Improvement";
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarFill, { height: insets.top }]} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={22} color="#5A5A5E" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isSpanish ? "Revisión de Forma" : "Form Check"}</Text>
          {exerciseName ? (
            <Text style={styles.headerExercise} numberOfLines={1}>{exerciseName}</Text>
          ) : null}
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {!videoUri ? (
            <View style={styles.captureSection}>
              <View style={styles.captureIconWrap}>
                <Video size={40} color="#4A7C59" />
              </View>
              <Text style={styles.captureTitle}>
                {isSpanish ? "Graba Tu Forma" : "Record Your Form"}
              </Text>
              <Text style={styles.captureSubtitle}>
                {isSpanish
                  ? "Graba un video o sube uno mientras realizas el ejercicio"
                  : "Record a video or upload one of yourself performing the exercise"}
              </Text>

              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={styles.captureButton}
                  activeOpacity={0.8}
                  onPress={() => pickVideo(true)}
                >
                  <Camera size={22} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>
                    {isSpanish ? "Grabar Video" : "Record Video"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureButton, styles.captureButtonSecondary]}
                  activeOpacity={0.8}
                  onPress={() => pickVideo(false)}
                >
                  <Upload size={22} color="#4A7C59" />
                  <Text style={[styles.captureButtonText, styles.captureButtonTextSecondary]}>
                    {isSpanish ? "Subir Video" : "Upload Video"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>
                  {isSpanish ? "Para mejores resultados:" : "For best results:"}
                </Text>
                <Text style={styles.tipItem}>
                  {isSpanish
                    ? "• Asegúrate de que todo tu cuerpo sea visible"
                    : "• Make sure your full body is visible"}
                </Text>
                <Text style={styles.tipItem}>
                  {isSpanish
                    ? "• Usa buena iluminación"
                    : "• Use good lighting"}
                </Text>
                <Text style={styles.tipItem}>
                  {isSpanish
                    ? "• Graba desde un ángulo lateral si es posible"
                    : "• Record from a side angle if possible"}
                </Text>
                <Text style={styles.tipItem}>
                  {isSpanish
                    ? "• Graba una repetición completa del movimiento (máx 30s)"
                    : "• Record a full rep of the movement (max 30s)"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.analysisSection}>
              <View style={styles.imageContainer}>
                {thumbnailUri ? (
                  <Image source={{ uri: thumbnailUri }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.previewImage, styles.videoPlaceholder]}>
                    <Video size={40} color="#7A7A7A" />
                    <Text style={styles.videoPlaceholderText}>
                      {isSpanish ? "Procesando video..." : "Processing video..."}
                    </Text>
                  </View>
                )}
                <View style={styles.videoBadge}>
                  <Video size={12} color="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>{isSpanish ? "Video" : "Video"}</Text>
                </View>
                <TouchableOpacity style={styles.retakeBtn} onPress={resetCheck}>
                  <RotateCcw size={16} color="#FFFFFF" />
                  <Text style={styles.retakeBtnText}>
                    {isSpanish ? "Regrabar" : "Re-record"}
                  </Text>
                </TouchableOpacity>
              </View>

              {!feedback && !isAnalyzing && (
                <TouchableOpacity style={styles.analyzeButton} activeOpacity={0.85} onPress={analyzeForm}>
                  <Sparkles size={20} color="#FFFFFF" />
                  <Text style={styles.analyzeButtonText}>
                    {isSpanish ? "Analizar Mi Forma" : "Analyze My Form"}
                  </Text>
                </TouchableOpacity>
              )}

              {isAnalyzing && (
                <View style={styles.analyzingCard}>
                  <Animated.View style={{ opacity: pulseAnim }}>
                    <ActivityIndicator size="large" color="#4A7C59" />
                  </Animated.View>
                  <Text style={styles.analyzingText}>
                    {isSpanish ? "Analizando tu forma..." : "Analyzing your form..."}
                  </Text>
                  <Text style={styles.analyzingSubtext}>
                    {isSpanish
                      ? "La IA está evaluando tu postura y alineación"
                      : "AI is evaluating your posture and alignment"}
                  </Text>
                </View>
              )}

              {feedback && (
                <View style={styles.feedbackContainer}>
                  <View style={styles.scoreCard}>
                    <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(feedback.score)}15` }]}>
                      <Text style={[styles.scoreNumber, { color: getScoreColor(feedback.score) }]}>
                        {feedback.score}
                      </Text>
                      <Text style={[styles.scoreMax, { color: getScoreColor(feedback.score) }]}>/10</Text>
                    </View>
                    <View style={styles.scoreInfo}>
                      <Text style={[styles.scoreLabel, { color: getScoreColor(feedback.score) }]}>
                        {getScoreLabel(feedback.score)}
                      </Text>
                      <Text style={styles.overallText}>{feedback.overall}</Text>
                    </View>
                  </View>

                  {feedback.strengths.length > 0 && (
                    <View style={styles.feedbackSection}>
                      <View style={styles.feedbackSectionHeader}>
                        <CheckCircle size={18} color="#10B981" />
                        <Text style={styles.feedbackSectionTitle}>
                          {isSpanish ? "Fortalezas" : "Strengths"}
                        </Text>
                      </View>
                      {feedback.strengths.map((item, i) => (
                        <View key={`s-${i}`} style={styles.feedbackItem}>
                          <View style={[styles.feedbackDot, { backgroundColor: "#10B981" }]} />
                          <Text style={styles.feedbackItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {feedback.improvements.length > 0 && (
                    <View style={styles.feedbackSection}>
                      <View style={styles.feedbackSectionHeader}>
                        <AlertTriangle size={18} color="#F59E0B" />
                        <Text style={styles.feedbackSectionTitle}>
                          {isSpanish ? "Mejoras" : "Improvements"}
                        </Text>
                      </View>
                      {feedback.improvements.map((item, i) => (
                        <View key={`i-${i}`} style={styles.feedbackItem}>
                          <View style={[styles.feedbackDot, { backgroundColor: "#F59E0B" }]} />
                          <Text style={styles.feedbackItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {feedback.tips.length > 0 && (
                    <View style={styles.feedbackSection}>
                      <View style={styles.feedbackSectionHeader}>
                        <Sparkles size={18} color="#6366F1" />
                        <Text style={styles.feedbackSectionTitle}>
                          {isSpanish ? "Consejos Pro" : "Pro Tips"}
                        </Text>
                      </View>
                      {feedback.tips.map((item, i) => (
                        <View key={`t-${i}`} style={styles.feedbackItem}>
                          <View style={[styles.feedbackDot, { backgroundColor: "#6366F1" }]} />
                          <Text style={styles.feedbackItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={styles.tryAgainButton} onPress={resetCheck}>
                    <RotateCcw size={18} color="#4A7C59" />
                    <Text style={styles.tryAgainText}>
                      {isSpanish ? "Analizar Otro Video" : "Analyze Another Video"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  statusBarFill: {
    backgroundColor: "#FEFCF9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#FEFCF9",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  headerExercise: {
    fontSize: 13,
    color: "#4A7C59",
    fontWeight: "600" as const,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  captureSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  captureIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(74,124,89,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  captureTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#2C2C2C",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  captureSubtitle: {
    fontSize: 15,
    color: "#7A7A7A",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  captureButtons: {
    width: "100%",
    gap: 12,
    marginBottom: 28,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A7C59",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  captureButtonSecondary: {
    backgroundColor: "rgba(74,124,89,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(74,124,89,0.2)",
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  captureButtonTextSecondary: {
    color: "#4A7C59",
  },
  tipsCard: {
    width: "100%",
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: "#4A7C59",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#2C2C2C",
    marginBottom: 10,
  },
  tipItem: {
    fontSize: 13,
    color: "#7A7A7A",
    lineHeight: 22,
  },
  analysisSection: {
    paddingTop: 20,
  },
  imageContainer: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E8E2D9",
    marginBottom: 16,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 300,
  },
  videoPlaceholder: {
    backgroundColor: "#E8E2D9",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  videoPlaceholderText: {
    fontSize: 14,
    color: "#7A7A7A",
    fontWeight: "500" as const,
  },
  videoBadge: {
    position: "absolute" as const,
    top: 12,
    left: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  videoBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  retakeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A7C59",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#4A7C59",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  analyzingCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  analyzingText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  analyzingSubtext: {
    fontSize: 14,
    color: "#7A7A7A",
    textAlign: "center",
  },
  feedbackContainer: {
    gap: 14,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  scoreBadge: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: "900" as const,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginTop: 8,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  overallText: {
    fontSize: 13,
    color: "#7A7A7A",
    lineHeight: 20,
  },
  feedbackSection: {
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
  },
  feedbackSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  feedbackSectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  feedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  feedbackItemText: {
    flex: 1,
    fontSize: 14,
    color: "#5A5A5E",
    lineHeight: 22,
  },
  tryAgainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(74,124,89,0.2)",
    backgroundColor: "rgba(74,124,89,0.04)",
    marginTop: 4,
  },
  tryAgainText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#4A7C59",
  },
});
