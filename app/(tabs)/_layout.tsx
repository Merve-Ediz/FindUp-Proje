import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Dimensions, Pressable, View } from "react-native";
import { auth, db } from "../../src/config/firebase";

const { width } = Dimensions.get("window");

export default function TabLayout() {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let unsubscribeChats: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeChats) {
        unsubscribeChats();
        unsubscribeChats = null;
      }
      if (!user) {
        setHasUnread(false);
        return;
      }
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid),
      );
      unsubscribeChats = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          const unread = data.some(
            (chat) =>
              chat.lastMessage &&
              chat.lastSenderId &&
              chat.lastSenderId !== user.uid &&
              !chat.readBy?.[user.uid],
          );
          setHasUnread(unread);
        },
        (error) => {
          console.log("Chat listener error:", error);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeChats) unsubscribeChats();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: width * 0.16 },
        tabBarLabelStyle: {
          fontSize: width * 0.03,
          marginBottom: width * 0.02,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "İlan Oluştur",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Mesajlar",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {hasUnread && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    width: width * 0.025,
                    height: width * 0.025,
                    borderRadius: width * 0.0125,
                    backgroundColor: "#16a34a",
                  }}
                />
              )}
            </View>
          ),
          tabBarButton: (props) => (
            <Pressable
              onPress={(e) => {
                setHasUnread(false);
                props.onPress?.(e as any);
              }}
              style={props.style as any}
            >
              {props.children}
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="myads"
        options={{
          title: "İlanlarım",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
