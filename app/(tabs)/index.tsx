import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  primaryMid: "#00584E22",
  accent: "#F4A435",
  accentLight: "#FEF3E2",
  lost: "#FF6B6B",
  lostLight: "#FFE8E8",
  found: "#00584E",
  foundLight: "#E8F5F3",
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  bg: "#F7F9F8",
  white: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5EAE9",
};

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "items"),
      where("type", "==", activeTab),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setFilteredItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [activeTab]);

  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.location?.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredItems(filtered);
    }
  }, [searchText, items]);

  // İletişime Geç butonuna basılınca direkt chat'e değil,
  // önce kanıt fotoğrafı ekranına yönlendiriyoruz.
  const handleContact = async (item: any) => {
    const { doc, getDoc, setDoc, serverTimestamp } =
      await import("firebase/firestore");
    const currentUserId = auth.currentUser?.uid!;
    const itemOwnerId = item.userId;

    if (currentUserId === itemOwnerId) {
      alert("Kendi ilanınıza mesaj gönderemezsiniz.");
      return;
    }

    const sortedIds = [currentUserId, itemOwnerId].sort();
    const chatId = `${sortedIds[0]}_${sortedIds[1]}`;
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      const ownerSnap = await getDoc(doc(db, "users", itemOwnerId));
      const ownerData = ownerSnap.exists() ? ownerSnap.data() : null;
      const currentUserSnap = await getDoc(doc(db, "users", currentUserId));
      const currentUserData = currentUserSnap.exists()
        ? currentUserSnap.data()
        : null;

      await setDoc(chatRef, {
        itemId: item.id,
        itemTitle: item.title,
        participants: [currentUserId, itemOwnerId],
        participantNames: {
          [currentUserId]: `${currentUserData?.name} ${currentUserData?.surname}`,
          [itemOwnerId]: `${ownerData?.name} ${ownerData?.surname}`,
        },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
      });
    }

    // Chat'e gitmeden önce kanıt fotoğrafı ekranına yönlendiriyoruz.
    // item.type: ilan türü (lost/found), itemTitle: ilan başlığı
    router.push({
      pathname: "/proof-photo" as any,
      params: {
        chatId,
        otherUserId: itemOwnerId,
        itemType: item.type,
        itemTitle: item.title,
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.imageUrl ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
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
          <View style={styles.metaRow}>
            <Ionicons
              name="person-outline"
              size={width * 0.035}
              color={COLORS.textSecondary}
            />
            <Text style={styles.cardUser} numberOfLines={1}>
              {item.userDisplayName}
            </Text>
          </View>
        </View>

        {auth.currentUser?.uid !== item.userId && (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContact(item)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={width * 0.04}
              color="#fff"
            />
            <Text style={styles.contactButtonText}>İletişime Geç</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FindUp</Text>
      </View>

      {/* Üst Sekmeler */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "lost" && styles.tabActiveLost]}
          onPress={() => setActiveTab("lost")}
        >
          <Ionicons
            name="search-outline"
            size={width * 0.04}
            color={activeTab === "lost" ? "#fff" : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "lost" && styles.tabTextActive,
            ]}
          >
            Kayıp İlanlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "found" && styles.tabActiveFound]}
          onPress={() => setActiveTab("found")}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={width * 0.04}
            color={activeTab === "found" ? "#fff" : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "found" && styles.tabTextActive,
            ]}
          >
            Bulunan Eşyalar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Arama Çubuğu */}
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
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: height * 0.1 }}
        />
      ) : filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons
              name="search-outline"
              size={width * 0.12}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
          <Text style={styles.emptyText}>
            {searchText
              ? "Farklı bir arama terimi deneyin."
              : "Henüz ilan yok."}
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

      {/* İlan görselini büyütmek için kullanılan Modal */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.01,
    paddingBottom: height * 0.015,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: width * 0.07,
    fontWeight: "800",
    textAlign: "center",
    color: "#fff",
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: width * 0.04,
    paddingBottom: height * 0.015,
    gap: width * 0.03,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.015,
    paddingVertical: height * 0.012,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tabActiveLost: { backgroundColor: COLORS.lost },
  tabActiveFound: { backgroundColor: "rgba(255,255,255,0.95)" },
  tabText: {
    fontSize: width * 0.032,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  tabTextActive: { color: COLORS.primary, fontWeight: "700" },
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
    backgroundColor: COLORS.card,
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.08,
    backgroundColor: "transparent",
  },
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
  cardMeta: { gap: height * 0.006, marginBottom: height * 0.014 },
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
    flex: 1,
  },
  cardUser: { fontSize: width * 0.03, color: COLORS.textSecondary, flex: 1 },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: width * 0.02,
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.014,
    borderRadius: 12,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: width * 0.036,
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
    fontSize: width * 0.035,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
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
