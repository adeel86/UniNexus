import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  backTo?: string;
  className?: string;
}

function getHomeForRole(role?: string): string {
  switch (role) {
    case "teacher": return "/teacher-dashboard";
    case "university_admin":
    case "university": return "/university-dashboard";
    case "industry_professional":
    case "industry": return "/industry-dashboard";
    case "master_admin": return "/master-admin-dashboard";
    default: return "/";
  }
}

export function MobilePageHeader({ title, subtitle, rightAction, backTo, className }: MobilePageHeaderProps) {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const { userData } = useAuth();

  if (!isMobile) return null;

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(getHomeForRole(userData?.role));
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b",
        "flex items-center gap-3 px-4 h-14 safe-area-top",
        className
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="flex-shrink-0 h-9 w-9 rounded-full"
        data-testid="button-back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-base truncate leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate leading-tight">{subtitle}</p>
        )}
      </div>

      {rightAction && (
        <div className="flex-shrink-0">{rightAction}</div>
      )}
    </div>
  );
}

export function MobilePageWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const isMobile = useIsMobile();
  return (
    <div className={cn(isMobile ? "pt-14" : "", "min-h-screen overflow-x-hidden", className)}>
      {children}
    </div>
  );
}
