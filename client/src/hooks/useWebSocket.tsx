import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface Notification {
  type: 'post' | 'comment' | 'like' | 'answer' | 'event' | 'achievement';
  userId: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const hasShownErrorRef = useRef(false);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user?.uid) return;

    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log('WebSocket connected');
      reconnectAttemptsRef.current = 0;
      hasShownErrorRef.current = false;
      
      // Get Firebase ID token and authenticate the connection
      try {
        const token = await user.getIdToken();
        ws.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
      } catch (error) {
        console.error('Failed to get Firebase token:', error);
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('WebSocket authenticated');
          return;
        }

        if (data.notificationType === 'notification') {
          const notification: Notification = data;
          
          // Show toast notification
          toast({
            title: getNotificationTitle(notification.type),
            description: notification.message,
          });

          // Invalidate relevant queries to refresh data
          invalidateQueriesForNotification(notification);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      
      // Only show error toast once after multiple failed attempts
      if (reconnectAttemptsRef.current >= 3 && !hasShownErrorRef.current) {
        hasShownErrorRef.current = true;
        toast({
          title: "Connection Error",
          description: "Unable to establish real-time connection. Retrying...",
          variant: "destructive",
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      reconnectAttemptsRef.current++;
      
      // Only attempt to reconnect if below max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [user?.uid, toast]);

  useEffect(() => {
    if (user?.uid) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    };
  }, [user?.uid, connect]);

  return wsRef.current;
}

function getNotificationTitle(type: Notification['type']): string {
  const titles = {
    post: 'New Post',
    comment: 'New Comment',
    like: 'New Like',
    answer: 'New Answer',
    event: 'Event Reminder',
    achievement: 'Achievement Unlocked'
  };
  return titles[type] || 'Notification';
}

function invalidateQueriesForNotification(notification: Notification) {
  switch (notification.type) {
    case 'post':
    case 'comment':
    case 'like':
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      break;
    case 'answer':
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      break;
    case 'event':
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      break;
    case 'achievement':
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      break;
  }
}
