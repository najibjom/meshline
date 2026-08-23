import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/components/meshline-ui";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const height = 58 + bottomPadding;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.tabBar, { height, paddingBottom: bottomPadding, backgroundColor: colors.surface, borderTopColor: colors.border }],
        sceneStyle: styles.scene,
      }}
      >
        <Tabs.Screen name="index" options={{ title: "Chats", tabBarIcon: ({ color }) => <MaterialIcons name="chat-bubble-outline" size={23} color={color} /> }} />
        <Tabs.Screen name="contacts" options={{ title: "Contacts", tabBarIcon: ({ color }) => <MaterialIcons name="people-outline" size={24} color={color} /> }} />
        <Tabs.Screen name="network" options={{ title: "Network", tabBarIcon: ({ color }) => <MaterialIcons name="hub" size={23} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <MaterialIcons name="person-outline" size={24} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: "#FFFFFF", borderTopColor: "#E8EBF3", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  label: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  scene: { flex: 1, minHeight: 0, overflow: "hidden" },
});
