import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
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
import { auth, db } from "../../src/config/firebase";
import { subscribeLocation } from "../../src/locationStore"; // Konum için fonksiyonu içe aktar

// Cihazın ekran boyutlarını alarak responsive tasarım için kullanacağız.
const { width, height } = Dimensions.get("window");

const CLOUDINARY_CLOUD_NAME = " ";
const CLOUDINARY_UPLOAD_PRESET = " ";
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

const COLORS = {
  primary: "#00584E",
  primaryLight: "#E8F5F3",
  lost: "#FF6B6B",
  found: "#00584E",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  border: "#E5EAE9",
  white: "#FFFFFF",
  bg: "#F7F9F8",
};

export default function CreateAd() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"lost" | "found">("lost");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const router = useRouter();

  // 1. ADIM: Konum verilerini almak için subscribeLocation fonksiyonu kullanıldı. (ekran açıldığında çalışır.)
  useEffect(() => {
    // Google Maps’ten seçilen konum verileri güncellendiğinde bize geri bildirim sağlar.
    const unsubscribe = subscribeLocation((data) => {
      if (data) {
        setLocation(data.address);
        setLocationCoords({ lat: data.lat, lng: data.lng });
      }
    });
    return unsubscribe;
  }, []);

  // 2. ADIM: Fonksiyonu daha garantili bir Base64 okuyucu ile güncelledik
  const analyzeImageWithGemini = async (
    uri: string,
  ): Promise<string | null> => {
    try {
      console.log("Analiz basliyor, URI:", uri); // Terminalde gormek icin

      // 1. Fotoğrafı Base64'e çeviren mobil yöntem (Resim dosyası okunur.)
      const response = await fetch(uri);
      const blob = await response.blob(); // Blob formatında resmi alır.

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); // FileReader kullanarak blob'u Base64'e çevirir.
        reader.onload = () => {
          const res = reader.result as string; // Data URL formatında döner.
          resolve(res.split(",")[1]); // Saf base64 verisini alır.
        };
        reader.onerror = (e) => reject(e); // Hata durumunda reddeder.
        reader.readAsDataURL(blob); //Fotoğraf Base64 formatına çevriliyor. Çünkü AI API’sine görsel bu şekilde gönderiliyor.
      });

      console.log("Base64 donusumu basarili, API'ye gidiliyor...");

      // 2. Gemini API istegi
      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }, // AI API'sine JSON formatında veri gönderilir.
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Bu fotograftaki ana objeyi sadece 2-3 kelimeyle tanimla. Sadece ismi yaz (Orn: Siyah Cuzdan, Mavi Anahtarlik). Baska cumle kurma.",
                  },
                  {
                    // AI API'sine gönderilecek görsel verisi
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      const data = await apiResponse.json(); // AI API'sinden gelen yanıt JSON formatında alınır.

      if (data.error) {
        console.log("API HATASI:", data.error.message);
        Alert.alert("API Hatası", data.error.message);
        return null;
      }

      // 3. AI API'sinden gelen yanıtın içinden tespit edilen nesnenin adını çekiyoruz.
      const detected = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log("Gemini Yaniti:", detected);
      return detected || null;
    } catch (error) {
      console.log("TEKNIK HATA:", error);
      Alert.alert(
        "Teknik Hata",
        "Analiz sirasinda bir hata olustu. Terminali kontrol et.",
      );
      return null;
    }
  };

  const handleImageSelected = async (uri: string) => {
    setImage(uri);
    setAnalyzing(true); // Analiz ekranını gösterir

    const detected = await analyzeImageWithGemini(uri);

    setAnalyzing(false); // Analiz ekranını kapatır

    if (detected) {
      Alert.alert(
        "🔍 Nesne Tespit Edildi",
        `Yüklenen fotoğraf "${detected}" olarak tespit edildi. Başlık olarak kullanmak ister misiniz?`,
        [
          { text: "Hayır", style: "cancel" },
          { text: "Evet", onPress: () => setTitle(detected) },
        ],
      );
    } else {
      // Eğer tespit edilemezse küçük bir hata mesajı verebilirsin.
      console.log("AI nesneyi tanımlayamadı.");
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); // Galeri izni istenir.
    if (!permission.granted) {
      Alert.alert("İzin Gerekli", "Galeriye erişim izni vermeniz gerekiyor.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      // Galeri açılır.
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Sadece resim seçimine izin verilir.
      allowsEditing: true, // Seçilen resim düzenlenebilir (kırpma).
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) await handleImageSelected(result.assets[0].uri); // Seçilen resmin URI'si analiz fonksiyonuna gönderilir.
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync(); // Kamera izni istenir.
    if (!permission.granted) {
      Alert.alert("İzin Gerekli", "Kamera erişim izni vermeniz gerekiyor.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) await handleImageSelected(result.assets[0].uri);
  };

  // 3. ADIM: Fotoğrafı Cloudinary'e yükleyen fonksiyon (İlan yayınlanmadan önce çalışır.)
  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const formData = new FormData(); // Cloudinary'e gönderilecek form verisi oluşturulur.
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
    const data = await response.json(); // Cloudinary'den gelen yanıt JSON formatında alınır.
    return data.secure_url; // Yüklenen fotoğrafın güvenli URL'si döndürülür.
  };

  const handleCreate = async () => {
    if (!title || !description || !location) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    try {
      setUploading(true); // Yükleme işlemi başladığında butonu devre dışı bırakır ve kullanıcıya geri bildirim verir.
      let imageUrl = null;
      if (image) imageUrl = await uploadToCloudinary(image); // Eğer fotoğraf varsa önce Cloudinary'e yüklenir ve URL'si alınır.
      await addDoc(collection(db, "items"), {
        title,
        description,
        location,
        locationCoords: locationCoords || null,
        type,
        userId: auth.currentUser?.uid,
        userDisplayName: auth.currentUser?.displayName,
        imageUrl,
        createdAt: serverTimestamp(),
      });
      setUploading(false);
      Alert.alert("Başarılı", "İlanınız oluşturuldu!", [
        { text: "Tamam", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (error) {
      setUploading(false);
      Alert.alert("Hata", "İlan oluşturulurken bir hata oluştu.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İlan Oluştur</Text>
          <Text style={styles.headerSubtitle}>
            Kaybettiğin veya bulduğun eşyayı paylaş
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                Bir şey mi kaybettin?
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
                Bir şey mi buldun?
              </Text>
            </TouchableOpacity>
          </View>

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
                placeholder="Konum (örn: Kadıköy, İstanbul)"
                placeholderTextColor={COLORS.textSecondary}
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  setLocationCoords(null);
                }}
              />
            </View>
          </View>
          {/*Google Maps ile konum seçme butonu*/}
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

          <Text style={styles.sectionLabel}>Fotoğraf</Text>
          {analyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.analyzingText}>
                🔍 Fotoğraf analiz ediliyor...
              </Text>
            </View>
          ) : image ? (
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

          <TouchableOpacity
            style={styles.publishButton}
            onPress={handleCreate}
            disabled={uploading || analyzing}
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
                <Text style={styles.publishButtonText}>İlanı Yayınla</Text>
              </>
            )}
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
  },
  headerTitle: {
    fontSize: width * 0.065,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: width * 0.032,
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
  // İlan türü seçim butonlarının bulunduğu kapsayıcı
  typeContainer: {
    flexDirection: "row", // Yanyana iki buton için row yönlendirmesi
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
  typeTextActive: { color: "#fff" }, // Aktif ilan türü metni beyaz olur
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
  analyzingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: height * 0.04,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: height * 0.015,
  },
  analyzingText: {
    fontSize: width * 0.036,
    color: COLORS.primary,
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
  // Fotoğraf önizlemesi ve kaldırma butonu stilleri
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
  // İlanı yayınlama butonu stilleri
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
});
