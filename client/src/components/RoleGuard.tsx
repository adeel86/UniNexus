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

export function RoleGuard({ allowedRoles, children, fallback, redirectToDashboard = true }: RoleGuardProps) {
  const { userData, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && userData && !allowedRoles.includes(userData.role)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this page.",
        variant: "destructive",
      });
      
      // Redirect to appropriate dashboard if requested
      if (redirectToDashboard) {
        const dashboardPath = getDashboardPath(userData.role);
        setLocation(dashboardPath);
      }
    }
  }, [userData, loading, allowedRoles, toast, redirectToDashboard, setLocation]);

  if (loading) {
    return null;
  }

  if (!userData || !allowedRoles.includes(userData.role)) {
    return fallback || null;
  }

  return <>{children}</>;
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'teacher':
      return '/teacher-dashboard';
    case 'university_admin':
      return '/university-dashboard';
    case 'industry_professional':
      return '/industry-dashboard';
    case 'master_admin':
      return '/master-admin-dashboard';
    default:
      return '/';
  }
}
