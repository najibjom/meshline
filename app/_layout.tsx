import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { MeshlineProvider } from "@/lib/meshline-context";

export default function RootLayout() {
  return (
    <MeshlineProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="recovery" />
        <Stack.Screen name="new-chat" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="storage" />
        <Stack.Screen name="security" />
      </Stack>
    </MeshlineProvider>
  );
}
