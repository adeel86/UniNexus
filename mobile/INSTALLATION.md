# UniNexus Mobile App - Installation Guide

## Prerequisites

Before building the mobile app, ensure you have:

1. **Node.js** (v18 or higher)
2. **Expo CLI** - Install globally: `npm install -g expo-cli`
3. **EAS CLI** - Install globally: `npm install -g eas-cli`
4. **Expo Account** - Create at https://expo.dev

## Development Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure API Endpoint

Edit `mobile/src/config/api.ts` and update the `API_URL` to point to your backend server:

```typescript
export const API_URL = 'https://your-backend-url.replit.app';
```

### 3. Start Development Server

```bash
npx expo start
```

Use the Expo Go app on your phone to scan the QR code and test the app.

## Building for Production

### Android APK

1. **Login to EAS**
   ```bash
   eas login
   ```

2. **Configure Project ID**
   - Run `eas build:configure` to set up your project
   - This will update `app.json` with your EAS project ID

3. **Build APK (Preview)**
   ```bash
   npm run build:android
   # or
   eas build --platform android --profile preview
   ```

4. **Build AAB (Production)**
   ```bash
   eas build --platform android --profile production
   ```

### iOS IPA

1. **Apple Developer Account Required**
   - Ensure you have an Apple Developer account ($99/year)
   - Set up App Store Connect app

2. **Configure iOS Credentials**
   - EAS will prompt for credentials during first build
   - Or set up manually in `eas.json`

3. **Build IPA**
   ```bash
   npm run build:ios
   # or
   eas build --platform ios --profile preview
   ```

## Push Notifications Setup

### Android (Firebase Cloud Messaging)

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package name `com.uninexus.mobile`
3. Download `google-services.json` and place in `mobile/` folder
4. FCM is automatically configured through Expo

### iOS (APNs)

1. Configure push notifications in Apple Developer Portal
2. Create APNs Key and upload to Expo
3. Enable Push Notifications capability in your app

## Installing the App

### Android

1. After build completes, download the APK from EAS dashboard
2. Transfer APK to device
3. Enable "Install from Unknown Sources" if prompted
4. Install the APK

### iOS

1. For development: Use TestFlight or ad-hoc distribution
2. Upload IPA to TestFlight via App Store Connect
3. Invite testers through TestFlight

## Troubleshooting

### Common Issues

1. **Build fails with dependency errors**
   ```bash
   rm -rf node_modules
   npm install
   npx expo-doctor
   ```

2. **Push notifications not working**
   - Ensure physical device (simulators don't support push)
   - Verify EAS project ID in app.json
   - Check Firebase/APNs configuration

3. **Network errors**
   - Verify API_URL is accessible
   - Check CORS settings on backend
   - Ensure HTTPS is used for production

### Getting Help

- Expo Documentation: https://docs.expo.dev
- EAS Build Guide: https://docs.expo.dev/build/introduction/
- Join Expo Discord for community support
