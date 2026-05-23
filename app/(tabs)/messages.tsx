import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
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
  unread: "#FF6B6B",
};

export default function Messages() {
  const [chats, setChats] = useState<any[]>([]);
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [readChats, setReadChats] = useState<Set<string>>(new Set());
  const router = useRouter();

  useFocusEffect(
    //Bu efekt, kullanıcı bu ekrana her geldiğinde çalışır.
    useCallback(() => {
      //Mevcut kullanıcı ID'si alınır.
      const currentUserId = auth.currentUser?.uid!;
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUserId), //Kullanıcının katıldığı sohbetleri filtreler.
        orderBy("lastMessageAt", "desc"), //Sohbetleri son mesaj tarihine göre sıralar, böylece en güncel sohbetler üstte görünür.
      );
      //Sohbetler gerçek zamanlı olarak dinlenir. Veritabanında herhangi bir değişiklik olduğunda, bu fonksiyon tetiklenir.
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as any[];
        setChats(data);

        //sohbet kartlarında kullanıcı adlarını göstermek için sohbetlerdeki diğer kullanıcıların isimlerini alarak bir nesne oluşturulur.
        const namesToFetch: { [key: string]: string } = {};
        for (const chat of data) {
          //Sohbetteki diğer kullanıcı ID'si bulunur.
          const otherUserId = chat.participants.find(
            (p: string) => p !== currentUserId,
          );
          //Eğer bu kullanıcı ID'si daha önce alınmamışsa, veritabanından bu kullanıcının adı ve soyadını alır ve namesToFetch nesnesine ekler.
          if (otherUserId && !namesToFetch[otherUserId]) {
            const snap = await getDoc(doc(db, "users", otherUserId));
            if (snap.exists()) {
              const d = snap.data();
              namesToFetch[otherUserId] = `${d.name} ${d.surname}`;
            }
          }
        }
        setUserNames(namesToFetch);
        setLoading(false);
      });
      return unsubscribe;
    }, []),
  );

  //Bir sohbetin okunup okunmadığını belirlemek için kullanılan yardımcı fonksiyon.
  const isUnread = (chat: any) => {
    const currentUserId = auth.currentUser?.uid!;
    if (!chat.lastMessage) return false;
    if (chat.lastSenderId === currentUserId) return false;
    return !chat.readBy?.[currentUserId];
  };

  //Sohbet kartlarını renderlamak için kullanılan fonksiyon. Her bir sohbet kartında diğer kullanıcının adı, son mesaj ve okunmamış mesaj göstergesi bulunur. Kartlara tıklandığında, kullanıcı sohbet ekranına yönlendirilir ve o sohbet okunmuş olarak işaretlenir.
  const renderItem = ({ item }: { item: any }) => {
    console.log("chat item:", item.id, item.itemTitle);
    const currentUserId = auth.currentUser?.uid!;
    const otherUserId = item.participants.find(
      (p: string) => p !== currentUserId,
    );
    const otherUserName = userNames[otherUserId] || "Yükleniyor...";
    const unread = isUnread(item) && !readChats.has(item.id);

    //Sohbet kartına tıklandığında, o sohbetin ID'si readChats set'ine eklenir, böylece o sohbet okunmuş olarak işaretlenir ve kullanıcı sohbet ekranına yönlendirilir.
    return (
      <TouchableOpacity
        style={[styles.chatCard, unread && styles.chatCardUnread]}
        onPress={() => {
          setReadChats((prev) => new Set([...prev, item.id]));
          router.push({
            pathname: "/chat" as any,
            params: {
              chatId: item.id,
              otherUserId,
              itemTitle: item.itemTitle || "",
            },
          });
        }}
      >
        <View style={[styles.chatAvatar, unread && styles.chatAvatarUnread]}>
          <Text style={styles.chatAvatarText}>
            {otherUserName?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <Text
            style={[styles.chatTitle, unread && styles.chatTitleUnread]}
            numberOfLines={1}
          >
            {otherUserName}
          </Text>
          <Text
            style={[
              styles.chatLastMessage,
              unread && styles.chatLastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage || "Henüz mesaj yok"}
          </Text>
        </View>
        <View style={styles.chatRight}>
          {unread && <View style={styles.unreadDot} />}
          <Ionicons
            name="chevron-forward"
            size={width * 0.04}
            color={COLORS.primaryMid}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <Text style={styles.headerSubtitle}>Sohbetlerin ve iletişimlerin</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: height * 0.1 }}
        />
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons
              name="chatbubbles-outline"
              size={width * 0.12}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>Henüz sohbet yok</Text>
          <Text style={styles.emptyText}>
            İlan sahipleriyle iletişime geçince sohbetlerin burada görünecek.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

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

  list: { padding: width * 0.04 },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: width * 0.04,
    marginBottom: height * 0.012,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatCardUnread: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chatAvatar: {
    width: width * 0.13,
    height: width * 0.13,
    borderRadius: width * 0.065,
    backgroundColor: COLORS.primaryMid,
    justifyContent: "center",
    alignItems: "center",
    marginRight: width * 0.035,
  },
  chatAvatarUnread: {
    backgroundColor: COLORS.primary,
  },
  chatAvatarText: {
    color: COLORS.white,
    fontSize: width * 0.05,
    fontWeight: "800",
  },
  chatInfo: { flex: 1 }, //Sohbet bilgilerini içeren bölümün stili, başlık ve son mesajın düzenli görünmesini sağlar.
  chatTitle: {
    fontSize: width * 0.038,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: height * 0.004,
  },
  chatTitleUnread: { fontWeight: "800" },
  chatLastMessage: { fontSize: width * 0.033, color: COLORS.textSecondary },
  chatLastMessageUnread: { color: COLORS.text, fontWeight: "500" },

  //Sohbet kartının sağ tarafında bulunan bölümün stili, okunmamış mesaj göstergesi ve yönlendirme ikonunun düzenli görünmesini sağlar.
  chatRight: {
    alignItems: "center",
    gap: height * 0.008,
  },
  unreadDot: {
    backgroundColor: COLORS.unread,
    width: width * 0.028,
    height: width * 0.028,
    borderRadius: width * 0.014,
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: height * 0.015,
    paddingHorizontal: width * 0.1,
  },
  emptyIconWrapper: {
    width: width * 0.22,
    height: width * 0.22,
    borderRadius: width * 0.11,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.01,
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
});
