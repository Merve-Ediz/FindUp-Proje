import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
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
  found: "#00584E",
  foundLight: "#E8F5F3",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  bg: "#F7F9F8",
  white: "#FFFFFF",
  border: "#E5EAE9",
};

export default function MyAds() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  // Kullanıcının ilanlarını gerçek zamanlı olarak dinlemek için Firestore sorgusu oluştur.
  useEffect(() => {
    // Sadece mevcut kullanıcının ilanlarını çekmek için where koşulu ekliyoruz.
    const q = query(
      collection(db, "items"),
      where("userId", "==", auth.currentUser?.uid),
      orderBy("createdAt", "desc"),
    );
    // onSnapshot ile gerçek zamanlı dinleme başlatıyoruz. (kullanıcı ilan eklediğinde sildiğinde düzenlediğinde anında güncellenir.)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setFilteredItems(data);
      setLoading(false); // Yükleme tamamlandıktan sonra loading durumunu false yapıyoruz.
    });
    return unsubscribe;
  }, []);

  // searchText değiştiğinde filtreleme işlemi yaparak filteredItems'ı güncelliyoruz.
  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchText.toLowerCase()) || //Büyük küçük harf duyarsız arama.
          item.location?.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredItems(filtered);
    }
  }, [searchText, items]);

  const handleDelete = (id: string) => {
    Alert.alert("İlanı Sil", "Bu ilanı silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "items", id));
        },
      },
    ]);
  };

  // Her ilanın görseli, başlığı, açıklaması, konumu ve düzenleme/silme butonlarını içerir.
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.imageUrl ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setSelectedImage(item.imageUrl)}
          >
            <Ionicons name="expand-outline" size={width * 0.05} color="#fff" />
          </TouchableOpacity>
          <View
            style={[
              styles.badgeOnImage,
              item.type === "lost" ? styles.badgeLost : styles.badgeFound,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.type === "lost" ? "Kayıp" : "Bulunan"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noImagePlaceholder}>
          <Ionicons
            name="image-outline"
            size={width * 0.1}
            color={COLORS.border}
          />
          <View
            style={[
              styles.badgeNoImage,
              item.type === "lost" ? styles.badgeLost : styles.badgeFound,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.type === "lost" ? "Kayıp" : "Bulunan"}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={width * 0.035}
              color={COLORS.primary}
            />
            {item.locationCoords ? (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps?q=${item.locationCoords.lat},${item.locationCoords.lng}`,
                  )
                }
              >
                <Text style={styles.cardLocationLink} numberOfLines={1}>
                  Google Maps'te Gör
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.cardLocation} numberOfLines={1}>
                {item.location}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: "/edit-ad" as any,
                params: {
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  location: item.location,
                  type: item.type,
                  imageUrl: item.imageUrl || "",
                  locationCoords: item.locationCoords
                    ? JSON.stringify(item.locationCoords)
                    : "",
                },
              })
            }
          >
            <Ionicons name="create-outline" size={width * 0.04} color="#fff" />
            <Text style={styles.editButtonText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons
              name="trash-outline"
              size={width * 0.04}
              color={COLORS.lost}
            />
            <Text style={styles.deleteButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İlanlarım</Text>
        <Text style={styles.headerSubtitle}>Oluşturduğun ilanları yönet</Text>
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={width * 0.045}
          color={COLORS.primary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Başlık, açıklama veya konum ara..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons
              name="close-circle"
              size={width * 0.05}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons
              name="document-outline"
              size={width * 0.12}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {searchText ? "Sonuç bulunamadı" : "Henüz ilanınız yok"}
          </Text>
          <Text style={styles.emptyText}>
            {searchText
              ? "Farklı bir arama terimi deneyin."
              : "İlan Oluştur sekmesinden ilk ilanınızı ekleyin."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.modalCloseBtn}>
              <Ionicons name="close" size={width * 0.06} color="#fff" />
            </View>
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Stil tanımları
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

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

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: width * 0.04,
    marginTop: height * 0.015,
    marginBottom: height * 0.01,
    borderRadius: 14,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.012,
    gap: width * 0.02,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, fontSize: width * 0.036, color: COLORS.text },

  list: {
    paddingHorizontal: width * 0.04,
    paddingBottom: height * 0.02,
    paddingTop: height * 0.005,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginBottom: height * 0.018,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageWrapper: { position: "relative" },
  cardImage: { width: "100%", height: height * 0.22 },
  expandButton: {
    position: "absolute",
    top: width * 0.03,
    right: width * 0.03,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    padding: width * 0.018,
  },
  badgeOnImage: {
    position: "absolute",
    top: width * 0.03,
    left: width * 0.03,
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.005,
    borderRadius: 20,
  },
  noImagePlaceholder: {
    width: "100%",
    height: height * 0.1,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeNoImage: {
    position: "absolute",
    top: width * 0.03,
    left: width * 0.03,
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.005,
    borderRadius: 20,
  },
  badgeLost: { backgroundColor: COLORS.lost },
  badgeFound: { backgroundColor: COLORS.primary },
  badgeText: { fontSize: width * 0.028, fontWeight: "700", color: "#fff" },

  cardContent: { padding: width * 0.04 },
  cardTitle: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: height * 0.005,
  },
  cardDescription: {
    fontSize: width * 0.033,
    color: COLORS.textSecondary,
    marginBottom: height * 0.012,
    lineHeight: width * 0.05,
  },

  cardMeta: { marginBottom: height * 0.014 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: width * 0.015 },
  cardLocation: {
    fontSize: width * 0.03,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardLocationLink: {
    fontSize: width * 0.03,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },

  cardActions: { flexDirection: "row", gap: width * 0.03 },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.02,
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.014,
    borderRadius: 12,
  },
  editButtonText: { color: "#fff", fontSize: width * 0.035, fontWeight: "700" },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.02,
    backgroundColor: COLORS.lostLight,
    paddingVertical: height * 0.014,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lost + "44",
  },
  deleteButtonText: {
    color: COLORS.lost,
    fontSize: width * 0.035,
    fontWeight: "700",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: height * 0.015,
    paddingHorizontal: width * 0.1,
  },
  emptyIconWrapper: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyText: {
    fontSize: width * 0.033,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: width * 0.05,
  },
  loadingText: { fontSize: width * 0.04, color: COLORS.textSecondary },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: height * 0.06,
    right: width * 0.04,
    zIndex: 1,
  },
  modalCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: width * 0.02,
  },
  modalImage: { width: width, height: height * 0.75 },
});
