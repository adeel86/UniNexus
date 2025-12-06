# UniNexus Mobile App

React Native mobile application for UniNexus - a Gen Z social learning and engagement platform. Built with Expo SDK 54 and React Native 0.81.

## Features

### Core Features
- Social Feed with posts, comments, reactions
- Real-time messaging/chat
- Course management with AI tutor integration
- Groups and networking
- Challenges with leaderboards
- Profile with CV/resume export

### Authentication
- Email/Password Authentication
- Role-based access (student, teacher, university, university_admin, industry, master_admin)
- Demo account support for testing
- Persistent login with AsyncStorage

### Platform Support
- iOS (Simulator + Device)
- Android (Emulator + Device)
- Expo Go for quick testing

## Prerequisites

- Node.js 20+ installed
- iOS Simulator (macOS only) or Android Emulator
- Expo Go app (for physical device testing)
- Backend server running on port 5000

## Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start the development server
npm start
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

| Role | Email | Password |
|------|-------|----------|
| Student | demo.student@uninexus.app | demo123 |
| Teacher | demo.teacher@uninexus.app | demo123 |
| University Admin | demo.university@uninexus.app | demo123 |
| Industry Professional | demo.industry@uninexus.app | demo123 |
| Master Admin | demo.admin@uninexus.app | demo123 |

Note: For demo accounts to work properly, make sure the backend server is running with `DEV_AUTH_ENABLED=true`.

## Project Structure

```
mobile/
├── App.tsx                           # Main app with navigation stack
├── app.json                          # Expo configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── assets/                           # Static assets (icons, images)
└── src/
    ├── config/
    │   ├── api.ts                    # API client with auth headers
    │   ├── theme.ts                  # Colors, fonts, gradients
    │   └── types.ts                  # TypeScript types
    ├── contexts/
    │   └── AuthContext.tsx           # Authentication state management
    ├── components/
    │   └── ui/
    │       ├── Avatar.tsx            # User avatar component
    │       ├── Badge.tsx             # Badge/tag component
    │       ├── Button.tsx            # Primary button component
    │       ├── Card.tsx              # Card container component
    │       ├── Input.tsx             # Text input component
    │       └── index.ts              # Export barrel
    ├── navigation/
    │   └── MainTabs.tsx              # Bottom tab navigation (role-based)
    └── screens/
        ├── LoginScreen.tsx           # Login with demo accounts
        ├── SignUpScreen.tsx          # User registration
        ├── FeedScreen.tsx            # Social feed with posts
        ├── PostDetailScreen.tsx      # Single post with comments
        ├── NetworkScreen.tsx         # Discover users, connections
        ├── ProfileViewScreen.tsx     # View other user profiles
        ├── MessagesScreen.tsx        # Conversations list
        ├── ChatScreen.tsx            # Real-time chat
        ├── CoursesScreen.tsx         # Enrolled courses list
        ├── CourseDetailScreen.tsx    # Course materials, discussions
        ├── AskTeacherAIScreen.tsx    # AI course tutor chat
        ├── GroupsScreen.tsx          # Groups discovery/management
        ├── GroupDetailScreen.tsx     # Group posts, members
        ├── ChallengesScreen.tsx      # Challenges list
        ├── ChallengeDetailScreen.tsx # Challenge details, leaderboard
        ├── NotificationsScreen.tsx   # Notifications list
        ├── ProfileScreen.tsx         # Own profile view
        ├── EditProfileScreen.tsx     # Edit profile form
        ├── SettingsScreen.tsx        # App settings
        ├── CVExportScreen.tsx        # Export CV as PDF
        └── HomeScreen.tsx            # (Deprecated - redirects to Feed)
```

## Navigation Structure

### Root Stack Navigator
- `Login` - Unauthenticated users
- `SignUp` - New user registration
- `MainTabs` - Authenticated users (bottom tab navigator)
- `Chat` - Direct message conversation
- `AskTeacherAI` - AI course tutor
- `CVExport` - CV export screen
- `PostDetail` - Single post view
- `CourseDetail` - Course details
- `GroupDetail` - Group details
- `ChallengeDetail` - Challenge details
- `ProfileView` - View other users
- `Settings` - App settings
- `EditProfile` - Edit own profile

### Main Tabs (Role-Based)

**Students/Teachers:**
| Tab | Component | Label |
|-----|-----------|-------|
| Home | FeedScreen | Feed |
| Courses | CoursesScreen | Courses |
| Messages | MessagesScreen | Messages |
| Notifications | NotificationsScreen | Alerts |
| ProfileTab | ProfileScreen | Profile |

**University/University Admin/Industry:**
| Tab | Component | Label |
|-----|-----------|-------|
| Home | FeedScreen | Feed |
| Network | NetworkScreen | Network |
| Messages | MessagesScreen | Messages |
| Notifications | NotificationsScreen | Alerts |
| ProfileTab | ProfileScreen | Profile |

**Master Admin:**
| Tab | Component | Label |
|-----|-----------|-------|
| Home | FeedScreen | Feed |
| Messages | MessagesScreen | Messages |
| Notifications | NotificationsScreen | Alerts |
| ProfileTab | ProfileScreen | Profile |

Note: Groups, Challenges, and Network features are accessible via the Feed and profile navigation.

## API Endpoints Used

### Authentication
- `POST /api/auth/dev-login` - Development login with demo accounts

### User
- `GET /api/me` - Get current user profile
- `PATCH /api/me` - Update profile
- `GET /api/users/:id` - Get user by ID

### Posts/Feed
- `GET /api/posts` - Get feed posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment
- `POST /api/posts/:id/react` - React to post

### Messaging
- `GET /api/conversations` - Get conversations list
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message
- `POST /api/conversations` - Start new conversation

### Courses
- `GET /api/me/enrolled-courses` - Get enrolled courses
- `GET /api/courses/:id` - Get course details
- `POST /api/ai/course-chat` - Send message to AI tutor

### Groups
- `GET /api/groups` - Get groups list
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/join` - Join group
- `POST /api/groups/:id/leave` - Leave group

### Challenges
- `GET /api/challenges` - Get challenges list
- `GET /api/challenges/:id` - Get challenge details
- `POST /api/challenges/:id/join` - Join challenge

### Connections/Network
- `GET /api/connections` - Get connections
- `POST /api/connections/request` - Request connection
- `POST /api/connections/accept` - Accept connection

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read

## Backend API Configuration

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

### Prerequisites

```bash
npm install -g eas-cli
eas login
```

### iOS (macOS only)

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

### Both Platforms

```bash
eas build --platform all
```

## QA Checklist

### Authentication
- [ ] Can log in with demo student account
- [ ] Can log in with demo teacher account
- [ ] Can log out and log back in
- [ ] Login persists after app restart
- [ ] Error messages display for invalid credentials

### Feed/Posts
- [ ] Feed loads and displays posts
- [ ] Can view post details
- [ ] Can add comment to post
- [ ] Comments display correctly
- [ ] Pull-to-refresh works

### Messaging
- [ ] Conversations list loads
- [ ] Can open existing conversation
- [ ] Messages display correctly
- [ ] Can send new message
- [ ] Messages appear after sending

### Courses
- [ ] Enrolled courses list loads (student)
- [ ] Course details display correctly
- [ ] Materials tab shows course materials
- [ ] Discussions tab shows course discussions
- [ ] AI Tutor button opens chat
- [ ] AI Tutor responds to questions

### Groups
- [ ] Groups list loads
- [ ] Can view group details
- [ ] Group posts display
- [ ] Members list shows
- [ ] Can join/leave groups

### Challenges
- [ ] Challenges list loads
- [ ] Challenge details display
- [ ] Leaderboard shows rankings
- [ ] Can join challenge

### Network/Connections
- [ ] Discover tab shows users
- [ ] Can view user profiles
- [ ] Can send connection request
- [ ] Connection requests work

### Profile
- [ ] Profile displays correctly
- [ ] Can edit profile
- [ ] Profile updates save
- [ ] CV export opens correctly

### Notifications
- [ ] Notifications list loads
- [ ] Notifications display correctly
- [ ] Can mark as read

### Navigation
- [ ] Bottom tabs work correctly
- [ ] Role-based tabs show correct items
- [ ] Stack navigation works (back buttons)
- [ ] Deep links work (if implemented)

### UI/UX
- [ ] Gradient theme displays correctly
- [ ] Loading states show
- [ ] Error states show
- [ ] Empty states show
- [ ] Keyboard dismisses properly
- [ ] Scroll works smoothly

### Performance
- [ ] App launches in reasonable time
- [ ] No excessive re-renders
- [ ] Images load efficiently
- [ ] API calls have loading states

## Troubleshooting

### "Network request failed" error
- Make sure the backend server is running on port 5000
- Check that `EXPO_PUBLIC_API_URL` is set correctly in `.env`
- Verify you can access the backend at http://localhost:5000 in your browser
- For physical devices, use your computer's IP address instead of localhost

### App doesn't start on simulator
- Make sure simulator is running
- Try clearing cache: `npm start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Authentication not persisting
- The app uses AsyncStorage for persistence
- Check that `@react-native-async-storage/async-storage` is installed
- Try clearing AsyncStorage and logging in again

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript version matches project requirements

### Expo errors
- Try `expo doctor` to check for issues
- Update Expo CLI: `npm install -g expo-cli`
- Clear Expo cache: `expo start -c`

## Tech Stack

- **Framework**: React Native 0.81 (via Expo SDK 54)
- **Navigation**: React Navigation 7 (native-stack + bottom-tabs)
- **State Management**: TanStack Query + React Context
- **Authentication**: Backend API with JWT + AsyncStorage
- **UI Components**: Custom + Expo Vector Icons
- **Animations**: Expo Linear Gradient
- **Language**: TypeScript
- **API Client**: Fetch API with auth wrapper

## Theme

The app uses a Gen-Z inspired neon gradient theme:

- **Primary**: Purple (#8B5CF6)
- **Secondary**: Pink (#EC4899)
- **Accent**: Blue (#3B82F6)
- **Background**: Dark (#0F0F14)
- **Surface**: Dark elevated (#1A1A24)

## Push Notifications

The app includes full push notification support via Expo Notifications:

- **Permission Handling**: Prompts user for notification permissions on first launch
- **Token Registration**: Automatically registers push tokens with the backend
- **Android Channels**: Configures channels for default, messages, and social notifications
- **Deep Linking**: Tapping notifications navigates to relevant screens

### Setup for Push Notifications

1. Configure EAS project ID in `app.json`
2. For Android: Add `google-services.json` from Firebase
3. For iOS: Configure APNs in Apple Developer Portal

See `INSTALLATION.md` for detailed setup instructions.

## Offline Mode

The app handles poor/no network connectivity gracefully:

- **Offline Detection**: Shows banner when network is unavailable
- **Data Caching**: Caches API responses for offline access
- **Draft Saving**: Saves unsent posts/comments/messages locally
- **Pending Queue**: Queues actions for sync when back online
- **Auto-Sync**: Automatically syncs pending actions on reconnection

### Key Files

- `src/services/offline.ts` - Caching and queue management
- `src/contexts/NetworkContext.tsx` - Network state provider
- `src/components/OfflineBanner.tsx` - Visual offline indicator

## EAS Build Configuration

Build configurations are defined in `eas.json`:

- **development**: Development builds with dev client
- **preview**: Internal distribution APK/IPA for testing
- **production**: Store-ready AAB/IPA builds

```bash
# Build preview APK
npm run build:android

# Build preview IPA
npm run build:ios

# Build both platforms
npm run build:all
```

See `INSTALLATION.md` for complete build instructions.

## Known Limitations

- Push notifications require physical device (not simulators)
- Video playback in posts not fully supported
- Real-time updates require manual refresh (pull-to-refresh)
- Groups and Challenges accessible via navigation but not in bottom tabs
- Some features require backend endpoints to be available

## Future Enhancements

- Video/audio messages
- Story-style posts
- Biometric authentication
- Dark/Light theme toggle

## License

MIT
