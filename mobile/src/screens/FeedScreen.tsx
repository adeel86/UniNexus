import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { colors, spacing, borderRadius, typography } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../config/api';
import { Card, CardContent, Avatar, Badge, Button } from '../components/ui';
import type { Post, User } from '../config/types';

interface PostWithUser extends Post {
  user: User;
  reactions: any[];
  commentCount: number;
  hasReacted: boolean;
}

export default function FeedScreen() {
  const { currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts = [], isLoading, refetch } = useQuery<PostWithUser[]>({
    queryKey: ['/api/posts'],
    staleTime: 30000,
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setNewPostContent('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create post');
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: string }) => {
      return apiRequest('/api/posts/' + postId + '/react', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    createPostMutation.mutate(newPostContent.trim());
  };

  const handleReact = (postId: number) => {
    reactMutation.mutate({ postId, type: 'like' });
  };

  const renderPost = ({ item: post }: { item: PostWithUser }) => (
    <Card style={styles.postCard}>
      <CardContent>
        <TouchableOpacity
          style={styles.postHeader}
          onPress={() => navigation.navigate('Profile', { userId: post.userId })}
        >
          <Avatar
            uri={post.user?.avatarUrl}
            name={post.user?.displayName || post.user?.firstName}
            size="md"
          />
          <View style={styles.postUserInfo}>
            <Text style={styles.postUserName}>
              {post.user?.displayName || `${post.user?.firstName} ${post.user?.lastName}`}
            </Text>
            <View style={styles.postMeta}>
              <Badge variant="outline" size="sm">
                {post.user?.role}
              </Badge>
              <Text style={styles.postTime}>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.postContent}>{post.content}</Text>

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.mediaUrls.slice(0, 4).map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={styles.postMedia}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleReact(post.id)}
          >
            <Ionicons
              name={post.hasReacted ? 'heart' : 'heart-outline'}
              size={22}
              color={post.hasReacted ? colors.error : colors.textSecondary}
            />
            <Text style={styles.actionText}>{post.reactions?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>{post.commentCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>UniNexus</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Card style={styles.createPostCard}>
        <CardContent>
          <View style={styles.createPostRow}>
            <Avatar
              uri={currentUser?.avatarUrl}
              name={currentUser?.displayName}
              size="md"
            />
            <TextInput
              style={styles.createPostInput}
              placeholder="Share something with your network..."
              placeholderTextColor={colors.textTertiary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              maxLength={500}
            />
          </View>
          {newPostContent.trim().length > 0 && (
            <View style={styles.createPostActions}>
              <Button
                title="Post"
                size="sm"
                onPress={handleCreatePost}
                loading={createPostMutation.isPending}
              />
            </View>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to share something!</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textLight,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  createPostCard: {
    margin: spacing.md,
    marginTop: spacing.md,
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  createPostInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  postTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  postContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  postMedia: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
