import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { MeshlineProvider } from "@/lib/meshline-context";
import { AppLockGate } from "@/components/app-lock-gate";

export default function RootLayout() {
  return (
    <MeshlineProvider>
      <StatusBar style="dark" />
      <AppLockGate>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="recovery" />
          <Stack.Screen name="new-chat" />
          <Stack.Screen name="new-space" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="channel-settings/[id]" />
          <Stack.Screen name="group-settings/[id]" />
          <Stack.Screen name="space-members/[id]" />
          <Stack.Screen name="storage" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="security" />
        </Stack>
      </AppLockGate>
    </MeshlineProvider>
  );
}
