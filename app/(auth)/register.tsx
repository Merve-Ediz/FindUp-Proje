import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Dimensions,
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

export default function Register() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (password !== passwordConfirm) {
      Alert.alert("Hata", "Şifreler eşleşmiyor.");
      return;
    }
    try {
      // Firebase Authentication ile kullanıcı oluşturma
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, {
        displayName: `${name} ${surname}`,
      });
      // Firestore'da kullanıcı bilgilerini kaydetme
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        surname,
        username,
        email,
        createdAt: new Date(),
      });
      await auth.signOut();
      Alert.alert("Başarılı", "Hesabın oluşturuldu!", [
        { text: "Tamam", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (error) {
      Alert.alert("Hata", "Kayıt olurken bir hata oluştu.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Üst Logo Alanı */}
          <View style={styles.brandSection}>
            {/* İç içe geçmiş daireler ile logo */}
            <View style={styles.logoWrapper}>
              <View style={styles.logoInner}>
                <Ionicons
                  name="person-add-outline"
                  size={width * 0.1}
                  color={COLORS.white}
                />
              </View>
            </View>
            <Text style={styles.brandName}>FindUp</Text>
            <Text style={styles.brandTagline}>
              Hemen ücretsiz hesap oluştur
            </Text>
          </View>

          {/* Kayıt Kartı */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kayıt Ol 🎉</Text>
            <Text style={styles.cardSubtitle}>Bilgilerini girerek başla</Text>

            {/* Ad ve Soyad yan yana */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <View style={styles.inputIconWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={width * 0.04}
                    color={COLORS.primary}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Ad"
                  placeholderTextColor={COLORS.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <View style={styles.inputIconWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={width * 0.04}
                    color={COLORS.primary}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Soyad"
                  placeholderTextColor={COLORS.textSecondary}
                  value={surname}
                  onChangeText={setSurname}
                />
              </View>
            </View>

            {/* Kullanıcı Adı */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="at-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı adı"
                placeholderTextColor={COLORS.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              {/* Email inputu için otomatik büyük harf kullanımı kapatılıyor */}
              <TextInput
                style={styles.input}
                placeholder="E-posta adresi"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Şifre */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              {/* Şifre göster/gizle toggle */}
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={width * 0.045}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Şifre Tekrar */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Şifre (Tekrar)"
                placeholderTextColor={COLORS.textSecondary}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry={!showPasswordConfirm}
              />
              <TouchableOpacity
                onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPasswordConfirm ? "eye-off-outline" : "eye-outline"}
                  size={width * 0.045}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Hesap Oluştur Butonu */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Hesap Oluştur</Text>
              <Ionicons name="arrow-forward" size={width * 0.05} color="#fff" />
            </TouchableOpacity>

            {/* Ayraç */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Giriş Yap Butonu */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    paddingBottom: height * 0.04,
  },
  brandSection: {
    alignItems: "center",
    paddingTop: height * 0.04,
    paddingBottom: height * 0.04,
  },
  logoWrapper: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.02,
  },
  logoInner: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: width * 0.1,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: width * 0.033,
    color: "rgba(255,255,255,0.7)",
    marginTop: height * 0.005,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: width * 0.07,
    paddingTop: height * 0.04,
  },
  cardTitle: {
    fontSize: width * 0.065,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: height * 0.005,
  },
  cardSubtitle: {
    fontSize: width * 0.036,
    color: COLORS.textSecondary,
    marginBottom: height * 0.03,
  },
  rowInputs: {
    flexDirection: "row",
    gap: width * 0.03,
    marginBottom: height * 0.002,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.015,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
  },
  inputIconWrapper: {
    marginRight: width * 0.025,
    paddingVertical: height * 0.014,
  },
  input: {
    flex: 1,
    fontSize: width * 0.036,
    color: COLORS.text,
    paddingVertical: height * 0.014,
  },
  eyeButton: { padding: width * 0.02 },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.02,
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.02,
    borderRadius: 16,
    marginTop: height * 0.01,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  registerButtonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: height * 0.022,
    gap: width * 0.03,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    fontSize: width * 0.033,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  loginButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.018,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    backgroundColor: COLORS.primaryLight,
    marginBottom: height * 0.018,
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: width * 0.04,
    fontWeight: "700",
  },
});
