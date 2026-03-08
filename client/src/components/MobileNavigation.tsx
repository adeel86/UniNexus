import { Home, Users, Trophy, MessageSquare, Bell, User, BarChart, Building2, Briefcase, Shield, Lightbulb, GraduationCap, UsersRound, Compass } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: any;
  label: string;
  path: string;
  roles: string[];
}

const navigationItems: NavItem[] = [
  // Student Navigation - Most complete with distinct routes
  { icon: Home, label: 'Home', path: '/', roles: ['student'] },
  { icon: GraduationCap, label: 'Courses', path: '/courses', roles: ['student'] },
  { icon: Trophy, label: 'Challenges', path: '/challenges', roles: ['student'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['student'] },
  { icon: User, label: 'Profile', path: '/profile', roles: ['student'] },
  
  // Teacher Navigation - Simplified to actual available routes
  { icon: Home, label: 'Dashboard', path: '/teacher-dashboard', roles: ['teacher'] },
  { icon: Trophy, label: 'Challenges', path: '/challenges', roles: ['teacher'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['teacher'] },
  { icon: User, label: 'Profile', path: '/profile', roles: ['teacher'] },
  
  // University Admin Navigation - With access to Network, Discover, Messages, Groups
  { icon: Home, label: 'Dashboard', path: '/university-dashboard', roles: ['university_admin'] },
  { icon: Users, label: 'Network', path: '/network', roles: ['university_admin'] },
  { icon: MessageSquare, label: 'Messages', path: '/messages', roles: ['university_admin'] },
  { icon: UsersRound, label: 'Groups', path: '/groups', roles: ['university_admin'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['university_admin'] },
  
  // Industry Professional Navigation - Distinct routes
  { icon: Home, label: 'Dashboard', path: '/industry-dashboard', roles: ['industry_professional'] },
  { icon: Trophy, label: 'Challenges', path: '/challenges', roles: ['industry_professional'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['industry_professional'] },
  { icon: User, label: 'Profile', path: '/profile', roles: ['industry_professional'] },
  
  // Master Admin Navigation - No access to Network, Discover, Messages, Groups, Posts, Profile, Settings
  { icon: Home, label: 'Dashboard', path: '/master-admin-dashboard', roles: ['master_admin'] },
  { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['master_admin'] },
];

export function MobileNavigation() {
  const [location, navigate] = useLocation();
  const { userData } = useAuth();

  if (!userData) return null;

  const userRole = userData.role;
  const roleItems = navigationItems.filter(item => item.roles.includes(userRole));

  // Mobile navigation is hidden - all navigation happens via MobileHome dashboard
  // This component is kept for backward compatibility but returns null
  return null;
}

