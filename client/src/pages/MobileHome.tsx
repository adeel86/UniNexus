import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
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
  { icon: BarChart, label: "Leaderboard", path: "/leaderboard", roles: ["student"], color: "from-red-500 to-red-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["student"], color: "from-pink-500 to-pink-600" },
  { icon: Send, label: "Messages", path: "/messages", roles: ["student"], color: "from-cyan-500 to-cyan-600" },
  { icon: User, label: "Profile", path: "/profile", roles: ["student"], color: "from-gray-500 to-gray-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["student"], color: "from-slate-500 to-slate-600" },

  // Teacher items
  { icon: Home, label: "Dashboard", path: "/teacher-dashboard", roles: ["teacher"], color: "from-blue-500 to-blue-600" },
  { icon: BookOpen, label: "My Courses", path: "/teacher-courses", roles: ["teacher"], color: "from-green-500 to-green-600" },
  { icon: Users, label: "My Students", path: "/network", roles: ["teacher"], color: "from-purple-500 to-purple-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["teacher"], color: "from-pink-500 to-pink-600" },
  { icon: Send, label: "Messages", path: "/messages", roles: ["teacher"], color: "from-cyan-500 to-cyan-600" },
  { icon: User, label: "Profile", path: "/profile", roles: ["teacher"], color: "from-gray-500 to-gray-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["teacher"], color: "from-slate-500 to-slate-600" },

  // University Admin items
  { icon: Home, label: "Dashboard", path: "/university-dashboard", roles: ["university_admin"], color: "from-blue-500 to-blue-600" },
  { icon: Users, label: "Network", path: "/network", roles: ["university_admin"], color: "from-purple-500 to-purple-600" },
  { icon: Building2, label: "Institution", path: "/university-admin", roles: ["university_admin"], color: "from-amber-600 to-amber-700" },
  { icon: Send, label: "Messages", path: "/messages", roles: ["university_admin"], color: "from-cyan-500 to-cyan-600" },
  { icon: UsersRound, label: "Groups", path: "/groups", roles: ["university_admin"], color: "from-orange-500 to-orange-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["university_admin"], color: "from-pink-500 to-pink-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["university_admin"], color: "from-slate-500 to-slate-600" },

  // Industry Professional items
  { icon: Home, label: "Dashboard", path: "/industry-dashboard", roles: ["industry_professional"], color: "from-blue-500 to-blue-600" },
  { icon: Briefcase, label: "Opportunities", path: "/opportunities", roles: ["industry_professional"], color: "from-teal-500 to-teal-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["industry_professional"], color: "from-pink-500 to-pink-600" },
  { icon: User, label: "Profile", path: "/profile", roles: ["industry_professional"], color: "from-gray-500 to-gray-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["industry_professional"], color: "from-slate-500 to-slate-600" },

  // Master Admin items
  { icon: Home, label: "Dashboard", path: "/master-admin-dashboard", roles: ["master_admin"], color: "from-blue-500 to-blue-600" },
  { icon: Shield, label: "Admin Panel", path: "/admin", roles: ["master_admin"], color: "from-red-600 to-red-700" },
  { icon: BarChart, label: "Analytics", path: "/analytics", roles: ["master_admin"], color: "from-purple-500 to-purple-600" },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: ["master_admin"], color: "from-pink-500 to-pink-600" },
  { icon: Settings, label: "Settings", path: "/settings", roles: ["master_admin"], color: "from-slate-500 to-slate-600" },
];

interface MobileMenuItemProps {
  icon: any;
  label: string;
  path: string;
  color: string;
  onClick: (path: string) => void;
}

function MobileMenuItem({ icon: Icon, label, path, color, onClick }: MobileMenuItemProps) {
  return (
    <button
      onClick={() => onClick(path)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:opacity-80 transition-opacity active:scale-95"
    >
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md hover:shadow-lg transition-shadow",
          `bg-gradient-to-br ${color}`
        )}
      >
        <Icon className="w-8 h-8" />
      </div>
      <span className="text-xs font-semibold text-center leading-tight max-w-[70px] text-foreground">
        {label}
      </span>
    </button>
  );
}

export default function MobileHome() {
  const { userData: user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    return null;
  }

  const userRole = user.role;
  const availableItems = mobileMenuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
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
        </Card>

        {/* Icon Grid - 3 columns on mobile */}
        <div className="grid grid-cols-3 gap-3 px-1">
          {availableItems.map((item) => (
            <MobileMenuItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              color={item.color || "from-blue-500 to-blue-600"}
              onClick={handleNavigation}
            />
          ))}
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

