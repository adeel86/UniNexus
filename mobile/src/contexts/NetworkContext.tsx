import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { subscribeToNetworkChanges, isOnline, processPendingQueue, getPendingQueue } from '../services/offline';
import { apiRequest } from '../config/api';

interface NetworkContextType {
  isConnected: boolean;
  pendingActionsCount: number;
  syncPendingActions: () => Promise<{ success: number; failed: number }>;
  refreshPendingCount: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const queue = await getPendingQueue();
    setPendingActionsCount(queue.length);
  }, []);

  const syncPendingActions = useCallback(async () => {
    const result = await processPendingQueue(apiRequest);
    await refreshPendingCount();
    return result;
  }, [refreshPendingCount]);

  useEffect(() => {
    isOnline().then(setIsConnected);

    const unsubscribe = subscribeToNetworkChanges((connected) => {
      setIsConnected(connected);
      if (connected) {
        syncPendingActions();
      }
    });

    refreshPendingCount();

    return unsubscribe;
  }, [syncPendingActions, refreshPendingCount]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        pendingActionsCount,
        syncPendingActions,
        refreshPendingCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
