import { Home, Compass, Sparkles, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home", testId: "button-nav-home" },
    { href: "/channels", icon: Compass, label: "Explore", testId: "button-nav-explore" },
    { href: "/ai", icon: Sparkles, label: "AI", testId: "button-nav-ai" },
    { href: "/events", icon: Calendar, label: "Events", testId: "button-nav-events" },
    { href: "/profile", icon: User, label: "Profile", testId: "button-nav-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl bg-background/80 border-t">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ href, icon: Icon, label, testId }) => (
          <Link key={href} href={href}>
            <Button
              variant="ghost"
              size="icon"
              className={`flex-col h-auto py-2 gap-1 ${location === href ? 'text-primary' : ''}`}
              data-testid={testId}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  );
}
