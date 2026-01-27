# DirectConnect Mobile App

**"Skip the search, get the answer"**

DirectConnect is a professional mobile application that instantly connects clients to verified professionals across four critical fields: Legal Advice, Mental Health, Career Guidance, and Medical Help.

## Features

### Client Features
- **Quick Call Now**: Instant connection to available professionals in under 2 minutes
- **Category Selection**: Browse by Legal, Mental Health, Career, or Medical
- **Professional Profiles**: View verified experts with ratings, reviews, and experience
- **Multi-Mode Consultation**: Chat, voice call, or video consultation
- **Real-Time Cost Tracking**: See session duration and cost as you consult
- **M-Pesa Payment**: Integrated mobile money payment system
- **Session History**: Track all past consultations and spending
- **Favorites**: Save preferred professionals for quick access
- **Ratings & Reviews**: Rate professionals after each session

### Professional Features
- **Professional Signup**: Apply to join with license verification
- **Dashboard**: Track earnings, sessions, and ratings
- **Online/Offline Toggle**: Control availability status
- **Request Management**: Accept or decline consultation requests
- **Earnings Tracking**: Monitor daily and monthly income
- **Withdrawal System**: Request payouts via M-Pesa or bank

### Custom Icons
- 🩹 Mental Health: Mended heartbreak (healing symbol)
- 🎓 Career Guidance: Graduation cap
- ⚖️ Legal Advice: Scales of justice
- 🩺 Medical Help: Stethoscope

## Tech Stack    BACKEND IN DJANGO
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Language**: TypeScript
- **Styling**: React Native StyleSheet
 ## BACKEND IN DJANGO
 - url: https://github.com/eKidenge/teleconnect.git
## App Structure
```
app/
├── index.tsx                    # Splash screen
├── dashboard.tsx                # Main home screen
├── category/[id].tsx           # Category professionals list
├── professional/[id].tsx       # Professional profile
├── session.tsx                 # Active consultation
├── quick-connect.tsx           # Quick matching
├── session-complete.tsx        # Session summary
├── payment.tsx                 # Payment screen
├── payment-success.tsx         # Payment confirmation
├── history.tsx                 # Session history
├── favorites.tsx               # Saved professionals
├── settings.tsx                # App settings
├── about.tsx                   # About DirectConnect
├── professional-signup.tsx     # Professional application
├── professional-pending.tsx    # Application status
└── professional-dashboard.tsx  # Professional earnings

components/
├── CategoryCard.tsx            # Category display card
├── ProfessionalCard.tsx        # Professional listing card
├── QuickCallButton.tsx         # Animated quick call button
└── BottomNav.tsx               # Bottom navigation

constants/
└── data.ts                     # Mock data for categories & professionals
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on device:
- Scan QR code with Expo Go app (iOS/Android)
- Press 'i' for iOS simulator
- Press 'a' for Android emulator

## Key Screens

### Splash Screen
- DC logo with DirectConnect branding
- Auto-navigates to dashboard after 3 seconds

### Dashboard
- Welcome message
- Quick Call Now button with pulse animation
- 4 category cards with availability indicators
- Stats display (2,500+ experts, 50k+ consultations)
- Bottom navigation

### Professional Profile
- Verified badge
- Rating and reviews
- Years of experience
- Rate per minute
- Connect options (chat/call/video)

### Active Session
- Real-time timer
- Running cost calculator
- Chat interface with message history
- End session button

### Payment
- M-Pesa integration
- Card payment option
- Amount display
- STK push notification

## Business Model
- Pay-per-minute pricing
- Commission: 5% per transaction
- Rates: KSH 80-120 per minute depending on category
- Transparent pricing with no hidden fees

## Contact
- Email: support@directconnect.co.ke
- Phone: +254 700 123 456
- Website: www.directconnect.co.ke

© 2025 DirectConnect Kenya. All rights reserved.
