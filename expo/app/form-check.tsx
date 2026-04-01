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
  ImageIcon,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { callOpenAIWithVision } from "@/utils/openai";
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

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
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

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Camera permission is required to take a photo.");
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            base64: true,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            base64: true,
            allowsEditing: false,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 ?? null);
        setFeedback(null);
        setRawFeedback("");
        console.log("Image selected for form check:", asset.uri.substring(0, 50));
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const analyzeForm = async () => {
    if (!imageBase64) {
      Alert.alert("No Image", "Please take or select a photo first.");
      return;
    }

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAnalyzing(true);

    try {
      const langInstruction = isSpanish
        ? "\nIMPORTANT: Respond entirely in Spanish."
        : "";

      const prompt = `You are an expert fitness coach and movement specialist. Analyze this photo of someone performing the exercise "${exerciseName || "an exercise"}".${langInstruction}

Evaluate their form and provide detailed feedback. Look at:
- Body alignment and posture
- Joint positions and angles
- Range of motion
- Common mistakes for this exercise
- Safety concerns

Respond in this exact JSON format:
{
  "overall": "A 2-3 sentence overall assessment of their form",
  "score": 7,
  "strengths": ["Specific thing they're doing well 1", "Specific thing they're doing well 2"],
  "improvements": ["Specific improvement suggestion 1", "Specific improvement suggestion 2"],
  "tips": ["Pro tip for this exercise 1", "Pro tip for this exercise 2"]
}

The score should be 1-10. Be encouraging but honest. Give specific, actionable feedback.
Return ONLY valid JSON.`;

      console.log("Analyzing exercise form with AI vision...");
      const aiResponse = await callOpenAIWithVision(prompt, imageBase64);
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
        imageUri: imageUri || "",
        feedback: aiResponse,
        date: new Date().toISOString(),
      });

      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error analyzing form:", error);
      Alert.alert("Analysis Failed", "Could not analyze your form. Please try again with a clearer photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCheck = () => {
    setImageUri(null);
    setImageBase64(null);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          {!imageUri ? (
            <View style={styles.captureSection}>
              <View style={styles.captureIconWrap}>
                <Camera size={40} color="#4A7C59" />
              </View>
              <Text style={styles.captureTitle}>
                {isSpanish ? "Captura Tu Forma" : "Capture Your Form"}
              </Text>
              <Text style={styles.captureSubtitle}>
                {isSpanish
                  ? "Toma una foto o sube una imagen mientras realizas el ejercicio"
                  : "Take a photo or upload an image of yourself performing the exercise"}
              </Text>

              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={styles.captureButton}
                  activeOpacity={0.8}
                  onPress={() => pickImage(true)}
                >
                  <Camera size={22} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>
                    {isSpanish ? "Tomar Foto" : "Take Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureButton, styles.captureButtonSecondary]}
                  activeOpacity={0.8}
                  onPress={() => pickImage(false)}
                >
                  <ImageIcon size={22} color="#4A7C59" />
                  <Text style={[styles.captureButtonText, styles.captureButtonTextSecondary]}>
                    {isSpanish ? "Subir Imagen" : "Upload Image"}
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
                    ? "• Captura desde un ángulo lateral si es posible"
                    : "• Capture from a side angle if possible"}
                </Text>
                <Text style={styles.tipItem}>
                  {isSpanish
                    ? "• Toma la foto en el punto más bajo/difícil del movimiento"
                    : "• Take the photo at the bottom/hardest point of the movement"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.analysisSection}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity style={styles.retakeBtn} onPress={resetCheck}>
                  <RotateCcw size={16} color="#FFFFFF" />
                  <Text style={styles.retakeBtnText}>
                    {isSpanish ? "Retomar" : "Retake"}
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
                      {isSpanish ? "Analizar Otra Foto" : "Analyze Another Photo"}
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
