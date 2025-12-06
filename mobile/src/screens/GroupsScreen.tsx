import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { apiRequest } from '../config/api';
import { Card, CardContent, Badge, Button } from '../components/ui';
import type { Group } from '../config/types';

type TabType = 'my-groups' | 'discover';

interface GroupWithMembership extends Group {
  isMember: boolean;
}

export default function GroupsScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('my-groups');
  const [refreshing, setRefreshing] = useState(false);

  const { data: myGroups = [], refetch: refetchMyGroups } = useQuery<Group[]>({
    queryKey: ['/api/groups/my'],
    enabled: activeTab === 'my-groups',
  });

  const { data: discoverGroups = [], refetch: refetchDiscover } = useQuery<GroupWithMembership[]>({
    queryKey: ['/api/groups/discover'],
    enabled: activeTab === 'discover',
  });

  const joinMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return apiRequest('/api/groups/' + groupId + '/join', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/discover'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'my-groups') {
      await refetchMyGroups();
    } else {
      await refetchDiscover();
    }
    setRefreshing(false);
  }, [activeTab, refetchMyGroups, refetchDiscover]);

  const renderGroupCard = ({ item: group }: { item: Group | GroupWithMembership }) => {
    const groupWithMembership = group as GroupWithMembership;
    const showJoinButton = activeTab === 'discover' && !groupWithMembership.isMember;

    return (
      <Card style={styles.groupCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
          activeOpacity={0.7}
        >
          <View style={styles.groupHeader}>
            {group.imageUrl ? (
              <Image source={{ uri: group.imageUrl }} style={styles.groupImage} />
            ) : (
              <View style={[styles.groupImage, styles.placeholderImage]}>
                <Ionicons name="people" size={32} color={colors.textLight} />
              </View>
            )}
            <View style={styles.groupInfo}>
              <Text style={styles.groupName} numberOfLines={1}>
                {group.name}
              </Text>
              <View style={styles.groupMeta}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.memberCount}>{group.memberCount} members</Text>
                {group.isPrivate && (
                  <Badge variant="outline" size="sm">
                    <Ionicons name="lock-closed" size={10} color={colors.textSecondary} />
                    {' Private'}
                  </Badge>
                )}
              </View>
            </View>
          </View>
          {group.description && (
            <Text style={styles.groupDescription} numberOfLines={2}>
              {group.description}
            </Text>
          )}
        </TouchableOpacity>
        {showJoinButton && (
          <View style={styles.joinButtonContainer}>
            <Button
              title="Join Group"
              size="sm"
              onPress={() => joinMutation.mutate(group.id)}
              loading={joinMutation.isPending}
            />
          </View>
        )}
      </Card>
    );
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'my-groups', label: 'My Groups', icon: 'people' },
    { key: 'discover', label: 'Discover', icon: 'compass' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Groups</Text>
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
        data={activeTab === 'my-groups' ? myGroups : discoverGroups}
        renderItem={renderGroupCard}
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
            <Ionicons name="people-circle-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'my-groups' ? 'No groups joined' : 'No groups to discover'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'my-groups'
                ? 'Browse and join groups to connect with others'
                : 'Check back later for new groups'}
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
  groupCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  placeholderImage: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  memberCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  groupDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  joinButtonContainer: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
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
