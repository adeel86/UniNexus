import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectToDashboard?: boolean;
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'teacher':
      return '/teacher-dashboard';
    case 'university':
    case 'university_admin':
      return '/university-dashboard';
    case 'industry':
    case 'industry_professional':
      return '/industry-dashboard';
    case 'admin':
    case 'master_admin':
      return '/master-admin-dashboard';
    default:
      return '/';
  }
}

export function RoleGuard({ allowedRoles, children, fallback, redirectToDashboard = true }: RoleGuardProps) {
  const { userData, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && userData) {
      // Role mapping for flexible checks
      const roleMap: Record<string, string[]> = {
        'university_admin': ['university', 'university_admin'],
        'university': ['university', 'university_admin'],
        'industry_professional': ['industry', 'industry_professional'],
        'industry': ['industry', 'industry_professional'],
        'master_admin': ['admin', 'master_admin'],
        'admin': ['admin', 'master_admin'],
      };

      const hasAccess = allowedRoles.some(role => 
        role === userData.role || (roleMap[role] && roleMap[role].includes(userData.role))
      );

      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this page.",
          variant: "destructive",
        });
        
        if (redirectToDashboard) {
          const dashboardPath = getDashboardPath(userData.role);
          setLocation(dashboardPath);
        }
      }
    }
  }, [userData, loading, allowedRoles, toast, redirectToDashboard, setLocation]);

  if (loading) {
    return null;
  }

  if (!userData) {
    return fallback || null;
  }

  // Final access check for rendering
  const roleMap: Record<string, string[]> = {
    'university_admin': ['university', 'university_admin'],
    'university': ['university', 'university_admin'],
    'industry_professional': ['industry', 'industry_professional'],
    'industry': ['industry', 'industry_professional'],
    'master_admin': ['admin', 'master_admin'],
    'admin': ['admin', 'master_admin'],
  };

  const hasAccess = allowedRoles.some(role => 
    role === userData.role || (roleMap[role] && roleMap[role].includes(userData.role))
  );

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
}
