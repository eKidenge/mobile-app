import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  user_type: string;
  status: string;
  phone: string;
  session_count: number;
  total_spent: number;
  created_at: string;
  last_login: string;
	is_verified: boolean;
}

interface UserFilters {
  status: string;
  role: string;
  search: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    status: 'all',
    role: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api'; // Adjust to your backend URL

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
      }

      const currentPage = loadMore ? page + 1 : 1;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '20',
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`${API_BASE_URL}/admin/users/?${params}`);
      const data = await response.json();

      if (response.ok) {
        if (loadMore) {
          setUsers(prev => [...prev, ...data.users]);
          setPage(currentPage);
        } else {
          setUsers(data.users);
          setPage(1);
        }
        setHasMore(data.users.length === 20); // Assuming page_size is 20
      } else {
        Alert.alert('Error', data.error || 'Failed to load users');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserDetail = async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedUser(data);
        setDetailModalVisible(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to load user details');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load user details');
    }
  };

  const updateUserStatus = async (userId: number, status: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message);
        loadUsers(); // Refresh the list
        setActionModalVisible(false);
      } else {
        Alert.alert('Error', data.error || 'Failed to update user status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const updateUserRole = async (userId: number, role: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message);
        loadUsers(); // Refresh the list
        setActionModalVisible(false);
      } else {
        Alert.alert('Error', data.error || 'Failed to update user role');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/delete/`, {
                method: 'POST',
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Success', data.message);
                loadUsers(); // Refresh the list
                setActionModalVisible(false);
              } else {
                Alert.alert('Error', data.error || 'Failed to delete user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => loadUserDetail(item.id)}
      onLongPress={() => {
        setSelectedUser(item);
        setActionModalVisible(true);
      }}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.userMeta}>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <View style={[styles.roleBadge, getRoleStyle(item.role)]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.userStats}>
        <Text style={styles.statText}>
          Sessions: {item.session_count}
        </Text>
        <Text style={styles.statText}>
          Spent: ${item.total_spent.toFixed(2)}
        </Text>
      </View>
      
      <Text style={styles.joinDate}>
        Joined: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return styles.statusActive;
      case 'inactive': return styles.statusInactive;
      case 'suspended': return styles.statusSuspended;
      default: return styles.statusActive;
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return styles.roleAdmin;
      case 'professional': return styles.roleProfessional;
      case 'client': return styles.roleClient;
      default: return styles.roleClient;
    }
  };

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        value={filters.search}
        onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
      />
      
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filters.status === 'all' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, status: 'all' }))}
        >
          <Text style={[styles.filterButtonText, filters.status === 'all' && styles.filterButtonTextActive]}>
            All Status
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filters.status === 'active' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, status: 'active' }))}
        >
          <Text style={[styles.filterButtonText, filters.status === 'active' && styles.filterButtonTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filters.status === 'inactive' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, status: 'inactive' }))}
        >
          <Text style={[styles.filterButtonText, filters.status === 'inactive' && styles.filterButtonTextActive]}>
            Inactive
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filters.role === 'all' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, role: 'all' }))}
        >
          <Text style={[styles.filterButtonText, filters.role === 'all' && styles.filterButtonTextActive]}>
            All Roles
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filters.role === 'client' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, role: 'client' }))}
        >
          <Text style={[styles.filterButtonText, filters.role === 'client' && styles.filterButtonTextActive]}>
            Clients
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filters.role === 'professional' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, role: 'professional' }))}
        >
          <Text style={[styles.filterButtonText, filters.role === 'professional' && styles.filterButtonTextActive]}>
            Professionals
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filters.role === 'admin' && styles.filterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, role: 'admin' }))}
        >
          <Text style={[styles.filterButtonText, filters.role === 'admin' && styles.filterButtonTextActive]}>
            Admins
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      
      {renderFilters()}

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => hasMore && loadUsers(true)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* User Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Details</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Personal Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.first_name} {selectedUser.last_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Username:</Text>
                  <Text style={styles.detailValue}>{selectedUser.username}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedUser.phone || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Account Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Role:</Text>
                  <View style={[styles.roleBadge, getRoleStyle(selectedUser.role)]}>
                    <Text style={styles.roleText}>{selectedUser.role}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Status:</Text>
                  <View style={[styles.statusBadge, getStatusStyle(selectedUser.status)]}>
                    <Text style={styles.statusText}>{selectedUser.status}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Verified:</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.is_verified ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Joined:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Last Login:</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Activity Statistics</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Total Sessions:</Text>
                  <Text style={styles.detailValue}>{selectedUser.session_count}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Total Spent:</Text>
                  <Text style={styles.detailValue}>${selectedUser.total_spent.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>
              Manage {selectedUser?.first_name} {selectedUser?.last_name}
            </Text>

            <Text style={styles.actionSectionTitle}>Change Status</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.statusActive]}
                onPress={() => updateUserStatus(selectedUser!.id, 'active')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Activate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.statusInactive]}
                onPress={() => updateUserStatus(selectedUser!.id, 'inactive')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Deactivate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.statusSuspended]}
                onPress={() => updateUserStatus(selectedUser!.id, 'suspended')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Suspend</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.actionSectionTitle}>Change Role</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.roleClient]}
                onPress={() => updateUserRole(selectedUser!.id, 'client')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Make Client</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.roleProfessional]}
                onPress={() => updateUserRole(selectedUser!.id, 'professional')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Make Professional</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.roleAdmin]}
                onPress={() => updateUserRole(selectedUser!.id, 'admin')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Make Admin</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.actionSectionTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteUser(selectedUser!.id)}
              disabled={actionLoading}
            >
              <Text style={styles.deleteButtonText}>Delete User</Text>
            </TouchableOpacity>

            {actionLoading && (
              <ActivityIndicator size="small" color="#007AFF" style={styles.actionLoading} />
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setActionModalVisible(false)}
              disabled={actionLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 10,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusActive: {
    backgroundColor: '#d4edda',
  },
  statusInactive: {
    backgroundColor: '#f8d7da',
  },
  statusSuspended: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#155724',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleAdmin: {
    backgroundColor: '#dc3545',
  },
  roleProfessional: {
    backgroundColor: '#007AFF',
  },
  roleClient: {
    backgroundColor: '#28a745',
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailKey: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    width: '100%',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionLoading: {
    marginTop: 10,
  },
});