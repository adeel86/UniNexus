import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { Navbar } from "@/components/Navbar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { CareerBot } from "@/components/CareerBot";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import StudentHome from "@/pages/StudentHome";
import TeacherDashboard from "@/pages/TeacherDashboard";
import UniversityDashboard from "@/pages/UniversityDashboard";
import IndustryDashboard from "@/pages/IndustryDashboard";
import MasterAdminDashboard from "@/pages/MasterAdminDashboard";
import Leaderboard from "@/pages/Leaderboard";
import Challenges from "@/pages/Challenges";
import GlobalChallengeMap from "@/pages/GlobalChallengeMap";
import Profile from "@/pages/Profile";
import CourseDetail from "@/pages/CourseDetail";
import VerifyCertificate from "@/pages/VerifyCertificate";
import Network from "@/pages/Network";
import Messages from "@/pages/Messages";
import GroupsDiscovery from "@/pages/GroupsDiscovery";
import Notifications from "@/pages/Notifications";
import Discovery from "@/pages/Discovery";
import EthicsDashboard from "@/pages/EthicsDashboard";
import TransparencyReport from "@/pages/TransparencyReport";
import NotFound from "@/pages/not-found";

function Router() {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading UniNexus...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !userData) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        {/* Public verification route */}
        <Route path="/verify/:hash" component={VerifyCertificate} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Determine home page based on role
  const getHomePage = () => {
    switch (userData.role) {
      case 'teacher':
        return TeacherDashboard;
      case 'university_admin':
        return UniversityDashboard;
      case 'industry_professional':
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
      <div className="pb-16 md:pb-0">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/network" component={Network} />
          <Route path="/discovery" component={Discovery} />
          <Route path="/messages" component={Messages} />
          <Route path="/groups" component={GroupsDiscovery} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/challenges" component={Challenges} />
          <Route path="/challenges/map" component={GlobalChallengeMap} />
          <Route path="/profile" component={Profile} />
          <Route path="/courses/:courseId" component={CourseDetail} />
          
          {/* Public verification route */}
          <Route path="/verify/:hash" component={VerifyCertificate} />
          
          {/* Admin/Ethics routes */}
          <Route path="/ethics" component={EthicsDashboard} />
          <Route path="/transparency" component={TransparencyReport} />
          
          {/* Role-specific routes */}
          <Route path="/teacher-dashboard" component={TeacherDashboard} />
          <Route path="/university-dashboard" component={UniversityDashboard} />
          <Route path="/industry-dashboard" component={IndustryDashboard} />
          <Route path="/master-admin-dashboard" component={MasterAdminDashboard} />
          
          {/* 404 fallback */}
          <Route component={NotFound} />
        </Switch>
      </div>
      
      {/* Mobile Navigation - Bottom Tab Bar */}
      <MobileNavigation />
      
      {/* AI Assistant - Available for all authenticated users */}
      <CareerBot />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
