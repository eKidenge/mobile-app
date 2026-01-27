// app/admin/professionals.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { apiService } from '../../services/api';

interface Professional {
  id: number;
  name: string;
  specialization: string;
  rate: number;
  status: 'pending' | 'approved' | 'rejected';
  available: boolean;
  email: string;
  phone: string;
  category: string;
  average_rating: number;
  total_sessions: number;
  created_at: string;
}

export default function ProfessionalManagement() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProfessionals();
  }, []);

  useEffect(() => {
    filterProfessionals();
  }, [professionals, searchQuery, statusFilter]);

  const loadProfessionals = async () => {
    try {
      const response = await apiService.get('/admin/professionals/');
      setProfessionals(response.professionals || []);
    } catch (error) {
      console.error('Failed to load professionals:', error);
      Alert.alert('Error', 'Failed to load professionals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterProfessionals = () => {
    let filtered = professionals;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(pro => pro.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(pro =>
        pro.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pro.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pro.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProfessionals(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfessionals();
  };

  const approveProfessional = async (id: number) => {
    try {
      setActionLoading(true);
      await apiService.post(`/admin/professionals/${id}/approve/`, {});
      Alert.alert('Success', 'Professional approved successfully');
      loadProfessionals();
    } catch (error) {
      console.error('Failed to approve professional:', error);
      Alert.alert('Error', 'Failed to approve professional');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectProfessional = async (id: number, reason: string) => {
    try {
      setActionLoading(true);
      await apiService.post(`/admin/professionals/${id}/reject/`, { reason });
      Alert.alert('Success', 'Professional rejected successfully');
      setModalVisible(false);
      setRejectionReason('');
      setSelectedProfessional(null);
      loadProfessionals();
    } catch (error) {
      console.error('Failed to reject professional:', error);
      Alert.alert('Error', 'Failed to reject professional');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#34C759';
      case 'pending': return '#FF9500';
      case 'rejected': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const ProfessionalCard = ({ professional }: { professional: Professional }) => (
    <TouchableOpacity
      style={styles.professionalCard}
      onPress={() => router.push(`/admin/professional-details/${professional.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.professionalName}>{professional.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(professional.status) }]}>
          <Text style={styles.statusText}>{professional.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.specialization}>{professional.specialization}</Text>
      <Text style={styles.category}>{professional.category}</Text>
      
      <View style={styles.cardDetails}>
        <Text style={styles.detail}>📧 {professional.email}</Text>
        <Text style={styles.detail}>📞 {professional.phone}</Text>
        <Text style={styles.detail}>💰 ${professional.rate}/hr</Text>
        <Text style={styles.detail}>⭐ {professional.average_rating} ({professional.total_sessions} sessions)</Text>
      </View>

      {professional.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => approveProfessional(professional.id)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.actionButtonText}>Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedProfessional(professional);
              setModalVisible(true);
            }}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading professionals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search professionals..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'approved', 'rejected'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                statusFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(filter as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Professionals List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredProfessionals.map((professional) => (
          <ProfessionalCard key={professional.id} professional={professional} />
        ))}
        
        {filteredProfessionals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No professionals found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No professionals in the system'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Professional</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting {selectedProfessional?.name}
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setRejectionReason('');
                  setSelectedProfessional(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={() => rejectProfessional(selectedProfessional!.id, rejectionReason)}
                disabled={!rejectionReason.trim() || actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
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
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    flex: 1,
  },
  professionalCard: {
    backgroundColor: 'white',
    margin: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  specialization: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmRejectButton: {
    backgroundColor: '#FF3B30',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});