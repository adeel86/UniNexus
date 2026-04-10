import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { AccessGate } from "@/components/AccessGate";
import { Navbar } from "@/components/Navbar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { CareerBot } from "@/components/CareerBot";
import { RoleGuard } from "@/components/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useIsMobile } from "@/hooks/use-mobile";
import Landing from "@/pages/Landing";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import StudentHome from "@/pages/StudentHome";
import MobileHome from "@/pages/MobileHome";
import CareerBotPage from "@/pages/CareerBotPage";
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
import DiscussionDetail from "@/pages/DiscussionDetail";
import VerifyCertificate from "@/pages/VerifyCertificate";
import VerifyEmail from "@/pages/VerifyEmail";
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
import UniversityLeaderboard from "@/pages/UniversityLeaderboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { currentUser, userData, loading } = useAuth();
  const isMobile = useIsMobile();
  const [location] = useLocation();

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
        {/* Login and register now open as modals on the landing page */}
        <Route path="/login" component={Landing} />
        <Route path="/register" component={Landing} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        {/* Public verification routes */}
        <Route path="/verify/:hash" component={VerifyCertificate} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route component={Landing} />
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
  const isMobileLauncher = location === "/" || location === "/mobile-home";
  const mobilePageTitles: Array<[RegExp, string]> = [
    [/^\/student-feed$/, "Feed"],
    [/^\/careerbot$/, "AI Career"],
    [/^\/network$/, "My Network"],
    [/^\/discovery$/, "Discover"],
    [/^\/personal-tutor$/, "AI Tutor"],
    [/^\/messages$/, "Messages"],
    [/^\/groups$/, "Groups"],
    [/^\/groups\/[^/]+$/, "Group"],
    [/^\/notifications$/, "Notifications"],
    [/^\/leaderboard$/, "Leaderboard"],
    [/^\/university-leaderboard$/, "Leaderboard"],
    [/^\/challenges$/, "Challenges"],
    [/^\/challenges\/map$/, "Challenge Map"],
    [/^\/problem-solving$/, "Q&A"],
    [/^\/profile$/, "Profile"],
    [/^\/settings$/, "Settings"],
    [/^\/courses$/, "My Courses"],
    [/^\/courses\/[^/]+$/, "Course"],
    [/^\/forums\/[^/]+\/[^/]+$/, "Discussion"],
    [/^\/ethics$/, "Ethics"],
    [/^\/transparency$/, "Transparency"],
    [/^\/my-teachers$/, "My Teachers"],
    [/^\/my-students$/, "My Students"],
    [/^\/university-teachers$/, "Teachers"],
    [/^\/teacher-dashboard$/, "Teacher Dashboard"],
    [/^\/university-dashboard$/, "University Dashboard"],
    [/^\/industry-dashboard$/, "Industry Dashboard"],
    [/^\/master-admin-dashboard$/, "Admin Dashboard"],
  ];
  const mobileTitle = mobilePageTitles.find(([pattern]) => pattern.test(location))?.[1] ?? "UniNexus";

  return (
    <div className={`min-h-screen bg-background overflow-x-hidden ${isMobile && !isMobileLauncher ? "mobile-global-header-active" : ""}`}>
      <Navbar />
      {isMobile && !isMobileLauncher && (
        <MobilePageHeader title={mobileTitle} global />
      )}
      <div className="pb-0">
        <ErrorBoundary>
        <Switch>
          {/* Mobile home page - show only on mobile */}
          <Route path="/mobile-home" component={MobileHome} />
          {/* AI Career Bot Page */}
          <Route path="/careerbot" component={CareerBotPage} />
          {/* Feed page for students */}
          <Route path="/student-feed">
            <RoleGuard allowedRoles={['student']}>
              <StudentHome />
            </RoleGuard>
          </Route>
          {/* Desktop home page - or mobile home if on mobile at root */}
          <Route path="/">
            {isMobile ? <MobileHome /> : <HomePage />}
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
            <RoleGuard allowedRoles={['student', 'teacher', 'university_admin', 'industry_professional', 'master_admin']}>
              <Settings />
            </RoleGuard>
          </Route>
          <Route path="/courses">
            <RoleGuard allowedRoles={['student']}>
              <Courses />
            </RoleGuard>
          </Route>
          <Route path="/courses/:courseId" component={CourseDetail} />
          <Route path="/forums/:courseId/:discussionId" component={DiscussionDetail} />
          
          {/* Public verification routes */}
          <Route path="/verify/:hash" component={VerifyCertificate} />
          <Route path="/verify-email" component={VerifyEmail} />
          
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
          <Route path="/university-leaderboard">
            <RoleGuard allowedRoles={['university', 'university_admin']}>
              <UniversityLeaderboard />
            </RoleGuard>
          </Route>
          
          {/* Role-specific routes */}
          <Route path="/teacher-dashboard">
            <RoleGuard allowedRoles={['teacher']}>
              <TeacherDashboard />
            </RoleGuard>
          </Route>
          <Route path="/university-dashboard">
            <RoleGuard allowedRoles={['university_admin', 'university']}>
              <UniversityDashboard />
            </RoleGuard>
          </Route>
          <Route path="/industry-dashboard">
            <RoleGuard allowedRoles={['industry_professional', 'industry']}>
              <IndustryDashboard />
            </RoleGuard>
          </Route>
          <Route path="/master-admin-dashboard">
            <RoleGuard allowedRoles={['master_admin']}>
              <MasterAdminDashboard />
            </RoleGuard>
          </Route>
          
          {/* 404 fallback */}
          <Route component={NotFound} />
        </Switch>
        </ErrorBoundary>
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
    <AccessGate>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AccessGate>
  );
}

export default App;
