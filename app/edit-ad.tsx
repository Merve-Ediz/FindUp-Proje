import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, // Yükleme göstergesi
  Alert,
  Dimensions, // Ekran boyutlarını almak için
  Image,
  KeyboardAvoidingView, // Klavye açıldığında görünümü ayarlamak için
  Platform, // Platforma özel davranışlar için
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../src/config/firebase";
import { subscribeLocation } from "../src/locationStore";

const { width, height } = Dimensions.get("window");

const CLOUDINARY_CLOUD_NAME = " ";
const CLOUDINARY_UPLOAD_PRESET = " ";

const COLORS = {
  primary: "#00584E",
  primaryLight: "#E8F5F3",
  primaryMid: "#B2D8D3",
  lost: "#FF6B6B",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  border: "#E5EAE9",
  white: "#FFFFFF",
  bg: "#F7F9F8",
};

export default function EditAd() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Düzenlenecek ilan bilgileri URL parametreleriyle geliyor

  const [title, setTitle] = useState(params.title as string);
  const [description, setDescription] = useState(params.description as string);
  const [location, setLocation] = useState(params.location as string);
  const [type, setType] = useState<"lost" | "found">(
    params.type as "lost" | "found",
  );
  const [image, setImage] = useState<string | null>(
    (params.imageUrl as string) || null,
  );
  const [uploading, setUploading] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(
    params.locationCoords ? JSON.parse(params.locationCoords as string) : null,
  );

  // LocationPicker'dan gelen konum güncellemelerini dinle
  useEffect(() => {
    const unsubscribe = subscribeLocation((data) => {
      if (data) {
        setLocation(data.address);
        setLocationCoords({ lat: data.lat, lng: data.lng });
      }
    });
    return unsubscribe;
  }, []);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin Gerekli", "Galeriye erişim izni vermeniz gerekiyor.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin Gerekli", "Kamera erişim izni vermeniz gerekiyor.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as any);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    const data = await response.json();
    return data.secure_url;
  };

  const handleUpdate = async () => {
    if (!title || !description || !location) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    try {
      setUploading(true);
      let imageUrl = image;
      if (image && !image.startsWith("https://")) {
        imageUrl = await uploadToCloudinary(image);
      }
      await updateDoc(doc(db, "items", params.id as string), {
        title,
        description,
        location,
        type,
        imageUrl,
        locationCoords: locationCoords || null,
      });
      setUploading(false);
      Alert.alert("Başarılı", "İlanınız güncellendi!", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (error) {
      setUploading(false);
      Alert.alert("Hata", "İlan güncellenirken bir hata oluştu.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={width * 0.06} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>İlanı Düzenle</Text>
            <Text style={styles.headerSubtitle}>
              Bilgilerini güncelleyebilirsin
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tip Seçimi */}
          <Text style={styles.sectionLabel}>İlan Türü</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === "lost" && styles.typeButtonLost,
              ]}
              onPress={() => setType("lost")}
            >
              <Ionicons
                name="search-outline"
                size={width * 0.055}
                color={type === "lost" ? "#fff" : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  type === "lost" && styles.typeTextActive,
                ]}
              >
                Kayıp
              </Text>
              <Text
                style={[
                  styles.typeSubText,
                  type === "lost" && styles.typeSubTextActive,
                ]}
              >
                Bir şey mi kaybettim?
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === "found" && styles.typeButtonFound,
              ]}
              onPress={() => setType("found")}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={width * 0.055}
                color={type === "found" ? "#fff" : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  type === "found" && styles.typeTextActive,
                ]}
              >
                Bulunan
              </Text>
              <Text
                style={[
                  styles.typeSubText,
                  type === "found" && styles.typeSubTextActive,
                ]}
              >
                Bir şey mi buldum?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bilgiler */}
          <Text style={styles.sectionLabel}>İlan Bilgileri</Text>
          <View style={styles.inputCard}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="pricetag-outline"
                size={width * 0.045}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Başlık"
                placeholderTextColor={COLORS.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputWrapper}>
              <Ionicons
                name="document-text-outline"
                size={width * 0.045}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Açıklama"
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Konum */}
          <Text style={styles.sectionLabel}>Konum</Text>
          <View style={styles.inputCard}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="location-outline"
                size={width * 0.045}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Konum"
                placeholderTextColor={COLORS.textSecondary}
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  setLocationCoords(null);
                }}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => router.push("/location-picker" as any)}
          >
            <Ionicons
              name="map-outline"
              size={width * 0.045}
              color={COLORS.primary}
            />
            <Text style={styles.mapButtonText}>Google Maps ile Konum Bul</Text>
            <Ionicons
              name="chevron-forward"
              size={width * 0.04}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          {/* Fotoğraf */}
          <Text style={styles.sectionLabel}>Fotoğraf</Text>
          {image ? (
            <View style={styles.imagePreviewWrapper}>
              <Image
                source={{ uri: image }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <View style={styles.removeImageInner}>
                  <Ionicons name="close" size={width * 0.045} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <View style={styles.imageButtonIcon}>
                  <Ionicons
                    name="image-outline"
                    size={width * 0.07}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.imageButtonText}>Galeriden Seç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <View style={styles.imageButtonIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={width * 0.07}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.imageButtonText}>Fotoğraf Çek</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Güncelle Butonu */}
          <TouchableOpacity
            style={styles.publishButton}
            onPress={handleUpdate}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={width * 0.05}
                  color="#fff"
                />
                <Text style={styles.publishButtonText}>Güncelle</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.01,
    paddingBottom: height * 0.02,
    flexDirection: "row",
    alignItems: "center",
    gap: width * 0.03,
  },
  backButton: { padding: width * 0.01 },
  headerTitle: {
    fontSize: width * 0.055,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: width * 0.03,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  container: { padding: width * 0.05, paddingBottom: height * 0.05 },

  sectionLabel: {
    fontSize: width * 0.035,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: height * 0.01,
    marginTop: height * 0.02,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  typeContainer: {
    flexDirection: "row",
    gap: width * 0.03,
    marginBottom: height * 0.005,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: height * 0.02,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: height * 0.005,
  },
  typeButtonLost: { backgroundColor: "#FF6B6B", borderColor: "#FF6B6B" },
  typeButtonFound: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: width * 0.04,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  typeTextActive: { color: "#fff" },
  typeSubText: { fontSize: width * 0.028, color: COLORS.textSecondary },
  typeSubTextActive: { color: "rgba(255,255,255,0.8)" },

  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: height * 0.005,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: width * 0.04,
  },
  inputIcon: { marginTop: height * 0.018, marginRight: width * 0.03 },
  input: {
    flex: 1,
    fontSize: width * 0.038,
    color: COLORS.text,
    paddingVertical: height * 0.018,
  },
  textArea: { height: height * 0.13, textAlignVertical: "top" },
  inputDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: width * 0.04,
  },

  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: width * 0.025,
    backgroundColor: COLORS.primaryLight,
    padding: height * 0.016,
    borderRadius: 14,
    marginTop: height * 0.01,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
  },
  mapButtonText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: width * 0.036,
    fontWeight: "600",
  },

  imageButtons: { flexDirection: "row", gap: width * 0.03 },
  imageButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: height * 0.025,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: height * 0.008,
    borderStyle: "dashed",
  },
  imageButtonIcon: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.07,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonText: {
    fontSize: width * 0.032,
    color: COLORS.primary,
    fontWeight: "600",
  },
  imagePreviewWrapper: { position: "relative", marginBottom: height * 0.005 },
  previewImage: { width: "100%", height: height * 0.25, borderRadius: 16 },
  removeImageButton: {
    position: "absolute",
    top: -width * 0.03,
    right: -width * 0.03,
  },
  removeImageInner: {
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.04,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.025,
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.02,
    borderRadius: 16,
    marginTop: height * 0.03,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  publishButtonText: {
    color: "#fff",
    fontSize: width * 0.042,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: height * 0.018,
    borderRadius: 16,
    marginTop: height * 0.015,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: width * 0.038,
    fontWeight: "600",
  },
});
