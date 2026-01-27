import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  timestamp: string;
  professionalName: string;
  professionalId: string;
  consultationType: string;
  sessionId: string;
  clientName: string;
  clientId: string;
}

interface ReceiptData {
  receiptNumber: string;
  date: string;
  time: string;
  clientName: string;
  clientEmail: string;
  professionalName: string;
  service: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [callType, setCallType] = useState<'video' | 'voice'>('video');
  
  // Track processed transactions to prevent duplicates
  const processedTransactions = useRef<Set<string>>(new Set());
  const initializationComplete = useRef(false);

  // Your server IP
  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

  // ADDED: Debug logging to identify this page
  console.log('🔴🔴🔴 REAL PAYMENT SUCCESS PAGE LOADED 🔴🔴🔴');
  console.log('File: app/payment-success.tsx');
  console.log('Component: PaymentSuccessScreen');
  console.log('Params received:', params);

  // FIXED: Use useCallback to prevent recreation of function on every render
  const initializePaymentData = useCallback(async () => {
    try {
      // Prevent multiple initializations
      if (initializationComplete.current) {
        console.log('🔄 Initialization already completed, skipping...');
        return;
      }

      setLoading(true);
      initializationComplete.current = true;

      console.log('🎉 PaymentSuccess params:', params);

      // Extract data from params
      const professional = params.professional ? JSON.parse(params.professional as string) : null;
      const amount = parseInt(params.amount as string) || 0;
      const transactionId = params.transactionId as string || params.checkoutRequestId as string || `TXN_${Date.now()}`;
      const consultationType = params.consultationType as string || 'consultation';
      const session = params.session ? JSON.parse(params.session as string) : null;
      const clientName = params.clientName as string || 'Client';
      const clientId = params.clientId as string || '1';

      // Set call type based on consultation type
      setCallType(consultationType === 'voice' ? 'voice' : 'video');

      console.log('📊 Payment data extracted:', {
        professional,
        amount,
        transactionId,
        consultationType,
        session,
        clientName,
        clientId
      });

      // Check if we've already processed this transaction
      if (processedTransactions.current.has(transactionId)) {
        console.log('🔄 Transaction already processed, skipping...');
        createPaymentData(professional, amount, transactionId, consultationType, session, clientName, clientId);
        setLoading(false);
        return;
      }

      // Mark transaction as processed
      processedTransactions.current.add(transactionId);

      // Record payment in database with retry logic
      await recordPaymentWithRetry({
        amount: amount,
        professionalId: professional?.id,
        sessionId: session?.session_id || session?.id,
        paymentMethod: 'mpesa',
        transactionId: transactionId,
        clientId: clientId,
        clientName: clientName
      });

      // Create payment data object
      createPaymentData(professional, amount, transactionId, consultationType, session, clientName, clientId);

      // Unlock the session
      await unlockSession(session?.session_id || session?.id);

    } catch (error) {
      console.error('Payment initialization error:', error);
      createFallbackPaymentData();
    } finally {
      setLoading(false);
    }
  }, [params]); // Add params as dependency

  useEffect(() => {
    // Only initialize if we have necessary params and haven't initialized yet
    if (params.professional && !initializationComplete.current) {
      console.log('🚀 Initializing payment data...');
      initializePaymentData();
    } else if (initializationComplete.current) {
      console.log('🔄 Already initialized, skipping...');
      setLoading(false);
    } else if (!params.professional) {
      console.log('❌ Missing professional data, cannot initialize');
      setLoading(false);
    }
  }, [initializePaymentData, params.professional]); // Fixed dependencies

  const recordPaymentWithRetry = async (paymentData: any, retries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📝 Recording payment attempt ${attempt}/${retries}...`);
        
        const paymentResponse = await fetch(`${API_BASE_URL}/record_payment/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          console.log('✅ Payment recorded in database:', paymentResult);
          return true;
        } else {
          console.log(`⚠️ Payment recording failed (attempt ${attempt}):`, paymentResponse.status);
          
          // If it's a client error (4xx), don't retry
          if (paymentResponse.status >= 400 && paymentResponse.status < 500) {
            console.log('🛑 Client error, stopping retries');
            break;
          }
        }
      } catch (dbError) {
        console.log(`⚠️ Database recording error (attempt ${attempt}):`, dbError);
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    console.log('❌ All payment recording attempts failed, but continuing...');
    return false;
  };

  const createPaymentData = (professional: any, amount: number, transactionId: string, consultationType: string, session: any, clientName: string, clientId: string) => {
    const paymentData: PaymentData = {
      id: `payment_${Date.now()}`,
      amount: amount,
      currency: 'KES',
      method: 'M-Pesa',
      status: 'completed',
      transactionId: transactionId,
      timestamp: new Date().toISOString(),
      professionalName: professional?.name || 'Professional',
      professionalId: professional?.id || '0',
      consultationType: consultationType,
      sessionId: session?.session_id || session?.id || `sess_${Date.now()}`,
      clientName: clientName,
      clientId: clientId
    };

    setPayment(paymentData);
    
    // Generate receipt data
    const receipt: ReceiptData = {
      receiptNumber: `RCP${Date.now()}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      clientName: clientName,
      clientEmail: 'client@example.com',
      professionalName: professional?.name || 'Professional',
      service: `${consultationType.charAt(0).toUpperCase() + consultationType.slice(1)} Consultation`,
      amount: amount,
      transactionId: transactionId,
      paymentMethod: 'M-Pesa'
    };
    
    setReceiptData(receipt);
    
    // Send receipt notification (fire and forget)
    sendReceiptNotification(receipt).catch(error => 
      console.error('Receipt notification failed:', error)
    );
  };

  const createFallbackPaymentData = () => {
    const fallbackPayment: PaymentData = {
      id: `fallback_${Date.now()}`,
      amount: parseInt(params.amount as string) || 0,
      currency: 'KES',
      method: 'M-Pesa',
      status: 'completed',
      transactionId: params.transactionId as string || `TXN_${Date.now()}`,
      timestamp: new Date().toISOString(),
      professionalName: 'Professional',
      professionalId: '0',
      consultationType: params.consultationType as string || 'Consultation',
      sessionId: '',
      clientName: 'Client',
      clientId: '1'
    };
    
    setPayment(fallbackPayment);
    
    Alert.alert(
      'Payment Successful!',
      'Your payment was processed successfully. You can now start your session.'
    );
  };

  const unlockSession = async (sessionId: string) => {
    if (!sessionId) {
      console.log('🔓 No session ID provided for unlocking');
      return;
    }

    try {
      console.log('🔓 Unlocking session:', sessionId);
      
      const response = await fetch(`${API_BASE_URL}/update_session_status/${sessionId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
          professional_id: params.professional ? JSON.parse(params.professional as string)?.id : null
        })
      });

      if (response.ok) {
        console.log('✅ Session unlocked and ready');
      } else {
        console.log('⚠️ Session status update failed:', response.status);
      }
    } catch (error) {
      console.error('Session unlock error:', error);
    }
  };

  const sendReceiptNotification = async (receipt: ReceiptData): Promise<void> => {
    try {
      console.log('📧 Sending receipt notification...');
      
      const response = await fetch(`${API_BASE_URL}/send_receipt_notification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData: receipt,
          clientId: '1',
          sendEmail: true,
          sendSMS: false
        })
      });
      
      if (response.ok) {
        console.log('✅ Receipt notification sent');
      } else {
        console.log('⚠️ Receipt notification failed:', response.status);
      }
    } catch (error) {
      console.error('Receipt notification error:', error);
      throw error;
    }
  };

  const generateReceiptHTML = (receipt: ReceiptData): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Receipt</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333; 
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #10B981; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #111827; 
          }
          .receipt-title { 
            font-size: 20px; 
            color: #059669; 
            margin: 10px 0; 
          }
          .details { 
            margin: 20px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
          }
          .detail-label { 
            font-weight: 600; 
            color: #6B7280; 
          }
          .detail-value { 
            color: #111827; 
          }
          .amount-section { 
            background: #F0F9FF; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .total-amount { 
            font-size: 24px; 
            font-weight: bold; 
            color: #059669; 
            text-align: center; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #E5E7EB; 
            color: #6B7280; 
            font-size: 12px; 
          }
          .thank-you { 
            text-align: center; 
            margin: 20px 0; 
            font-style: italic; 
            color: #6B7280; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">DIRECT-CONNECT TECHNOLOGIES</div>
          <div class="receipt-title">PAYMENT RECEIPT</div>
        </div>
        
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Receipt Number:</span>
            <span class="detail-value">${receipt.receiptNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${receipt.date}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${receipt.time}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Transaction ID:</span>
            <span class="detail-value">${receipt.transactionId}</span>
          </div>
        </div>
        
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Client:</span>
            <span class="detail-value">${receipt.clientName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Professional:</span>
            <span class="detail-value">${receipt.professionalName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service:</span>
            <span class="detail-value">${receipt.service}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">${receipt.paymentMethod}</span>
          </div>
        </div>
        
        <div class="amount-section">
          <div class="total-amount">KSH ${receipt.amount.toLocaleString()}</div>
        </div>
        
        <div class="thank-you">
          Thank you for your payment. This receipt confirms your transaction.
        </div>
        
        <div class="footer">
          <p>DIRECT-CONNECT TECHNOLOGIES</p>
          <p>"Skip the search, get the answer."</p>
          <p>This is an computer-generated receipt. No signature required.</p>
        </div>
      </body>
      </html>
    `;
  };

  const printReceipt = async () => {
    if (!receiptData) {
      Alert.alert('Error', 'Receipt data not available');
      return;
    }

    try {
      setGeneratingReceipt(true);
      
      const html = generateReceiptHTML(receiptData);
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: html,
        base64: false
      });

      // Share the PDF file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Payment Receipt',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', 'Receipt generated successfully. PDF saved to device.');
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to generate receipt. Please try again.');
    } finally {
      setGeneratingReceipt(false);
    }
  };

  // UPDATED: Function to start call session
  const startCallSession = () => {
    console.log('🔍 Starting call session with params:', params);

    const professional = params.professional ? JSON.parse(params.professional as string) : null;
    const clientName = params.clientName as string || 'Client';
    const clientId = params.clientId as string || '1';
    
    // Extract session/consultation ID
    let sessionId: string | null = null;
    
    if (params.session) {
      try {
        const sessionData = JSON.parse(params.session as string);
        sessionId = sessionData.session_id || sessionData.id || sessionData.consultationId || params.session as string;
        console.log('📦 Extracted session ID:', sessionId);
      } catch (error) {
        sessionId = params.session as string;
        console.log('📦 Using session as direct ID:', sessionId);
      }
    }
    
    const consultationType = params.consultationType as string || 'video';
    const amount = parseInt(params.amount as string) || 0;
    const transactionId = params.transactionId as string || params.checkoutRequestId as string || `TXN_${Date.now()}`;

    console.log('🚀 Starting call session:', { 
      professional: professional?.name,
      professionalId: professional?.id,
      sessionId, 
      consultationType,
      clientName,
      clientId
    });

    if (!professional) {
      Alert.alert('Error', 'Professional information missing');
      return;
    }

    if (!professional.id) {
      Alert.alert('Error', 'Professional ID is required');
      return;
    }

    console.log('🎯 Navigating to CallPage with payment data');

    // Prepare payment data for CallPage
    const paymentDataForCall = {
      clientId: clientId,
      clientName: clientName,
      professionalId: professional.id,
      professionalName: professional.name,
      consultationId: sessionId || `cons_${Date.now()}`,
      duration: 30, // Default duration - you can make this dynamic
      amount: amount,
      transactionId: transactionId,
      categoryName: consultationType,
      paymentStatus: 'completed',
      consultationType: consultationType
    };

    console.log('📤 Payment data for CallPage:', paymentDataForCall);

    // Navigate to CallPage with all necessary data
    router.push({
      pathname: '/call',
      params: { 
        paymentData: JSON.stringify(paymentDataForCall),
        professional: JSON.stringify(professional),
        consultationType: consultationType
      }
    });
  };

  const contactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Email: support@directconnect.com\nPhone: 0700 000 000',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finalizing your payment...</Text>
          <Text style={styles.loadingSubtext}>Unlocking your session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Branding Banner */}
      <View style={styles.brandBanner}>
        <Text style={styles.brandBannerText}>
          DIRECT-CONNECT TECHNOLOGIES
        </Text>
        <Text style={styles.brandBannerSubtext}>
          "Skip the search, get the answer."
        </Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {/* Success Icon & Title */}
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={100} color="#10B981" />
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Your payment has been processed successfully. You can now start your {callType} call with the professional.
            </Text>
          </View>

          {/* Payment Details Card */}
          {payment && (
            <View style={styles.detailsCard}>
              <Text style={styles.cardTitle}>Payment Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount Paid</Text>
                <Text style={styles.detailValue}>KSH {payment.amount.toLocaleString()}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{payment.method}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID</Text>
                <Text style={styles.detailValue}>{payment.transactionId}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Professional</Text>
                <Text style={styles.detailValue}>{payment.professionalName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{payment.consultationType}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              </View>
            </View>
          )}

          {/* Call Ready Card */}
          <View style={styles.sessionCard}>
            <Ionicons name="videocam" size={40} color="#10B981" />
            <Text style={styles.sessionTitle}>Call Ready! 🎉</Text>
            <Text style={styles.sessionText}>
              Your {callType} call with {payment?.professionalName} is now ready to start.
            </Text>
            <View style={styles.callTypeIndicator}>
              <Ionicons 
                name={callType === 'video' ? "videocam" : "call"} 
                size={20} 
                color="#2563EB" 
              />
              <Text style={styles.callTypeText}>
                {callType === 'video' ? 'Video Call' : 'Voice Call'}
              </Text>
            </View>
          </View>

          {/* Receipt Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>📄 Receipt & Records</Text>
            
            <TouchableOpacity 
              style={[styles.receiptButton, { backgroundColor: '#8B5CF6' }]}
              onPress={printReceipt}
              disabled={generatingReceipt}
            >
              {generatingReceipt ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="receipt" size={24} color="#fff" />
                  <Text style={styles.receiptButtonText}>
                    📥 DOWNLOAD RECEIPT
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Receipt info */}
            <Text style={styles.receiptInfo}>
              {receiptData ? `Receipt #${receiptData.receiptNumber} ready` : 'Generating receipt...'}
            </Text>
          </View>

          {/* Next Steps */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>What's Next?</Text>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.infoText}>Payment verified and recorded</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.infoText}>Professional notified and waiting</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.infoText}>{callType === 'video' ? 'Video call' : 'Voice call'} activated and ready</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.infoText}>Receipt sent to your records</Text>
            </View>
          </View>

          {/* Call Preparation Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.cardTitle}>💡 Call Preparation</Text>
            <View style={styles.tipItem}>
              <Ionicons name="wifi" size={16} color="#2563EB" />
              <Text style={styles.tipText}>Ensure stable internet connection</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="volume-high" size={16} color="#2563EB" />
              <Text style={styles.tipText}>Test your microphone and speakers</Text>
            </View>
            {callType === 'video' && (
              <View style={styles.tipItem}>
                <Ionicons name="camera" size={16} color="#2563EB" />
                <Text style={styles.tipText}>Check your camera and lighting</Text>
              </View>
            )}
            <View style={styles.tipItem}>
              <Ionicons name="time" size={16} color="#2563EB" />
              <Text style={styles.tipText}>Session duration: 30 minutes</Text>
            </View>
          </View>

          {/* Support Information */}
          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              If you have any issues starting your call, contact our support team.
            </Text>
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={contactSupport}
            >
              <Ionicons name="headset" size={16} color="#2563EB" />
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            callType === 'video' ? styles.videoButton : styles.voiceButton
          ]}
          onPress={startCallSession}
        >
          <Ionicons 
            name={callType === 'video' ? "videocam" : "call"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.primaryButtonText}>
            Start {callType === 'video' ? 'Video' : 'Voice'} Call Now
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryButtons}>
          <TouchableOpacity 
            style={styles.outlineButton}
            onPress={() => router.push('/dashboard')}
          >
            <Text style={styles.outlineButtonText}>Schedule for Later</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.textButton}
            onPress={() => router.back()}
          >
            <Text style={styles.textButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  // Updated: Brand banner styles
  brandBanner: {
    backgroundColor: '#2563EB', 
    padding: 16, 
    alignItems: 'center',
  },
  brandBannerText: {
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  brandBannerSubtext: {
    color: 'white', 
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  scrollContent: {
    flex: 1,
  },
  content: { 
    padding: 20, 
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#111827', 
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  detailsCard: {
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 12,
    marginBottom: 8,
  },
  sessionText: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    lineHeight: 20,
  },
  callTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  callTypeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 6,
  },
  actionsCard: {
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsCard: {
    backgroundColor: '#F0F9FF', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  cardTitle: {
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  receiptButtonText: {
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
  },
  receiptInfo: {
    fontSize: 12, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  supportSection: {
    backgroundColor: '#FEF3F2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  supportButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  videoButton: {
    backgroundColor: '#8B5CF6',
  },
  voiceButton: {
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outlineButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
    marginRight: 8,
  },
  outlineButtonText: {
    color: '#111827', 
    fontSize: 14, 
    fontWeight: '600',
  },
  textButton: {
    padding: 12,
    alignItems: 'center',
    flex: 1,
  },
  textButtonText: {
    color: '#6B7280', 
    fontSize: 14, 
    fontWeight: '500',
  },
});