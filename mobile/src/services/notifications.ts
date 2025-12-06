import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../config/api';

const PUSH_TOKEN_KEY = '@uninexus_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.log('Project ID not found - push notifications may not work in development');
      const expoPushToken = await Notifications.getExpoPushTokenAsync();
      token = expoPushToken.data;
    } else {
      const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
      token = expoPushToken.data;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Notifications for new messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#EC4899',
      });

      await Notifications.setNotificationChannelAsync('social', {
        name: 'Social',
        description: 'Likes, comments, and social interactions',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#3B82F6',
      });
    }

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    
    try {
      await apiRequest('/api/push-tokens', {
        method: 'POST',
        body: JSON.stringify({ token, platform: Platform.OS }),
      });
    } catch (error) {
      console.log('Could not register push token with backend:', error);
    }

  } catch (error) {
    console.log('Error getting push token:', error);
  }

  return token;
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function getBadgeCountAsync(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCountAsync(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function cancelAllNotificationsAsync(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export interface NotificationData {
  type: 'message' | 'comment' | 'reaction' | 'connection' | 'badge' | 'challenge' | 'endorsement' | 'course';
  id?: number;
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

export function parseNotificationData(notification: Notifications.Notification): NotificationData | null {
  const data = notification.request.content.data;
  if (!data) return null;

  return {
    type: data.type as NotificationData['type'],
    id: data.id as number | undefined,
    title: notification.request.content.title ?? undefined,
    body: notification.request.content.body ?? undefined,
    data: data as Record<string, any>,
  };
}

export function getNavigationTarget(notificationData: NotificationData): { screen: string; params?: Record<string, any> } | null {
  switch (notificationData.type) {
    case 'message':
      return {
        screen: 'Chat',
        params: { 
          conversationId: notificationData.id,
          recipientName: notificationData.data?.recipientName ?? 'User',
        },
      };
    case 'comment':
    case 'reaction':
      return {
        screen: 'PostDetail',
        params: { postId: notificationData.id },
      };
    case 'connection':
      return {
        screen: 'ProfileView',
        params: { userId: notificationData.id },
      };
    case 'challenge':
      return {
        screen: 'ChallengeDetail',
        params: { challengeId: notificationData.id },
      };
    case 'course':
      return {
        screen: 'CourseDetail',
        params: { courseId: notificationData.id },
      };
    case 'badge':
    case 'endorsement':
      return { screen: 'MainTabs' };
    default:
      return null;
  }
}
