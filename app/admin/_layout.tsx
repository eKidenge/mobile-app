// app/admin/_layout.tsx
import { Stack } from "expo-router";
import { AuthGuard } from "../../components/AuthGuard";

export default function AdminLayout() {
  return (
    <AuthGuard requiredRole="admin">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Admin Dashboard" }} />
        <Stack.Screen name="professionals" options={{ title: "Manage Professionals" }} />
        <Stack.Screen name="professional-details/[id]" options={{ title: "Professional Details" }} />
        <Stack.Screen name="categories" options={{ title: "Manage Categories" }} />
        <Stack.Screen name="category-edit/[id]" options={{ title: "Edit Category" }} />
        <Stack.Screen name="transactions" options={{ title: "Transaction History" }} />
        <Stack.Screen name="disputes" options={{ title: "Manage Disputes" }} />
        <Stack.Screen name="dispute-details/[id]" options={{ title: "Dispute Details" }} />
        <Stack.Screen name="users" options={{ title: "User Management" }} />
        <Stack.Screen name="user-details/[id]" options={{ title: "User Details" }} />
        <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
        <Stack.Screen name="settings" options={{ title: "Admin Settings" }} />
      </Stack>
    </AuthGuard>
  );
}