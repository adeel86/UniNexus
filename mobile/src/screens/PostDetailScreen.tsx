import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { Avatar, Card, Badge } from '../components/ui';
import { apiClient } from '../config/api';
import type { RootStackParamList } from '../../App';
import type { Post, Comment } from '../config/types';

type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PostDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['/api/posts', postId],
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['/api/posts', postId, 'comments'],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiClient.post(`/api/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      setCommentText('');
    },
  });

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText.trim());
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Avatar
        uri={item.author?.profileImageUrl}
        name={item.author?.displayName || 'User'}
        size={32}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentAuthor}>{item.author?.displayName}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {post && (
            <Card style={styles.postCard}>
              <View style={styles.postHeader}>
                <TouchableOpacity
                  style={styles.authorRow}
                  onPress={() => navigation.navigate('ProfileView', { userId: post.authorId })}
                >
                  <Avatar
                    uri={post.author?.profileImageUrl}
                    name={post.author?.displayName || 'User'}
                    size={44}
                  />
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{post.author?.displayName}</Text>
                    <Text style={styles.postTime}>
                      {post.author?.role && (
                        <Badge variant="secondary" size="sm">{post.author.role}</Badge>
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postStats}>
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={18} color={colors.accent} />
                  <Text style={styles.statText}>{post.reactionCount || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="chatbubble" size={18} color={colors.textSecondary} />
                  <Text style={styles.statText}>{post.commentCount || 0}</Text>
                </View>
              </View>
            </Card>
          )}

          <Text style={styles.sectionTitle}>Comments</Text>

          {comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Avatar
                    uri={comment.author?.profileImageUrl}
                    name={comment.author?.displayName || 'User'}
                    size={32}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>{comment.author?.displayName}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
          )}
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || addCommentMutation.isPending}
          >
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() ? colors.background : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  postCard: {
    marginBottom: spacing.lg,
  },
  postHeader: {
    marginBottom: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: spacing.sm,
  },
  authorName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  postTime: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postContent: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  postStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  commentsList: {
    gap: spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 12,
  },
  commentAuthor: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});
