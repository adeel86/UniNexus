import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, Trash2, Award, MessageSquare, Heart, Trophy, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Notification } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function Notifications() {
  const { userData } = useAuth();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    },
    onError: (_, notificationId) => {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
      toast({ title: "Failed to mark notification as read", variant: "destructive" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/notifications/mark-all-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: "All notifications marked as read" });
    },
    onError: () => {
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      return apiRequest("DELETE", `/api/notifications/${notificationId}`, {});
    },
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
      toast({ title: "Notification deleted" });
    },
    onError: (_, notificationId) => {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
      toast({ title: "Failed to delete notification", variant: "destructive" });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/notifications/clear-all`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: "All notifications cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear notifications", variant: "destructive" });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'badge':
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'reaction':
        return <Heart className="h-5 w-5 text-pink-500" />;
      case 'challenge':
        return <Trophy className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activities
            {unreadCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({unreadCount} unread)
              </span>
            )}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Are you sure you want to clear all notifications?")) {
                  clearAllMutation.mutate();
                }
              }}
              disabled={clearAllMutation.isPending}
              data-testid="button-clear-all"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification: Notification) => (
            <Card
              key={notification.id}
              className={`hover-elevate cursor-pointer ${
                !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
              }`}
              data-testid={`notification-${notification.id}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div 
                    className="flex-1 flex gap-3 min-w-0"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={processingIds.has(notification.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notification.id);
                        }}
                        title="Mark as read"
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        {processingIds.has(notification.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      disabled={processingIds.has(notification.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate(notification.id);
                      }}
                      title="Delete notification"
                      data-testid={`button-delete-notification-${notification.id}`}
                    >
                      {processingIds.has(notification.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
