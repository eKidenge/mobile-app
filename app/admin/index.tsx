// app/admin/index.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminIndex() {
  const { user } = useAuth();

  const handleLogout = () => {
    // Navigate to logout screen
    router.push('/logout');
  };

  const adminCards = [
    {
      title: 'Professional Management',
      description: 'Approve, reject, and manage professionals',
      icon: '👥',
      route: '/admin/professionals',
      color: '#007AFF',
    },
    {
      title: 'Category Management',
      description: 'Manage service categories and pricing',
      icon: '📁',
      route: '/admin/categories',
      color: '#34C759',
    },
    {
      title: 'User Management',
      description: 'Manage platform users and roles',
      icon: '👤',
      route: '/admin/users',
      color: '#FF9500',
    },
    {
      title: 'Transaction History',
      description: 'View and manage all transactions',
      icon: '💰',
      route: '/admin/transactions',
      color: '#5856D6',
    },
    {
      title: 'Dispute Resolution',
      description: 'Handle user and professional disputes',
      icon: '⚖️',
      route: '/admin/disputes',
      color: '#FF3B30',
    },
    {
      title: 'Analytics & Reports',
      description: 'View platform analytics and reports',
      icon: '📊',
      route: '/admin/analytics',
      color: '#AF52DE',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcome}>Admin Panel</Text>
            <Text style={styles.subtitle}>
              Welcome back, {user?.first_name || user?.username || 'Admin'}!
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.grid}>
        {adminCards.map((card, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: card.color }]}
            onPress={() => router.push(card.route as any)}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.quickStats}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Text style={styles.quickActionText}>View Pending Approvals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <Text style={styles.quickActionText}>Check Recent Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <Text style={styles.quickActionText}>Platform Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    width: '47%',
    margin: 6,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
	lineHeight: 16,
  },
  quickStats: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  quickActions: {
    gap: 8,
  },
  quickAction: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionText: {
    color: '#495057',
    fontWeight: '500',
  },
});