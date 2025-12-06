import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../config/api';
import { Avatar } from '../components/ui';
import type { Message, Conversation, User } from '../config/types';

export default function ChatScreen() {
  const { currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  
  const conversationId = route.params?.conversationId;

  const { data: conversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    enabled: !!conversationId,
  });

  const { data: messages = [], refetch } = useQuery<Message[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('/api/conversations/' + conversationId + '/messages', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setMessage('');
    },
  });

  const otherUser = conversation?.participants?.find(p => p.id !== currentUser?.id);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const renderMessage = ({ item: msg }: { item: Message }) => {
    const isOwnMessage = msg.senderId === currentUser?.id;

    return (
      <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
        {!isOwnMessage && (
          <Avatar uri={msg.sender?.avatarUrl} name={msg.sender?.displayName} size="sm" />
        )}
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {msg.content}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {format(new Date(msg.createdAt), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => otherUser && navigation.navigate('Profile', { userId: otherUser.id })}
        >
          <Avatar
            uri={otherUser?.avatarUrl}
            name={otherUser?.displayName || otherUser?.firstName}
            size="md"
          />
          <View>
            <Text style={styles.headerName}>
              {otherUser?.displayName || `${otherUser?.firstName} ${otherUser?.lastName}`}
            </Text>
            <Text style={styles.headerRole}>{otherUser?.role}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          inverted
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? colors.textLight : colors.textTertiary}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  headerRole: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
  },
  ownMessageText: {
    color: colors.textLight,
  },
  messageTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
});
