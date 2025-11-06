import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="professional/[id]" />
      <Stack.Screen name="session" />
      <Stack.Screen name="quick-connect" />
      <Stack.Screen name="session-complete" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="history" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="about" />
      <Stack.Screen name="professional-signup" />
      <Stack.Screen name="professional-pending" />
      <Stack.Screen name="professional-dashboard" />
    </Stack>
  );
}
