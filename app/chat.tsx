import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../src/config/firebase";

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

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [proofData, setProofData] = useState<{
    url: string | null;
    senderName: string;
    description: string | null;
    itemTitle: string | null;
  } | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofChecked, setProofChecked] = useState(false);
  const [expandedProof, setExpandedProof] = useState(false);

  // Silme modu için state'ler
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [selectionMode, setSelectionMode] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (params.otherUserId) {
        const snap = await getDoc(
          doc(db, "users", params.otherUserId as string),
        );
        if (snap.exists()) {
          const data = snap.data();
          setOtherUserName(`${data.name} ${data.surname}`);
        }
      }
    };
    fetchOtherUser();
  }, []);

  useEffect(() => {
    const markAsRead = async () => {
      try {
        await updateDoc(doc(db, "chats", params.chatId as string), {
          [`readBy.${auth.currentUser?.uid}`]: true,
        });
      } catch (e) {}
    };
    markAsRead();

    const chatDocUnsubscribe = onSnapshot(
      doc(db, "chats", params.chatId as string),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (params.itemTitle) {
            setItemTitle(params.itemTitle as string);
          }
          if (
            (data.proofImageUrl || data.proofDescription) &&
            data.proofSenderId !== auth.currentUser?.uid &&
            !proofChecked
          ) {
            setProofData({
              url: data.proofImageUrl || null,
              senderName: data.proofSenderName || "Kullanıcı",
              description: data.proofDescription || null,
              itemTitle: (params.itemTitle as string) || null,
            });
            setShowProofModal(true);
          }
        }
      },
    );

    const q = query(
      collection(db, "chats", params.chatId as string, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(data);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
      markAsRead();
    });

    return () => {
      unsubscribe();
      chatDocUnsubscribe();
    };
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    const messageText = text.trim();
    setText("");
    const currentUserId = auth.currentUser?.uid!;
    const otherUserId = params.otherUserId as string;
    await addDoc(collection(db, "chats", params.chatId as string, "messages"), {
      text: messageText,
      senderId: currentUserId,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "chats", params.chatId as string), {
      lastMessage: messageText,
      lastMessageAt: serverTimestamp(),
      lastSenderId: currentUserId,
      [`readBy.${currentUserId}`]: true,
      [`readBy.${otherUserId}`]: false,
    });
  };

  // Mesaja uzun basınca seçim modunu başlat
  const handleLongPress = (messageId: string) => {
    setSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
  };

  // Mesaja basınca seç/seçimi kaldır
  const handleMessagePress = (messageId: string) => {
    if (!selectionMode) return;
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
      if (newSelected.size === 0) setSelectionMode(false);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  // Seçim modundan çık
  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };

  // Seçili mesajları sil
  const handleDeleteSelected = () => {
    Alert.alert(
      "Mesajları Sil",
      `${selectedMessages.size} mesajı silmek istediğinize emin misiniz?`,
      [
        { text: "Hayır", style: "cancel" },
        {
          text: "Evet",
          style: "destructive",
          onPress: async () => {
            for (const messageId of selectedMessages) {
              await deleteDoc(
                doc(
                  db,
                  "chats",
                  params.chatId as string,
                  "messages",
                  messageId,
                ),
              );
            }
            setSelectionMode(false);
            setSelectedMessages(new Set());
          },
        },
      ],
    );
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    const isLast = index === messages.length - 1;
    const isSelected = selectedMessages.has(item.id);

    return (
      <TouchableWithoutFeedback
        onLongPress={() => handleLongPress(item.id)}
        onPress={() => handleMessagePress(item.id)}
      >
        <View style={styles.messageRow}>
          {/* Seçim modu kutucuğu */}
          {selectionMode && (
            <View
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={width * 0.035} color="#fff" />
              )}
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isMe ? styles.myBubble : styles.otherBubble,
              isSelected && styles.messageBubbleSelected,
              selectionMode && { maxWidth: width * 0.62 },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myText : styles.otherText,
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  // Badge ayrı render ediliyor - en son mesajın altında
  const renderBadge = () => {
    if (!itemTitle || messages.length === 0) return null;
    return (
      <View style={styles.itemTitleBadge}>
        <Ionicons
          name="pricetag-outline"
          size={width * 0.033}
          color={COLORS.primary}
        />
        <Text style={styles.itemTitleBadgeText}>
          {`"${itemTitle}" ilanı hakkında mesajlaşılıyor.`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - seçim modunda değişir */}
      <View style={styles.header}>
        {selectionMode ? (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={cancelSelection}
            >
              <Ionicons name="close" size={width * 0.06} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {selectedMessages.size} mesaj seçildi
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteSelected}
            >
              <Ionicons name="trash-outline" size={width * 0.06} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={width * 0.06} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {otherUserName?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {otherUserName || "Sohbet"}
              </Text>
              <Text style={styles.headerSubtitle}>Çevrimiçi</Text>
            </View>
          </>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderBadge}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={width * 0.1}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyText}>Henüz mesaj yok.</Text>
              <Text style={styles.emptySubText}>İlk mesajı siz gönderin!</Text>
            </View>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Mesaj yazın..."
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={width * 0.045} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Kanıt Modal */}
      <Modal visible={showProofModal} transparent animationType="slide">
        <View style={styles.proofModalOverlay}>
          <View style={styles.proofModalContainer}>
            <View style={styles.proofModalHandle} />
            <View style={styles.proofModalIconWrapper}>
              <Ionicons
                name="shield-checkmark-outline"
                size={width * 0.08}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.proofModalTitle}>Kanıt Bilgisi</Text>
            <Text style={styles.proofModalSubtitle}>
              <Text style={{ fontWeight: "700" }}>{proofData?.senderName}</Text>
              {proofData?.itemTitle
                ? ` adlı kişi "${proofData.itemTitle}" ilanı için aşağıdaki bilgiyi paylaştı.`
                : " adlı kişi bu ilan için aşağıdaki bilgiyi paylaştı."}
            </Text>

            {proofData?.url && (
              <View style={styles.proofImageWrapper}>
                <Image
                  source={{ uri: proofData.url }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.proofExpandButton}
                  onPress={() => setExpandedProof(true)}
                >
                  <Ionicons
                    name="expand-outline"
                    size={width * 0.05}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            )}

            {proofData?.description && (
              <View style={styles.proofDescriptionBox}>
                <Text style={styles.proofDescriptionLabel}>Açıklama:</Text>
                <Text style={styles.proofDescriptionText}>
                  {proofData.description}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.proofOkButton}
              onPress={() => {
                setProofChecked(true);
                setShowProofModal(false);
              }}
            >
              <Text style={styles.proofOkButtonText}>Tamam, Sohbete Geç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tam ekran büyütme */}
      <Modal visible={expandedProof} transparent animationType="fade">
        <View style={styles.expandedOverlay}>
          <TouchableOpacity
            style={styles.expandedClose}
            onPress={() => setExpandedProof(false)}
          >
            <View style={styles.expandedCloseBtn}>
              <Ionicons name="close" size={width * 0.06} color="#fff" />
            </View>
          </TouchableOpacity>
          {proofData?.url && (
            <Image
              source={{ uri: proofData.url }}
              style={styles.expandedImage}
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    gap: width * 0.03,
  },
  backButton: { padding: width * 0.01 },
  deleteButton: { padding: width * 0.01 },
  headerAvatar: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "800",
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: width * 0.042, fontWeight: "700", color: "#fff" },
  headerSubtitle: {
    fontSize: width * 0.028,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  messageList: {
    padding: width * 0.04,
    flexGrow: 1,
    paddingBottom: height * 0.02,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.008,
    gap: width * 0.025,
  },

  checkbox: {
    width: width * 0.055,
    height: width * 0.055,
    borderRadius: width * 0.0275,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  messageBubble: {
    maxWidth: width * 0.72,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.012,
    borderRadius: 18,
  },
  messageBubbleSelected: { opacity: 0.75 },
  myBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  otherBubble: {
    backgroundColor: COLORS.white,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: { fontSize: width * 0.038, lineHeight: width * 0.056 },
  myText: { color: "#fff" },
  otherText: { color: COLORS.text },

  itemTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: width * 0.015,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.008,
    alignSelf: "center",
    marginTop: height * 0.008,
    marginBottom: height * 0.015,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  itemTitleBadgeText: {
    fontSize: width * 0.03,
    color: COLORS.primary,
    fontWeight: "600",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: height * 0.1,
    gap: height * 0.01,
  },
  emptyIconWrapper: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.01,
  },
  emptyText: { fontSize: width * 0.04, fontWeight: "700", color: COLORS.text },
  emptySubText: { fontSize: width * 0.034, color: COLORS.textSecondary },
  inputContainer: {
    flexDirection: "row",
    padding: width * 0.03,
    paddingHorizontal: width * 0.04,
    backgroundColor: COLORS.white,
    alignItems: "flex-end",
    gap: width * 0.025,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    borderRadius: 22,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.012,
    fontSize: width * 0.036,
    color: COLORS.text,
    maxHeight: height * 0.12,
    backgroundColor: COLORS.primaryLight,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: width * 0.115,
    height: width * 0.115,
    borderRadius: width * 0.0575,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sendButtonDisabled: { backgroundColor: COLORS.primaryMid, elevation: 0 },
  proofModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  proofModalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: width * 0.06,
    paddingBottom: height * 0.04,
    alignItems: "center",
    gap: height * 0.015,
  },
  proofModalHandle: {
    width: width * 0.1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: height * 0.01,
  },
  proofModalIconWrapper: {
    width: width * 0.16,
    height: width * 0.16,
    borderRadius: width * 0.08,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  proofModalTitle: {
    fontSize: width * 0.052,
    fontWeight: "800",
    color: COLORS.text,
  },
  proofModalSubtitle: {
    fontSize: width * 0.035,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: width * 0.053,
  },
  proofImageWrapper: {
    width: "100%",
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  proofImage: { width: "100%", height: height * 0.28, borderRadius: 16 },
  proofExpandButton: {
    position: "absolute",
    top: width * 0.02,
    right: width * 0.02,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    padding: width * 0.018,
  },
  proofDescriptionBox: {
    width: "100%",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: width * 0.04,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  proofDescriptionLabel: {
    fontSize: width * 0.03,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  proofDescriptionText: {
    fontSize: width * 0.036,
    color: COLORS.text,
    lineHeight: width * 0.055,
  },
  proofOkButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.02,
    borderRadius: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  proofOkButtonText: {
    color: "#fff",
    fontSize: width * 0.042,
    fontWeight: "800",
  },
  expandedOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  expandedClose: {
    position: "absolute",
    top: height * 0.06,
    right: width * 0.04,
    zIndex: 1,
  },
  expandedCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: width * 0.02,
  },
  expandedImage: { width: width, height: height * 0.75 },
});
