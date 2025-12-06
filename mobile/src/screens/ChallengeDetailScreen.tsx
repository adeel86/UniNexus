import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { Card, Badge, Button, Avatar } from '../components/ui';
import { apiClient } from '../config/api';
import type { RootStackParamList } from '../../App';

type ChallengeDetailRouteProp = RouteProp<RootStackParamList, 'ChallengeDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Participant = {
  id: number;
  userId: number;
  user: {
    id: number;
    displayName: string;
    profileImageUrl?: string;
  };
  score?: number;
  rank?: number;
};

type Challenge = {
  id: number;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  points: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  isJoined?: boolean;
  participants?: Participant[];
  rules?: string[];
  prizes?: string[];
};

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChallengeDetailRouteProp>();
  const { challengeId } = route.params;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'rules'>('overview');

  const { data: challenge, isLoading } = useQuery<Challenge>({
    queryKey: ['/api/challenges', challengeId],
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/api/challenges/${challengeId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges', challengeId] });
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return colors.success;
      case 'medium': return colors.warning;
      case 'hard': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'primary';
      case 'upcoming': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading challenge...</Text>
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
        <Text style={styles.headerTitle}>Challenge</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.challengeCard}>
          <View style={styles.badgeRow}>
            <Badge variant={getStatusColor(challenge?.status || 'upcoming') as any}>
              {challenge?.status?.toUpperCase()}
            </Badge>
            <Badge variant="outline" style={{ borderColor: getDifficultyColor(challenge?.difficulty || 'easy') }}>
              <Text style={{ color: getDifficultyColor(challenge?.difficulty || 'easy') }}>
                {challenge?.difficulty?.toUpperCase()}
              </Text>
            </Badge>
          </View>

          <Text style={styles.challengeTitle}>{challenge?.title}</Text>
          <Text style={styles.challengeType}>{challenge?.type}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="trophy" size={20} color={colors.accent} />
              <Text style={styles.statValue}>{challenge?.points}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.statValue}>{challenge?.participantCount}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="calendar" size={20} color={colors.secondary} />
              <Text style={styles.statValue}>{challenge?.endDate ? formatDate(challenge.endDate) : 'TBD'}</Text>
              <Text style={styles.statLabel}>End Date</Text>
            </View>
          </View>

          {challenge?.status === 'active' && !challenge?.isJoined && (
            <Button
              title="Join Challenge"
              onPress={() => joinMutation.mutate()}
              variant="primary"
              loading={joinMutation.isPending}
              style={styles.joinButton}
            />
          )}

          {challenge?.isJoined && (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.joinedText}>You've joined this challenge</Text>
            </View>
          )}
        </Card>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rules' && styles.activeTab]}
            onPress={() => setActiveTab('rules')}
          >
            <Text style={[styles.tabText, activeTab === 'rules' && styles.activeTabText]}>
              Rules
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{challenge?.description}</Text>

            {challenge?.prizes && challenge.prizes.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Prizes</Text>
                {challenge.prizes.map((prize, index) => (
                  <View key={index} style={styles.prizeItem}>
                    <View style={styles.prizeRank}>
                      <Ionicons
                        name="medal"
                        size={20}
                        color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}
                      />
                    </View>
                    <Text style={styles.prizeText}>{prize}</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <Ionicons name="play-circle" size={20} color={colors.success} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Start Date</Text>
                  <Text style={styles.timelineValue}>
                    {challenge?.startDate ? formatDate(challenge.startDate) : 'TBD'}
                  </Text>
                </View>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <Ionicons name="stop-circle" size={20} color={colors.error} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>End Date</Text>
                  <Text style={styles.timelineValue}>
                    {challenge?.endDate ? formatDate(challenge.endDate) : 'TBD'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.sectionContainer}>
            {challenge?.participants && challenge.participants.length > 0 ? (
              challenge.participants.map((participant, index) => (
                <TouchableOpacity
                  key={participant.id}
                  style={styles.leaderboardItem}
                  onPress={() => navigation.navigate('ProfileView', { userId: participant.userId })}
                >
                  <Text style={[styles.rank, index < 3 && styles.topRank]}>#{index + 1}</Text>
                  <Avatar
                    uri={participant.user.profileImageUrl}
                    name={participant.user.displayName}
                    size={40}
                  />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{participant.user.displayName}</Text>
                    <Text style={styles.participantScore}>{participant.score || 0} pts</Text>
                  </View>
                  {index < 3 && (
                    <Ionicons
                      name="medal"
                      size={24}
                      color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}
                    />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="podium-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No participants yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'rules' && (
          <View style={styles.sectionContainer}>
            {challenge?.rules && challenge.rules.length > 0 ? (
              challenge.rules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <View style={styles.ruleNumber}>
                    <Text style={styles.ruleNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No rules specified</Text>
              </View>
            )}
          </View>
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
  shareButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  challengeCard: {
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  challengeTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  challengeType: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  joinButton: {
    marginTop: spacing.md,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.success}15`,
    borderRadius: 8,
  },
  joinedText: {
    fontSize: typography.body,
    color: colors.success,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.md,
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
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  description: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  prizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  prizeRank: {
    marginRight: spacing.md,
  },
  prizeText: {
    fontSize: typography.body,
    color: colors.text,
    flex: 1,
  },
  timeline: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 9,
    marginVertical: spacing.xs,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  timelineValue: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  rank: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 36,
  },
  topRank: {
    color: colors.accent,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  participantName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  participantScore: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  ruleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ruleNumberText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.background,
  },
  ruleText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
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
