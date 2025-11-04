import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { CareerBot } from "@/components/CareerBot";
import Landing from "@/pages/Landing";
import StudentHome from "@/pages/StudentHome";
import TeacherDashboard from "@/pages/TeacherDashboard";
import UniversityDashboard from "@/pages/UniversityDashboard";
import IndustryDashboard from "@/pages/IndustryDashboard";
import MasterAdminDashboard from "@/pages/MasterAdminDashboard";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading UniNexus...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Determine home page based on role
  const getHomePage = () => {
    switch (user?.role) {
      case 'teacher':
        return TeacherDashboard;
      case 'university_admin':
        return UniversityDashboard;
      case 'industry_partner':
        return IndustryDashboard;
      case 'master_admin':
        return MasterAdminDashboard;
      default:
        return StudentHome;
    }
  };

  const HomePage = getHomePage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/profile" component={Profile} />
        
        {/* Role-specific routes */}
        <Route path="/teacher" component={TeacherDashboard} />
        <Route path="/university" component={UniversityDashboard} />
        <Route path="/industry" component={IndustryDashboard} />
        <Route path="/admin" component={MasterAdminDashboard} />
        
        {/* 404 fallback */}
        <Route component={NotFound} />
      </Switch>
      
      {/* Career Bot - Only for students */}
      {user?.role === 'student' && <CareerBot />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
