import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';

export default function QuickCallButton() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleQuickCall = () => {
    router.push('/quick-connect');
  };

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleQuickCall}
        activeOpacity={0.9}
      >
        <Text style={styles.icon}>📞</Text>
        <Text style={styles.text}>Quick Call Now</Text>
        <Text style={styles.subtext}>Connect in 2 minutes</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
	backgroundColor: '#24107eff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  icon: {
    fontSize: 32,
    marginBottom: 8
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  subtext: {
    color: '#FEE2E2',
    fontSize: 13,
    fontWeight: '500'
  }
});
