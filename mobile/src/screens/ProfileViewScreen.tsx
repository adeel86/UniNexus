import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { Card, Badge, Button, Avatar } from '../components/ui';
import { apiClient } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../../App';
import type { User, Post } from '../config/types';

type ProfileViewRouteProp = RouteProp<RootStackParamList, 'ProfileView'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = User & {
  posts?: Post[];
  badges?: { id: number; name: string; icon: string; earnedAt: string }[];
  skills?: string[];
  isConnected?: boolean;
  connectionPending?: boolean;
};

export default function ProfileViewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileViewRouteProp>();
  const { userId } = route.params;
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');

  const isOwnProfile = currentUser?.id === userId;

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users', userId],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/api/connections/request`, { targetUserId: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
    },
  });

  const handleMessage = () => {
    navigation.navigate('Chat', {
      conversationId: 0,
      recipientName: user?.displayName || 'User',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {isOwnProfile ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Avatar
            uri={user?.profileImageUrl}
            name={user?.displayName || 'User'}
            size={100}
          />
          <Text style={styles.displayName}>{user?.displayName}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          
          <View style={styles.badgeRow}>
            <Badge variant="primary">{user?.role}</Badge>
            {user?.university && (
              <Badge variant="secondary">{user.university}</Badge>
            )}
          </View>

          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.totalEngagementPoints || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.posts?.length || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.badges?.length || 0}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>

          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              {user?.isConnected ? (
                <Button
                  title="Message"
                  onPress={handleMessage}
                  variant="primary"
                  icon={<Ionicons name="chatbubble" size={18} color={colors.background} />}
                  style={styles.actionButton}
                />
              ) : user?.connectionPending ? (
                <Button
                  title="Request Pending"
                  onPress={() => {}}
                  variant="outline"
                  disabled
                  style={styles.actionButton}
                />
              ) : (
                <Button
                  title="Connect"
                  onPress={() => connectMutation.mutate()}
                  variant="primary"
                  loading={connectMutation.isPending}
                  icon={<Ionicons name="person-add" size={18} color={colors.background} />}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}
        </View>

        {user?.badges && user.badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {user.badges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={styles.badgeIcon}>
                    <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {user?.skills && user.skills.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsList}>
              {user.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </View>
          </View>
        )}

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'posts' ? (
          <View style={styles.postsContainer}>
            {user?.posts && user.posts.length > 0 ? (
              user.posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
                  <View style={styles.postStats}>
                    <View style={styles.postStat}>
                      <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.postStatText}>{post.reactionCount || 0}</Text>
                    </View>
                    <View style={styles.postStat}>
                      <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.postStatText}>{post.commentCount || 0}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            )}
          </View>
        ) : (
          <Card style={styles.aboutCard}>
            <View style={styles.aboutItem}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} />
              <Text style={styles.aboutText}>{user?.email || 'No email provided'}</Text>
            </View>
            {user?.university && (
              <View style={styles.aboutItem}>
                <Ionicons name="school" size={20} color={colors.textSecondary} />
                <Text style={styles.aboutText}>{user.university}</Text>
              </View>
            )}
            {user?.fieldOfStudy && (
              <View style={styles.aboutItem}>
                <Ionicons name="book" size={20} color={colors.textSecondary} />
                <Text style={styles.aboutText}>{user.fieldOfStudy}</Text>
              </View>
            )}
            <View style={styles.aboutItem}>
              <Ionicons name="calendar" size={20} color={colors.textSecondary} />
              <Text style={styles.aboutText}>
                Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
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
  editButton: {
    padding: spacing.xs,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  displayName: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  username: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bio: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    minWidth: 140,
  },
  badgesSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: '500',
  },
  skillsSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: 12,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.background,
  },
  postsContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  postCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  postContent: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  postStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postStatText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  aboutCard: {
    margin: spacing.md,
    marginTop: 0,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  aboutText: {
    fontSize: typography.body,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
