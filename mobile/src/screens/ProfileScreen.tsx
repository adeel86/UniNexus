import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Badge, Button, Card, CardContent } from '../components/ui';
import type { User, UserBadge, UserSkill } from '../config/types';

interface ProfileData extends User {
  badges: UserBadge[];
  skills: UserSkill[];
  postsCount: number;
  connectionsCount: number;
}

export default function ProfileScreen() {
  const { currentUser, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, refetch } = useQuery<ProfileData>({
    queryKey: ['/api/users', currentUser?.id, 'profile'],
    enabled: !!currentUser?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return colors.primary;
      case 'teacher': return colors.success;
      case 'university':
      case 'university_admin': return colors.info;
      case 'industry': return colors.warning;
      case 'master_admin': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const user = profile || currentUser;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient
          colors={colors.gradient.full}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={user?.avatarUrl}
                name={user?.displayName || user?.firstName}
                size="xl"
              />
            </View>
            <Text style={styles.userName}>
              {user?.displayName || `${user?.firstName} ${user?.lastName}`}
            </Text>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || 'student') }]}>
                <Text style={styles.roleText}>{user?.role}</Text>
              </View>
            </View>
            {user?.university && (
              <Text style={styles.university}>{user.university}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.postsCount || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.connectionsCount || 0}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.points || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.actionButtons}>
            <Button
              title="Edit Profile"
              variant="outline"
              size="sm"
              icon={<Ionicons name="pencil" size={16} color={colors.primary} />}
              onPress={() => navigation.navigate('EditProfile')}
              style={styles.actionButton}
            />
            <Button
              title="Export CV"
              variant="secondary"
              size="sm"
              icon={<Ionicons name="document-text" size={16} color={colors.text} />}
              onPress={() => navigation.navigate('CVExport')}
              style={styles.actionButton}
            />
          </View>

          {user?.bio && (
            <Card style={styles.section}>
              <CardContent>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </CardContent>
            </Card>
          )}

          {profile?.badges && profile.badges.length > 0 && (
            <Card style={styles.section}>
              <CardContent>
                <Text style={styles.sectionTitle}>Badges</Text>
                <View style={styles.badgesGrid}>
                  {profile.badges.slice(0, 6).map((userBadge) => (
                    <View key={userBadge.id} style={styles.badgeItem}>
                      <View style={styles.badgeIcon}>
                        <Ionicons name="medal" size={24} color={colors.warning} />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={1}>
                        {userBadge.badge.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {profile?.skills && profile.skills.length > 0 && (
            <Card style={styles.section}>
              <CardContent>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.skillsContainer}>
                  {profile.skills.map((userSkill) => (
                    <Badge key={userSkill.id} variant="outline">
                      {userSkill.skill.name}
                      {userSkill.endorsementCount > 0 && ` (${userSkill.endorsementCount})`}
                    </Badge>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {user?.rankTier && (
            <Card style={styles.section}>
              <CardContent>
                <View style={styles.rankRow}>
                  <View style={styles.rankInfo}>
                    <Ionicons name="trophy" size={24} color={colors.warning} />
                    <View>
                      <Text style={styles.rankTitle}>Current Rank</Text>
                      <Text style={styles.rankValue}>{user.rankTier}</Text>
                    </View>
                  </View>
                  <View style={styles.pointsInfo}>
                    <Text style={styles.pointsLabel}>Challenge Points</Text>
                    <Text style={styles.pointsValue}>{user.challengePoints || 0}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingBottom: spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  avatarContainer: {
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 50,
  },
  userName: {
    ...typography.h2,
    color: colors.textLight,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  roleContainer: {
    marginTop: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  university: {
    ...typography.bodySmall,
    color: colors.textLight,
    opacity: 0.9,
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    ...typography.h3,
    color: colors.textLight,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
    opacity: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    padding: spacing.md,
    marginTop: -spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  badgeName: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rankValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  pointsInfo: {
    alignItems: 'flex-end',
  },
  pointsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pointsValue: {
    ...typography.h4,
    color: colors.warning,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});
