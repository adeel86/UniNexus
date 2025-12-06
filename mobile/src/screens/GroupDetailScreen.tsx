import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { Card, Badge, Button, Avatar } from '../components/ui';
import type { RootStackParamList } from '../../App';
import type { User, Post } from '../config/types';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Group = {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  category?: string;
  isPublic: boolean;
  isMember?: boolean;
  createdAt: string;
  members?: User[];
  posts?: Post[];
};

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about'>('posts');

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ['/api/groups', groupId],
  });

  const renderPost = (post: Post) => (
    <TouchableOpacity
      key={post.id}
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
    >
      <View style={styles.postHeader}>
        <Avatar
          uri={post.author?.profileImageUrl}
          name={post.author?.displayName || 'User'}
          size={36}
        />
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{post.author?.displayName}</Text>
          <Text style={styles.postTime}>Just now</Text>
        </View>
      </View>
      <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
      <View style={styles.postStats}>
        <View style={styles.statItem}>
          <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.statText}>{post.reactionCount || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.statText}>{post.commentCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMember = (member: User) => (
    <TouchableOpacity
      key={member.id}
      style={styles.memberCard}
      onPress={() => navigation.navigate('ProfileView', { userId: member.id })}
    >
      <Avatar
        uri={member.profileImageUrl}
        name={member.displayName || member.username}
        size={48}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.displayName}</Text>
        <Text style={styles.memberRole}>{member.role}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading group...</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{group?.name || 'Group'}</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.groupCover}>
          {group?.imageUrl ? (
            <Image source={{ uri: group.imageUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="people" size={48} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group?.name}</Text>
          <View style={styles.groupMeta}>
            <Badge variant={group?.isPublic ? 'secondary' : 'outline'}>
              {group?.isPublic ? 'Public' : 'Private'}
            </Badge>
            {group?.category && (
              <Badge variant="secondary">{group.category}</Badge>
            )}
          </View>
          <Text style={styles.memberCount}>
            <Ionicons name="people" size={14} color={colors.textSecondary} />
            {' '}{group?.memberCount || 0} members
          </Text>

          {!group?.isMember && (
            <Button
              title="Join Group"
              onPress={() => {}}
              variant="primary"
              style={styles.joinButton}
            />
          )}
        </View>

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
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
              Members
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

        {activeTab === 'posts' && (
          <View style={styles.postsContainer}>
            {group?.posts && group.posts.length > 0 ? (
              group.posts.map(renderPost)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.membersContainer}>
            {group?.members && group.members.length > 0 ? (
              group.members.map(renderMember)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No members to show</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <Card style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>About this group</Text>
            <Text style={styles.aboutDescription}>
              {group?.description || 'No description available.'}
            </Text>
            <View style={styles.aboutMeta}>
              <View style={styles.aboutItem}>
                <Ionicons name="calendar" size={18} color={colors.textSecondary} />
                <Text style={styles.aboutItemText}>Created on {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}</Text>
              </View>
              <View style={styles.aboutItem}>
                <Ionicons name={group?.isPublic ? 'globe' : 'lock-closed'} size={18} color={colors.textSecondary} />
                <Text style={styles.aboutItemText}>{group?.isPublic ? 'Public group - Anyone can join' : 'Private group - Approval required'}</Text>
              </View>
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
    flex: 1,
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  moreButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  groupCover: {
    height: 160,
    backgroundColor: colors.surface,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
  },
  groupInfo: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupName: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberCount: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  joinButton: {
    marginTop: spacing.md,
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  postAuthorInfo: {
    marginLeft: spacing.sm,
  },
  postAuthorName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  postTime: {
    fontSize: typography.xs,
    color: colors.textSecondary,
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
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  membersContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  memberRole: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  aboutCard: {
    margin: spacing.md,
    marginTop: 0,
  },
  aboutTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  aboutDescription: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  aboutMeta: {
    gap: spacing.sm,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutItemText: {
    fontSize: typography.body,
    color: colors.textSecondary,
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
