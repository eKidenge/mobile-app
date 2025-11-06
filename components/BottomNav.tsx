import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'Home', icon: '🏠', path: '/dashboard' },
    { name: 'History', icon: '📋', path: '/history' },
    { name: 'Favorites', icon: '❤️', path: '/favorites' },
    { name: 'Settings', icon: '⚙️', path: '/settings' }
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5
  },
  iconActive: {
    opacity: 1
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500'
  },
  labelActive: {
    color: '#2563EB',
    fontWeight: '700'
  }
});
