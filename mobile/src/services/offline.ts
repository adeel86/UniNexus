import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { QueryClient } from '@tanstack/react-query';

const CACHE_PREFIX = '@uninexus_cache_';
const DRAFT_PREFIX = '@uninexus_draft_';
const PENDING_QUEUE_KEY = '@uninexus_pending_queue';

export interface CachedData<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface PendingAction {
  id: string;
  type: 'post' | 'comment' | 'message' | 'reaction';
  endpoint: string;
  method: string;
  body: string;
  createdAt: number;
  retries: number;
}

const DEFAULT_CACHE_DURATION = 1000 * 60 * 60;
const FEED_CACHE_DURATION = 1000 * 60 * 30;
const MESSAGES_CACHE_DURATION = 1000 * 60 * 15;
const MAX_RETRIES = 3;

export async function cacheData<T>(
  key: string,
  data: T,
  duration: number = DEFAULT_CACHE_DURATION
): Promise<void> {
  const cacheEntry: CachedData<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + duration,
  };
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry));
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const cacheEntry: CachedData<T> = JSON.parse(cached);
    
    if (Date.now() > cacheEntry.expiresAt) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export async function clearCache(pattern?: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => {
    if (!key.startsWith(CACHE_PREFIX)) return false;
    if (pattern) {
      return key.includes(pattern);
    }
    return true;
  });
  await AsyncStorage.multiRemove(cacheKeys);
}

export async function saveDraft(type: 'post' | 'comment' | 'message', content: string, metadata?: Record<string, any>): Promise<void> {
  const draft = {
    content,
    metadata,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(`${DRAFT_PREFIX}${type}`, JSON.stringify(draft));
}

export async function getDraft(type: 'post' | 'comment' | 'message'): Promise<{ content: string; metadata?: Record<string, any> } | null> {
  try {
    const draft = await AsyncStorage.getItem(`${DRAFT_PREFIX}${type}`);
    if (!draft) return null;
    return JSON.parse(draft);
  } catch {
    return null;
  }
}

export async function clearDraft(type: 'post' | 'comment' | 'message'): Promise<void> {
  await AsyncStorage.removeItem(`${DRAFT_PREFIX}${type}`);
}

export async function addToPendingQueue(action: Omit<PendingAction, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const queue = await getPendingQueue();
  const newAction: PendingAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  queue.push(newAction);
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
}

export async function getPendingQueue(): Promise<PendingAction[]> {
  try {
    const queue = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

export async function removeFromPendingQueue(id: string): Promise<void> {
  const queue = await getPendingQueue();
  const filtered = queue.filter((action) => action.id !== id);
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
}

const FAILED_QUEUE_KEY = '@uninexus_failed_queue';

export async function processPendingQueue(
  apiRequest: (endpoint: string, options: RequestInit) => Promise<any>
): Promise<{ success: number; failed: number }> {
  const queue = await getPendingQueue();
  let success = 0;
  let failed = 0;

  for (const action of queue) {
    try {
      await apiRequest(action.endpoint, {
        method: action.method,
        body: action.body,
      });
      await removeFromPendingQueue(action.id);
      success++;
    } catch (error) {
      action.retries++;
      if (action.retries >= MAX_RETRIES) {
        await removeFromPendingQueue(action.id);
        await addToFailedQueue(action);
        failed++;
      } else {
        const updatedQueue = await getPendingQueue();
        const index = updatedQueue.findIndex((a) => a.id === action.id);
        if (index >= 0) {
          updatedQueue[index] = action;
          await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(updatedQueue));
        }
      }
    }
  }

  return { success, failed };
}

async function addToFailedQueue(action: PendingAction): Promise<void> {
  try {
    const failedRaw = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
    const failedQueue: PendingAction[] = failedRaw ? JSON.parse(failedRaw) : [];
    failedQueue.push(action);
    await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(failedQueue));
  } catch (error) {
    console.error('Failed to save to failed queue:', error);
  }
}

export async function getFailedQueue(): Promise<PendingAction[]> {
  try {
    const queue = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

export async function clearFailedQueue(): Promise<void> {
  await AsyncStorage.removeItem(FAILED_QUEUE_KEY);
}

export function getCacheDuration(queryKey: string): number {
  if (queryKey.includes('/api/posts')) {
    return FEED_CACHE_DURATION;
  }
  if (queryKey.includes('/api/conversations') || queryKey.includes('/api/messages')) {
    return MESSAGES_CACHE_DURATION;
  }
  return DEFAULT_CACHE_DURATION;
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function subscribeToNetworkChanges(
  callback: (isConnected: boolean) => void
): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    callback(state.isConnected === true && state.isInternetReachable !== false);
  });
}

function serializeQueryKey(queryKey: readonly unknown[]): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return queryKey.map((k) => (typeof k === 'object' ? JSON.stringify(k) : String(k))).join('_');
  }
}

export function setupOfflineQueryClient(queryClient: QueryClient): void {
  queryClient.getQueryCache().subscribe(async (event) => {
    if (event.type === 'updated' && event.query.state.status === 'success') {
      const queryKey = event.query.queryKey;
      if (typeof queryKey[0] === 'string') {
        const key = serializeQueryKey(queryKey);
        const duration = getCacheDuration(queryKey[0]);
        try {
          await cacheData(key, event.query.state.data, duration);
        } catch (error) {
          console.warn('Failed to cache query data:', error);
        }
      }
    }
  });
}
