import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ProfessionalCard from '../../components/ProfessionalCard';
import { categories, professionals } from '../../constants/data';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const category = categories.find(c => c.id === id);
  const categoryPros = professionals.filter(p => p.category === id);

  if (!category) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{category.title}</Text>
        <Text style={styles.subtitle}>{category.available} professionals available</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          <TouchableOpacity style={[styles.filterBtn, styles.filterActive]}>
            <Text style={styles.filterTextActive}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>Highest Rated</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>Lowest Rate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.professionals}>
          {categoryPros.map((pro) => (
            <ProfessionalCard key={pro.id} {...pro} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 12
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  scroll: {
    flex: 1,
    padding: 20
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  filterTextActive: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600'
  },
  professionals: {
    marginBottom: 20
  }
});
