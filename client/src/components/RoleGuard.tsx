import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { dashboardPathForRole, hasRole } from "@shared/roles";

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
    if (!loading && userData) {
      const hasAccess = hasRole(userData.role, allowedRoles);

      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this page.",
          variant: "destructive",
        });
        
        if (redirectToDashboard) {
          const dashboardPath = dashboardPathForRole(userData.role);
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

  const hasAccess = hasRole(userData.role, allowedRoles);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
}
