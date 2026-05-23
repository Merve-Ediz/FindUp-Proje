import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from "firebase/auth";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
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
  lost: "#FF6B6B",
  lostLight: "#FFE8E8",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  border: "#E5EAE9",
  white: "#FFFFFF",
  bg: "#F7F9F8",
};

export default function Profile() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"password" | "delete">("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const router = useRouter();

  useFocusEffect(
    // Profil ekranına her gelindiğinde kullanıcı verilerini güncellemek için useFocusEffect kullanıyoruz.
    useCallback(() => {
      const fetchUser = async () => {
        if (auth.currentUser) {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setUserData(docSnap.data());
        }
        setLoading(false);
      };
      fetchUser();
    }, []),
  );

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const openPasswordModal = () => {
    setModalType("password");
    setCurrentPassword("");
    setNewPassword("");
    setModalVisible(true);
  };

  const openDeleteModal = () => {
    setModalType("delete");
    setCurrentPassword("");
    setModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    try {
      const user = auth.currentUser!;
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setModalVisible(false);
      Alert.alert("Başarılı", "Şifreniz güncellendi!");
    } catch (error) {
      Alert.alert("Hata", "Mevcut şifre hatalı veya bir sorun oluştu.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentPassword) {
      Alert.alert("Hata", "Lütfen şifrenizi girin.");
      return;
    }
    try {
      const user = auth.currentUser!;
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Hata", "Şifre hatalı veya bir sorun oluştu.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // Kullanıcının ad ve soyadının baş harflerini alarak avatar için initials oluşturuyoruz.
  const initials =
    `${userData?.name?.charAt(0) || ""}${userData?.surname?.charAt(0) || ""}`.toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => router.push("/edit-profile" as any)}
          >
            <Ionicons name="pencil" size={width * 0.045} color="#fff" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="checkmark" size={width * 0.03} color="#fff" />
            </View>
          </View>

          <Text style={styles.fullName}>
            {userData?.name} {userData?.surname}
          </Text>
          <Text style={styles.username}>@{userData?.username}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons
                name="mail-outline"
                size={width * 0.04}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.statText} numberOfLines={1}>
                {userData?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons
                  name="person-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ad</Text>
                <Text style={styles.infoValue}>{userData?.name}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={width * 0.04}
                color={COLORS.border}
              />
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons
                  name="person-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Soyad</Text>
                <Text style={styles.infoValue}>{userData?.surname}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={width * 0.04}
                color={COLORS.border}
              />
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons
                  name="at-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Kullanıcı Adı</Text>
                <Text style={styles.infoValue}>@{userData?.username}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={width * 0.04}
                color={COLORS.border}
              />
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-posta</Text>
                <Text style={styles.infoValue}>{userData?.email}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={width * 0.04}
                color={COLORS.border}
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap İşlemleri</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={openPasswordModal}
            >
              <View
                style={[
                  styles.actionIconWrapper,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.actionTitle}>Şifre Değiştir</Text>
                <Text style={styles.actionSubtitle}>
                  Hesap güvenliğini güncelle
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={width * 0.04}
                color={COLORS.border}
              />
            </TouchableOpacity>
            <View style={styles.infoDivider} />
            <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
              <View
                style={[
                  styles.actionIconWrapper,
                  { backgroundColor: "#FFF3E0" },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={width * 0.045}
                  color="#F57C00"
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.actionTitle, { color: "#F57C00" }]}>
                  Çıkış Yap
                </Text>
                <Text style={styles.actionSubtitle}>
                  Hesabından güvenle çık
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={width * 0.04}
                color={COLORS.border}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginBottom: height * 0.04 }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.lost }]}>
            Tehlikeli Bölge
          </Text>
          <TouchableOpacity style={styles.dangerCard} onPress={openDeleteModal}>
            <View
              style={[
                styles.actionIconWrapper,
                { backgroundColor: COLORS.lostLight },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={width * 0.045}
                color={COLORS.lost}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.actionTitle, { color: COLORS.lost }]}>
                Hesabı Sil
              </Text>
              <Text style={styles.actionSubtitle}>
                Tüm veriler kalıcı olarak silinir
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={width * 0.04}
              color={COLORS.lost + "88"}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View
              style={[
                styles.modalIconWrapper,
                {
                  backgroundColor:
                    modalType === "delete"
                      ? COLORS.lostLight
                      : COLORS.primaryLight,
                },
              ]}
            >
              <Ionicons
                name={
                  modalType === "delete"
                    ? "trash-outline"
                    : "lock-closed-outline"
                }
                size={width * 0.08}
                color={modalType === "delete" ? COLORS.lost : COLORS.primary}
              />
            </View>
            <Text style={styles.modalTitle}>
              {modalType === "password" ? "Şifre Değiştir" : "Hesabı Sil"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalType === "password"
                ? "Güvenliğiniz için mevcut şifrenizi doğrulayın."
                : "Bu işlem geri alınamaz. Devam etmek için şifrenizi girin."}
            </Text>

            <View style={styles.modalInputCard}>
              <Ionicons
                name="lock-closed-outline"
                size={width * 0.045}
                color={COLORS.primary}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Mevcut Şifre"
                placeholderTextColor={COLORS.textSecondary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            </View>

            {modalType === "password" && (
              <View style={styles.modalInputCard}>
                <Ionicons
                  name="key-outline"
                  size={width * 0.045}
                  color={COLORS.primary}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Yeni Şifre (en az 6 karakter)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  modalType === "delete" && styles.modalDeleteConfirm,
                ]}
                onPress={
                  modalType === "password"
                    ? handleChangePassword
                    : handleDeleteAccount
                }
              >
                <Text style={styles.modalConfirmText}>
                  {modalType === "password" ? "Güncelle" : "Sil"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: height * 0.02,
    paddingBottom: height * 0.04,
    alignItems: "center",
    paddingHorizontal: width * 0.05,
  },
  editIconButton: {
    position: "absolute",
    top: height * 0.02,
    right: width * 0.05,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: width * 0.025,
  },
  avatarWrapper: { position: "relative", marginBottom: height * 0.015 },
  // Avatar için dış halka ve iç daire şeklinde iki katmanlı bir yapı kullanıyoruz.
  avatarOuter: {
    width: width * 0.26,
    height: width * 0.26,
    borderRadius: width * 0.13,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
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
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: width * 0.07,
    height: width * 0.07,
    borderRadius: width * 0.035,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  fullName: {
    fontSize: width * 0.058,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  username: {
    fontSize: width * 0.036,
    color: "rgba(255,255,255,0.7)",
    marginTop: 3,
    marginBottom: height * 0.015,
  },
  // Kullanıcının e-posta adresini göstermek için statsRow ve statItem stillerini kullanıyoruz.
  statsRow: { flexDirection: "row", justifyContent: "center" },
  statItem: { flexDirection: "row", alignItems: "center", gap: width * 0.015 },
  statText: {
    fontSize: width * 0.032,
    color: "rgba(255,255,255,0.7)",
    maxWidth: width * 0.6,
  },

  // Section
  section: { paddingHorizontal: width * 0.04, marginTop: height * 0.025 },
  sectionTitle: {
    fontSize: width * 0.033,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: height * 0.012,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.016,
    gap: width * 0.03,
  },
  infoIconWrapper: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: width * 0.028,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: width * 0.038,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: width * 0.04,
  },

  // Action Row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.016,
    gap: width * 0.03,
  },
  actionIconWrapper: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: {
    fontSize: width * 0.038,
    fontWeight: "700",
    color: COLORS.text,
  },
  actionSubtitle: {
    fontSize: width * 0.03,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Danger
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.lost + "44",
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.016,
    gap: width * 0.03,
    elevation: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: width * 0.06,
    paddingBottom: height * 0.04,
    alignItems: "center",
  },
  modalHandle: {
    width: width * 0.1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: height * 0.025,
  },
  modalIconWrapper: {
    width: width * 0.18,
    height: width * 0.18,
    borderRadius: width * 0.09,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.02,
  },
  modalTitle: {
    fontSize: width * 0.052,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: height * 0.008,
  },
  modalSubtitle: {
    fontSize: width * 0.034,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: height * 0.025,
    lineHeight: width * 0.052,
  },
  modalInputCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: width * 0.03,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.005,
    marginBottom: height * 0.015,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  modalInput: {
    flex: 1,
    fontSize: width * 0.038,
    color: COLORS.text,
    paddingVertical: height * 0.015,
  },
  modalButtons: {
    flexDirection: "row",
    gap: width * 0.03,
    width: "100%",
    marginTop: height * 0.01,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: height * 0.018,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: width * 0.038,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: height * 0.018,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  modalDeleteConfirm: { backgroundColor: COLORS.lost },
  modalConfirmText: {
    color: "#fff",
    fontSize: width * 0.038,
    fontWeight: "700",
  },
});
