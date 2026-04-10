import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getNavigationForRole } from "@/lib/navigation-config";
import type { MenuItem } from "@/lib/navigation-config";
import { cn } from "@/lib/utils";

interface MobileMenuItemProps {
  icon: any;
  label: string;
  path: string;
  color: string;
  onClick: (path: string) => void;
  notificationCount?: number;
  hasNotification?: boolean;
}

function MobileMenuItem({ icon: Icon, label, path, color, onClick, notificationCount, hasNotification }: MobileMenuItemProps) {
  return (
    <button
      onClick={() => onClick(path)}
      className="group relative flex min-h-[116px] flex-col items-center justify-center gap-2 rounded-3xl bg-card/90 p-3 shadow-sm ring-1 ring-border/70 transition-all active:scale-95"
      data-testid={`button-launch-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div
        className={cn(
          "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-md transition-shadow relative group-active:shadow-lg",
          `bg-gradient-to-br ${color}`
        )}
      >
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
        
        {/* Notification Badge */}
        {notificationCount !== undefined && notificationCount > 0 && (
          <div 
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              zIndex: 10
            }}
          >
            {notificationCount > 99 ? '99+' : notificationCount}
          </div>
        )}
        
        {hasNotification && notificationCount === undefined && (
          <div 
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '2px solid white',
              zIndex: 10
            }}
          />
        )}
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight max-w-[74px] text-foreground">
        {label}
      </span>
    </button>
  );
}

export default function MobileHome() {
  const { userData: user, signOut } = useAuth();
  const [, navigate] = useLocation();
  
  const [notificationCounts, setNotificationCounts] = useState<{
    notifications: number;
    messages: number;
    networkRequests: number;
    groups: number;
    courses: number;
  }>({
    notifications: 0,
    messages: 0,
    networkRequests: 0,
    groups: 0,
    courses: 0,
  });

  const fetchNotificationCounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const [notificationsRes, messagesRes, networkRes, groupsRes, coursesRes] = await Promise.all([
        apiRequest("GET", "/api/notifications/unread-count"),
        apiRequest("GET", "/api/unread-count"),
        apiRequest("GET", "/api/pending-count"),
        apiRequest("GET", "/api/notifications/groups/unread-count"),
        apiRequest("GET", "/api/notifications/courses/unread-count"),
      ]);

      const notificationsData = notificationsRes?.ok ? await notificationsRes.json() : { count: 0 };
      const messagesData = messagesRes?.ok ? await messagesRes.json() : { count: 0 };
      const networkData = networkRes?.ok ? await networkRes.json() : { count: 0 };
      const groupsData = groupsRes?.ok ? await groupsRes.json() : { count: 0 };
      const coursesData = coursesRes?.ok ? await coursesRes.json() : { count: 0 };

      setNotificationCounts({
        notifications: notificationsData.count || 0,
        messages: messagesData.count || 0,
        networkRequests: networkData.count || 0,
        groups: groupsData.count || 0,
        courses: coursesData.count || 0,
      });
    } catch (error) {
      // Silently fail to avoid spamming logs
    }
  }, [user]);

  useEffect(() => {
    // Fetch counts immediately when component mounts
    fetchNotificationCounts();
    
    // Also refresh every 3 seconds for real-time updates (more responsive)
    const interval = setInterval(fetchNotificationCounts, 3000);
    
    return () => clearInterval(interval);
  }, [fetchNotificationCounts]);

  if (!user) {
    return null;
  }

  const userRole = user.role;
  const availableItems = getNavigationForRole(userRole);

  const handleLogout = async () => {
    try {
      // Call logout API (fire and forget)
      await apiRequest("POST", "/api/auth/logout").catch(() => {
        // API might fail but that's okay
      });
    } catch (error) {
      // Silently handle logout errors
    }

    // Sign out from auth context (clears currentUser and userData)
    await signOut();
  };

  const handleNavigation = async (path: string) => {
    if (path === "/logout") {
      // Handle logout directly without navigating
      await handleLogout();
      // Once signOut completes, auth context will update and router will redirect to login
    } else {
      navigate(path);
      
      // Refetch counts after a short delay to ensure proper synchronization
      // This removes the badge from the icon (UI), but notifications remain unread in database
      setTimeout(() => {
        fetchNotificationCounts();
      }, 500);
    }
  };

  return (
    <div className="md:hidden min-h-screen overflow-x-hidden bg-gradient-to-b from-purple-50 via-background to-blue-50 pb-8 dark:from-purple-950/30 dark:via-background dark:to-blue-950/30">
      {/* Header */}
      <div className="px-4 pt-8 pb-5">
        <div className="rounded-[2rem] bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-6 text-white shadow-xl shadow-purple-500/20">
          <p className="text-sm font-medium text-white/80">Welcome back</p>
          <h1 className="font-heading text-3xl font-bold">UniNexus</h1>
          <p className="mt-1 text-sm text-purple-100" data-testid="text-mobile-welcome">
            Hi {user?.firstName}, choose an icon to open any feature.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 space-y-5">
      {/* Instructions Card */}
      <Card className="rounded-3xl border-purple-200/70 bg-white/80 p-4 shadow-sm dark:bg-card/80">
        <p className="text-sm text-muted-foreground text-center font-medium">
          App launcher
        </p>
      </Card>
        {/* Icon Grid - 3 columns on mobile */}
        <div className="grid grid-cols-3 gap-3">
          {availableItems.map((item) => {
            // Determine notification count for each item
            let notificationCount: number | undefined;
            let hasNotification: boolean = false;

            if (item.label === "Notifications") {
              // For notifications: show numeric count
              notificationCount = notificationCounts.notifications;
            } else if (item.label === "Messages") {
              // For messages: show dot indicator
              hasNotification = notificationCounts.messages > 0;
            } else if (item.label === "My Network") {
              // For network: show dot indicator
              hasNotification = notificationCounts.networkRequests > 0;
            } else if (item.label === "Groups") {
              // For groups: show dot indicator
              hasNotification = notificationCounts.groups > 0;
            } else if (item.label === "My Courses" || item.label === "Student Courses") {
              // For courses: show dot indicator
              hasNotification = notificationCounts.courses > 0;
            }

            return (
              <MobileMenuItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                color={item.color || "from-blue-500 to-blue-600"}
                onClick={handleNavigation}
                notificationCount={notificationCount}
                hasNotification={hasNotification}
              />
            );
          })}
        </div>

        {/* Quick Stats Card - Student Only */}
        {user?.role === "student" && user?.totalPoints !== undefined && (
          <Card className="p-4 mt-6 rounded-3xl border-purple-200/70 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {user.totalPoints || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">
                  {user.rankTier || "Bronze"}
                </div>
                <div className="text-xs text-muted-foreground">Rank Tier</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

