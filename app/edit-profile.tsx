import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions, // Ekran boyutlarını almak için
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

const COLORS = {
  primary: "#00584E",
  primaryLight: "#E8F5F3",
  primaryMid: "#B2D8D3",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  border: "#E5EAE9",
  white: "#FFFFFF",
  bg: "#F7F9F8",
};

export default function EditProfile() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();

  // Kullanıcı verilerini Firestore'dan çek
  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name);
          setSurname(data.surname);
          setUsername(data.username);
        }
      }
    };
    fetchUser();
  }, []);

  // Profil güncelleme fonksiyonu
  const handleUpdate = async () => {
    if (!name || !surname || !username) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        name,
        surname,
        username,
      });
      Alert.alert("Başarılı", "Profiliniz güncellendi!", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Hata", "Profil güncellenirken bir hata oluştu.");
    }
  };

  // Avatar için baş harfleri oluştur
  const initials =
    `${name?.charAt(0) || ""}${surname?.charAt(0) || ""}`.toUpperCase();

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
            <Text style={styles.headerTitle}>Profili Düzenle</Text>
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
          {/* Avatar Preview */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || "?"}</Text>
              </View>
            </View>
            <Text style={styles.avatarHint}>
              Baş harfler otomatik güncellenir
            </Text>
          </View>

          {/* Form */}
          <Text style={styles.sectionLabel}>Kişisel Bilgiler</Text>
          <View style={styles.inputCard}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="person-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Ad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı girin"
                  placeholderTextColor={COLORS.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="person-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Soyad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Soyadınızı girin"
                  placeholderTextColor={COLORS.textSecondary}
                  value={surname}
                  onChangeText={setSurname}
                />
              </View>
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="at-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Kullanıcı Adı</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kullanıcı adınızı girin"
                  placeholderTextColor={COLORS.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Güncelle */}
          <TouchableOpacity style={styles.publishButton} onPress={handleUpdate}>
            <Ionicons
              name="checkmark-circle-outline"
              size={width * 0.05}
              color="#fff"
            />
            <Text style={styles.publishButtonText}>Güncelle</Text>
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

  avatarSection: { alignItems: "center", paddingVertical: height * 0.03 },
  avatarOuter: {
    width: width * 0.26,
    height: width * 0.26,
    borderRadius: width * 0.13,
    backgroundColor: COLORS.primaryMid,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.01,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatar: {
    width: width * 0.22,
    height: width * 0.22,
    borderRadius: width * 0.11,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: width * 0.09,
    fontWeight: "800",
    color: COLORS.primary,
  },
  avatarHint: { fontSize: width * 0.03, color: COLORS.textSecondary },

  sectionLabel: {
    fontSize: width * 0.033,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: height * 0.012,
  },

  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: height * 0.03,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.016,
    gap: width * 0.03,
  },
  inputIconWrapper: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContent: { flex: 1 },
  inputLabel: {
    fontSize: width * 0.028,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  input: {
    fontSize: width * 0.038,
    color: COLORS.text,
    fontWeight: "500",
    paddingVertical: 2,
  },
  inputDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: width * 0.04,
  },

  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.025,
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.02,
    borderRadius: 16,
    marginBottom: height * 0.015,
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
