import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  backTo?: string;
  className?: string;
  global?: boolean;
}

export function MobilePageHeader({ title, subtitle, rightAction, backTo, className, global = false }: MobilePageHeaderProps) {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();

  if (!isMobile) return null;

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className={cn(
        "mobile-page-header left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b",
        global ? "mobile-page-header-global sticky top-0" : "fixed top-0",
        "flex items-center gap-3 px-4 h-14 safe-area-inset-top",
        className
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      data-testid="mobile-page-header"
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
    <div className={cn(isMobile ? "pt-0" : "", "min-h-screen", className)}>
      {children}
    </div>
  );
}
