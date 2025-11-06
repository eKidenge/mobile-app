import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/68e0a341b0c4553af1164043_1759552387205_a719f5fa.webp' }}
        style={styles.logo}
      />
      <Text style={styles.appName}>DirectConnect</Text>
      <Text style={styles.tagline}>Skip the search, get the answer</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.replace('/dashboard')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 24
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8
  },
  tagline: {
    fontSize: 16,
    color: '#E0F2FE',
    fontWeight: '500',
    marginBottom: 60
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  buttonText: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '700'
  }
});
