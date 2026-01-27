import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ProfessionalProvider } from "../contexts/ProfessionalContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native'; // Added Text import
import { useRouter, useSegments } from 'expo-router';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  'index', // splash screen - let it handle its own navigation
  'login', 
  'professional/login', 
  'professional/professional-signup',
  'register'
];

// Route Protection Component
function ProtectedLayout() {
  const { user, professional, loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading || isRedirecting) return;

    const currentRoute = segments[0];
    const subRoute = segments[1];
    const fullRoute = `${currentRoute}${subRoute ? `/${subRoute}` : ''}`;
    
    console.log('🛡️ ROUTE PROTECTION - Current state:', {
      currentRoute,
      subRoute,
      fullRoute,
      isAuthenticated,
      userType: user?.user_type,
      loading
    });

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.includes(fullRoute);

    console.log('📋 Route check:', {
      fullRoute,
      isPublicRoute,
      isAuthenticated,
      userType: user?.user_type
    });

    // CRITICAL: Allow splash screen to handle its own navigation
    if (currentRoute === 'index') {
      console.log('✅ Allowing splash screen to handle navigation');
      return;
    }

    // Allow access to public routes without authentication
    if (!isAuthenticated && isPublicRoute) {
      console.log('✅ Allowing access to public route:', fullRoute);
      return;
    }

    // If not authenticated and trying to access protected route, redirect to login
    if (!isAuthenticated && !isPublicRoute) {
      console.log('🔒 Redirecting to login - not authenticated');
      router.replace('/login');
      return;
    }

    // If authenticated and on login page, redirect to appropriate dashboard
    if (isAuthenticated && user && currentRoute === 'login') {
      console.log('✅ Authenticated user on login page, redirecting...');
      setIsRedirecting(true);
      
      let targetRoute = '/dashboard'; // default
      
      if (user.user_type === 'professional') {
        if (professional?.is_approved) {
          targetRoute = '/professional/professional-dashboard';
        } else {
          targetRoute = '/professional/professional-pending';
        }
      } else if (user.user_type === 'admin' || user.is_staff) {
        targetRoute = '/admin';
      }
      
      console.log('🎯 Redirecting authenticated user to:', targetRoute);
      router.replace(targetRoute);
      setIsRedirecting(false);
      return;
    }

    // If authenticated, handle route restrictions based on user type
    if (isAuthenticated && user) {
      const isProfessionalRoute = currentRoute === 'professional';
      
      // Client trying to access professional routes
      if (user.user_type === 'client' && isProfessionalRoute) {
        console.log('🚫 Client trying to access professional route, redirecting to dashboard');
        router.replace('/dashboard');
        return;
      }

      // Professional trying to access client routes (except public routes)
      if (user.user_type === 'professional' && 
          !isPublicRoute && 
          currentRoute !== 'professional') {
        if (professional?.is_approved) {
          console.log('🚫 Professional trying to access client route, redirecting to professional dashboard');
          router.replace('/professional/professional-dashboard');
        } else {
          console.log('🚫 Unapproved professional trying to access client route, redirecting to pending');
          router.replace('/professional/professional-pending');
        }
        return;
      }

      // Unapproved professional trying to access professional dashboard
      if (user.user_type === 'professional' && 
          !professional?.is_approved && 
          currentRoute === 'professional' && 
          subRoute === 'professional-dashboard') {
        console.log('🚫 Unapproved professional trying to access dashboard, redirecting to pending');
        router.replace('/professional/professional-pending');
        return;
      }

      // Approved professional trying to access pending screen
      if (user.user_type === 'professional' && 
          professional?.is_approved && 
          currentRoute === 'professional' && 
          subRoute === 'professional-pending') {
        console.log('✅ Approved professional trying to access pending, redirecting to dashboard');
        router.replace('/professional/professional-dashboard');
        return;
      }

      // Authenticated user trying to access signup pages - redirect to appropriate dashboard
      if (isAuthenticated && isPublicRoute && fullRoute !== 'index') {
        console.log('🔄 Authenticated user on public route, redirecting to dashboard...');
        setIsRedirecting(true);
        
        let targetRoute = '/dashboard';
        if (user.user_type === 'professional') {
          if (professional?.is_approved) {
            targetRoute = '/professional/professional-dashboard';
          } else {
            targetRoute = '/professional/professional-pending';
          }
        } else if (user.user_type === 'admin' || user.is_staff) {
          targetRoute = '/admin';
        }
        
        console.log('🎯 Redirecting authenticated user from public route to:', targetRoute);
        router.replace(targetRoute);
        setIsRedirecting(false);
        return;
      }
    }
  }, [user, professional, segments, loading, isAuthenticated, isRedirecting]);

  // Show loading indicator while checking auth status
  if (loading || isRedirecting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: '#666' }}>
          {isRedirecting ? 'Redirecting...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#fff' },
        gestureEnabled: true
      }}
    >
      {/* Public & Welcome Routes */}
      <Stack.Screen 
        name="index" 
        options={{ 
          animation: 'fade',
          gestureEnabled: false 
        }} 
      />
      
      {/* Auth Routes */}
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Client Login',
          animation: 'slide_from_bottom'
        }} 
      />
      
      {/* Client App Routes */}
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
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      
      {/* Professional Routes */}
      <Stack.Screen 
        name="professional/login" 
        options={{ 
          title: 'Professional Login',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="professional/professional-signup" 
        options={{ 
          title: 'Professional Signup',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="professional/professional-pending" 
        options={{ 
          title: 'Pending Approval',
          gestureEnabled: false,
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="professional/professional-dashboard" 
        options={{ 
          title: 'Professional Dashboard',
          gestureEnabled: false
        }} 
      />
      <Stack.Screen name="professional/professional-session" />
      <Stack.Screen name="professional/incoming" />

      {/* Admin Routes */}
      <Stack.Screen 
        name="admin" 
        options={{ 
          title: 'Admin Dashboard',
          animation: 'slide_from_left'
        }} 
      />

      {/* Add register route if needed */}
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'Client Registration',
          animation: 'slide_from_bottom'
        }} 
      />

      {/* Additional common routes */}
      <Stack.Screen name="search" />
      <Stack.Screen name="professionals" />
      <Stack.Screen name="help-center" />
      <Stack.Screen name="support-chat" />
      <Stack.Screen name="terms-privacy" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ProfessionalProvider>
          <StatusBar style="auto" />
          <ProtectedLayout />
        </ProfessionalProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}