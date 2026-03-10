import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  Home,
  Users,
  Trophy,
  MessageSquare,
  Bell,
  User,
  BarChart,
  Building2,
  Briefcase,
  Shield,
  Brain,
  GraduationCap,
  UsersRound,
  Settings,
  Send,
  BookOpen,
  Network,
  Search,
  HelpCircle,
  LogOut,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuItem {
  icon: any;
  label: string;
  path: string;
  roles: string[];
  color?: string;
}

const mobileMenuItems: MobileMenuItem[] = [
  // Student items
  { icon: Home, label: "Feed", path: "/student-feed", roles: ["student"], color: "from-blue-500 to-blue-600" },
  { icon: Search, label: "Discover", path: "/discovery", roles: ["student"], color: "from-teal-500 to-teal-600" },
  { icon: HelpCircle, label: "Q&A", path: "/problem-solving", roles: ["student"], color: "from-amber-500 to-amber-600" },
  { icon: Network, label: "My Network", path: "/network", roles: ["student"], color: "from-purple-500 to-purple-600" },
  { icon: GraduationCap, label: "My Courses", path: "/courses", roles: ["student"], color: "from-green-500 to-green-600" },
  { icon: UsersRound, label: "Groups", path: "/groups", roles: ["student"], color: "from-orange-500 to-orange-600" },
  { icon: Brain, label: "AI Tutor", path: "/personal-tutor", roles: ["student"], color: "from-indigo-500 to-indigo-600" },
  { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", roles: ["student"], color: "from-yellow-500 to-yellow-600" },
  { icon: BarChart, label: "Leaderboard", path: "/leaderboard", roles: ["student"], color: "from-red-500 to-red-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["student"], color: "from-pink-500 to-pink-600" },
  { icon: Send, label: "Messages", path: "/messages", roles: ["student"], color: "from-cyan-500 to-cyan-600" },
  { icon: User, label: "Profile", path: "/profile", roles: ["student"], color: "from-gray-500 to-gray-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["student"], color: "from-slate-500 to-slate-600" },
  { icon: LogOut, label: "Logout", path: "/logout", roles: ["student"], color: "from-red-500 to-red-600" },

  // Teacher items
  { icon: Home, label: "Dashboard", path: "/teacher-dashboard", roles: ["teacher"], color: "from-blue-500 to-blue-600" },
  { icon: BookOpen, label: "My Courses", path: "/teacher-courses", roles: ["teacher"], color: "from-green-500 to-green-600" },
  { icon: Users, label: "My Students", path: "/network", roles: ["teacher"], color: "from-purple-500 to-purple-600" },
  { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", roles: ["teacher"], color: "from-yellow-500 to-yellow-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["teacher"], color: "from-pink-500 to-pink-600" },
  { icon: Send, label: "Messages", path: "/messages", roles: ["teacher"], color: "from-cyan-500 to-cyan-600" },
  { icon: User, label: "Profile", path: "/profile", roles: ["teacher"], color: "from-gray-500 to-gray-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["teacher"], color: "from-slate-500 to-slate-600" },
  { icon: LogOut, label: "Logout", path: "/logout", roles: ["teacher"], color: "from-red-500 to-red-600" },

  // University Admin items
  { icon: Home, label: "Dashboard", path: "/university-dashboard", roles: ["university_admin"], color: "from-blue-500 to-blue-600" },
  { icon: Users, label: "Network", path: "/network", roles: ["university_admin"], color: "from-purple-500 to-purple-600" },
  { icon: Building2, label: "Institution", path: "/university-admin", roles: ["university_admin"], color: "from-amber-600 to-amber-700" },
  { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", roles: ["university_admin"], color: "from-yellow-500 to-yellow-600" },
  { icon: Send, label: "Messages", path: "/messages", roles: ["university_admin"], color: "from-cyan-500 to-cyan-600" },
  { icon: UsersRound, label: "Groups", path: "/groups", roles: ["university_admin"], color: "from-orange-500 to-orange-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["university_admin"], color: "from-pink-500 to-pink-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["university_admin"], color: "from-slate-500 to-slate-600" },
  { icon: LogOut, label: "Logout", path: "/logout", roles: ["university_admin"], color: "from-red-500 to-red-600" },

  // Industry Professional items
  { icon: Home, label: "Dashboard", path: "/industry-dashboard", roles: ["industry_professional"], color: "from-blue-500 to-blue-600" },
  { icon: Briefcase, label: "Opportunities", path: "/opportunities", roles: ["industry_professional"], color: "from-teal-500 to-teal-600" },
  { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", roles: ["industry_professional"], color: "from-yellow-500 to-yellow-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["industry_professional"], color: "from-pink-500 to-pink-600" },
  { icon: User, label: "Profile", path: "/profile", roles: ["industry_professional"], color: "from-gray-500 to-gray-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["industry_professional"], color: "from-slate-500 to-slate-600" },
  { icon: LogOut, label: "Logout", path: "/logout", roles: ["industry_professional"], color: "from-red-500 to-red-600" },

  // Master Admin items
  { icon: Home, label: "Dashboard", path: "/master-admin-dashboard", roles: ["master_admin"], color: "from-blue-500 to-blue-600" },
  { icon: Shield, label: "Admin Panel", path: "/admin", roles: ["master_admin"], color: "from-red-600 to-red-700" },
  { icon: BarChart, label: "Analytics", path: "/analytics", roles: ["master_admin"], color: "from-purple-500 to-purple-600" },
  { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", roles: ["master_admin"], color: "from-yellow-500 to-yellow-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["master_admin"], color: "from-pink-500 to-pink-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["master_admin"], color: "from-slate-500 to-slate-600" },
  { icon: LogOut, label: "Logout", path: "/logout", roles: ["master_admin"], color: "from-red-500 to-red-600" },
];

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
      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:opacity-80 transition-opacity active:scale-95 relative"
    >
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md hover:shadow-lg transition-shadow relative",
          `bg-gradient-to-br ${color}`
        )}
      >
        <Icon className="w-8 h-8" />
        
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
      <span className="text-xs font-semibold text-center leading-tight max-w-[70px] text-foreground">
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

  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        const [notificationsRes, messagesRes, networkRes, groupsRes, coursesRes] = await Promise.all([
          apiRequest("GET", "/api/notifications/unread-count"),
          apiRequest("GET", "/api/unread-count"),
          apiRequest("GET", "/api/connections/pending-count"),
          apiRequest("GET", "/api/notifications/groups/unread-count"),
          apiRequest("GET", "/api/notifications/courses/unread-count"),
        ]);

        const notificationsData = notificationsRes ? await notificationsRes.json() : { count: 0 };
        const messagesData = messagesRes ? await messagesRes.json() : { count: 0 };
        const networkData = networkRes ? await networkRes.json() : { count: 0 };
        const groupsData = groupsRes ? await groupsRes.json() : { count: 0 };
        const coursesData = coursesRes ? await coursesRes.json() : { count: 0 };

        setNotificationCounts({
          notifications: notificationsData.count || 0,
          messages: messagesData.count || 0,
          networkRequests: networkData.count || 0,
          groups: groupsData.count || 0,
          courses: coursesData.count || 0,
        });
      } catch (error) {
        console.error("Failed to fetch notification counts:", error);
      }
    };

    if (user) {
      fetchNotificationCounts();
      // Refresh every 30 seconds
      const interval = setInterval(fetchNotificationCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const userRole = user.role;
  const availableItems = mobileMenuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    try {
      // Call logout API (fire and forget)
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {
        // API might fail but that's okay
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
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
      // Clear notification indicators from UI when navigating to those pages
      // NOTE: We only clear the UI indicator, NOT mark as read in database
      // Users should read individual notifications to mark them as read
      if (path === "/notifications") {
        // Only clear the UI indicator - do NOT mark notifications as read
        setNotificationCounts(prev => ({ ...prev, notifications: 0 }));
      } else if (path === "/messages") {
        // Clear message count when viewing messages
        setNotificationCounts(prev => ({ ...prev, messages: 0 }));
      } else if (path === "/network") {
        // Clear network request count when viewing network
        setNotificationCounts(prev => ({ ...prev, networkRequests: 0 }));
      } else if (path === "/groups") {
        // Clear group notification count when viewing groups
        setNotificationCounts(prev => ({ ...prev, groups: 0 }));
      } else if (path === "/courses" || path === "/teacher-courses" || path === "/my-courses") {
        // Clear course notification count when viewing courses
        setNotificationCounts(prev => ({ ...prev, courses: 0 }));
      }
      navigate(path);
    }
  };

  return (
    <div className="md:hidden min-h-screen bg-gradient-to-b from-background to-background/95 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 pt-8 pb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1">UniNexus</h1>
          <p className="text-purple-100">Welcome, {user?.firstName}! 👋</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-6 space-y-4">
      {/* Instructions Card */}
      <Card className="p-3 bg-blue-50/50 border-blue-200 mx-1">
        <p className="text-xs text-blue-900 text-center font-medium">
          Tap any icon to access features
        </p>
      </Card>        {/* Icon Grid - 3 columns on mobile */}
        <div className="grid grid-cols-3 gap-3 px-1">
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
          <Card className="p-4 mt-6 border-l-4 border-purple-500 mx-1">
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

