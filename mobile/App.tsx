import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { colors } from './src/config/theme';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import MainTabs from './src/navigation/MainTabs';
import ChatScreen from './src/screens/ChatScreen';
import AskTeacherAIScreen from './src/screens/AskTeacherAIScreen';
import CVExportScreen from './src/screens/CVExportScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import CourseDetailScreen from './src/screens/CourseDetailScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import ChallengeDetailScreen from './src/screens/ChallengeDetailScreen';
import ProfileViewScreen from './src/screens/ProfileViewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  Chat: { conversationId: number; recipientName: string };
  AskTeacherAI: { courseId: number; courseName: string };
  CVExport: undefined;
  PostDetail: { postId: number };
  CourseDetail: { courseId: number };
  GroupDetail: { groupId: number };
  ChallengeDetail: { challengeId: number };
  ProfileView: { userId: number };
  Settings: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function Navigation() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading UniNexus...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {currentUser ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="AskTeacherAI" 
              component={AskTeacherAIScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="CVExport" component={CVExportScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
            <Stack.Screen name="ProfileView" component={ProfileViewScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
