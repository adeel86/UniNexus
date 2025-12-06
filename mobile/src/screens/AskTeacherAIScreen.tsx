import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { apiRequest } from '../config/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { title: string; chunk: string }[];
}

export default function AskTeacherAIScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);

  const courseId = route.params?.courseId;
  const courseTitle = route.params?.courseTitle;

  const { data: status } = useQuery({
    queryKey: ['/api/ai/course-chat', courseId, 'status'],
    enabled: !!courseId,
  });

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      return apiRequest('/api/ai/course-chat', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          message: question,
          sessionId,
        }),
      });
    },
    onSuccess: (response) => {
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response || response.message,
          citations: response.citations,
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input.trim());
    setInput('');
  };

  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const isUser = msg.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {msg.content}
          </Text>
          {msg.citations && msg.citations.length > 0 && (
            <View style={styles.citationsContainer}>
              <Text style={styles.citationsTitle}>Sources:</Text>
              {msg.citations.map((citation, index) => (
                <View key={index} style={styles.citation}>
                  <Ionicons name="document-text" size={12} color={colors.textSecondary} />
                  <Text style={styles.citationText} numberOfLines={2}>
                    {citation.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const hasContent = status?.hasIndexedContent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Ask Teacher's AI</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {courseTitle}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {!hasContent ? (
        <View style={styles.noContentState}>
          <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.noContentTitle}>No materials indexed</Text>
          <Text style={styles.noContentText}>
            The teacher hasn't added any course materials yet. Check back later!
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="sparkles" size={40} color={colors.primary} />
              </View>
              <Text style={styles.welcomeTitle}>Hi! I'm your course AI assistant</Text>
              <Text style={styles.welcomeText}>
                Ask me anything about this course's materials and I'll help you understand
                the content based on what your teacher has uploaded.
              </Text>
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Try asking:</Text>
                {[
                  'What are the main topics covered?',
                  'Explain the key concepts',
                  'Summarize the course content',
                ].map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => setInput(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              ListFooterComponent={
                chatMutation.isPending ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Thinking...</Text>
                  </View>
                ) : null
              }
            />
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask about the course..."
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
            >
              <Ionicons
                name="send"
                size={20}
                color={input.trim() ? colors.textLight : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
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
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textLight,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    opacity: 0.9,
  },
  noContentState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  noContentTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.lg,
  },
  noContentText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  chatContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
  },
  welcomeText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  suggestionsContainer: {
    marginTop: spacing.xl,
    width: '100%',
  },
  suggestionsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  userMessageText: {
    color: colors.textLight,
  },
  citationsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  citationsTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  citation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  citationText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
