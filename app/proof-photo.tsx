import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../src/config/firebase";

const { width, height } = Dimensions.get("window");

const CLOUDINARY_CLOUD_NAME = " ";
const CLOUDINARY_UPLOAD_PRESET = " ";

const COLORS = {
  primary: "#00584E",
  primaryLight: "#E8F5F3",
  primaryMid: "#B2D8D3",
  lost: "#FF6B6B",
  lostLight: "#FFE8E8",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  border: "#E5EAE9",
  white: "#FFFFFF",
  bg: "#F7F9F8",
};

export default function ProofPhoto() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const proofText =
    params.itemType === "lost"
      ? `"${params.itemTitle}" ilanı için iletişime geçmek istiyorsunuz.\n\nEşyanın sizde olduğunu kanıtlamak için fotoğraf yükleyin veya açıklama yazın.`
      : `"${params.itemTitle}" ilanı için iletişime geçmek istiyorsunuz.\n\nEşyanın size ait olduğunu kanıtlamak için fotoğraf yükleyin veya açıklama yazın.`;

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
      name: "proof.jpg",
    } as any);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    formData.append("folder", "findup/proofs");
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!image && !description.trim()) {
      Alert.alert(
        "Hata",
        "Lütfen en az bir fotoğraf yükleyin veya açıklama yazın.",
      );
      return;
    }
    try {
      setUploading(true);
      let proofUrl = null;
      if (image) proofUrl = await uploadToCloudinary(image);

      await updateDoc(doc(db, "chats", params.chatId as string), {
        proofImageUrl: proofUrl || null,
        proofDescription: description.trim() || null,
        proofSenderId: auth.currentUser?.uid,
        proofSenderName: auth.currentUser?.displayName,
        itemTitle: params.itemTitle || null,
      });

      setUploading(false);
      router.replace({
        pathname: "/chat" as any,
        params: {
          chatId: params.chatId,
          otherUserId: params.otherUserId,
          itemTitle: params.itemTitle,
        },
      });
    } catch (error) {
      setUploading(false);
      Alert.alert("Hata", "Bir sorun oluştu, tekrar deneyin.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kanıt Bilgisi</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Açıklama Kartı */}
          <View
            style={[
              styles.infoCard,
              params.itemType === "lost"
                ? styles.infoCardLost
                : styles.infoCardFound,
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={width * 0.07}
              color={params.itemType === "lost" ? COLORS.lost : COLORS.primary}
            />
            <Text style={styles.infoText}>{proofText}</Text>
          </View>

          {/* Fotoğraf Seçimi */}
          <Text style={styles.sectionLabel}>Fotoğraf (İsteğe Bağlı)</Text>
          {image ? (
            <View style={styles.previewWrapper}>
              <Image
                source={{ uri: image }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setImage(null)}
              >
                <View style={styles.removeButtonInner}>
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

          {/* Açıklama Alanı */}
          <Text style={styles.sectionLabel}>Açıklama (İsteğe Bağlı)</Text>
          <Text style={styles.sectionHint}>
            Eşyanın kendine özgü bildiğiniz özelliklerini yazabilirsiniz.
          </Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textArea}
              placeholder="Örn: İçinde kırmızı kartı olan siyah deri cüzdan, üzerinde çizik var..."
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Gönder Butonu */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !image && !description.trim() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="paper-plane-outline"
                  size={width * 0.05}
                  color="#fff"
                />
                <Text style={styles.submitButtonText}>
                  Gönder ve Sohbete Geç
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    gap: width * 0.03,
  },
  backButton: { padding: width * 0.01 },
  headerTitle: { fontSize: width * 0.045, fontWeight: "700", color: "#fff" },
  content: {
    padding: width * 0.05,
    gap: height * 0.02,
    paddingBottom: height * 0.05,
  },
  infoCard: {
    borderRadius: 16,
    padding: width * 0.05,
    gap: height * 0.012,
    alignItems: "center",
    borderWidth: 1.5,
  },
  infoCardLost: {
    backgroundColor: COLORS.lostLight,
    borderColor: COLORS.lost + "44",
  },
  infoCardFound: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary + "44",
  },
  infoText: {
    fontSize: width * 0.036,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: width * 0.055,
  },
  sectionLabel: {
    fontSize: width * 0.033,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionHint: {
    fontSize: width * 0.033,
    color: COLORS.textSecondary,
    marginTop: -height * 0.01,
  },
  imageButtons: { flexDirection: "row", gap: width * 0.03 },
  imageButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: height * 0.03,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: height * 0.01,
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
  previewWrapper: { position: "relative" },
  previewImage: { width: "100%", height: height * 0.28, borderRadius: 16 },
  removeButton: {
    position: "absolute",
    top: -width * 0.03,
    right: -width * 0.03,
  },
  removeButtonInner: {
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.04,
    backgroundColor: COLORS.lost,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: width * 0.04,
  },
  textArea: {
    fontSize: width * 0.037,
    color: COLORS.text,
    minHeight: height * 0.13,
    textAlignVertical: "top",
    lineHeight: width * 0.056,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.025,
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.02,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitButtonDisabled: { backgroundColor: COLORS.primaryMid, elevation: 0 },
  submitButtonText: {
    color: "#fff",
    fontSize: width * 0.038,
    fontWeight: "700",
  },
});
