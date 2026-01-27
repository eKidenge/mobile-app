from django.urls import path, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from quickconnect import views
# ✅ ADD THESE IMPORT STATEMENTS
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
# TO:
from quickconnect.views import (
    VoiceCallView, 
    CallAcceptView, 
    CallEndView, 
    CallQualityView,
    ProfessionalAvailabilityView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('', views.home, name='home'),
    
    # AUTHENTICATION ROUTES
    path('api/register/', views.api_register, name='api-register'),
    path('api/login/', views.api_login, name='api-login'),
    
    # USER PROFILE & FAVORITES ROUTES
    path('api/user/profile/', views.user_profile, name='user-profile'),
    path('api/user/favorites/', views.user_favorites, name='user-favorites'),
    path('api/user/favorites/<int:professional_id>/', views.manage_favorites, name='manage-favorites'),
    
    # PROFESSIONAL ROUTES
    path('api/professionals/', views.professional_list, name='professional-list'),
    path('api/professionals/create/', views.create_professional_profile, name='create-professional'),
    path('api/professionals/register/', views.create_professional_direct, name='register-professional'),
    path('api/professionals/<int:professional_id>/', views.professional_detail_api, name='professional-detail'),
    path('api/professional/dashboard/<int:id>/', views.professional_dashboard, name='professional-dashboard'),
    
    # PROFESSIONAL STATUS ROUTES
    path('api/professional/profile/', views.professional_profile, name='professional-profile'),
    path('api/professional/profile/update/<int:professional_id>/', views.update_professional_profile, name='update-professional-profile'),
    path('api/professional/dashboard-stats/<int:professional_id>/', views.professional_dashboard_stats, name='professional-dashboard-stats'),
    path('api/professional/pending-requests/<int:professional_id>/', views.professional_pending_requests, name='professional-pending-requests'),
    path('api/professional/earnings/<int:professional_id>/', views.professional_earnings, name='professional-earnings'),
    path('api/professional/sessions/<int:professional_id>/', views.professional_sessions, name='professional-sessions'),
    path('api/professional/online-status/<int:professional_id>/', views.update_professional_online_status, name='update-professional-online-status'),
    path('api/professional/availability/<int:professional_id>/', views.update_professional_availability, name='update-professional-availability'),
    
    # SESSION ROUTES
    path('api/sessions/history/', views.session_history, name='session-history'),
    path('api/session/accept/<int:session_id>/', views.accept_session_request, name='accept-session-request'),
    path('api/session/decline/<int:session_id>/', views.decline_session_request, name='decline-session-request'),

    # ADMIN DASHBOARD ROUTES
    path('api/admin/dashboard/stats/', views.admin_dashboard_stats, name='admin-dashboard-stats'),
    path('api/admin/dashboard/revenue-chart/', views.revenue_chart_data, name='revenue-chart'),
    path('api/admin/dashboard/recent-activity/', views.recent_activity, name='recent-activity'),
    
    # ADMIN ANALYTICS & TRANSACTIONS
    path('api/admin/analytics/', views.admin_analytics, name='admin-analytics'),
    path('api/admin/transactions/', views.admin_transactions, name='admin-transactions'),
    
    # ADMIN – PROFESSIONAL MANAGEMENT
    path('api/admin/professionals/pending/', views.pending_professionals, name='pending-professionals'),
    path('api/admin/professionals/<int:professional_id>/approve/', views.approve_professional, name='approve-professional'),
    path('api/admin/professionals/<int:professional_id>/reject/', views.reject_professional, name='reject-professional'),
    path('api/admin/professionals/all/', views.all_professionals, name='all-professionals'),
    path('api/admin/professionals/<int:professional_id>/detail/', views.professional_detail_api, name='admin-professional-detail'),
    
    # ADMIN – USER MANAGEMENT
    path('api/admin/users/', views.users_list, name='users-list'),
    path('api/admin/users/<int:user_id>/', views.user_detail, name='user-detail'),
    path('api/admin/users/<int:user_id>/status/', views.update_user_status, name='update-user-status'),
    path('api/admin/users/<int:user_id>/role/', views.update_user_role, name='update-user-role'),
    path('api/admin/users/<int:user_id>/delete/', views.delete_user, name='delete-user'),
    
    # ADMIN – ANALYTICS
    path('api/admin/analytics/users/', views.user_analytics, name='user-analytics'),
    path('api/admin/analytics/sessions/', views.session_analytics, name='session-analytics'),
    path('api/admin/analytics/financial/', views.financial_analytics, name='financial-analytics'),

    # ADMIN – CATEGORIES
    path('api/admin/categories/', views.admin_categories_list, name='categories-list'),
    path('api/admin/categories/<int:category_id>/update/', views.update_category, name='update-category'),
    path('api/admin/categories/<int:category_id>/delete/', views.delete_category, name='delete-category'),

    # PUBLIC – CATEGORIES
    path('api/categories/', views.public_categories_list, name='public-categories-list'),

    # FILE UPLOAD ENDPOINTS
    path('api/upload/license/', views.upload_license_file, name='upload-license'),
    path('api/upload/profile-image/', views.upload_profile_image, name='upload-profile-image'),
    
    # SESSION & CHAT ROUTES
    path('api/sessions/create/', views.create_session, name='create-session'),
    path('api/sessions/<int:session_id>/messages/', views.get_session_messages_api, name='session-messages'),
    path('api/sessions/<int:session_id>/end/', views.end_session_api, name='end-session'),
    path('api/sessions/<int:session_id>/', views.get_session_detail, name='session-detail'),
    path('api/messages/send/', views.send_message_api, name='send-message'),
    
    # CALL FUNCTIONALITY ROUTES
    path('api/video/initiate/', views.initiate_video_call, name='initiate-video'),
    path('api/video/join/<int:session_id>/', views.join_video_call, name='join-video'),
    path('api/video/end/<int:session_id>/', views.end_video_call, name='end-video'),
    
    path('api/voice/initiate/', views.initiate_voice_call, name='initiate-voice'),
    path('api/voice/end/<int:session_id>/', views.end_voice_call, name='end-voice'),
    
    # NOTIFICATION ROUTES
    path('api/notifications/', views.get_notifications, name='get-notifications'),
    path('api/notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark-notification-read'),
    path('api/notifications/read-all/', views.mark_all_notifications_read, name='mark-all-notifications-read'),
    
    # ADMIN PROFESSIONALS API ROUTE
    path('api/admin/professionals/', views.admin_professionals_api, name='admin-professionals-api'),
    
    # PROFESSIONAL APPLICATION STATUS ENDPOINTS
    path('api/professionals/<int:professional_id>/application-status/', views.professional_application_status, name='professional-application-status'),
    path('api/professionals/8/application-status/', views.professional_application_status_fallback, name='professional-application-status-fallback'),
    
    # PROFESSIONAL AVAILABILITY CHECK
    path('api/check-professional-availability/<int:professional_id>/', views.check_professional_availability_api, name='check-professional-availability-api'),
    
    # USER SETTINGS ENDPOINTS
    path('api/user/settings/', views.user_settings_api, name='user-settings-api'),
    path('api/user/<int:user_id>/settings/', views.user_settings_by_id, name='user-settings-by-id'),
    path('api/settings/', views.global_settings, name='global-settings'),
    
    # SESSION MANAGEMENT ENDPOINTS
    path('api/sessions/', views.user_sessions_list, name='user-sessions-list'),
    path('api/user/sessions/', views.user_sessions_list, name='user-sessions-list-alt'),
    path('api/session-history/', views.session_history_api, name='session-history-api'),
    
    # FAVORITES MANAGEMENT
    path('api/manage-favorites/<int:professional_id>/', views.manage_favorites_api, name='manage-favorites-api'),
    
    # DEBUG ROUTES
    path('api/debug/professionals/', views.debug_all_professionals, name='debug-professionals'),
    path('api/debug/sessions/', views.debug_all_sessions, name='debug-sessions'),
    path('debug/professionals-direct/', views.debug_professionals_direct, name='debug-professionals-direct'),
    
    # NEW ENDPOINTS FOR REACT NATIVE APP
    path('api/professionals/category/<str:category>/', views.professionals_by_category, name='professionals-by-category'),
    path('api/professionals/search/', views.search_professionals, name='search-professionals'),
    path('api/professionals/<int:professional_id>/availability/', views.check_professional_availability, name='check-professional-availability'),
    
    # LOCKING MECHANISM
    path('api/locks/acquire/', views.acquire_lock, name='acquire-lock'),
    path('api/locks/release/', views.release_lock, name='release-lock'),

    # PAYMENT PROCESSING ENDPOINTS
    path('api/mpesa/stk-push/', views.initiate_mpesa_stk_push, name='mpesa-stk-push'),
    path('api/mpesa/callback/', views.mpesa_callback, name='mpesa-callback'),
    path('api/payments/record/', views.record_payment, name='record-payment'),
    path('api/payments/verify/<str:transaction_id>/', views.verify_payment, name='verify-payment'),
    path('api/payments/history/', views.payment_history, name='payment-history'),
    path('api/mpesa/status/<str:checkout_request_id>/', views.check_mpesa_payment_status, name='mpesa-status'),

    # SESSION MANAGEMENT ENDPOINTS
    path('api/sessions/rate/', views.rate_session, name='rate-session'),
    path('api/sessions/<int:session_id>/complete/', views.complete_session, name='complete-session'),
    path('api/sessions/<int:session_id>/update/', views.update_session_status, name='update-session-status'),

    # CALL MANAGEMENT ENDPOINTS
    path('api/calls/initiate-voice/', views.initiate_voice_call_api, name='initiate-voice-call-api'),
    path('api/calls/initiate-video/', views.initiate_video_call_api, name='initiate-video-call-api'),
    path('api/calls/<int:call_id>/status/', views.update_call_status, name='update-call-status'),

    # NOTIFICATION ENDPOINTS
    path('api/notifications/send/', views.send_notification, name='send-notification'),
    path('api/notifications/receipt/', views.send_receipt_notification, name='send-receipt-notification'),

    # RECEIPT & DOCUMENT GENERATION
    path('api/receipts/generate/', views.generate_receipt, name='generate-receipt'),
    path('api/receipts/<str:receipt_number>/', views.get_receipt, name='get-receipt'),
    path('api/receipts/user/', views.user_receipts, name='user-receipts'),

    # CLIENT DASHBOARD ENDPOINTS
    path('api/client/dashboard/stats/', views.client_dashboard_stats, name='client-dashboard-stats'),
    path('api/client/sessions/active/', views.client_active_sessions, name='client-active-sessions'),
    path('api/client/sessions/completed/', views.client_completed_sessions, name='client-completed-sessions'),

    # REAL-TIME AVAILABILITY CHECK
    path('api/professionals/<int:professional_id>/real-time-availability/', views.real_time_availability, name='real-time-availability'),

    # CATEGORY-BASED PROFESSIONAL MATCHING
    path('api/categories/<int:category_id>/professionals/', views.category_professionals, name='category-professionals'),
    path('api/categories/with-professionals/', views.categories_with_professionals, name='categories-with-professionals'),

    # PAYMENT GATEWAY INTEGRATION
    path('api/payments/card/initiate/', views.initiate_card_payment, name='initiate-card-payment'),
    path('api/payments/bank/initiate/', views.initiate_bank_transfer, name='initiate-bank-transfer'),
    path('api/payments/<int:payment_id>/status/', views.payment_status, name='payment-status'),

    # SESSION VERIFICATION ENDPOINTS
    path('api/sessions/<int:session_id>/verify/', views.verify_session_access, name='verify-session-access'),
    path('api/sessions/<int:session_id>/participants/', views.get_session_participants, name='get-session-participants'),

    # AI MATCHING ALGORITHM ENDPOINTS
    path('api/matching/algorithm/', views.run_matching_algorithm, name='run-matching-algorithm'),
    path('api/matching/scores/', views.calculate_matching_scores, name='calculate-matching-scores'),

    # USER PREFERENCES & SETTINGS
    path('api/user/preferences/', views.user_preferences, name='user-preferences'),
    path('api/user/notifications/settings/', views.notification_settings, name='notification-settings'),

    # SUPPORT & HELP ENDPOINTS
    path('api/support/tickets/', views.support_tickets, name='support-tickets'),
    path('api/support/contact/', views.contact_support, name='contact-support'),

    # ANALYTICS & REPORTING
    path('api/analytics/session-metrics/', views.session_metrics, name='session-metrics'),
    path('api/analytics/payment-metrics/', views.payment_metrics, name='payment-metrics'),
    path('api/analytics/user-engagement/', views.user_engagement, name='user-engagement'),

    # HEALTH CHECK
    path('api/health/', views.health_check, name='health_check'),
    
    # ✅ VOICE CALL ENDPOINTS - INSERTED DIRECTLY
    path('api/voice-calls/initiate/', VoiceCallView.as_view(), name='initiate-call'),
    path('api/voice-calls/<int:call_id>/accept/', CallAcceptView.as_view(), name='accept-call'),
    path('api/voice-calls/<int:session_id>/end/', CallEndView.as_view(), name='end-call'),
    path('api/voice-calls/<int:session_id>/quality/', CallQualityView.as_view(), name='call-quality'),
    path('api/voice-calls/professionals/<int:professional_id>/availability/', ProfessionalAvailabilityView.as_view(), name='professional-availability'),

    # Call Management added on 25th Nov 2025 2:42PM
    # Call Management
    path('calls/initiate/', views.VoiceCallView.as_view(), name='initiate_call'),
    path('calls/<str:call_id>/accept/', views.CallAcceptView.as_view(), name='accept_call'),
    path('calls/<str:session_id>/end/', views.CallEndView.as_view(), name='end_call'),
    path('calls/<str:session_id>/quality/', views.CallQualityView.as_view(), name='call_quality'),
    
    # Professional Management
    path('professionals/<str:professional_id>/availability/', views.ProfessionalAvailabilityView.as_view(), name='professional_availability'),
    
    # Notifications
    path('notifications/call/', views.CallNotificationView.as_view(), name='call_notification'),
    
    # Recordings
    path('recordings/upload/', views.RecordingUploadView.as_view(), name='upload_recording'),

    # 25TH NOVEMBER NIGHT 2025
    # ✅ SESSION MANAGEMENT ENDPOINTS
    path('api/sessions/<uuid:session_id>/activate/', views.activate_session, name='activate-session'),
    path('api/sessions/<uuid:session_id>/stats/', views.session_stats, name='session-stats'),
    path('api/sessions/<uuid:session_id>/messages/since/', views.get_messages_since, name='get-messages-since'),
    path('api/sessions/<uuid:session_id>/status/', views.session_status, name='session-status'),
    path('api/sessions/<uuid:session_id>/verify-access/', views.verify_session_access, name='verify-session-access'),
    path('api/sessions/<uuid:session_id>/participants/', views.session_participants, name='session-participants'),
    # ✅ PROFESSIONAL SESSION ENDPOINTS
    path('api/professional/active-sessions/', views.professional_active_sessions, name='professional-active-sessions'),
    path('api/professional/session-requests/', views.professional_session_requests, name='professional-session-requests'),
    # ✅ CALL MANAGEMENT ENDPOINTS
    path('api/calls/<uuid:session_id>/join/', views.join_call, name='join-call'),
    path('api/calls/<uuid:session_id>/leave/', views.leave_call, name='leave-call'),

    # ✅ SESSION FEEDBACK & RATING
    path('api/sessions/<uuid:session_id>/rate/', views.rate_session, name='rate-session'),
    path('api/sessions/<uuid:session_id>/feedback/', views.session_feedback, name='session-feedback'),
    # 25TH NOVEMBER NIGHT 2025 END

# 27TH NOVEMBER NIGHT 2025 AT 9:10 AM
    path('api/voice/initiate/', views.initiate_voice_call_api, name='initiate-voice-call-api'),
    path('api/sessions/<int:session_id>/with-messages/', views.get_session_with_messages, name='session-with-messages'),
    path('api/sessions/<int:session_id>/send-message/', views.send_session_message, name='send-session-message'),
    # ✅ CORRECT - Use the actual function name
    path('api/voice/end/<int:session_id>/', views.end_voice_call, name='end-voice-call'),
# 29TH NOVEMBER NIGHT 2025 AT 11:13 PM
    # In urls.py - temporarily replace the voice initiate endpoint
    path('api/voice/initiate/', views.debug_initiate_voice_call, name='debug-initiate-voice'),
    # TEST ENDPOINTS
    path('api/test/call-log-creation/', views.test_call_log_creation, name='test-call-log-creation'),
    path('api/test/voice-call-flow/', views.test_voice_call_flow, name='test-voice-call-flow'),
    # VOICE CALL MANAGEMENT
    path('api/voice/initiate/', views.initiate_voice_call, name='initiate-voice'),
    path('api/voice/end/<int:session_id>/', views.end_voice_call, name='end-voice'),  # ✅ FIXED
     # Push token management - NO AUTHENTICATION
    path('api/professional/update-push-token/<str:professional_id>/', 
         views.update_professional_push_token, name='update-push-token'),
    
    # 🔥 MISSING ENDPOINTS TO FIX 404 ERRORS - ADDED BELOW
    
    # PAYMENT & RECEIPT ENDPOINTS (Missing from your logs)
    path('api/record_payment/', views.record_payment, name='record-payment-legacy'),
    path('api/send_receipt_notification/', views.send_receipt_notification, name='send-receipt-notification'),
    
    # SESSION STATUS ENDPOINTS (Missing from your logs)
    path('api/update_session_status/<int:session_id>/', views.update_session_status, name='update-session-status-legacy'),
    path('api/get_session_detail/<int:session_id>/', views.get_session_detail, name='get-session-detail'),
    
    # NOTIFICATION ENDPOINTS (Missing from your logs)
    path('api/send_notification/', views.send_notification, name='send-notification-legacy'),
    
    # VOICE CALL ENDPOINTS (Multiple variations from your logs)
    path('api/initiate_voice_call/', views.initiate_voice_call_api, name='initiate-voice-call-legacy'),
    path('api/voice-call/initiate/', views.initiate_voice_call_api, name='voice-call-initiate'),
    path('api/calls/voice/', views.initiate_voice_call_api, name='calls-voice'),
    path('api/audio-call/', views.initiate_voice_call_api, name='audio-call'),
    
    # PAYMENT RECORDING ENDPOINT (From your logs)
    path('api/payments/record/', views.record_payment, name='payments-record'),
    
    # 1ST DECEMBER 2025 - RESERVATION ENDPOINTS TO FIX 404 ERRORS
    # Reservation endpoints
    path('api/reserve-professional/', views.reserve_professional, name='reserve_professional'),
    path('api/reservations/', views.create_reservation, name='create_reservation'),
    path('api/assign-professional/', views.assign_professional, name='assign_professional'),
    path('api/sessions/reserve/', views.reserve_session, name='reserve_session'),
    path('api/sessions/create/', views.create_session_endpoint, name='create_session'),
    path('api/reservations/fallback/', views.fallback_reservation, name='fallback_reservation'),
    
    # Category endpoints
    path('api/professionals-by-category/<str:category>/', views.professionals_by_category, name='professionals_by_category'),
    
    # Reservation management
    path('api/reservations/<int:reservation_id>/status/', views.reservation_status, name='reservation_status'),
    path('api/reservations/<int:reservation_id>/cancel/', views.cancel_reservation, name='cancel_reservation'),
    path('api/debug/reservation/', views.debug_reservation, name='debug_reservation'),

    # Professional incoming calls check
    path('api/professional/incoming-calls/<int:professional_id>/', 
         views.professional_incoming_calls, name='professional-incoming-calls'),
    
    # Push notification token update (ensure it's there)
    path('api/professional/update-push-token/<str:professional_id>/', 
         views.update_professional_push_token, name='update-push-token'),
    # Add these to your urls.py:
    # Add these to your existing urlpatterns:
    
    # Professional call management
    path('api/professional/incoming-calls/<int:professional_id>/', 
         views.professional_incoming_calls, name='professional-incoming-calls'),
    path('api/professional/update-push-token/<str:professional_id>/', 
         views.update_professional_push_token, name='update-push-token'),
    path('api/professional/real-time-availability/<int:professional_id>/', 
         views.real_time_availability, name='real-time-availability'),
    path('api/professional/session-requests/', 
         views.professional_session_requests, name='professional-session-requests'),
    path('api/professional/active-sessions/', 
         views.professional_active_sessions, name='professional-active-sessions'),
    path('api/update-push-token/', 
         views.update_push_token, name='update-push-token'),
    
    # Also ensure these exist (check if they're already in your urls):
    path('api/professional/dashboard-stats/<int:professional_id>/', 
         views.professional_dashboard_stats, name='professional-dashboard-stats'),
    path('api/professional/pending-requests/<int:professional_id>/', 
         views.professional_pending_requests, name='professional-pending-requests'),
    path('api/professional/online-status/<int:professional_id>/', 
         views.update_professional_online_status, name='update-professional-online-status'),
    path('api/professional/availability/<int:professional_id>/', 
         views.update_professional_availability, name='update-professional-availability'),
    path('api/admin/fix-categories/', views.admin_fix_categories, name='admin_fix_categories'),
    # ... your existing URLs ...
    path('api/fix-categories/', views.fix_professional_categories, name='fix_categories'),
    path('api/admin/clear-categories/', views.clear_professional_categories, name='clear_categories'),
    path('api/professionals-by-category-id/<int:category_id>/', 
         views.professionals_by_category_id, 
         name='professionals_by_category_id'),
    path('api/call/initiate/<int:professional_id>/', 
         views.initiate_call_to_professional, 
         name='initiate_call_to_professional'),

    # Call notifications       FOR DOUBLE CHECKING NOTIFICATIONS ADDED ON 6TH 2025
    path('api/call/initiate/<int:professional_id>/', views.initiate_call_to_professional, name='initiate_call'),
    path('api/notifications/unread/', views.get_unread_notifications, name='get_unread_notifications'),
    path('api/notifications/<int:notification_id>/read/', views.mark_notification_as_read, name='mark_notification_as_read'),
# ADDED TO HANDLE VIDEO CALLS ON 7TH DEC
    # Video Call Endpoints
    path('api/video/initiate/', views.InitiateVideoCallAPIView.as_view(), name='initiate_video_call'),
    path('api/video/<str:session_id>/start/', views.StartVideoCallAPIView.as_view(), name='start_video_call'),
    path('api/video/<str:session_id>/end/', views.EndVideoCallAPIView.as_view(), name='end_video_call'),
    path('api/video/<str:session_id>/quality/', views.UpdateVideoCallQualityAPIView.as_view(), name='update_video_quality'),
    path('api/video/<str:session_id>/rate/', views.SubmitVideoCallRatingAPIView.as_view(), name='submit_video_rating'),
    path('api/video/<str:session_id>/', views.GetVideoSessionDetailsAPIView.as_view(), name='get_video_session'),
    
    # Existing endpoints
    path('api/chat_messages/send/', views.SendChatMessageAPIView.as_view(), name='send_chat_message'),
    path('api/chat_messages/<str:session_id>/', views.GetChatMessagesAPIView.as_view(), name='get_chat_messages'),
#---------------------------------------------------------------------------------------------------------------
# KASARANI NAIROBI KENYA UPDATE TO HANDLE VOICE CALLS 8TH DECEMBER 2025
#---------------------------------------------------------------------------------------------------------------
    # Add these to your existing urlpatterns:
    # Voice call endpoints (EXACT MATCH for your frontend)
    path('api/voice/initiate/', views.initiate_voice_call_api, name='initiate-voice-call'),
    path('api/voice/end/<int:session_id>/', views.end_voice_call, name='end-voice-call'),
    # Payment endpoints
    path('api/record_payment/', views.record_payment, name='record-payment'),
    path('api/payments/record/', views.record_payment, name='payments-record'),
    # Session endpoints
    path('api/update_session_status/<int:session_id>/', views.update_session_status, name='update-session-status'),
    path('api/get_session_detail/<int:session_id>/', views.get_session_detail, name='get-session-detail'),
    # Notification endpoints
    path('api/send_notification/', views.send_notification, name='send-notification'),
    path('api/send_receipt_notification/', views.send_receipt_notification, name='send-receipt-notification'),
    # Alternative voice call endpoints (from your error logs)
    path('api/initiate_voice_call/', views.initiate_voice_call_api, name='initiate-voice-call-alt'),
    path('api/voice-call/initiate/', views.initiate_voice_call_api, name='voice-call-initiate'),
    path('api/calls/voice/', views.initiate_voice_call_api, name='calls-voice'),
    path('api/audio-call/', views.initiate_voice_call_api, name='audio-call'),
    # Professional availability
    path('api/professionals/<int:professional_id>/availability/', views.check_professional_availability, name='professional-availability'),
    # In urls.py
    path('api/user/favorites/', views.user_favorites, name='user-favorites'),
    path('api/user/favorites/<int:professional_id>/', views.manage_favorites, name='manage-favorites'),
    path('api/debug/favorites-test/', views.test_user_favorites, name='test-user-favorites'),
    # ADD THESE AT THE END OF YOUR urlpatterns, BEFORE the static files section:

# ========================
# 🔥 MISSING ENDPOINTS FROM YOUR ERROR LOGS
# ========================

# 2. Chat messages endpoint (your logs show: Unauthorized: /api/chat_messages/229/)
# Note: This endpoint exists but returns 401 - needs authentication
    path('api/chat_messages/<int:session_id>/', views.get_chat_messages_api, name='get-chat-messages'),

# 3. Alternative session endpoints (your logs show 404 for these)
    path('api/session/<int:session_id>/', views.get_session_detail, name='session-detail-alt'),
    path('api/sessions/<int:session_id>/detail/', views.get_session_detail, name='session-detail-extended'),

# 4. Fix the duplicate endpoints issue - ensure these exist with proper views:
# (Your current setup might have duplicate names or missing implementations)
    # Add this to fix 404 for /api/favorites/
    path('api/favorites/', views.user_favorites, name='favorites-alias'),
    path('api/favorites', views.user_favorites, name='favorites-alias-no-slash'),

# ========================
# ADD THESE VIEWS TO views.py
# ========================
]

# SERVE MEDIA AND STATIC FILES IN DEVELOPMENT
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
