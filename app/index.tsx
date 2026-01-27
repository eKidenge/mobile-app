import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { loading } = useAuth();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Show the "Get Started" button after 3 seconds if still loading
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    // Simply navigate to login - let _layout.tsx handle the auth logic
    router.replace('/login');
  };

  return (
    <LinearGradient
      colors={['#2563EB', '#0D9488']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <Image 
          source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/68e0a341b0c4553af1164043_1759552387205_a719f5fa.webp' }}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={styles.appName}>DirectConnect</Text>
        <Text style={styles.tagline}>Skip the search, get the answer</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Checking authentication...</Text>
          </View>
        ) : (
          showButton && (
            <TouchableOpacity 
              style={styles.button}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                Get Started
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#E0F2FE',
    fontWeight: '500',
    marginBottom: 60,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: 4 
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#E0F2FE',
    fontSize: 14,
    marginTop: 12,
  },
});