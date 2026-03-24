import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router, Stack } from "expo-router";
import {
  ArrowLeft,
  Camera,
  MapPin,
  Clock,
  TrendingUp,
  Flame,
  Calendar,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import * as ImagePicker from "expo-image-picker";
import RunMap from "@/components/RunMap";
import colors from "@/constants/colors";

export default function RunDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recentRuns, updateRun } = useApp();
  const insets = useSafeAreaInsets();
  
  const [run, setRun] = useState(recentRuns.find(r => r.id === id));
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(run?.notes || "");
  const [route, setRoute] = useState(run?.route || "");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const updatedRun = recentRuns.find(r => r.id === id);
    if (updatedRun) {
      setRun(updatedRun);
      setNotes(updatedRun.notes || "");
      setRoute(updatedRun.route || "");
    }
  }, [recentRuns, id]);

  if (!run) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Run not found</Text>
      </View>
    );
  }

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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSave = () => {
    if (!id) return;
    
    updateRun(id, {
      notes: notes.trim(),
      route: route.trim(),
    });
    
    setIsEditing(false);
    Alert.alert("Success", "Run details updated successfully!");
  };

  const handleAddPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to add photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...(run.photos || []), result.assets[0].uri];
        updateRun(id!, { photos: newPhotos });
      }
    } catch (error) {
      console.error("Error adding photo:", error);
      Alert.alert("Error", "Failed to add photo. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera permissions to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...(run.photos || []), result.assets[0].uri];
        updateRun(id!, { photos: newPhotos });
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleDeletePhoto = (photoIndex: number) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newPhotos = run.photos?.filter((_, index) => index !== photoIndex) || [];
            updateRun(id!, { photos: newPhotos });
          },
        },
      ]
    );
  };

  const showPhotoOptions = () => {
    Alert.alert(
      "Add Photo",
      "Choose how you'd like to add a photo",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handleAddPhoto },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <LinearGradient
        colors={[colors.accent.teal, colors.accent.violet]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Run Details</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={isEditing ? handleSave : () => setIsEditing(true)}
            testID="edit-button"
          >
            {isEditing ? (
              <Save size={24} color="#FFFFFF" />
            ) : (
              <Edit3 size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateCard}>
          <Calendar size={20} color={colors.accent.teal} />
          <View style={styles.dateInfo}>
            <Text style={styles.dateText}>{formatDate(run.date)}</Text>
            <Text style={styles.timeText}>{formatDateTime(run.date)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MapPin size={24} color={colors.accent.teal} />
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>{run.distance.toFixed(2)}</Text>
            <Text style={styles.statUnit}>miles</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={24} color="#10B981" />
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={styles.statValue}>{formatTime(run.time)}</Text>
            <Text style={styles.statUnit}>duration</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#F59E0B" />
            <Text style={styles.statLabel}>PACE</Text>
            <Text style={styles.statValue}>{formatPace(run.pace)}</Text>
            <Text style={styles.statUnit}>min/mi</Text>
          </View>
          <View style={styles.statCard}>
            <Flame size={24} color="#EF4444" />
            <Text style={styles.statLabel}>CALORIES</Text>
            <Text style={styles.statValue}>{run.calories}</Text>
            <Text style={styles.statUnit}>burned</Text>
          </View>
        </View>

        {/* Route Map */}
        <RunMap
          currentLocation={null}
          routeCoordinates={run.routeCoordinates || []}
          showMap={true}
          isRunning={false}
          isHistorical={true}
          title="Your Route"
        />

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Route</Text>
          {isEditing ? (
            <TextInput
              style={styles.textInput}
              value={route}
              onChangeText={setRoute}
              placeholder="Where did you run? (e.g., Central Park Loop)"
              multiline
              testID="route-input"
            />
          ) : (
            <Text style={styles.detailText}>
              {route || "No route specified"}
            </Text>
          )}
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {isEditing ? (
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did the run feel? Any thoughts or memories?"
              multiline
              numberOfLines={4}
              testID="notes-input"
            />
          ) : (
            <Text style={styles.detailText}>
              {notes || "No notes added"}
            </Text>
          )}
        </View>

        <View style={styles.photosSection}>
          <View style={styles.photosSectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={showPhotoOptions}
              testID="add-photo-button"
            >
              <Plus size={20} color={colors.accent.teal} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
          
          {run.photos && run.photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {run.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoContainer}
                  onPress={() => {
                    setSelectedImageIndex(index);
                    setShowImageModal(true);
                  }}
                  testID={`photo-${index}`}
                >
                  {photo && photo.trim() ? (
                    <Image source={{ uri: photo }} style={styles.photo} />
                  ) : (
                    <View style={[styles.photo, styles.placeholderPhoto]}>
                      <Camera size={24} color="#9CA3AF" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(index)}
                    testID={`delete-photo-${index}`}
                  >
                    <Trash2 size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPhotos}>
              <Camera size={48} color="#9CA3AF" />
              <Text style={styles.emptyPhotosText}>
                No photos yet. Add some memories from your run!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setShowImageModal(false)}
            testID="close-image-modal"
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {run.photos && run.photos[selectedImageIndex] && run.photos[selectedImageIndex].trim() ? (
            <Image
              source={{ uri: run.photos[selectedImageIndex] }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.fullScreenImagePlaceholder}>
              <Camera size={48} color="#9CA3AF" />
              <Text style={styles.placeholderText}>Image not available</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  dateCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  dateInfo: {
    marginLeft: 15,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text.primary,
  },
  timeText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginTop: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: colors.text.primary,
    marginTop: 5,
  },
  statUnit: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  detailsSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text.primary,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.tertiary,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  photosSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  photosSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 173, 181, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.accent.teal,
    fontWeight: "500" as const,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoContainer: {
    position: "relative",
    width: "48%",
    aspectRatio: 4 / 3,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  deletePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    borderRadius: 12,
    padding: 4,
  },
  emptyPhotos: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyPhotosText: {
    fontSize: 16,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: 15,
    lineHeight: 24,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  fullScreenImage: {
    width: "90%",
    height: "80%",
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    textAlign: "center",
    marginTop: 50,
  },
  placeholderPhoto: {
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImagePlaceholder: {
    width: "90%",
    height: "80%",
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: "500" as const,
  },
});