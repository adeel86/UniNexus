# UniNexus Mobile App

React Native mobile application for UniNexus, built with Expo.

## Features

- 🔐 Email/Password Authentication (Firebase)
- 📱 iOS and Android Support
- 🎨 Gen Z-Inspired Gradient UI
- 🔄 Persistent Authentication
- 📲 Demo Account Support

## Prerequisites

- Node.js 20+ installed
- iOS Simulator (macOS only) or Android Emulator
- Expo Go app (for physical device testing)

## Installation

```bash
cd mobile
npm install
```

## Running the App

### On iOS Simulator (macOS only)

```bash
npm run ios
```

### On Android Emulator

1. Start your Android emulator
2. Run:

```bash
npm run android
```

### On Physical Device

1. Install Expo Go from App Store or Google Play
2. Run:

```bash
npm start
```

3. Scan the QR code with your device

### On Web (for testing)

```bash
npm run web
```

## Demo Accounts

You can log in with these demo accounts:

- **Student**: `demo.student@uninexus.app` / `demo123`
- **Teacher**: `demo.teacher@uninexus.app` / `demo123`
- **University Admin**: `demo.university@uninexus.app` / `demo123`
- **Industry Professional**: `demo.industry@uninexus.app` / `demo123`
- **Master Admin**: `demo.admin@uninexus.app` / `demo123`

Note: For demo accounts to work properly, make sure the backend server is running with `DEV_AUTH_ENABLED=true`.

## Project Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── firebase.ts          # Firebase configuration
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context
│   └── screens/
│       ├── LoginScreen.tsx      # Login screen
│       ├── SignUpScreen.tsx     # Sign up screen
│       └── HomeScreen.tsx       # Home screen (after login)
├── App.tsx                       # Main app component
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

## Backend API Configuration

The mobile app connects to the UniNexus backend API for authentication and data. 

### Development Mode

When running locally, the app connects to `http://localhost:5000` by default. Make sure the backend server is running with:

```bash
# From the root directory
npm run dev
```

The backend uses `DEV_AUTH_ENABLED=true` to allow demo accounts to work without Firebase setup.

### Custom Backend URL

To connect to a different backend URL, set the environment variable:

```bash
# Create .env file in mobile/ directory
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

## Building for Production

### iOS (macOS only)

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## Troubleshooting

### "Network request failed" error
- Make sure the backend server is running on port 5000
- Check that `EXPO_PUBLIC_API_URL` is set correctly in `.env`
- Verify you can access the backend at http://localhost:5000 in your browser

### App doesn't start on simulator
- Make sure simulator is running
- Try clearing cache: `npm start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Authentication not persisting
- The app uses AsyncStorage for persistence
- Check that `@react-native-async-storage/async-storage` is installed

## Tech Stack

- **Framework**: React Native (via Expo)
- **Navigation**: React Navigation 6
- **Authentication**: Backend API (UniNexus server)
- **Storage**: AsyncStorage for local persistence
- **UI**: React Native built-in components + LinearGradient
- **Language**: TypeScript
- **API Client**: Fetch API with custom wrapper

## Future Enhancements

- Social feed with posts and comments
- Gamified profile with badges
- AI-powered career guidance
- Course discussions
- Leaderboards and challenges
- Real-time notifications
- Push notifications

## License

MIT
