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
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { apiRequest } from '../config/api';
import { Card, CardContent, Badge, Button } from '../components/ui';
import type { Challenge } from '../config/types';

type TabType = 'active' | 'joined' | 'completed';

interface ChallengeWithParticipation extends Challenge {
  hasJoined: boolean;
  hasSubmitted: boolean;
}

export default function ChallengesScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);

  const { data: challenges = [], refetch } = useQuery<ChallengeWithParticipation[]>({
    queryKey: ['/api/challenges'],
    staleTime: 30000,
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      return apiRequest('/api/challenges/' + challengeId + '/join', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredChallenges = challenges.filter(challenge => {
    const endDate = new Date(challenge.endDate);
    const isCompleted = isPast(endDate);
    
    if (activeTab === 'completed') return isCompleted;
    if (activeTab === 'joined') return challenge.hasJoined && !isCompleted;
    return !isCompleted; // active
  });

  const getChallengeStatus = (challenge: Challenge) => {
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    
    if (isPast(endDate)) return { label: 'Completed', color: colors.textSecondary };
    if (isFuture(startDate)) return { label: 'Upcoming', color: colors.info };
    return { label: 'Active', color: colors.success };
  };

  const renderChallengeCard = ({ item: challenge }: { item: ChallengeWithParticipation }) => {
    const status = getChallengeStatus(challenge);
    const endDate = new Date(challenge.endDate);
    const isCompleted = isPast(endDate);

    return (
      <Card style={styles.challengeCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
          activeOpacity={0.7}
        >
          <CardContent>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle} numberOfLines={2}>
                  {challenge.title}
                </Text>
                <View style={styles.challengeMeta}>
                  <Badge variant={isCompleted ? 'default' : 'success'} size="sm">
                    {status.label}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {challenge.type}
                  </Badge>
                </View>
              </View>
              <View style={styles.pointsBadge}>
                <Ionicons name="trophy" size={20} color={colors.warning} />
                <Text style={styles.pointsText}>{challenge.pointsReward}</Text>
              </View>
            </View>

            {challenge.description && (
              <Text style={styles.challengeDescription} numberOfLines={2}>
                {challenge.description}
              </Text>
            )}

            <View style={styles.challengeDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {isCompleted
                    ? `Ended ${formatDistanceToNow(endDate, { addSuffix: true })}`
                    : `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {challenge.currentParticipants}
                  {challenge.maxParticipants ? `/${challenge.maxParticipants}` : ''} joined
                </Text>
              </View>
            </View>

            {!isCompleted && !challenge.hasJoined && (
              <View style={styles.actionRow}>
                <Button
                  title="Join Challenge"
                  size="sm"
                  icon={<Ionicons name="flash" size={16} color={colors.textLight} />}
                  onPress={() => joinMutation.mutate(challenge.id)}
                  loading={joinMutation.isPending}
                />
              </View>
            )}

            {challenge.hasJoined && !isCompleted && (
              <View style={styles.joinedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.joinedText}>
                  {challenge.hasSubmitted ? 'Submitted' : 'Joined'}
                </Text>
              </View>
            )}
          </CardContent>
        </TouchableOpacity>
      </Card>
    );
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'active', label: 'Active', icon: 'flash' },
    { key: 'joined', label: 'Joined', icon: 'checkmark-circle' },
    { key: 'completed', label: 'Completed', icon: 'trophy' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Challenges</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
          <Ionicons name="podium-outline" size={24} color={colors.textLight} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredChallenges}
        renderItem={renderChallengeCard}
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
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'No active challenges' :
               activeTab === 'joined' ? 'No joined challenges' : 'No completed challenges'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new challenges
            </Text>
          </View>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: `${colors.primary}15`,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  challengeCard: {
    marginBottom: spacing.md,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  challengeInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  challengeTitle: {
    ...typography.h4,
    color: colors.text,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.warning}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pointsText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.warning,
  },
  challengeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  challengeDetails: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-start',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  joinedText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '500',
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
