import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { Bell, LogOut, Menu, Trophy, Target, MessageCircle, Users, UsersRound, Compass, Lightbulb, GraduationCap, BrainCircuit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { userData: user, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  const roleDisplay = {
    student: "Student",
    teacher: "Teacher",
    university_admin: "University Admin",
    industry_partner: "Industry Partner",
    master_admin: "Master Admin",
  };

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isUniversity = user?.role === 'university_admin';
  const isIndustry = user?.role === 'industry_partner' || user?.role === 'industry_professional' || user?.role === 'industry';
  const isAdmin = user?.role === 'master_admin';

  return (
    <nav className="sticky top-0 z-50 border-b bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-5">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="text-white hover:bg-white/20 md:hidden"
              data-testid="button-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" data-testid="link-home" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center font-heading font-bold text-lg">
              U
            </div>
            <span className="font-heading font-bold text-xl hidden sm:inline">UniNexus</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {/* Not available to master_admin */}
            {!isAdmin && (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/network' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-network"
                >
                  <Link href="/network">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>My Network</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/discovery' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-discovery"
                >
                  <Link href="/discovery">
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4" />
                      <span>Discover</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 relative ${location === '/messages' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-messages"
                >
                  <Link href="/messages">
                    <div className="flex items-center gap-2 relative">
                      <MessageCircle className="h-4 w-4" />
                      <span>Messages</span>
                      {unreadMessages > 0 && (
                        <Badge
                          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                          data-testid="badge-unread-messages"
                        >
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/groups' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-groups"
                >
                  <Link href="/groups">
                    <div className="flex items-center gap-2">
                      <UsersRound className="h-4 w-4" />
                      <span>Groups</span>
                    </div>
                  </Link>
                </Button>
              </>
            )}
            
            {isStudent && (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/courses' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-courses"
                >
                  <Link href="/courses">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Courses</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/personal-tutor' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-personal-tutor"
                >
                  <Link href="/personal-tutor">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4" />
                      <span>Personal Tutor</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/leaderboard' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-leaderboard"
                >
                  <Link href="/leaderboard">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>Leaderboard</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/20 gap-2 ${location === '/problem-solving' ? 'bg-white/20' : ''}`}
                  data-testid="nav-link-problem-solving"
                >
                  <Link href="/problem-solving">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <span>Q&A</span>
                    </div>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right: User Menu */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-white hover:bg-white/20"
                  data-testid="button-notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                      data-testid="badge-unread-count"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start gap-1 p-3 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{notification.message}</div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-white/20"
                  data-testid="button-user-menu"
                >
                  <UserAvatar user={user} size="sm" />
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                    <span className="text-xs opacity-90">{roleDisplay[user.role as keyof typeof roleDisplay]}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setLocation('/profile')} data-testid="link-profile">
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/settings')} data-testid="link-settings">
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    setLocation('/');
                  }}
                  className="text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </nav>
  );
}
