import {
  Home,
  Bell,
  User,
  Brain,
  Trophy,
  GraduationCap,
  UsersRound,
  Settings,
  Send,
  Network,
  Search,
  HelpCircle,
  LogOut,
  Lightbulb,
  Map,
  ShieldCheck,
  FileText,
  Users,
  Star,
} from "lucide-react";
import { normalizeRole, type RoleCode } from "@shared/roles";

export interface MenuItem {
  icon: any;
  label: string;
  path: string;
  color?: string;
}

/**
 * Navigation configuration for each role.
 * Items are listed in the order they should appear on the icon launcher.
 * Mobile and Desktop navbars use this same config to stay in sync.
 */
export const navigationConfig: Record<RoleCode, MenuItem[]> = {
  student: [
    { icon: Home,          label: "Feed",          path: "/student-feed",    color: "from-blue-500 to-blue-600" },
    { icon: Network,       label: "My Network",    path: "/network",         color: "from-purple-500 to-purple-600" },
    { icon: Search,        label: "Discover",      path: "/discovery",       color: "from-teal-500 to-teal-600" },
    { icon: Send,          label: "Messages",      path: "/messages",        color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound,    label: "Groups",        path: "/groups",          color: "from-orange-500 to-orange-600" },
    { icon: GraduationCap, label: "My Courses",    path: "/courses",         color: "from-green-500 to-green-600" },
    { icon: Users,         label: "My Teachers",   path: "/my-teachers",     color: "from-violet-500 to-violet-600" },
    { icon: Trophy,        label: "Challenges",    path: "/challenges",      color: "from-red-500 to-red-600" },
    { icon: Map,           label: "Challenge Map", path: "/challenges/map",  color: "from-emerald-500 to-emerald-600" },
    { icon: Star,          label: "Leaderboard",   path: "/leaderboard",     color: "from-yellow-500 to-yellow-600" },
    { icon: Brain,         label: "AI Tutor",      path: "/personal-tutor",  color: "from-indigo-500 to-indigo-600" },
    { icon: Lightbulb,     label: "AI Career",     path: "/careerbot",       color: "from-amber-500 to-amber-600" },
    { icon: HelpCircle,    label: "Q&A",           path: "/problem-solving", color: "from-lime-500 to-lime-600" },
    { icon: Bell,          label: "Notifications", path: "/notifications",   color: "from-pink-500 to-pink-600" },
    { icon: User,          label: "Profile",       path: "/profile",         color: "from-gray-500 to-gray-600" },
    { icon: Settings,      label: "Settings",      path: "/settings",        color: "from-slate-500 to-slate-600" },
    { icon: LogOut,        label: "Logout",        path: "/logout",          color: "from-rose-500 to-rose-600" },
  ],

  teacher: [
    { icon: Home,       label: "Dashboard",     path: "/teacher-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Users,      label: "My Students",   path: "/my-students",       color: "from-violet-500 to-violet-600" },
    { icon: Network,    label: "My Network",    path: "/network",           color: "from-purple-500 to-purple-600" },
    { icon: Search,     label: "Discover",      path: "/discovery",         color: "from-teal-500 to-teal-600" },
    { icon: Send,       label: "Messages",      path: "/messages",          color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound, label: "Groups",        path: "/groups",            color: "from-orange-500 to-orange-600" },
    { icon: Trophy,     label: "Challenges",    path: "/challenges",        color: "from-red-500 to-red-600" },
    { icon: Map,        label: "Challenge Map", path: "/challenges/map",    color: "from-emerald-500 to-emerald-600" },
    { icon: Star,       label: "Leaderboard",   path: "/leaderboard",       color: "from-yellow-500 to-yellow-600" },
    { icon: Lightbulb,  label: "AI Career",     path: "/careerbot",         color: "from-amber-500 to-amber-600" },
    { icon: Bell,       label: "Notifications", path: "/notifications",     color: "from-pink-500 to-pink-600" },
    { icon: User,       label: "Profile",       path: "/profile",           color: "from-gray-500 to-gray-600" },
    { icon: Settings,   label: "Settings",      path: "/settings",          color: "from-slate-500 to-slate-600" },
    { icon: LogOut,     label: "Logout",        path: "/logout",            color: "from-rose-500 to-rose-600" },
  ],

  university: [
    { icon: Home,          label: "Dashboard",     path: "/university-dashboard",   color: "from-blue-500 to-blue-600" },
    { icon: GraduationCap, label: "Teachers",      path: "/university-teachers",    color: "from-green-500 to-green-600" },
    { icon: Network,       label: "My Network",    path: "/network",                color: "from-purple-500 to-purple-600" },
    { icon: Search,        label: "Discover",      path: "/discovery",              color: "from-teal-500 to-teal-600" },
    { icon: Send,          label: "Messages",      path: "/messages",               color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound,    label: "Groups",        path: "/groups",                 color: "from-orange-500 to-orange-600" },
    { icon: Trophy,        label: "Challenges",    path: "/challenges",             color: "from-red-500 to-red-600" },
    { icon: Map,           label: "Challenge Map", path: "/challenges/map",          color: "from-emerald-500 to-emerald-600" },
    { icon: Star,          label: "Leaderboard",   path: "/university-leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: Lightbulb,     label: "AI Career",     path: "/careerbot",              color: "from-amber-500 to-amber-600" },
    { icon: Bell,          label: "Notifications", path: "/notifications",          color: "from-pink-500 to-pink-600" },
    { icon: User,          label: "Profile",       path: "/profile",                color: "from-gray-500 to-gray-600" },
    { icon: Settings,      label: "Settings",      path: "/settings",               color: "from-slate-500 to-slate-600" },
    { icon: LogOut,        label: "Logout",        path: "/logout",                 color: "from-rose-500 to-rose-600" },
  ],

  industry: [
    { icon: Home,       label: "Dashboard",     path: "/industry-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Network,    label: "My Network",    path: "/network",            color: "from-purple-500 to-purple-600" },
    { icon: Search,     label: "Discover",      path: "/discovery",          color: "from-teal-500 to-teal-600" },
    { icon: Send,       label: "Messages",      path: "/messages",           color: "from-cyan-500 to-cyan-600" },
    { icon: UsersRound, label: "Groups",        path: "/groups",             color: "from-orange-500 to-orange-600" },
    { icon: Trophy,     label: "Challenges",    path: "/challenges",         color: "from-red-500 to-red-600" },
    { icon: Map,        label: "Challenge Map", path: "/challenges/map",     color: "from-emerald-500 to-emerald-600" },
    { icon: Star,       label: "Leaderboard",   path: "/leaderboard",        color: "from-yellow-500 to-yellow-600" },
    { icon: Lightbulb,  label: "AI Career",     path: "/careerbot",          color: "from-amber-500 to-amber-600" },
    { icon: Bell,       label: "Notifications", path: "/notifications",      color: "from-pink-500 to-pink-600" },
    { icon: User,       label: "Profile",       path: "/profile",            color: "from-gray-500 to-gray-600" },
    { icon: Settings,   label: "Settings",      path: "/settings",           color: "from-slate-500 to-slate-600" },
    { icon: LogOut,     label: "Logout",        path: "/logout",             color: "from-rose-500 to-rose-600" },
  ],

  admin: [
    { icon: Home,        label: "Dashboard",      path: "/master-admin-dashboard", color: "from-blue-500 to-blue-600" },
    { icon: Star,        label: "Leaderboard",     path: "/leaderboard",           color: "from-yellow-500 to-yellow-600" },
    { icon: ShieldCheck, label: "Ethics",          path: "/ethics",                color: "from-indigo-500 to-indigo-600" },
    { icon: FileText,    label: "Transparency",    path: "/transparency",          color: "from-teal-500 to-teal-600" },
    { icon: Lightbulb,   label: "AI Career",       path: "/careerbot",             color: "from-amber-500 to-amber-600" },
    { icon: Bell,        label: "Notifications",   path: "/notifications",         color: "from-pink-500 to-pink-600" },
    { icon: Settings,    label: "Settings",        path: "/settings",              color: "from-slate-500 to-slate-600" },
    { icon: LogOut,      label: "Logout",          path: "/logout",                color: "from-rose-500 to-rose-600" },
  ],
};

/**
 * Get navigation items for a specific role.
 * Handles legacy role aliases while keeping one navigation key per role.
 */
export function getNavigationForRole(role?: string): MenuItem[] {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? navigationConfig[normalizedRole] : [];
}
