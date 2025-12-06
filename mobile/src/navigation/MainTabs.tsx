import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { colors } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import type { MainTabParamList, UserRole } from '../config/types';

import FeedScreen from '../screens/FeedScreen';
import NetworkScreen from '../screens/NetworkScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CoursesScreen from '../screens/CoursesScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabConfig = {
  name: keyof MainTabParamList;
  component: React.ComponentType<any>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  roles?: UserRole[];
};

// Role-based tab configurations
// Students/Teachers: Home, Courses, Messages, Notifications, Profile
// Other roles: Home, Network, Messages, Notifications, Profile
const getTabsForRole = (role: UserRole): TabConfig[] => {
  const baseTabs: TabConfig[] = [
    { name: 'Home', component: FeedScreen, icon: 'home', label: 'Feed' },
  ];
  
  // Role-specific middle tabs
  if (role === 'student' || role === 'teacher') {
    baseTabs.push(
      { name: 'Courses', component: CoursesScreen, icon: 'book', label: 'Courses' },
      { name: 'Messages', component: MessagesScreen, icon: 'chatbubbles', label: 'Messages' },
    );
  } else if (role !== 'master_admin') {
    // university, university_admin, industry
    baseTabs.push(
      { name: 'Network', component: NetworkScreen, icon: 'people', label: 'Network' },
      { name: 'Messages', component: MessagesScreen, icon: 'chatbubbles', label: 'Messages' },
    );
  } else {
    // master_admin - basic tabs only
    baseTabs.push(
      { name: 'Messages', component: MessagesScreen, icon: 'chatbubbles', label: 'Messages' },
    );
  }
  
  // Common ending tabs for all roles
  baseTabs.push(
    { name: 'Notifications', component: NotificationsScreen, icon: 'notifications', label: 'Alerts' },
    { name: 'ProfileTab', component: ProfileScreen, icon: 'person', label: 'Profile' },
  );
  
  return baseTabs;
};

export default function MainTabs() {
  const { currentUser } = useAuth();
  const userRole = (currentUser?.role || 'student') as UserRole;

  const visibleTabs = getTabsForRole(userRole);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const config = visibleTabs.find(t => t.name === route.name);
          const iconName = config?.icon || 'help';
          return (
            <View style={focused ? styles.activeTab : undefined}>
              <Ionicons name={focused ? iconName : (`${iconName}-outline` as any)} size={24} color={color} />
            </View>
          );
        },
      })}
    >
      {visibleTabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 80,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  activeTab: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 6,
    marginBottom: -4,
  },
});
