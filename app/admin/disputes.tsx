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

interface Dispute {
  id: number;
  title: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
  session: {
    id: number;
    professional: {
      name: string;
    };
    client_id: string;
  };
}

interface DisputeFilters {
  status: string;
  search: string;
}

export default function DisputeResolution() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [filters, setFilters] = useState<DisputeFilters>({
    status: 'all',
    search: '',
  });
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Use your computer's IP address instead of localhost
  // Or use ngrok for development: ngrok http 8000
  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api'; // Replace with your computer's IP
  // const API_BASE_URL = 'https://your-ngrok-url.ngrok.io/api'; // If using ngrok

  useEffect(() => {
    loadDisputes();
  }, [filters]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      console.log('Loading disputes from:', API_BASE_URL);
      
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const url = `${API_BASE_URL}/disputes/${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('Fetching URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Disputes loaded:', data.length);
        setDisputes(data);
      } else {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        Alert.alert('Error', `Failed to load disputes: ${response.status}`);
      }
    } catch (error) {
      console.error('Network Error:', error);
      Alert.alert(
        'Connection Error', 
        `Failed to connect to server. Please check:\n\n1. Server is running on port 8000\n2. Correct IP address: ${API_BASE_URL}\n3. Network connectivity`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateDisputeStatus = async (disputeId: number, status: string, resolution?: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/disputes/${disputeId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          resolution: resolution || '',
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Dispute status updated successfully');
        loadDisputes();
        setActionModalVisible(false);
        setResolutionNote('');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to update dispute');
      }
    } catch (error) {
      console.error('Update Error:', error);
      Alert.alert('Error', 'Failed to update dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return styles.statusOpen;
      case 'in_progress': return styles.statusInProgress;
      case 'resolved': return styles.statusResolved;
      case 'closed': return styles.statusClosed;
      default: return styles.statusOpen;
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderDisputeItem = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={styles.disputeCard}
      onPress={() => {
        setSelectedDispute(item);
        setDetailModalVisible(true);
      }}
      onLongPress={() => {
        setSelectedDispute(item);
        setActionModalVisible(true);
      }}
    >
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeTitle}>{item.title}</Text>
          <Text style={styles.disputeSession}>
            Session #{item.session.id} • {item.session.professional.name} ↔ {item.session.client_id}
          </Text>
        </View>
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{getStatusDisplayText(item.status)}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.disputeDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.disputeFooter}>
        <Text style={styles.footerText}>
          Reported by: {item.created_by}
        </Text>
        <Text style={styles.footerText}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      {item.resolved_at && (
        <View style={styles.resolvedInfo}>
          <Ionicons name="checkmark-circle" size={16} color="#28a745" />
          <Text style={styles.resolvedText}>
            Resolved: {formatDate(item.resolved_at)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search disputes..."
        value={filters.search}
        onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
      />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, filters.status === 'all' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, status: 'all' }))}
          >
            <Text style={[styles.filterButtonText, filters.status === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filters.status === 'open' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, status: 'open' }))}
          >
            <Text style={[styles.filterButtonText, filters.status === 'open' && styles.filterButtonTextActive]}>
              Open
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filters.status === 'in_progress' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, status: 'in_progress' }))}
          >
            <Text style={[styles.filterButtonText, filters.status === 'in_progress' && styles.filterButtonTextActive]}>
              In Progress
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filters.status === 'resolved' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, status: 'resolved' }))}
          >
            <Text style={[styles.filterButtonText, filters.status === 'resolved' && styles.filterButtonTextActive]}>
              Resolved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filters.status === 'closed' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, status: 'closed' }))}
          >
            <Text style={[styles.filterButtonText, filters.status === 'closed' && styles.filterButtonTextActive]}>
              Closed
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  if (loading && disputes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading disputes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dispute Resolution</Text>
        <TouchableOpacity onPress={loadDisputes} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {renderFilters()}

      <FlatList
        data={disputes}
        renderItem={renderDisputeItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No disputes found</Text>
            <Text style={styles.emptySubtext}>
              {filters.status !== 'all' || filters.search ? 'Try changing your filters' : 'All disputes are resolved'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Dispute Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dispute Details</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {selectedDispute && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selectedDispute.title}</Text>
                  <View style={[styles.statusBadge, getStatusStyle(selectedDispute.status)]}>
                    <Text style={styles.statusText}>{getStatusDisplayText(selectedDispute.status)}</Text>
                  </View>
                </View>
                
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionLabel}>Session Details</Text>
                  <Text style={styles.sessionText}>
                    Session #{selectedDispute.session.id}
                  </Text>
                  <Text style={styles.sessionText}>
                    Professional: {selectedDispute.session.professional.name}
                  </Text>
                  <Text style={styles.sessionText}>
                    Client: {selectedDispute.session.client_id}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.descriptionText}>{selectedDispute.description}</Text>
              </View>

              {selectedDispute.resolution && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Resolution</Text>
                  <Text style={styles.resolutionText}>{selectedDispute.resolution}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Timeline</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedDispute.created_at)}
                  </Text>
                </View>
                {selectedDispute.resolved_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Resolved:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedDispute.resolved_at)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Reported by:</Text>
                  <Text style={styles.detailValue}>{selectedDispute.created_by}</Text>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setDetailModalVisible(false);
                setActionModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Manage Dispute</Text>
            </TouchableOpacity>
          </View>
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
              Manage Dispute: {selectedDispute?.title}
            </Text>

            <Text style={styles.actionSectionTitle}>Update Status</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.statusButton, styles.statusOpen]}
                onPress={() => updateDisputeStatus(selectedDispute!.id, 'open')}
                disabled={actionLoading}
              >
                <Text style={styles.statusButtonText}>Re-open</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statusButton, styles.statusInProgress]}
                onPress={() => updateDisputeStatus(selectedDispute!.id, 'in_progress')}
                disabled={actionLoading}
              >
                <Text style={styles.statusButtonText}>In Progress</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statusButton, styles.statusResolved]}
                onPress={() => updateDisputeStatus(selectedDispute!.id, 'resolved', resolutionNote)}
                disabled={actionLoading}
              >
                <Text style={styles.statusButtonText}>Resolve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statusButton, styles.statusClosed]}
                onPress={() => updateDisputeStatus(selectedDispute!.id, 'closed')}
                disabled={actionLoading}
              >
                <Text style={styles.statusButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.actionSectionTitle}>Resolution Note</Text>
            <TextInput
              style={styles.resolutionInput}
              placeholder="Add resolution notes (required for resolving disputes)..."
              multiline
              numberOfLines={4}
              value={resolutionNote}
              onChangeText={setResolutionNote}
            />

            {actionLoading && (
              <ActivityIndicator size="small" color="#007AFF" style={styles.actionLoading} />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setActionModalVisible(false);
                  setResolutionNote('');
                }}
                disabled={actionLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={() => setActionModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.doneButtonText}>Done</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
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
  filterScroll: {
    marginHorizontal: -5,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    marginHorizontal: 4,
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
    flexGrow: 1,
  },
  disputeCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  disputeSession: {
    fontSize: 12,
    color: '#666',
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#d4edda',
  },
  statusInProgress: {
    backgroundColor: '#cce7ff',
  },
  statusResolved: {
    backgroundColor: '#e2e3e5',
  },
  statusClosed: {
    backgroundColor: '#d6d8db',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#155724',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  resolvedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  resolvedText: {
    fontSize: 11,
    color: '#28a745',
    marginLeft: 4,
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
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
    textAlign: 'center',
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
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  sessionInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
	color: '#333',
    marginBottom: 4,
  },
  sessionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  resolutionText: {
    fontSize: 16,
    color: '#28a745',
    lineHeight: 24,
    fontStyle: 'italic',
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
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resolutionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
  },
  doneButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionLoading: {
    marginTop: 10,
  },
});