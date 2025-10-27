import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import Home from "@/pages/Home";
import Channels from "@/pages/Channels";
import QAndA from "@/pages/QAndA";
import AIAssistant from "@/pages/AIAssistant";
import Events from "@/pages/Events";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { Home as HomeIcon, Compass, Sparkles, Calendar, Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";

function Sidebar() {
  return (
    <aside className="hidden md:block fixed left-0 top-16 bottom-0 w-64 border-r p-4">
      <nav className="space-y-2">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-home">
            <HomeIcon className="h-5 w-5" />
            <span>Home Feed</span>
          </Button>
        </Link>
        
        <Link href="/channels">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-channels">
            <Compass className="h-5 w-5" />
            <span>Channels</span>
          </Button>
        </Link>
        
        <Link href="/qa">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-qa">
            <Sparkles className="h-5 w-5" />
            <span>Q&A</span>
          </Button>
        </Link>
        
        <Link href="/ai">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-ai">
            <Sparkles className="h-5 w-5" />
            <span>AI Assistant</span>
          </Button>
        </Link>
        
        <Link href="/events">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-events">
            <Calendar className="h-5 w-5" />
            <span>Events</span>
          </Button>
        </Link>
        
        <Link href="/leaderboard">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-leaderboard">
            <Trophy className="h-5 w-5" />
            <span>Leaderboard</span>
          </Button>
        </Link>
        
        <Link href="/profile">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-profile">
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Button>
        </Link>
      </nav>
    </aside>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Connect to WebSocket for real-time notifications
  useWebSocket();

  useEffect(() => {
    if (!loading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      <div className="md:ml-64">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/channels" component={Channels} />
          <Route path="/qa" component={QAndA} />
          <Route path="/ai" component={AIAssistant} />
          <Route path="/events" component={Events} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNav />
      <FloatingActionButton />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
