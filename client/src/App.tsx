import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { Navbar } from "@/components/Navbar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { CareerBot } from "@/components/CareerBot";
import { RoleGuard } from "@/components/RoleGuard";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import StudentHome from "@/pages/StudentHome";
import TeacherDashboard from "@/pages/TeacherDashboard";
import UniversityDashboard from "@/pages/UniversityDashboard";
import IndustryDashboard from "@/pages/IndustryDashboard";
import MasterAdminDashboard from "@/pages/MasterAdminDashboard";
import Leaderboard from "@/pages/Leaderboard";
import Challenges from "@/pages/Challenges";
import ProblemSolving from "@/pages/ProblemSolving";
import GlobalChallengeMap from "@/pages/GlobalChallengeMap";
import Profile from "@/pages/Profile";
import CourseDetail from "@/pages/CourseDetail";
import Courses from "@/pages/Courses";
import VerifyCertificate from "@/pages/VerifyCertificate";
import Network from "@/pages/Network";
import Messages from "@/pages/Messages";
import GroupsDiscovery from "@/pages/GroupsDiscovery";
import GroupPage from "@/pages/GroupPage";
import Notifications from "@/pages/Notifications";
import Discovery from "@/pages/Discovery";
import PersonalTutorPage from "@/pages/PersonalTutorPage";
import EthicsDashboard from "@/pages/EthicsDashboard";
import TransparencyReport from "@/pages/TransparencyReport";
import Settings from "@/pages/Settings";
import MyTeachers from "@/pages/MyTeachers";
import MyStudents from "@/pages/MyStudents";
import UniversityTeachers from "@/pages/UniversityTeachers";
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
        <Route path="/forgot-password" component={ForgotPassword} />
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
      case 'university':
        return UniversityDashboard;
      case 'industry_professional':
      case 'industry':
        return IndustryDashboard;
      case 'master_admin':
      case 'admin':
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
          {/* ... existing routes ... */}
          <Route path="/master-admin-dashboard">
            {import.meta.env.VITE_DEV_AUTH_ENABLED === 'true' ? (
              <MasterAdminDashboard />
            ) : (
              <NotFound />
            )}
          </Route>
          <Route path="/network">
            <RoleGuard allowedRoles={['student', 'teacher', 'industry_professional', 'university_admin']}>
              <Network />
            </RoleGuard>
          </Route>
          <Route path="/discovery">
            <RoleGuard allowedRoles={['student', 'teacher', 'industry_professional', 'university_admin']}>
              <Discovery />
            </RoleGuard>
          </Route>
          <Route path="/personal-tutor">
            <RoleGuard allowedRoles={['student']}>
              <PersonalTutorPage />
            </RoleGuard>
          </Route>
          <Route path="/messages">
            <RoleGuard allowedRoles={['student', 'teacher', 'industry_professional', 'university_admin']}>
              <Messages />
            </RoleGuard>
          </Route>
          <Route path="/groups">
            <RoleGuard allowedRoles={['student', 'teacher', 'industry_professional', 'university_admin']}>
              <GroupsDiscovery />
            </RoleGuard>
          </Route>
          <Route path="/groups/:id">
            <RoleGuard allowedRoles={['student', 'teacher', 'industry_professional', 'university_admin']}>
              <GroupPage />
            </RoleGuard>
          </Route>
          <Route path="/notifications" component={Notifications} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/challenges" component={Challenges} />
          <Route path="/challenges/map" component={GlobalChallengeMap} />
          <Route path="/problem-solving">
            <RoleGuard allowedRoles={['student', 'teacher', 'industry_professional']}>
              <ProblemSolving />
            </RoleGuard>
          </Route>
          <Route path="/profile">
            <RoleGuard allowedRoles={['student', 'teacher', 'university_admin', 'industry_professional']}>
              <Profile />
            </RoleGuard>
          </Route>
          <Route path="/settings">
            <RoleGuard allowedRoles={['student', 'teacher', 'university_admin', 'industry_professional']}>
              <Settings />
            </RoleGuard>
          </Route>
          <Route path="/courses">
            <RoleGuard allowedRoles={['student']}>
              <Courses />
            </RoleGuard>
          </Route>
          <Route path="/courses/:courseId" component={CourseDetail} />
          
          {/* Public verification route */}
          <Route path="/verify/:hash" component={VerifyCertificate} />
          
          {/* Admin/Ethics routes */}
          <Route path="/ethics" component={EthicsDashboard} />
          <Route path="/transparency" component={TransparencyReport} />
          
          {/* Relationship pages */}
          <Route path="/my-teachers">
            <RoleGuard allowedRoles={['student']}>
              <MyTeachers />
            </RoleGuard>
          </Route>
          <Route path="/my-students">
            <RoleGuard allowedRoles={['teacher']}>
              <MyStudents />
            </RoleGuard>
          </Route>
          <Route path="/university-teachers">
            <RoleGuard allowedRoles={['university', 'university_admin', 'master_admin']}>
              <UniversityTeachers />
            </RoleGuard>
          </Route>
          
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
