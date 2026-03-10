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

export interface MenuItem {
  icon: any;
  label: string;
  path: string;
  color?: string;
}

/**
 * Navigation configuration for each role.
 * Items are listed in the order they should appear.
 * Mobile and Desktop navbars use this same config to stay in sync.
 */
export const navigationConfig: Record<string, MenuItem[]> = {
  student: [
    { icon: Home, label: "Feed", path: "/student-feed", color: "from-blue-500 to-blue-600" },
    { icon: Network, label: "My Network", path: "/network", color: "from-purple-500 to-purple-600" },
    { icon: Search, label: "Discover", path: "/discovery", color: "from-teal-500 to-teal-600" },
    { icon: Send, label: "Messages", path: "/messages", color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound, label: "Groups", path: "/groups", color: "from-orange-500 to-orange-600" },
    { icon: GraduationCap, label: "My Courses", path: "/courses", color: "from-green-500 to-green-600" },
    { icon: Brain, label: "AI Tutor", path: "/personal-tutor", color: "from-indigo-500 to-indigo-600" },
    { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", color: "from-yellow-500 to-yellow-600" },
    { icon: HelpCircle, label: "Q&A", path: "/problem-solving", color: "from-amber-500 to-amber-600" },
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard", color: "from-red-500 to-red-600" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "from-pink-500 to-pink-600" },
    { icon: User, label: "Profile", path: "/profile", color: "from-gray-500 to-gray-600" },
    { icon: Settings, label: "Settings", path: "/settings", color: "from-slate-500 to-slate-600" },
    { icon: LogOut, label: "Logout", path: "/logout", color: "from-red-500 to-red-600" },
  ],

  teacher: [
    { icon: Home, label: "Dashboard", path: "/teacher-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Network, label: "My Network", path: "/network", color: "from-purple-500 to-purple-600" },
    { icon: Search, label: "Discover", path: "/discovery", color: "from-teal-500 to-teal-600" },
    { icon: Send, label: "Messages", path: "/messages", color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound, label: "Groups", path: "/groups", color: "from-orange-500 to-orange-600" },
    { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", color: "from-yellow-500 to-yellow-600" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "from-pink-500 to-pink-600" },
    { icon: User, label: "Profile", path: "/profile", color: "from-gray-500 to-gray-600" },
    { icon: Settings, label: "Settings", path: "/settings", color: "from-slate-500 to-slate-600" },
    { icon: LogOut, label: "Logout", path: "/logout", color: "from-red-500 to-red-600" },
  ],

  university_admin: [
    { icon: Home, label: "Dashboard", path: "/university-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Network, label: "My Network", path: "/network", color: "from-purple-500 to-purple-600" },
    { icon: Search, label: "Discover", path: "/discovery", color: "from-teal-500 to-teal-600" },
    { icon: Send, label: "Messages", path: "/messages", color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound, label: "Groups", path: "/groups", color: "from-orange-500 to-orange-600" },
    { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", color: "from-yellow-500 to-yellow-600" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "from-pink-500 to-pink-600" },
    { icon: User, label: "Profile", path: "/profile", color: "from-gray-500 to-gray-600" },
    { icon: Settings, label: "Settings", path: "/settings", color: "from-slate-500 to-slate-600" },
    { icon: LogOut, label: "Logout", path: "/logout", color: "from-red-500 to-red-600" },
  ],

  industry_professional: [
    { icon: Home, label: "Dashboard", path: "/industry-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Network, label: "My Network", path: "/network", color: "from-purple-500 to-purple-600" },
    { icon: Search, label: "Discover", path: "/discovery", color: "from-teal-500 to-teal-600" },
    { icon: Send, label: "Messages", path: "/messages", color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound, label: "Groups", path: "/groups", color: "from-orange-500 to-orange-600" },
    { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", color: "from-yellow-500 to-yellow-600" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "from-pink-500 to-pink-600" },
    { icon: User, label: "Profile", path: "/profile", color: "from-gray-500 to-gray-600" },
    { icon: Settings, label: "Settings", path: "/settings", color: "from-slate-500 to-slate-600" },
    { icon: LogOut, label: "Logout", path: "/logout", color: "from-red-500 to-red-600" },
  ],

  master_admin: [
    { icon: Home, label: "Dashboard", path: "/master-admin-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Shield, label: "Admin Panel", path: "/admin", color: "from-red-600 to-red-700" },
    { icon: BarChart, label: "Analytics", path: "/analytics", color: "from-purple-500 to-purple-600" },
    { icon: Lightbulb, label: "AI Career Bot", path: "/careerbot", color: "from-yellow-500 to-yellow-600" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "from-pink-500 to-pink-600" },
    { icon: Settings, label: "Settings", path: "/settings", color: "from-slate-500 to-slate-600" },
    { icon: LogOut, label: "Logout", path: "/logout", color: "from-red-500 to-red-600" },
  ],
};

/**
 * Get navigation items for a specific role.
 * Handles role aliases (industry_partner, industry, etc.)
 */
export function getNavigationForRole(role?: string): MenuItem[] {
  if (!role) return [];

  // Handle role aliases
  if (role === "industry_partner" || role === "industry") {
    role = "industry_professional";
  }

  return navigationConfig[role] || [];
}
