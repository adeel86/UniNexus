import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';
import { colors } from '../config/theme';

export default function OfflineBanner() {
  const { isConnected, pendingActionsCount, syncPendingActions } = useNetwork();

  if (isConnected && pendingActionsCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, !isConnected ? styles.offline : styles.syncing]}>
      <View style={styles.content}>
        <Ionicons
          name={isConnected ? 'cloud-upload-outline' : 'cloud-offline-outline'}
          size={18}
          color={colors.background}
        />
        <Text style={styles.text}>
          {!isConnected
            ? 'No internet connection'
            : `${pendingActionsCount} pending action${pendingActionsCount > 1 ? 's' : ''}`}
        </Text>
      </View>
      {isConnected && pendingActionsCount > 0 && (
        <Pressable onPress={syncPendingActions} style={styles.syncButton}>
          <Text style={styles.syncText}>Sync Now</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  syncing: {
    backgroundColor: '#F59E0B',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  syncText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
});
