import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

interface ApplicationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  submitted_at: string;
  estimated_review_time: string;
  review_notes?: string;
  admin_contact?: string;
}

export default function ProfessionalPendingScreen() {
  const router = useRouter();
  const { user, professional } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplicationStatus = async () => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const response = await fetch(`https://teleconnect-krga.onrender.com/api/professionals/${user.id}/application-status/`);
      
      if (response.ok) {
        const data = await response.json();
        setApplicationStatus(data);
        
        // If application is approved, redirect to professional dashboard
        if (data.status === 'approved') {
          Alert.alert(
            'Application Approved!',
            'Your professional application has been approved. You can now start accepting clients.',
            [{ text: 'Get Started', onPress: () => router.replace('/professional-dashboard') }]
          );
        }
        
        // If application is rejected, show rejection reason
        if (data.status === 'rejected') {
          Alert.alert(
            'Application Review Complete',
            `Your application requires attention: ${data.review_notes || 'Please check your application details.'}`,
            [{ text: 'Review', onPress: () => router.push('/professional-signup') }]
          );
        }
      } else {
        throw new Error('Failed to fetch application status');
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
		Alert.alert('Error', 'Failed to load application status. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplicationStatus();
  };

  useEffect(() => {
    fetchApplicationStatus();

    // Set up polling to check status every 30 seconds
    const interval = setInterval(fetchApplicationStatus, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'under_review': return '🔍';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'under_review': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Your application has been approved!';
      case 'rejected':
        return 'Your application requires attention';
      case 'under_review':
        return 'Your application is under detailed review';
      default:
        return 'Your application is pending review';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading application status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.icon}>
            {applicationStatus ? getStatusIcon(applicationStatus.status) : '⏳'}
          </Text>
          
          <Text style={styles.title}>
            {applicationStatus ? getStatusMessage(applicationStatus.status) : 'Application Submitted!'}
          </Text>
          
          <Text style={styles.subtitle}>
            {applicationStatus?.status === 'approved' 
              ? 'Welcome to DirectConnect! You can now start accepting clients and growing your practice.'
              : applicationStatus?.status === 'rejected'
              ? 'Our team has reviewed your application and provided feedback below.'
              : 'Thank you for your interest in joining DirectConnect. Our team will review your application and verify your credentials.'
            }
          </Text>

          {/* Application Status Card */}
          {applicationStatus && (
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusTitle}>Application Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(applicationStatus.status) }]}>
                  <Text style={styles.statusBadgeText}>
                    {applicationStatus.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statusDetail}>
                <Text style={styles.detailLabel}>Submitted On</Text>
                <Text style={styles.detailValue}>
                  {formatDate(applicationStatus.submitted_at)}
                </Text>
              </View>
              
              <View style={styles.statusDetail}>
                <Text style={styles.detailLabel}>Estimated Review</Text>
                <Text style={styles.detailValue}>
                  {applicationStatus.estimated_review_time}
                </Text>
              </View>

              {applicationStatus.review_notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Review Notes</Text>
                  <Text style={styles.notesText}>
                    {applicationStatus.review_notes}
                  </Text>
                </View>
              )}

              {applicationStatus.admin_contact && (
                <View style={styles.contactSection}>
                  <Text style={styles.contactLabel}>Contact Administrator</Text>
                  <Text style={styles.contactText}>
                    {applicationStatus.admin_contact}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Next Steps Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What happens next?</Text>
            
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                We verify your license and credentials ({applicationStatus?.estimated_review_time || '1-2 business days'})
              </Text>
            </View>
            
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                You'll receive an email with your approval status
              </Text>
            </View>
            
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Once approved, you can start accepting clients immediately
              </Text>
            </View>
          </View>

          {/* Support Contact */}
          <View style={styles.contact}>
            <Text style={styles.contactTitle}>Need Help?</Text>
            <Text style={styles.contactText}>Email: support@directconnect.co.ke</Text>
            <Text style={styles.contactText}>Phone: +254 700 123 456</Text>
            <Text style={styles.contactText}>Hours: Mon-Fri, 8AM-5PM EAT</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {applicationStatus?.status === 'rejected' && (
              <TouchableOpacity 
                style={[styles.button, styles.reapplyButton]}
                onPress={() => router.push('/professional-signup')}
              >
                <Text style={styles.reapplyButtonText}>Update Application</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, styles.homeButton]}
              onPress={() => router.push('/dashboard')}
            >
              <Text style={styles.homeButtonText}>Return to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.refreshButton]}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
  },
  content: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  icon: { 
    fontSize: 80, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#111827', 
    textAlign: 'center', 
    marginBottom: 12 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginBottom: 32, 
    lineHeight: 22 
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contactSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 24 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 16 
  },
  step: { 
    flexDirection: 'row', 
    marginBottom: 16, 
    alignItems: 'flex-start' 
  },
  stepNumber: { 
    width: 28, 
    height: 28, 
    backgroundColor: '#2563EB', 
    color: '#fff', 
    borderRadius: 14, 
    textAlign: 'center', 
    lineHeight: 28, 
    fontWeight: '700', 
    marginRight: 12 
  },
  stepText: { 
    flex: 1, 
    fontSize: 14, 
    color: '#6B7280', 
    lineHeight: 20 
  },
  contact: { 
    backgroundColor: '#FEF3C7', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 24 
  },
  contactTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#92400E', 
    marginBottom: 8 
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: '#2563EB',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reapplyButton: {
    backgroundColor: '#DC2626',
  },
  reapplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshButton: {
    backgroundColor: '#6B7280',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});