import { View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Dimensions, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface Professional {
  id: string;
  name: string;
  specialization: string;
  rate: number;
  available: boolean;
  online_status: boolean;
  category: string;
  average_rating: number;
  total_sessions: number;
  experience_years: number;
  email?: string;
  phone?: string;
  bio?: string;
  title?: string;
  languages?: string[];
  education?: string[];
  certifications?: string[];
  avg_response_time?: string;
  success_rate?: number;
  current_workload?: number;
  max_workload?: number;
  last_active?: string;
  profile_picture?: string;
  is_favorite?: boolean;
  categories?: Array<{
    id: string;
    name: string;
    is_primary: boolean;
  }>;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [consultationType, setConsultationType] = useState<'chat' | 'audio' | 'video'>('chat');
  const [amount, setAmount] = useState(0);
  
  // Custom Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalButtons, setModalButtons] = useState<Array<{text: string, onPress: () => void}>>([]);
  
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const isNavigating = useRef(false);

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

  // Custom Alert function
  const showCustomAlert = useCallback((title: string, message: string, buttons: Array<{text: string, onPress?: () => void, style?: 'cancel' | 'default' | 'destructive'}>) => {
    setModalTitle(title);
    setModalMessage(message);
    
    const modalButtonsWithDismiss = buttons.map(btn => ({
      text: btn.text,
      onPress: () => {
        setShowConfirmModal(false);
        if (btn.onPress) {
          btn.onPress();
        }
      }
    }));
    
    setModalButtons(modalButtonsWithDismiss);
    setShowConfirmModal(true);
  }, []);

  const calculateAmount = useCallback((prof: Professional, type: string): number => {
    const baseRate = prof.rate || 1000;
    
    const multipliers = {
      chat: 1,
      audio: 1.5,
      video: 2
    };
    
    return Math.round(baseRate * (multipliers[type as keyof typeof multipliers] || 1));
  }, []);

  const professionalParam = params.professional as string;
  const consultationTypeParam = params.consultationType as string;

  const parsedProfessional = useMemo(() => {
    if (!professionalParam) return null;
    try {
      return JSON.parse(professionalParam);
    } catch (error) {
      console.error('Error parsing professional data:', error);
      return null;
    }
  }, [professionalParam]);

  // Generate a numeric session ID that matches backend expectations
  const generateSessionId = useCallback(() => {
    // Generate a simple numeric ID that will match the backend's integer field
    // Using timestamp + random number to ensure uniqueness
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    return `${timestamp}${randomNum}`;
  }, []);

  useEffect(() => {
    if (parsedProfessional && consultationTypeParam) {
      setProfessional(parsedProfessional);
      setConsultationType(consultationTypeParam as 'chat' | 'audio' | 'video');
      const calculatedAmount = calculateAmount(parsedProfessional, consultationTypeParam);
      setAmount(calculatedAmount);
    }
  }, [parsedProfessional, consultationTypeParam, calculateAmount]);

  useEffect(() => {
    const valid = validatePhone(phone);
    setIsPhoneValid(valid);
  }, [phone]);

  const validatePhone = useCallback((phone: string): boolean => {
    const cleaned = phone.replace(/\s+/g, '');
    const kenyaRegex = /^0?7[0-9]{8}$/;
    return kenyaRegex.test(cleaned);
  }, []);

  const formatPhone = useCallback((phone: string): string => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^0/, '');
    return `254${cleaned}`;
  }, []);

  const navigateToSuccess = useCallback((result: any, phoneNumber: string, sessionId: string, professional: Professional) => {
    if (isNavigating.current) {
      return;
    }

    isNavigating.current = true;
    
    const sessionData = {
      session_id: sessionId,
      id: sessionId,
      professional_id: professional.id,
      client_id: 1,
      session_type: consultationType,
      status: 'pending_payment'
    };

    // Navigate to payment-success with delay to ensure modal is closed
    setTimeout(() => {
      router.push({
        pathname: '/payment-success',
        params: {
          transactionId: result.checkout_request_id || result.transaction_id || 'N/A',
          checkoutRequestId: result.checkout_request_id || 'N/A',
          professional: JSON.stringify(professional),
          consultationType: consultationType,
          amount: amount.toString(),
          phone: phoneNumber,
          session: JSON.stringify(sessionData),
          paymentId: result.payment_id || 'N/A',
          merchantRequestId: result.merchant_request_id || 'N/A',
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
        }
      });
    }, 300);

    setTimeout(() => {
      isNavigating.current = false;
    }, 2000);
  }, [consultationType, amount, router]);

  const initiatePaymentProcess = useCallback(async (phoneNumber: string, amount: number, professional: Professional, isRetry = false, retryCount = 0) => {
    try {
      setProcessing(true);
      
      const formattedPhone = formatPhone(phoneNumber);

      // Validation
      if (amount < 1) {
        throw new Error('Amount must be at least 1 KSH');
      }

      if (!formattedPhone.startsWith('2547') || formattedPhone.length !== 12) {
        throw new Error(`Invalid phone format: ${formattedPhone}`);
      }

      // Create session ID - using numeric format
      const sessionId = generateSessionId();

      const payload = {
        phoneNumber: formattedPhone,
        amount: amount,
        professionalId: professional.id,
        sessionId: sessionId,
      };

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);

      try {
        const response = await fetch(`${API_BASE_URL}/mpesa/stk-push/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
        }

        if (response.ok) {
          if (result.success) {
            showCustomAlert(
              'STK Push Sent! 📱',
              `Check your phone ${phoneNumber} for M-Pesa prompt for KSH ${amount}.`,
              [
                {
                  text: 'I\'ve Paid',
                  onPress: () => {
                    setShowConfirmModal(false);
                    
                    // Wait for modal to close, then navigate
                    setTimeout(() => {
                      navigateToSuccess(result, phoneNumber, sessionId, professional);
                    }, 200);
                  }
                },
                {
                  text: 'Not Received?',
                  onPress: () => {
                    setTimeout(() => {
                      if (retryMpesaPaymentRef.current) {
                        retryMpesaPaymentRef.current(phoneNumber, amount, professional, retryCount);
                      }
                    }, 500);
                  }
                }
              ]
            );
          } else {
            const errorMessage = result.message || result.error || 
                               result.response_description || 
                               result.ResultDesc || 
                               'Unknown error from M-Pesa';
            
            // If it's a session ID format error, try with different format
            if (errorMessage.includes('session') || errorMessage.includes('Session') || errorMessage.includes('ID') || errorMessage.includes('Invalid session')) {
              showCustomAlert(
                'Session Format Issue',
                'There seems to be an issue with the session format. Let me try a different approach.',
                [
                  { 
                    text: 'OK', 
                    style: 'cancel',
                  },
                  {
                    text: 'Retry with Different Format',
                    onPress: () => {
                      setTimeout(() => {
                        if (retryMpesaPaymentRef.current) {
                          retryMpesaPaymentRef.current(phoneNumber, amount, professional, retryCount);
                        }
                      }, 500);
                    }
                  }
                ]
              );
            } else {
              showCustomAlert(
                'M-Pesa Error',
                errorMessage,
                [
                  { 
                    text: 'OK', 
                    style: 'cancel',
                  },
                  {
                    text: 'Retry',
                    onPress: () => {
                      setTimeout(() => {
                        if (retryMpesaPaymentRef.current) {
                          retryMpesaPaymentRef.current(phoneNumber, amount, professional, retryCount);
                        }
                      }, 500);
                    }
                  }
                ]
              );
            }
          }
        } else {
          const errorMessage = result.message || result.error || 
                             result.response_description || 
                             `HTTP Error: ${response.status}`;
          throw new Error(errorMessage);
        }
      } catch (fetchError: any) {
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      let userMessage = 'Unable to send M-Pesa prompt. ';
      if (error.name === 'AbortError') {
        userMessage = 'Request timed out. Please check your internet connection.';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        userMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. The server might be busy.';
      } else {
        userMessage += error.message || 'Please try again.';
      }
      
      showCustomAlert(
        'Payment Failed',
        userMessage,
        [
          { 
            text: 'OK', 
            style: 'cancel',
          },
          {
            text: 'Retry',
            onPress: () => {
              setTimeout(() => {
                if (retryMpesaPaymentRef.current) {
                  retryMpesaPaymentRef.current(phoneNumber, amount, professional, retryCount);
                }
              }, 500);
            }
          }
        ]
      );
    } finally {
      setProcessing(false);
    }
  }, [formatPhone, generateSessionId, navigateToSuccess, showCustomAlert]);

  // Create a ref to store the retry function
  const retryMpesaPaymentRef = useRef<(phoneNumber: string, amount: number, professional: Professional, retryCount?: number) => Promise<void>>();

  // Define retryMpesaPayment AFTER initiatePaymentProcess
  const retryMpesaPayment = useCallback(async (phoneNumber: string, amount: number, professional: Professional, retryCount = 0) => {
    if (retryCount > 3) {
      showCustomAlert(
        'Too Many Attempts',
        'Please check with support about the correct session ID format.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    showCustomAlert(
      'Resend M-Pesa Prompt?',
      `Should we try resending the M-Pesa prompt?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        { 
          text: 'Try Again', 
          onPress: async () => {
            setShowConfirmModal(false);
            setTimeout(async () => {
              await initiatePaymentProcess(phoneNumber, amount, professional, true, retryCount + 1);
            }, 100);
          }
        }
      ]
    );
  }, [showCustomAlert, initiatePaymentProcess]);

  // Store retry function in ref
  useEffect(() => {
    retryMpesaPaymentRef.current = retryMpesaPayment;
  }, [retryMpesaPayment]);

  // Handle M-Pesa payment button click
  const handleMpesaPayment = useCallback(() => {
    if (!professional) {
      showCustomAlert('Error', 'Professional information missing', [
        { text: 'OK' }
      ]);
      return;
    }

    if (!isPhoneValid) {
      showCustomAlert('Invalid Phone', 'Please enter a valid Kenyan phone number (07XXXXXXXX)', [
        { text: 'OK' }
      ]);
      return;
    }

    if (processing) {
      return;
    }
    
    showCustomAlert(
      'Confirm M-Pesa Payment',
      `You will receive an M-Pesa prompt on ${phone} for KSH ${amount.toLocaleString()}.\n\nConsultation: ${consultationType.charAt(0).toUpperCase() + consultationType.slice(1)} with ${professional.name}`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        { 
          text: 'Pay Now', 
          onPress: () => {
            setShowConfirmModal(false);
            // Start payment process after a short delay
            setTimeout(() => {
              initiatePaymentProcess(phone, amount, professional);
            }, 100);
          }
        }
      ]
    );
  }, [professional, phone, amount, consultationType, isPhoneValid, processing, initiatePaymentProcess, showCustomAlert]);

  const handleCardPayment = useCallback(() => {
    if (!professional) return;

    showCustomAlert(
      'Card Payment',
      'Card payment integration coming soon. Please use M-Pesa for now.',
      [{ text: 'OK', style: 'default' }]
    );
  }, [professional, showCustomAlert]);

  const handleBankTransfer = useCallback(() => {
    if (!professional) return;

    showCustomAlert(
      'Bank Transfer',
      'Bank transfer option coming soon. Please use M-Pesa for instant payment.',
      [{ text: 'OK', style: 'default' }]
    );
  }, [professional, showCustomAlert]);

  const getConsultationTypeDisplay = useCallback((type: string) => {
    const typeMap = {
      chat: 'Chat Consultation',
      audio: 'Voice Call Consultation', 
      video: 'Video Call Consultation'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  }, []);

  if (!professional) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Complete Payment</Text>
          </View>
          <View style={styles.placeholderView} />
        </View>

        {/* Professional Info */}
        <View style={styles.professionalCard}>
          <View style={styles.professionalInfo}>
            <View style={styles.professionalDetails}>
              <Text style={styles.professionalName}>{professional.name}</Text>
              <Text style={styles.consultationType}>
                {getConsultationTypeDisplay(consultationType)}
              </Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateText}>KSH {professional.rate}/session</Text>
            </View>
          </View>
          {professional.specialization && (
            <Text style={styles.specialization}>{professional.specialization}</Text>
          )}
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount to Pay</Text>
          <Text style={styles.amount}>KSH {amount.toLocaleString()}</Text>
          <Text style={styles.amountNote}>You'll receive M-Pesa prompt on your phone</Text>
        </View>

        {/* M-Pesa Payment Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="phone-portrait" size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>Pay with M-Pesa</Text>
          </View>
          
          <Text style={styles.inputLabel}>Enter your M-Pesa phone number:</Text>
          <TextInput
            style={[styles.input, phone.length > 0 && (isPhoneValid ? styles.validInput : styles.invalidInput)]}
            placeholder="07XXXXXXXX"
            value={phone}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '');
              setPhone(cleaned);
            }}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!processing}
            placeholderTextColor="#9CA3AF"
          />
          
          {phone.length > 0 && !isPhoneValid && (
            <Text style={styles.errorText}>Please enter a valid Kenyan phone number (07XXXXXXXX)</Text>
          )}
          
          <View style={styles.hintContainer}>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text style={styles.hint}>
              You'll receive an M-Pesa prompt on this number. Enter your PIN to complete payment instantly.
            </Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.payBtn, 
              processing && styles.payBtnDisabled,
              (!phone || !isPhoneValid) && styles.payBtnDisabled
            ]} 
            onPress={handleMpesaPayment}
            disabled={processing || !phone || !isPhoneValid}
          >
            {processing ? (
              <View style={styles.payBtnContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.payText}>Sending M-Pesa Prompt...</Text>
              </View>
            ) : (
              <View style={styles.payBtnContent}>
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                <Text style={styles.payText}>Pay KSH {amount.toLocaleString()} with M-Pesa</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <View style={styles.dividerTextContainer}>
            <Text style={styles.dividerText}>OTHER PAYMENT METHODS</Text>
          </View>
          <View style={styles.line} />
        </View>

        {/* Card Payment Option */}
        <TouchableOpacity 
          style={styles.altBtn}
          onPress={handleCardPayment}
          disabled={processing}
        >
          <View style={styles.altBtnContent}>
            <Ionicons name="card" size={24} color="#1F2937" />
            <View style={styles.altTextContainer}>
              <Text style={styles.altText}>Debit/Credit Card</Text>
              <Text style={styles.altSubtext}>Coming soon</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Bank Transfer Option */}
        <TouchableOpacity 
          style={styles.altBtn}
          onPress={handleBankTransfer}
          disabled={processing}
        >
          <View style={styles.altBtnContent}>
            <Ionicons name="business" size={24} color="#1F2937" />
            <View style={styles.altTextContainer}>
              <Text style={styles.altText}>Bank Transfer</Text>
              <Text style={styles.altSubtext}>Coming soon</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={styles.securityText}>Secure payment • Encrypted with SSL • M-Pesa Verified</Text>
        </View>

        {/* Support */}
        <View style={styles.supportInfo}>
          <Text style={styles.supportText}>
            Need help with payment? Call 0700 000 000 or email support@consultpro.com
          </Text>
        </View>

        {/* Cancel */}
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.cancelBtn}
          disabled={processing}
        >
          <Text style={styles.cancelLink}>Cancel Payment</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Modal for Alerts */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowConfirmModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowConfirmModal(false);
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.text.toLowerCase().includes('cancel') && styles.modalCancelButton,
                    button.text.toLowerCase().includes('pay') && styles.modalPayButton,
                  ]}
                  onPress={button.onPress}
                >
                  <Text style={[
                    styles.modalButtonText,
                    button.text.toLowerCase().includes('cancel') && styles.modalCancelButtonText,
                    button.text.toLowerCase().includes('pay') && styles.modalPayButtonText,
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: Math.min(screenWidth * 0.04, 16),
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: Math.max(14, screenWidth * 0.035),
    color: '#6B7280',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: Math.max(14, screenWidth * 0.035),
    fontWeight: '600',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Math.min(screenHeight * 0.02, 16),
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: { 
    fontSize: Math.max(18, screenWidth * 0.045),
    fontWeight: '700', 
    color: '#111827', 
    textAlign: 'center',
  },
  placeholderView: {
    width: 40,
    height: 40,
  },
  professionalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Math.min(screenWidth * 0.04, 16),
    marginBottom: Math.min(screenHeight * 0.02, 16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  professionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: Math.max(16, screenWidth * 0.04),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: Math.max(12, screenWidth * 0.03),
    color: '#6B7280',
    fontWeight: '500',
  },
  rateBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateText: {
    color: '#fff',
    fontSize: Math.max(10, screenWidth * 0.025),
    fontWeight: '700',
  },
  specialization: {
    fontSize: Math.max(12, screenWidth * 0.03),
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  amountCard: { 
    backgroundColor: '#2563EB', 
    borderRadius: 16, 
    padding: Math.min(screenWidth * 0.05, 20), 
    alignItems: 'center', 
    marginBottom: Math.min(screenHeight * 0.025, 20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  amountLabel: { 
    fontSize: Math.max(12, screenWidth * 0.03),
    color: '#BFDBFE', 
    marginBottom: 8,
    fontWeight: '600',
  },
  amount: { 
    fontSize: Math.max(28, screenWidth * 0.07),
    fontWeight: '800', 
    color: '#fff',
    marginBottom: 8,
  },
  amountNote: {
    fontSize: Math.max(10, screenWidth * 0.025),
    color: '#BFDBFE',
    textAlign: 'center',
  },
  section: { 
    marginBottom: Math.min(screenHeight * 0.025, 20) 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Math.min(screenHeight * 0.015, 12),
  },
  sectionTitle: { 
    fontSize: Math.max(16, screenWidth * 0.04),
    fontWeight: '700', 
    color: '#111827', 
    marginLeft: 8,
  },
  inputLabel: {
    fontSize: Math.max(12, screenWidth * 0.03),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: Math.min(screenWidth * 0.04, 12), 
    fontSize: Math.max(14, screenWidth * 0.035),
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    fontWeight: '500',
  },
  validInput: {
    borderColor: '#10B981',
  },
  invalidInput: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: Math.max(10, screenWidth * 0.025),
    marginBottom: 8,
    fontWeight: '500',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Math.min(screenHeight * 0.02, 16),
    backgroundColor: '#F0F9FF',
    padding: Math.min(screenWidth * 0.03, 12),
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  hint: { 
    fontSize: Math.max(10, screenWidth * 0.025),
    color: '#0369A1',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  payBtn: { 
    backgroundColor: '#10B981', 
    padding: Math.min(screenWidth * 0.04, 16), 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
    marginBottom: 8,
  },
  payBtnDisabled: { 
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: { 
    color: '#fff', 
    fontSize: Math.max(14, screenWidth * 0.035),
    fontWeight: '700',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 300,
  },
  modalMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    padding: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalPayButton: {
    backgroundColor: '#10B981',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalCancelButtonText: {
    color: '#374151',
  },
  modalPayButtonText: {
    color: 'white',
  },
  // Rest of styles...
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: Math.min(screenHeight * 0.025, 20) 
  },
  line: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#E5E7EB' 
  },
  dividerTextContainer: {
    paddingHorizontal: Math.min(screenWidth * 0.03, 12),
  },
  dividerText: { 
    fontSize: Math.max(10, screenWidth * 0.025),
    color: '#6B7280', 
    fontWeight: '700',
  },
  altBtn: { 
    backgroundColor: '#fff', 
    padding: Math.min(screenWidth * 0.04, 16), 
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  altBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  altTextContainer: {
    marginLeft: Math.min(screenWidth * 0.03, 12),
  },
  altText: { 
    color: '#111827', 
    fontSize: Math.max(12, screenWidth * 0.03),
    fontWeight: '600',
  },
  altSubtext: {
    color: '#6B7280',
    fontSize: Math.max(10, screenWidth * 0.025),
    marginTop: 2,
  },
  securityInfo: {
	flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Math.min(screenHeight * 0.02, 16),
    marginTop: Math.min(screenHeight * 0.015, 12),
    padding: Math.min(screenWidth * 0.03, 12),
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  securityText: {
    fontSize: Math.max(10, screenWidth * 0.025),
    color: '#065F46',
    marginLeft: 8,
    fontWeight: '500',
  },
  supportInfo: {
    alignItems: 'center',
    marginBottom: Math.min(screenHeight * 0.025, 20),
    padding: Math.min(screenWidth * 0.03, 12),
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  supportText: {
    fontSize: Math.max(10, screenWidth * 0.025),
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelBtn: {
    padding: Math.min(screenWidth * 0.04, 16),
    alignItems: 'center',
    marginTop: 8,
  },
  cancelLink: {
    fontSize: Math.max(14, screenWidth * 0.035),
    color: '#DC2626', 
    fontWeight: '600',
  }
});