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
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Badge } from '../components/ui';
import type { Conversation, User } from '../config/types';

export default function MessagesScreen() {
  const { currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const { data: conversations = [], refetch, isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    staleTime: 10000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getOtherParticipant = (conversation: Conversation): User | undefined => {
    return conversation.participants?.find(p => p.id !== currentUser?.id);
  };

  const renderConversation = ({ item: conversation }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(conversation);
    if (!otherUser) return null;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => navigation.navigate('Chat', { 
          conversationId: conversation.id,
          recipientName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`,
        })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Avatar
            uri={otherUser.avatarUrl}
            name={otherUser.displayName || otherUser.firstName}
            size="lg"
          />
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`}
            </Text>
            <Text style={styles.timestamp}>
              {conversation.lastMessage
                ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })
                : ''}
            </Text>
          </View>

          <View style={styles.lastMessageRow}>
            <Text
              style={[
                styles.lastMessage,
                conversation.unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={2}
            >
              {conversation.lastMessage?.content || 'No messages yet'}
            </Text>
          </View>

          <Badge variant="outline" size="sm" style={styles.roleBadge}>
            {otherUser.role}
          </Badge>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newMessageButton}>
          <Ionicons name="create-outline" size={24} color={colors.textLight} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
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
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Connect with others to start chatting
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
  newMessageButton: {
    padding: spacing.sm,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  conversationInfo: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: colors.text,
  },
  roleBadge: {
    marginTop: 4,
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
