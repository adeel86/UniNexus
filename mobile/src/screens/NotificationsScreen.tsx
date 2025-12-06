import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { apiRequest } from '../config/api';
import { Button } from '../components/ui';
import type { Notification } from '../config/types';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [], refetch, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    staleTime: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest('/api/notifications/' + notificationId + '/read', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/read-all', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getNotificationIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'like':
      case 'reaction':
        return { name: 'heart', color: colors.error };
      case 'comment':
        return { name: 'chatbubble', color: colors.info };
      case 'follow':
      case 'connection':
        return { name: 'person-add', color: colors.primary };
      case 'message':
        return { name: 'mail', color: colors.secondary };
      case 'badge':
        return { name: 'medal', color: colors.warning };
      case 'endorsement':
        return { name: 'thumbs-up', color: colors.success };
      case 'challenge':
        return { name: 'trophy', color: colors.warning };
      case 'course':
        return { name: 'book', color: colors.accent };
      default:
        return { name: 'notifications', color: colors.primary };
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    const metadata = notification.metadata || {};
    
    if (metadata.postId) {
      navigation.navigate('PostDetail', { postId: metadata.postId });
    } else if (metadata.userId) {
      navigation.navigate('Profile', { userId: metadata.userId });
    } else if (metadata.conversationId) {
      navigation.navigate('Chat', { conversationId: metadata.conversationId });
    } else if (metadata.courseId) {
      navigation.navigate('CourseDetail', { courseId: metadata.courseId });
    } else if (metadata.challengeId) {
      navigation.navigate('ChallengeDetail', { challengeId: metadata.challengeId });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotification = ({ item: notification }: { item: Notification }) => {
    const icon = getNotificationIcon(notification.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !notification.isRead && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </Text>
        </View>

        {!notification.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Button
            title="Mark all read"
            variant="ghost"
            size="sm"
            textStyle={{ color: colors.textLight }}
            onPress={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          />
        )}
      </LinearGradient>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
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
              <Ionicons name="notifications-off-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>
                You're all caught up! Check back later.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textLight,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textLight,
    opacity: 0.9,
    marginTop: 2,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  unreadCard: {
    backgroundColor: `${colors.primary}08`,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  notificationMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
