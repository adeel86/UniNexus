import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { colors, spacing, typography } from '../config/theme';
import { Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SettingItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  type: 'navigate' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert('Contact Support', 'Please contact support to delete your account.'),
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          icon: 'person-outline' as const,
          title: 'Edit Profile',
          subtitle: 'Update your profile information',
          type: 'navigate' as const,
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          id: 'password',
          icon: 'lock-closed-outline' as const,
          title: 'Change Password',
          subtitle: 'Update your password',
          type: 'navigate' as const,
          onPress: () => Alert.alert('Coming Soon', 'Password change will be available soon.'),
        },
        {
          id: 'privacy',
          icon: 'shield-outline' as const,
          title: 'Privacy',
          subtitle: 'Manage your privacy settings',
          type: 'navigate' as const,
          onPress: () => Alert.alert('Coming Soon', 'Privacy settings will be available soon.'),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'push',
          icon: 'notifications-outline' as const,
          title: 'Push Notifications',
          subtitle: 'Receive push notifications',
          type: 'toggle' as const,
          value: pushEnabled,
          onPress: () => setPushEnabled(!pushEnabled),
        },
        {
          id: 'email',
          icon: 'mail-outline' as const,
          title: 'Email Notifications',
          subtitle: 'Receive email updates',
          type: 'toggle' as const,
          value: emailEnabled,
          onPress: () => setEmailEnabled(!emailEnabled),
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'darkMode',
          icon: 'moon-outline' as const,
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          type: 'toggle' as const,
          value: darkMode,
          onPress: () => setDarkMode(!darkMode),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          icon: 'help-circle-outline' as const,
          title: 'Help Center',
          subtitle: 'Get help with UniNexus',
          type: 'navigate' as const,
          onPress: () => Alert.alert('Help Center', 'Visit our website for help.'),
        },
        {
          id: 'feedback',
          icon: 'chatbox-outline' as const,
          title: 'Send Feedback',
          subtitle: 'Share your thoughts with us',
          type: 'navigate' as const,
          onPress: () => Alert.alert('Feedback', 'Email us at support@uninexus.com'),
        },
        {
          id: 'about',
          icon: 'information-circle-outline' as const,
          title: 'About',
          subtitle: 'Version 1.0.0',
          type: 'navigate' as const,
          onPress: () => Alert.alert('UniNexus', 'Version 1.0.0\n\nA social learning platform for Gen Z.'),
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          icon: 'log-out-outline' as const,
          title: 'Logout',
          type: 'action' as const,
          onPress: handleLogout,
          danger: true,
        },
        {
          id: 'delete',
          icon: 'trash-outline' as const,
          title: 'Delete Account',
          type: 'action' as const,
          onPress: handleDeleteAccount,
          danger: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.type !== 'toggle' ? item.onPress : undefined}
      activeOpacity={item.type === 'toggle' ? 1 : 0.7}
    >
      <View style={[styles.iconContainer, item.danger && styles.dangerIcon]}>
        <Ionicons
          name={item.icon}
          size={22}
          color={item.danger ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, item.danger && styles.dangerText]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.type === 'toggle' && (
        <Switch
          value={item.value}
          onValueChange={item.onPress}
          trackColor={{ false: colors.border, true: `${colors.primary}50` }}
          thumbColor={item.value ? colors.primary : colors.textMuted}
        />
      )}
      {item.type === 'navigate' && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {renderSettingItem(item)}
                  {index < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dangerIcon: {
    backgroundColor: `${colors.error}15`,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  dangerText: {
    color: colors.error,
  },
  settingSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
});
