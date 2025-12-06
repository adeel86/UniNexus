import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '../config/theme';
import { apiRequest } from '../config/api';
import { Card, CardContent, Avatar, Badge, Button } from '../components/ui';
import type { User, Connection } from '../config/types';

type TabType = 'discover' | 'connections' | 'requests';

export default function NetworkScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: discoverUsers = [], refetch: refetchDiscover } = useQuery<User[]>({
    queryKey: ['/api/discover/users'],
    enabled: activeTab === 'discover',
  });

  const { data: connections = [], refetch: refetchConnections } = useQuery<Connection[]>({
    queryKey: ['/api/connections'],
    enabled: activeTab === 'connections',
  });

  const { data: requests = [], refetch: refetchRequests } = useQuery<Connection[]>({
    queryKey: ['/api/connections/requests'],
    enabled: activeTab === 'requests',
  });

  const connectMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('/api/connections/request', {
        method: 'POST',
        body: JSON.stringify({ addresseeId: userId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discover/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/requests'] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: number; accept: boolean }) => {
      return apiRequest('/api/connections/' + connectionId + '/respond', {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/requests'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'discover') await refetchDiscover();
    else if (activeTab === 'connections') await refetchConnections();
    else await refetchRequests();
    setRefreshing(false);
  }, [activeTab, refetchDiscover, refetchConnections, refetchRequests]);

  const filteredConnections = connections.filter(conn => {
    if (!searchQuery) return true;
    const user = conn.addressee || conn.requester;
    const name = user?.displayName || `${user?.firstName} ${user?.lastName}`;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderUserCard = (user: User, showConnect = false) => (
    <Card style={styles.userCard} key={user.id}>
      <CardContent>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => navigation.navigate('Profile', { userId: user.id })}
        >
          <Avatar uri={user.avatarUrl} name={user.displayName || user.firstName} size="lg" />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.displayName || `${user.firstName} ${user.lastName}`}
            </Text>
            <View style={styles.userMeta}>
              <Badge variant="outline" size="sm">{user.role}</Badge>
              {user.university && (
                <Text style={styles.userUniversity} numberOfLines={1}>
                  {user.university}
                </Text>
              )}
            </View>
            {user.bio && (
              <Text style={styles.userBio} numberOfLines={2}>{user.bio}</Text>
            )}
          </View>
        </TouchableOpacity>
        {showConnect && (
          <View style={styles.actionRow}>
            <Button
              title="Connect"
              size="sm"
              onPress={() => connectMutation.mutate(user.id)}
              loading={connectMutation.isPending}
            />
          </View>
        )}
      </CardContent>
    </Card>
  );

  const renderConnectionCard = (connection: Connection) => {
    const user = connection.addressee || connection.requester;
    if (!user) return null;
    return renderUserCard(user);
  };

  const renderRequestCard = (connection: Connection) => {
    const user = connection.requester;
    if (!user) return null;
    return (
      <Card style={styles.userCard} key={connection.id}>
        <CardContent>
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => navigation.navigate('Profile', { userId: user.id })}
          >
            <Avatar uri={user.avatarUrl} name={user.displayName || user.firstName} size="lg" />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.displayName || `${user.firstName} ${user.lastName}`}
              </Text>
              <Badge variant="outline" size="sm">{user.role}</Badge>
            </View>
          </TouchableOpacity>
          <View style={styles.requestActions}>
            <Button
              title="Accept"
              size="sm"
              onPress={() => respondMutation.mutate({ connectionId: connection.id, accept: true })}
            />
            <Button
              title="Decline"
              variant="outline"
              size="sm"
              onPress={() => respondMutation.mutate({ connectionId: connection.id, accept: false })}
            />
          </View>
        </CardContent>
      </Card>
    );
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'discover', label: 'Discover', icon: 'compass' },
    { key: 'connections', label: 'My Network', icon: 'people' },
    { key: 'requests', label: 'Requests', icon: 'person-add' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Network</Text>
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

      {activeTab === 'connections' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search connections..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <FlatList
        data={
          activeTab === 'discover'
            ? discoverUsers
            : activeTab === 'connections'
            ? filteredConnections
            : requests
        }
        renderItem={({ item }) => {
          if (activeTab === 'discover') return renderUserCard(item as User, true);
          if (activeTab === 'requests') return renderRequestCard(item as Connection);
          return renderConnectionCard(item as Connection);
        }}
        keyExtractor={(item: any) => item.id.toString()}
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
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'discover' ? 'No users to discover' :
               activeTab === 'connections' ? 'No connections yet' : 'No pending requests'}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  userUniversity: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  userBio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
